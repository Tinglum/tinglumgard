import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { sendEmail } from '@/lib/email/client';
import { getAdminReplyNotificationTemplate } from '@/lib/email/templates';

// POST /api/admin/messages/[id]/replies - Add reply to a message
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { reply_text } = await request.json();

    if (!reply_text?.trim()) {
      return NextResponse.json({ error: 'Reply text is required' }, { status: 400 });
    }

    const adminName = session.email || 'Admin';

    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: params.id,
        admin_name: adminName,
        reply_text: reply_text.trim(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (replyError) {
      logError('admin-message-reply-create', replyError);
      return NextResponse.json({ error: 'Failed to create reply' }, { status: 500 });
    }

    const { error: updateError } = await supabaseAdmin
      .from('customer_messages')
      .update({ status: 'in_progress' })
      .eq('id', params.id)
      .eq('status', 'open');

    if (updateError) {
      logError('admin-message-reply-update-status', updateError);
    }

    // Send email notification to customer
    try {
      // Get message details with customer email
      const { data: message } = await supabaseAdmin
        .from('customer_messages')
        .select('customer_email, customer_name, subject, email_thread_id, id')
        .eq('id', params.id)
        .single();

      if (message && message.customer_email) {
        const emailTemplate = getAdminReplyNotificationTemplate({
          customerName: message.customer_name || 'Kunde',
          messageId: message.id,
          subject: message.subject,
          replyText: reply_text.trim(),
          adminName,
        });

        const emailResult = await sendEmail({
          to: message.customer_email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
        });

        if (emailResult.success) {
          console.log('Admin reply notification sent to:', message.customer_email, 'ID:', emailResult.id);
        } else {
          console.error('Failed to send admin reply notification:', emailResult.error);
        }
      }
    } catch (emailError) {
      logError('admin-message-reply-email', emailError);
      // Don't fail the reply if email fails
    }

    return NextResponse.json({ reply, success: true });
  } catch (error) {
    logError('admin-message-reply-post', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
