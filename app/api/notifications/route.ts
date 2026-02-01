import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// GET /api/notifications - Get unread notifications for customer
export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.phoneNumber) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unread') === 'true';

    let query = supabaseAdmin
      .from('notifications')
      .select('*')
      .eq('customer_phone', session.phoneNumber)
      .order('created_at', { ascending: false })
      .limit(50);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data: notifications, error } = await query;

    if (error) {
      logError('notifications-get', error);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    return NextResponse.json({ notifications });
  } catch (error) {
    logError('notifications-get-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
