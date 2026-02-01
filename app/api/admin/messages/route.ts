import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/admin/messages - Get all messages (with filtering)
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'open', 'in_progress', 'resolved', 'closed'
    const priority = searchParams.get('priority');
    const type = searchParams.get('type');

    let query = supabaseAdmin
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
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);
    if (priority) query = query.eq('priority', priority);
    if (type) query = query.eq('message_type', type);

    const { data: messages, error } = await query;

    if (error) {
      logError('admin-messages-get', error);
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    // Calculate summary stats
    const stats = {
      total: messages?.length || 0,
      open: messages?.filter(m => m.status === 'open').length || 0,
      in_progress: messages?.filter(m => m.status === 'in_progress').length || 0,
      resolved: messages?.filter(m => m.status === 'resolved').length || 0,
    };

    return NextResponse.json({ messages, stats });
  } catch (error) {
    logError('admin-messages-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
