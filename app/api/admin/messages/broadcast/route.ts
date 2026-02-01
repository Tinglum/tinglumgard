import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

// POST /api/admin/messages/broadcast - Send a message to all clients
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subject, message, message_type } = await request.json();

    if (!subject || !message || !message_type) {
      return NextResponse.json(
        { error: 'Subject, message, and message_type are required' },
        { status: 400 }
      );
    }

    const { data: users, error: usersError } = await supabaseAdmin
      .from('vipps_users')
      .select('phone_number, name, email')
      .not('phone_number', 'is', null);

    if (usersError) {
      logError('admin-messages-broadcast-users', usersError);
      return NextResponse.json({ error: 'Failed to load users' }, { status: 500 });
    }

    if (!users || users.length === 0) {
      return NextResponse.json({ error: 'No users found' }, { status: 400 });
    }

    const records = users
      .filter((u) => u.phone_number)
      .map((u) => ({
        customer_phone: u.phone_number,
        customer_name: u.name || null,
        customer_email: u.email || null,
        subject,
        message,
        message_type,
        status: 'open',
        priority: 'normal',
      }));

    const { error: insertError } = await supabaseAdmin
      .from('customer_messages')
      .insert(records);

    if (insertError) {
      logError('admin-messages-broadcast-insert', insertError);
      return NextResponse.json({ error: 'Failed to create broadcast messages' }, { status: 500 });
    }

    return NextResponse.json({ count: records.length });
  } catch (error) {
    logError('admin-messages-broadcast-main', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
