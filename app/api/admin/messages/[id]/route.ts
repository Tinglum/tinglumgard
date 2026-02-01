import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

const ALLOWED_STATUSES = new Set(['open', 'in_progress', 'resolved', 'closed']);

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
