import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

type Filters = {
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

async function getRecipientsFromOrders(filters: Filters, excludePhones: string[] = []) {
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
      console.log('Filtering by extra slugs:', targetSlugs);
    }

    // Query orders where extra_products JSON contains any of these slugs
    // Using Supabase's contains operator on JSONB
    let ordersQuery = supabaseAdmin
      .from('orders')
      .select('id');

    if (targetSlugs.length > 0) {
      // Filter by orders that have any of the selected extras in their extra_products JSON
      // We need to use raw SQL-like filtering via Supabase
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

      console.log('Found orders with matching extras:', orderIds.length);
      if (orderIds.length === 0) return [];
    } else if (filters.hasExtras) {
      // Just filter for any orders with extras (non-empty extra_products)
      const { data: matchedOrders, error: ordersError } = await supabaseAdmin
        .from('orders')
        .select('id')
        .not('extra_products', 'is', null);

      if (ordersError) throw ordersError;

      // Filter for non-empty arrays
      orderIds = (matchedOrders || [])
        .filter((order: any) =>
          Array.isArray(order.extra_products) && order.extra_products.length > 0
        )
        .map((order: any) => order.id);

      console.log('Found orders with any extras:', orderIds.length);
      if (orderIds.length === 0) return [];
    }
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

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const include = (searchParams.get('include') || '').split(',').filter(Boolean);
    const includeClients = include.includes('clients');
    const includeExtras = include.includes('extras');
    const includePreview = include.includes('preview');

    const response: Record<string, unknown> = {};

    if (includeClients) {
      const { data: users, error } = await supabaseAdmin
        .from('vipps_users')
        .select('phone_number, name, email')
        .not('phone_number', 'is', null)
        .order('name', { ascending: true });

      if (error) throw error;

      response.clients = (users || []).map((u) => ({
        phone: u.phone_number as string,
        name: u.name || null,
        email: u.email || null,
      }));
    }

    if (includeExtras) {
      const { data: extras, error } = await supabaseAdmin
        .from('extras_catalog')
        .select('id, name_no, name_en, slug')
        .order('display_order', { ascending: true });

      if (error) throw error;

      response.extras = (extras || []).map((e) => ({
        id: e.id as string,
        name: e.name_no || e.name_en || e.slug || 'Extra',
      }));
    }

    if (includePreview) {
      const filters: Filters = {
        awaitingFinalPayment: searchParams.get('awaitingFinalPayment') === 'true',
        boxSize: searchParams.get('boxSize') ? Number(searchParams.get('boxSize')) : null,
        hasExtras: searchParams.get('hasExtras') === 'true',
        extraIds: searchParams.get('extraIds') ? searchParams.get('extraIds')!.split(',').filter(Boolean) : [],
      };
      const excludePhones = searchParams.get('excludePhones')
        ? searchParams.get('excludePhones')!.split(',').filter(Boolean)
        : [];
      const limit = Number(searchParams.get('limit') || 50);

      const recipients = await getRecipientsFromOrders(filters, excludePhones);
      response.count = recipients.length;
      response.recipients = recipients.slice(0, limit);
    }

    return NextResponse.json(response);
  } catch (error) {
    logError('admin-messages-recipients', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
