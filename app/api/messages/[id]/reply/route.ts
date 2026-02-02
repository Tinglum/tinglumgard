import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// POST /api/messages/[id]/reply - Customer replies to a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { reply_text } = await request.json();

    if (!reply_text?.trim()) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });
    }

    // Verify the message belongs to this customer
    const { data: message, error: messageError } = await supabaseAdmin
      .from('customer_messages')
      .select('id, customer_phone')
      .eq('id', params.id)
      .single();

    if (messageError || !message) {
      logError('customer-message-reply-verify', messageError);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (message.customer_phone !== session.phoneNumber) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the customer reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: params.id,
        admin_name: session.name || session.phoneNumber,
        reply_text: reply_text.trim(),
        is_from_customer: true,
        is_internal: false,
      })
      .select()
      .single();

    if (replyError) {
      logError('customer-message-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    // Update message status to 'in_progress' if it was resolved/closed
    const { error: updateError } = await supabaseAdmin
      .from('customer_messages')
      .update({ 
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .in('status', ['resolved', 'closed']);

    if (updateError) {
      logError('customer-message-reply-update-status', updateError);
    }

    return NextResponse.json({ reply, success: true });
  } catch (error) {
    logError('customer-message-reply-post', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
