import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function isPhoneMatch(sessionPhone?: string | null, messagePhone?: string | null) {
  const a = normalizePhone(sessionPhone);
  const b = normalizePhone(messagePhone);
  if (!a || !b) return false;
  if (a === b) return true;

  const a8 = a.slice(-8);
  const b8 = b.slice(-8);
  if (a8.length === 8 && b8.length === 8 && a8 === b8) return true;

  const a4 = a.slice(-4);
  const b4 = b.slice(-4);
  return a4.length === 4 && b4.length === 4 && a4 === b4;
}

function isEmailMatch(sessionEmail?: string | null, messageEmail?: string | null) {
  const a = normalizeEmail(sessionEmail);
  const b = normalizeEmail(messageEmail);
  return Boolean(a) && Boolean(b) && a === b;
}

function buildIdentityOrFilter(sessionPhone?: string | null, sessionEmail?: string | null) {
  const parts: string[] = [];
  const rawPhone = (sessionPhone || '').trim();
  const normalizedPhone = normalizePhone(sessionPhone);
  const normalizedEmail = normalizeEmail(sessionEmail);

  if (rawPhone) {
    parts.push(`customer_phone.eq.${rawPhone}`);
  }
  if (normalizedPhone.length >= 8) {
    parts.push(`customer_phone.ilike.%${normalizedPhone.slice(-8)}`);
  }
  if (normalizedEmail) {
    parts.push(`customer_email.ilike.${normalizedEmail}`);
  }

  return parts.join(',');
}

// GET /api/messages/unread-count - Get count of messages with unread admin replies
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const identityFilter = buildIdentityOrFilter(session.phoneNumber, session.email as string | undefined);

    // Get all messages for this customer with their replies
    let query = supabaseAdmin
      .from('customer_messages')
      .select(`
        id,
        customer_phone,
        customer_email,
        status,
        last_viewed_at,
        message_replies (
          id,
          created_at,
          is_internal,
          is_from_customer
        )
      `)

    if (identityFilter) {
      query = query.or(identityFilter);
    }

    const { data: messages, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      logError('messages-unread-count', error);
      // Return 0 instead of 500 if there's an error - graceful degradation
      return NextResponse.json({ unreadCount: 0 });
    }

    const ownMessages = (messages || []).filter((message: any) => {
      return (
        isPhoneMatch(session.phoneNumber, message.customer_phone) ||
        isEmailMatch(session.email as string | undefined, message.customer_email)
      );
    });

    // Count messages with new admin replies only
    let unreadCount = 0;

    if (ownMessages && Array.isArray(ownMessages)) {
      for (const message of ownMessages) {
        const replies = message.message_replies || [];
        const publicReplies = Array.isArray(replies)
          ? replies.filter((r: any) => r && !r.is_internal && !r.is_from_customer)
          : [];
        
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

  if (!session?.phoneNumber && !session?.email) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { messageIds } = await request.json();

    if (!messageIds || !Array.isArray(messageIds)) {
      return NextResponse.json({ error: 'messageIds array is required' }, { status: 400 });
    }

    const now = new Date().toISOString();

    const { data: messagesToMark, error: fetchError } = await supabaseAdmin
      .from('customer_messages')
      .select('id, customer_phone, customer_email')
      .in('id', messageIds);

    if (fetchError) {
      logError('messages-mark-viewed-fetch', fetchError);
      return NextResponse.json({ error: 'Failed to mark messages as viewed' }, { status: 500 });
    }

    const allowedIds = (messagesToMark || [])
      .filter((message: any) => {
        return (
          isPhoneMatch(session.phoneNumber, message.customer_phone) ||
          isEmailMatch(session.email as string | undefined, message.customer_email)
        );
      })
      .map((message: any) => message.id);

    if (allowedIds.length === 0) {
      return NextResponse.json({ success: true });
    }

    // Update all specified messages to mark them as viewed
    const { error } = await supabaseAdmin
      .from('customer_messages')
      .update({ last_viewed_at: now })
      .in('id', allowedIds);

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
