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
        last_viewed_at,
        message_replies (
          id,
          created_at,
          is_internal
        )
      `)
      .eq('customer_phone', session.phoneNumber);

    if (error) {
      logError('messages-unread-count', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Count messages that have new replies (replies created after last_viewed_at)
    let unreadCount = 0;

    for (const message of messages || []) {
      if (!message.message_replies || message.message_replies.length === 0) {
        continue;
      }

      // Filter out internal replies (admin notes)
      const publicReplies = message.message_replies.filter((r: any) => !r.is_internal);
      
      if (publicReplies.length === 0) {
        continue;
      }

      // If never viewed, or has replies after last viewed time, it's unread
      if (!message.last_viewed_at) {
        unreadCount++;
      } else {
        const lastViewed = new Date(message.last_viewed_at).getTime();
        const hasNewReplies = publicReplies.some((reply: any) => {
          const replyTime = new Date(reply.created_at).getTime();
          return replyTime > lastViewed;
        });

        if (hasNewReplies) {
          unreadCount++;
        }
      }
    }

    return NextResponse.json({ unreadCount });
  } catch (error) {
    logError('messages-unread-count-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
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
