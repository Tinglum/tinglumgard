import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { listMessageEmailDebugEvents } from '@/lib/messages/email-debug';
import { needsAdminAttention } from '@/lib/messages/admin-attention';

const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);

// GET /api/admin/messages/[id] - Fetch single message with replies and email debug trail
export async function GET(_request: NextRequest, context: { params: { id: string } }) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: message, error } = await supabaseAdmin
      .from('customer_messages')
      .select(`
        *,
        message_replies (
          id,
          admin_name,
          reply_text,
          is_internal,
          is_from_customer,
          source,
          email_message_id,
          created_at
        )
      `)
      .eq('id', context.params.id)
      .single();

    if (error) {
      logError('admin-message-get', error);
      return NextResponse.json({ error: 'Failed to fetch message' }, { status: 500 });
    }

    if (needsAdminAttention(message)) {
      const viewedAt = new Date().toISOString();
      const { data: internalViewReply, error: viewError } = await supabaseAdmin
        .from('message_replies')
        .insert({
          message_id: message.id,
          admin_name: 'System',
          reply_text: '[admin_viewed]',
          is_internal: true,
          is_from_customer: false,
          source: 'panel',
          created_at: viewedAt,
        })
        .select('id, admin_name, reply_text, is_internal, is_from_customer, source, email_message_id, created_at')
        .maybeSingle();

      if (viewError) {
        logError('admin-message-mark-viewed', viewError);
      } else if (internalViewReply) {
        message.message_replies = [...(message.message_replies || []), internalViewReply];
      }
    }

    const emailDebugEvents = await listMessageEmailDebugEvents({
      messageId: message.id,
      emailThreadId: message.email_thread_id || null,
      customerEmail: message.customer_email || null,
      subject: message.subject || '',
    });

    return NextResponse.json({
      message: {
        ...message,
        email_debug_events: emailDebugEvents,
      },
    });
  } catch (error) {
    logError('admin-message-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// PATCH /api/admin/messages/[id] - Update message status
export async function PATCH(request: NextRequest, context: { params: { id: string } }) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { status } = await request.json();
    if (!ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const now = new Date().toISOString();
    const updates: Record<string, unknown> = {
      status,
      updated_at: now,
    };

    if (status === 'resolved') {
      updates.resolved_at = now;
    }

    const { data, error } = await supabaseAdmin
      .from('customer_messages')
      .update(updates)
      .eq('id', context.params.id)
      .select()
      .single();

    if (error) {
      logError('admin-messages-patch', error);
      return NextResponse.json({ error: 'Failed to update message' }, { status: 500 });
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    logError('admin-messages-patch-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
