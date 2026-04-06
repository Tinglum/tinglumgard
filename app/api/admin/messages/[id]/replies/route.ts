import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';

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
    const trimmedReply = reply_text.trim();

    const { data: reply, error: replyError } = await supabaseAdmin
      .from('message_replies')
      .insert({
        message_id: params.id,
        admin_name: adminName,
        reply_text: trimmedReply,
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
      .update({ status: 'in_progress', updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .in('status', ['open', 'resolved', 'closed', 'in_progress']);

    if (updateError) {
      logError('admin-message-reply-update-status', updateError);
    }

    try {
      const { data: message } = await supabaseAdmin
        .from('customer_messages')
        .select('customer_email, customer_name, subject, id')
        .eq('id', params.id)
        .single();

      if (message && message.customer_email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglumgard.no';
        const rendered = await renderManagedTemplate({
          templateKey: 'support.reply.customer.notification',
          locale: 'no',
          variables: {
            customer_name: message.customer_name || 'Kunde',
            thread_id: `msg_${message.id}`,
            subject_line: message.subject,
            reply_text: trimmedReply,
            admin_name: adminName,
            portal_url: `${appUrl}/min-side`,
            portal_label: 'Min side',
          },
        });

        if (!rendered) {
          throw new Error('Missing template support.reply.customer.notification');
        }

        await dispatchEmail({
          to: message.customer_email,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'support',
          templateKey: rendered.templateKey,
          sourcePath: '/api/admin/messages/[id]/replies',
          customerMessageId: message.id,
          sendImmediately: true,
        });
      }
    } catch (emailError) {
      logError('admin-message-reply-email', emailError);
    }

    return NextResponse.json({ reply, success: true });
  } catch (error) {
    logError('admin-message-reply-post', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
