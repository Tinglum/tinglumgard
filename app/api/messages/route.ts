import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/messages - Fetch customer's messages
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { data: messages, error } = await supabaseAdmin
      .from('customer_messages')
      .select(`
        *,
        message_replies (
          id,
          admin_name,
          reply_text,
          is_internal,
          created_at
        )
      `)
      .eq('customer_phone', session.phoneNumber)
      .order('created_at', { ascending: false });

    if (error) {
      logError('messages-get', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json({ messages });
  } catch (error) {
    logError('messages-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST /api/messages - Create new message
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.phoneNumber) {
      logError('messages-post-no-session', { session });
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    const {
      subject,
      message,
      message_type,
      order_id,
    } = await request.json();

    if (!subject || !message || !message_type) {
      logError('messages-post-missing-fields', { subject: !!subject, message: !!message, message_type: !!message_type });
      return NextResponse.json(
        { error: 'Subject, message, and message_type are required' },
        { status: 400 }
      );
    }

    const { data: newMessage, error } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        customer_phone: session.phoneNumber,
        customer_name: session.name,
        customer_email: session.email,
        subject,
        message,
        message_type,
        order_id: order_id || null,
        status: 'open',
        priority: 'normal',
      })
      .select()
      .single();

    if (error) {
      logError('messages-post-db-error', { error, phone: session.phoneNumber });
      return NextResponse.json({ error: 'Failed to create message' }, { status: 500 });
    }

    // TODO: Send notification to admin that new message received

    return NextResponse.json({ message: newMessage }, { status: 201 });
  } catch (error) {
    logError('messages-post-catch', { error: error instanceof Error ? error.message : 'Unknown error' });
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
