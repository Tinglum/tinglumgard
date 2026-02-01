import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

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

    return NextResponse.json({ reply, success: true });
  } catch (error) {
    logError('admin-message-reply-post', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
