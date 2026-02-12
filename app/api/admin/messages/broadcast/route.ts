import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';
import { getEffectiveBoxSize } from '@/lib/orders/display';

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
    // Get all extras_catalog entries first to map IDs to slugs
    let extrasQuery = supabaseAdmin
      .from('extras_catalog')
      .select('id, slug');
    
    const { data: extrasMap, error: mapError } = await extrasQuery;
    if (mapError) throw mapError;
    
    // Build a map of ID -> slug
    const idToSlug = new Map<string, string>();
    extrasMap?.forEach((e: any) => {
      idToSlug.set(e.id, e.slug);
    });

    // Convert extra IDs to slugs
    let targetSlugs: string[] = [];
    if (filters.extraIds && filters.extraIds.length > 0) {
      targetSlugs = filters.extraIds
        .map((id: string) => idToSlug.get(id))
        .filter((slug: string | undefined) => slug !== undefined) as string[];
    }

    // Query orders where extra_products JSON contains any of these slugs
    if (targetSlugs.length > 0) {
      const { data: matchedOrders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id, extra_products')
        .not('extra_products', 'is', null);

      if (ordersError) throw ordersError;

      orderIds = (matchedOrders || [])
        .filter((order: any) => {
          if (!Array.isArray(order.extra_products)) return false;
          return order.extra_products.some((extra: any) =>
            targetSlugs.includes(extra.slug)
          );
        })
        .map((order: any) => order.id);

      if (orderIds.length === 0) return [];
    } else if (filters.hasExtras) {
      // Just filter for any orders with extras (non-empty extra_products)
      const { data: matchedOrders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .not('extra_products', 'is', null);

      if (ordersError) throw ordersError;

      orderIds = (matchedOrders || [])
        .filter((order: any) =>
          Array.isArray(order.extra_products) && order.extra_products.length > 0
        )
        .map((order: any) => order.id);

      if (orderIds.length === 0) return [];
    }
  }

  let ordersQuery = supabaseAdmin
    .from('orders')
    .select('id, customer_phone, customer_name, customer_email, box_size, status, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)');

  if (filters.awaitingFinalPayment) {
    ordersQuery = ordersQuery.eq('status', 'deposit_paid');
  }
  if (orderIds) {
    ordersQuery = ordersQuery.in('id', orderIds);
  }

  const { data: fetchedOrders, error: ordersError } = await ordersQuery;
  if (ordersError) throw ordersError;

  const orders = (fetchedOrders || []).filter((order) => {
    if (!filters.boxSize) return true;
    return getEffectiveBoxSize(order as any) === filters.boxSize;
  });

  const recipients = orders
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
