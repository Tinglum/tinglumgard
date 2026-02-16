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

// POST /api/messages/[id]/reply - Customer replies to a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session?.phoneNumber && !session?.email) {
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
      .select('id, customer_phone, customer_email')
      .eq('id', params.id)
      .single();

    if (messageError || !message) {
      logError('customer-message-reply-verify', messageError);
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    if (
      !isPhoneMatch(session.phoneNumber, message.customer_phone) &&
      !isEmailMatch(session.email as string | undefined, message.customer_email)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Create the customer reply
    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: params.id,
        admin_name: session.name || session.phoneNumber || session.email || 'Kunde',
        reply_text: reply_text.trim(),
        is_from_customer: true,
        is_internal: false,
      })
      .select()
      .single();

    if (replyError) {
      console.error('Customer reply create failed:', {
        code: replyError.code,
        message: replyError.message,
        details: replyError.details,
        hint: replyError.hint,
      });
      logError('customer-message-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply', details: replyError.message }, { status: 500 });
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
