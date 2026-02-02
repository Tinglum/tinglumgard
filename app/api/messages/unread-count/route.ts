import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/messages/unread-count - Get count of messages with unread admin replies
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Get all messages for this customer with their replies
    const { data: messages, error } = await supabaseAdmin
      .from('customer_messages')
      .select(`
        id,
        status,
        last_viewed_at,
        message_replies (
          id,
          created_at,
          is_internal
        )
      `)
      .eq('customer_phone', session.phoneNumber);

    if (error) {
      console.error('Supabase error:', error);
      logError('messages-unread-count', error);
      // Return 0 instead of 500 if there's an error - graceful degradation
      return NextResponse.json({ unreadCount: 0 });
    }

    // Count messages with new admin replies OR open messages without replies yet
    let unreadCount = 0;

    if (messages && Array.isArray(messages)) {
      for (const message of messages) {
        const replies = message.message_replies || [];
        const publicReplies = Array.isArray(replies) ? replies.filter((r: any) => r && !r.is_internal) : [];
        
        // Case 1: Message has admin replies
        if (publicReplies.length > 0) {
          // If never viewed, or has replies after last viewed time, it's unread
          if (!message.last_viewed_at) {
            unreadCount++;
          } else {
            const lastViewed = new Date(message.last_viewed_at).getTime();
            const hasNewReplies = publicReplies.some((reply: any) => {
              if (!reply || !reply.created_at) return false;
              const replyTime = new Date(reply.created_at).getTime();
              return replyTime > lastViewed;
            });

            if (hasNewReplies) {
              unreadCount++;
            }
          }
        } 
        // Case 2: Open message without admin reply yet - count as unread
        else if ((message as any).status === 'open' || (message as any).status === 'in_progress') {
          unreadCount++;
        }
      }
    }

    return NextResponse.json({ unreadCount });
  } catch (error) {
    console.error('Unread count error:', error);
    logError('messages-unread-count-main', error);
    // Return 0 as fallback - user experience is better than showing error
    return NextResponse.json({ unreadCount: 0 });
  }
}

// POST /api/messages/unread-count - Mark messages as viewed
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    // Update all specified messages to mark them as viewed
    const { error } = await supabaseAdmin
      .from('customer_messages')
      .update({ last_viewed_at: now })
      .in('id', messageIds)
      .eq('customer_phone', session.phoneNumber); // Safety: only update own messages

    if (error) {
      logError('messages-mark-viewed', error);
      return NextResponse.json({ error: 'Failed to mark messages as viewed' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('messages-mark-viewed-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
