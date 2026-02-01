import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

type BroadcastFilters = {
  awaitingFinalPayment?: boolean;
  boxSize?: number | null;
  hasExtras?: boolean;
  extraIds?: string[];
};

const uniqueByPhone = (items: Array<{ phone: string; name?: string | null; email?: string | null }>) => {
  const map = new Map<string, { phone: string; name?: string | null; email?: string | null }>();
  items.forEach((item) => {
    if (!map.has(item.phone)) map.set(item.phone, item);
  });
  return Array.from(map.values());
};

async function getRecipientsFromOrders(filters: BroadcastFilters, excludePhones: string[] = []) {
  const excluded = new Set(excludePhones);

  let orderIds: string[] | null = null;
  if (filters.hasExtras || (filters.extraIds && filters.extraIds.length > 0)) {
    let extrasQuery = supabaseAdmin.from('order_extras').select('order_id');
    if (filters.extraIds && filters.extraIds.length > 0) {
      extrasQuery = extrasQuery.in('extra_id', filters.extraIds);
    }
    const { data: extrasData, error: extrasError } = await extrasQuery;
    if (extrasError) throw extrasError;
    orderIds = Array.from(new Set((extrasData || []).map((r) => r.order_id)));
    if (orderIds.length === 0) return [];
  }

  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('id, customer_phone, customer_name, customer_email, box_size, status');

  if (filters.awaitingFinalPayment) {
    ordersQuery = ordersQuery.eq('status', 'deposit_paid');
  }
  if (filters.boxSize) {
    ordersQuery = ordersQuery.eq('box_size', filters.boxSize);
  }
  if (orderIds) {
    ordersQuery = ordersQuery.in('id', orderIds);
  }

  const { data: orders, error: ordersError } = await ordersQuery;
  if (ordersError) throw ordersError;

  const recipients = (orders || [])
    .filter((o) => o.customer_phone && !excluded.has(o.customer_phone))
    .map((o) => ({
      phone: o.customer_phone as string,
      name: o.customer_name || null,
      email: o.customer_email || null,
    }));

  return uniqueByPhone(recipients);
}

async function getRecipientsFromUsers(excludePhones: string[] = []) {
  const excluded = new Set(excludePhones);
  const { data: users, error } = await supabaseAdmin
    .from('vipps_users')
    .select('phone_number, name, email')
    .not('phone_number', 'is', null);

  if (error) throw error;

  const recipients = (users || [])
    .filter((u) => u.phone_number && !excluded.has(u.phone_number))
    .map((u) => ({
      phone: u.phone_number as string,
      name: u.name || null,
      email: u.email || null,
    }));

  return uniqueByPhone(recipients);
}

// POST /api/admin/messages/broadcast - Send messages to selected clients
export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { subject, message, message_type, mode, recipients, excludedPhones, filters } = await request.json();

    if (!subject || !message || !message_type) {
      return NextResponse.json(
        { error: 'Subject, message, and message_type are required' },
        { status: 400 }
      );
    }

    const exclude = Array.isArray(excludedPhones) ? excludedPhones : [];
    const broadcastFilters: BroadcastFilters = filters || {};

    let targetRecipients: Array<{ phone: string; name?: string | null; email?: string | null }> = [];

    if (mode === 'manual') {
      const phoneList: string[] = Array.isArray(recipients) ? recipients : [];
      if (phoneList.length === 0) {
        return NextResponse.json({ error: 'No recipients selected' }, { status: 400 });
      }
      const { data: users, error: usersError } = await supabaseAdmin
        .from('vipps_users')
        .select('phone_number, name, email')
        .in('phone_number', phoneList);

      if (usersError) throw usersError;

      const existing = (users || []).map((u) => ({
        phone: u.phone_number as string,
        name: u.name || null,
        email: u.email || null,
      }));

      const fallback = phoneList
        .filter((phone) => !existing.find((u) => u.phone === phone))
        .map((phone) => ({ phone, name: null, email: null }));

      targetRecipients = uniqueByPhone([...existing, ...fallback]).filter((r) => !exclude.includes(r.phone));
    } else if (mode === 'filters') {
      targetRecipients = await getRecipientsFromOrders(broadcastFilters, exclude);
    } else {
      targetRecipients = await getRecipientsFromUsers(exclude);
    }

    if (targetRecipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 });
    }

    const records = targetRecipients.map((u) => ({
      customer_phone: u.phone,
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
