import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { fetchCommunicationHistory } from '@/lib/email/history';

type PaymentRow = {
  amount_nok: number | null;
  status: string | null;
};

type PigExtraRow = {
  quantity?: number | null;
  price_nok?: number | null;
  total_price?: number | null;
  unit_price?: number | null;
  extras_catalog?: {
    name_no?: string | null;
  } | null;
};

type PigOrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string;
  total_amount: number | null;
  box_size?: number | null;
  ribbe_choice?: string | null;
  payments?: PaymentRow[] | null;
  order_extras?: PigExtraRow[] | null;
};

type EggOrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string;
  total_amount: number | null;
  quantity?: number | null;
  delivery_method?: string | null;
  week_number?: number | null;
  year?: number | null;
  egg_breeds?: { name?: string | null } | null;
  egg_payments?: PaymentRow[] | null;
};

type ChickenOrderRow = {
  id: string;
  user_id: string | null;
  order_number: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  status: string;
  created_at: string;
  total_amount_nok: number | null;
  quantity_hens?: number | null;
  quantity_roosters?: number | null;
  pickup_week?: number | null;
  pickup_year?: number | null;
  pickup_monday?: string | null;
  age_weeks_at_pickup?: number | null;
  delivery_method?: string | null;
  delivery_fee_nok?: number | null;
  deposit_amount_nok?: number | null;
  remainder_amount_nok?: number | null;
  remainder_due_date?: string | null;
  price_per_hen_nok?: number | null;
  price_per_rooster_nok?: number | null;
  subtotal_nok?: number | null;
  notes?: string | null;
  admin_notes?: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;
  chicken_breeds?: { name?: string | null } | null;
  chicken_order_additions?: Array<{
    id?: string | null;
    quantity_hens?: number | null;
    quantity_roosters?: number | null;
    subtotal_nok?: number | null;
    price_per_hen_nok?: number | null;
  }> | null;
  chicken_payments?: PaymentRow[] | null;
};

type UnifiedOrder = {
  source: 'pig' | 'egg' | 'chicken';
  id: string;
  userId: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  phoneDigits: string;
  status: string;
  createdAt: string;
  paidAmountNok: number;
  displayAmountNok: number;
  metadata: Record<string, unknown>;
};

type ResolvedCustomerIdentity = {
  customerId: string;
  email: string;
  phone: string;
};

type ParsedCustomerId = {
  email: string;
  phoneDigits: string;
  userId: string;
  orderKey: string;
};

const NON_CUSTOMER_EMAILS = new Set(['pending@vipps.no']);

function normalizeEmail(value?: string | null): string {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return (value || '').trim();
}

function phoneDigits(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

function isUsableEmail(email: string): boolean {
  if (!email) return false;
  if (!email.includes('@')) return false;
  return !NON_CUSTOMER_EMAILS.has(email);
}

function isMissingColumnOrRelationError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  if (candidate.code === '42703' || candidate.code === '42P01') return true;
  if (typeof candidate.message === 'string' && candidate.message.includes('does not exist')) return true;
  return false;
}

function sumCompletedPayments(payments: PaymentRow[] | null | undefined): number {
  return (payments || []).reduce((sum, payment) => {
    if (payment?.status !== 'completed') return sum;
    return sum + Number(payment.amount_nok || 0);
  }, 0);
}

function toPigUnified(row: PigOrderRow): UnifiedOrder {
  return {
    source: 'pig',
    id: row.id,
    userId: String(row.user_id || ''),
    orderNumber: row.order_number,
    customerName: String(row.customer_name || 'Kunde').trim() || 'Kunde',
    customerEmail: normalizeEmail(row.customer_email),
    customerPhone: normalizePhone(row.customer_phone),
    phoneDigits: phoneDigits(row.customer_phone),
    status: String(row.status || ''),
    createdAt: String(row.created_at || ''),
    paidAmountNok: sumCompletedPayments(row.payments),
    displayAmountNok: Math.round(Number(row.total_amount || 0)),
    metadata: {
      box_size: row.box_size ?? null,
      ribbe_choice: row.ribbe_choice ?? null,
      order_extras: row.order_extras || [],
    },
  };
}

function toEggUnified(row: EggOrderRow): UnifiedOrder {
  return {
    source: 'egg',
    id: row.id,
    userId: String(row.user_id || ''),
    orderNumber: row.order_number,
    customerName: String(row.customer_name || 'Kunde').trim() || 'Kunde',
    customerEmail: normalizeEmail(row.customer_email),
    customerPhone: normalizePhone(row.customer_phone),
    phoneDigits: phoneDigits(row.customer_phone),
    status: String(row.status || ''),
    createdAt: String(row.created_at || ''),
    paidAmountNok: sumCompletedPayments(row.egg_payments),
    // egg totals are stored in ore
    displayAmountNok: Math.round(Number(row.total_amount || 0) / 100),
    metadata: {
      quantity: row.quantity ?? null,
      delivery_method: row.delivery_method ?? null,
      week_number: row.week_number ?? null,
      year: row.year ?? null,
      breed_name: row.egg_breeds?.name || null,
    },
  };
}

function toChickenUnified(row: ChickenOrderRow): UnifiedOrder {
  return {
    source: 'chicken',
    id: row.id,
    userId: String(row.user_id || ''),
    orderNumber: row.order_number,
    customerName: String(row.customer_name || 'Kunde').trim() || 'Kunde',
    customerEmail: normalizeEmail(row.customer_email),
    customerPhone: normalizePhone(row.customer_phone),
    phoneDigits: phoneDigits(row.customer_phone),
    status: String(row.status || ''),
    createdAt: String(row.created_at || ''),
    paidAmountNok: sumCompletedPayments(row.chicken_payments),
    displayAmountNok: Math.round(Number(row.total_amount_nok || 0)),
    metadata: {
      quantity_hens: row.quantity_hens ?? null,
      quantity_roosters: row.quantity_roosters ?? null,
      pickup_week: row.pickup_week ?? null,
      pickup_year: row.pickup_year ?? null,
      pickup_monday: row.pickup_monday ?? null,
      age_weeks_at_pickup: row.age_weeks_at_pickup ?? null,
      delivery_method: row.delivery_method ?? null,
      delivery_fee_nok: row.delivery_fee_nok ?? null,
      deposit_amount_nok: row.deposit_amount_nok ?? null,
      remainder_amount_nok: row.remainder_amount_nok ?? null,
      remainder_due_date: row.remainder_due_date ?? null,
      price_per_hen_nok: row.price_per_hen_nok ?? null,
      price_per_rooster_nok: row.price_per_rooster_nok ?? null,
      subtotal_nok: row.subtotal_nok ?? null,
      notes: row.notes ?? null,
      admin_notes: row.admin_notes ?? null,
      shipping_address: row.shipping_address ?? null,
      shipping_postal_code: row.shipping_postal_code ?? null,
      shipping_city: row.shipping_city ?? null,
      shipping_country: row.shipping_country ?? null,
      additions: row.chicken_order_additions || [],
      breed_name: row.chicken_breeds?.name || null,
    },
  };
}

function isCompletedOrder(order: UnifiedOrder): boolean {
  if (order.source === 'pig') return order.status === 'completed';
  if (order.source === 'egg') return ['fully_paid', 'delivered'].includes(order.status);
  return ['picked_up', 'completed'].includes(order.status);
}

function isAtRiskOrder(order: UnifiedOrder): boolean {
  if (order.source === 'pig') return ['draft', 'deposit_paid'].includes(order.status);
  if (order.source === 'egg') return ['pending', 'deposit_paid', 'partially_paid'].includes(order.status);
  return ['pending', 'deposit_paid', 'ready_for_pickup'].includes(order.status);
}

function getPreferenceLabel(order: UnifiedOrder): string {
  if (order.source === 'pig') {
    const boxSize = Number(order.metadata.box_size || 0);
    return boxSize > 0 ? `Mangalitsa (${boxSize} kg)` : 'Mangalitsa';
  }

  if (order.source === 'egg') {
    const breedName = String(order.metadata.breed_name || '').trim();
    return breedName ? `Rugeegg (${breedName})` : 'Rugeegg';
  }

  const chickenBreed = String(order.metadata.breed_name || '').trim();
  return chickenBreed ? `Kyllinger (${chickenBreed})` : 'Kyllinger';
}

function resolveCustomerIdentity(order: UnifiedOrder): ResolvedCustomerIdentity {
  if (isUsableEmail(order.customerEmail)) {
    return {
      customerId: `email:${order.customerEmail}`,
      email: order.customerEmail,
      phone: order.customerPhone,
    };
  }

  if (order.phoneDigits) {
    return {
      customerId: `phone:${order.phoneDigits}`,
      email: '',
      phone: order.customerPhone,
    };
  }

  if (order.userId) {
    return {
      customerId: `user:${order.userId}`,
      email: '',
      phone: '',
    };
  }

  // Last-resort identity so orders are never hidden from admin customer view.
  return {
    customerId: `order:${order.source}:${order.id}`,
    email: '',
    phone: '',
  };
}

function parseCustomerId(customerId: string): ParsedCustomerId {
  const raw = String(customerId || '').trim();
  if (!raw) return { email: '', phoneDigits: '', userId: '', orderKey: '' };

  if (raw.startsWith('email:')) {
    return { email: normalizeEmail(raw.slice(6)), phoneDigits: '', userId: '', orderKey: '' };
  }

  if (raw.startsWith('phone:')) {
    return { email: '', phoneDigits: phoneDigits(raw.slice(6)), userId: '', orderKey: '' };
  }

  if (raw.startsWith('user:')) {
    return { email: '', phoneDigits: '', userId: raw.slice(5), orderKey: '' };
  }

  if (raw.startsWith('order:')) {
    return { email: '', phoneDigits: '', userId: '', orderKey: raw.slice(6) };
  }

  const fallbackEmail = normalizeEmail(raw);
  if (isUsableEmail(fallbackEmail)) {
    return { email: fallbackEmail, phoneDigits: '', userId: '', orderKey: '' };
  }

  return { email: '', phoneDigits: phoneDigits(raw), userId: '', orderKey: '' };
}

function orderMatchesCustomer(order: UnifiedOrder, parsed: ParsedCustomerId): boolean {
  if (parsed.userId && order.userId === parsed.userId) return true;
  if (parsed.email && normalizeEmail(order.customerEmail) === parsed.email) return true;
  if (parsed.phoneDigits && order.phoneDigits === parsed.phoneDigits) return true;
  if (parsed.orderKey && `${order.source}:${order.id}` === parsed.orderKey) return true;
  return false;
}

async function fetchPigOrdersRows(): Promise<PigOrderRow[]> {
  const detailed = await supabaseAdmin
    .from('orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount, box_size, ribbe_choice, payments(amount_nok, status), order_extras(quantity, price_nok, total_price, unit_price, extras_catalog(name_no))'
    );

  if (!detailed.error) {
    return (detailed.data || []) as PigOrderRow[];
  }

  if (!isMissingColumnOrRelationError(detailed.error)) {
    throw detailed.error;
  }

  const fallback = await supabaseAdmin
    .from('orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount, box_size, ribbe_choice, payments(amount_nok, status)'
    );

  if (fallback.error) throw fallback.error;

  return ((fallback.data || []) as PigOrderRow[]).map((row) => ({
    ...row,
    order_extras: [],
  }));
}

async function fetchEggOrdersRows(): Promise<EggOrderRow[]> {
  const detailed = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount, quantity, delivery_method, week_number, year, egg_breeds(name), egg_payments(amount_nok, status)'
    );

  if (!detailed.error) {
    return (detailed.data || []) as EggOrderRow[];
  }

  if (detailed.error.code === '42P01') {
    return [];
  }

  if (!isMissingColumnOrRelationError(detailed.error)) {
    throw detailed.error;
  }

  const fallback = await supabaseAdmin
    .from('egg_orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount, quantity, delivery_method, week_number, year'
    );

  if (fallback.error) throw fallback.error;

  return ((fallback.data || []) as EggOrderRow[]).map((row) => ({
    ...row,
    egg_breeds: null,
    egg_payments: [],
  }));
}

async function fetchChickenOrdersRows(): Promise<ChickenOrderRow[]> {
  const detailed = await supabaseAdmin
    .from('chicken_orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount_nok, quantity_hens, quantity_roosters, pickup_week, pickup_year, pickup_monday, age_weeks_at_pickup, delivery_method, delivery_fee_nok, deposit_amount_nok, remainder_amount_nok, remainder_due_date, price_per_hen_nok, price_per_rooster_nok, subtotal_nok, notes, admin_notes, shipping_address, shipping_postal_code, shipping_city, shipping_country, chicken_breeds(name), chicken_payments(amount_nok, status), chicken_order_additions(id, quantity_hens, quantity_roosters, subtotal_nok, price_per_hen_nok)'
    );

  if (!detailed.error) {
    return (detailed.data || []) as ChickenOrderRow[];
  }

  if (detailed.error.code === '42P01') {
    return [];
  }

  if (!isMissingColumnOrRelationError(detailed.error)) {
    throw detailed.error;
  }

  const fallback = await supabaseAdmin
    .from('chicken_orders')
    .select(
      'id, user_id, order_number, customer_name, customer_email, customer_phone, status, created_at, total_amount_nok, quantity_hens, quantity_roosters, pickup_week, pickup_year'
    );

  if (fallback.error) throw fallback.error;

  return ((fallback.data || []) as ChickenOrderRow[]).map((row) => ({
    ...row,
    chicken_breeds: null,
    chicken_order_additions: [],
    chicken_payments: [],
  }));
}

async function fetchAllUnifiedOrders(): Promise<UnifiedOrder[]> {
  const [pigRows, eggRows, chickenRows] = await Promise.all([
    fetchPigOrdersRows(),
    fetchEggOrdersRows(),
    fetchChickenOrdersRows(),
  ]);

  const pigOrders = pigRows.map(toPigUnified);
  const eggOrders = eggRows.map(toEggUnified);
  const chickenOrders = chickenRows.map(toChickenUnified);

  return [...pigOrders, ...eggOrders, ...chickenOrders].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const customerId = searchParams.get('customerId');
    const source = searchParams.get('source');
    const orderId = searchParams.get('orderId');

    switch (action) {
      case 'list':
        return await getCustomerList();

      case 'profile':
        if (!customerId) {
          return NextResponse.json({ error: 'Customer ID required' }, { status: 400 });
        }
        return await getCustomerProfile(customerId);

      case 'stats':
        return await getCustomerStats();

      case 'order-detail':
        if (!source || !orderId) {
          return NextResponse.json({ error: 'Source and orderId are required' }, { status: 400 });
        }
        if (!['pig', 'egg', 'chicken'].includes(source)) {
          return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
        }
        return await getOrderDetail(source as 'pig' | 'egg' | 'chicken', orderId);

      default:
        return await getCustomerList();
    }
  } catch (error) {
    console.error('Customer API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch customer data' },
      { status: 500 }
    );
  }
}

async function getCustomerList() {
  const unifiedOrders = await fetchAllUnifiedOrders();
  const customerMap = new Map<string, any>();

  for (const order of unifiedOrders) {
    const identity = resolveCustomerIdentity(order);

    if (!customerMap.has(identity.customerId)) {
      customerMap.set(identity.customerId, {
        customer_id: identity.customerId,
        email: identity.email,
        name: order.customerName,
        phone: identity.phone || null,
        first_order_date: order.createdAt,
        last_order_date: order.createdAt,
        total_orders: 0,
        completed_orders: 0,
        total_spent: 0,
        lifetime_value: 0,
        at_risk: false,
      });
    }

    const customer = customerMap.get(identity.customerId);
    customer.total_orders += 1;
    if (isCompletedOrder(order)) customer.completed_orders += 1;
    if (isAtRiskOrder(order)) customer.at_risk = true;

    customer.total_spent += order.paidAmountNok;
    customer.lifetime_value += order.paidAmountNok;

    if (!customer.phone && identity.phone) {
      customer.phone = identity.phone;
    }
    if (!customer.email && identity.email) {
      customer.email = identity.email;
    }
    if ((!customer.name || customer.name === 'Kunde') && order.customerName) {
      customer.name = order.customerName;
    }

    if (new Date(order.createdAt) < new Date(customer.first_order_date)) {
      customer.first_order_date = order.createdAt;
    }
    if (new Date(order.createdAt) > new Date(customer.last_order_date)) {
      customer.last_order_date = order.createdAt;
    }
  }

  const customers = Array.from(customerMap.values()).sort((a, b) => b.lifetime_value - a.lifetime_value);

  return NextResponse.json({
    customers,
    total_customers: customers.length,
    repeat_customers: customers.filter((customer) => customer.total_orders > 1).length,
  });
}

async function getCustomerProfile(customerId: string) {
  const parsed = parseCustomerId(customerId);
  const allOrders = await fetchAllUnifiedOrders();
  const orders = allOrders.filter((order) => orderMatchesCustomer(order, parsed));

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  const totalOrders = orders.length;
  const completedOrders = orders.filter(isCompletedOrder).length;
  const totalSpent = orders.reduce((sum, order) => sum + order.paidAmountNok, 0);
  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  const productPreferencesMap = new Map<string, number>();
  for (const order of orders) {
    const key = getPreferenceLabel(order);
    productPreferencesMap.set(key, (productPreferencesMap.get(key) || 0) + 1);
  }

  const extrasOrdered = orders.reduce((acc, order) => {
    if (order.source !== 'pig') return acc;
    const extras = Array.isArray(order.metadata.order_extras)
      ? (order.metadata.order_extras as PigExtraRow[])
      : [];
    for (const extra of extras) {
      const name = String(extra.extras_catalog?.name_no || '').trim();
      if (!name) continue;
      if (!acc[name]) {
        acc[name] = { count: 0, total_spent: 0 };
      }
      acc[name].count += Number(extra.quantity || 0) || 1;
      const fallbackTotal = Number(extra.price_nok || extra.unit_price || 0) * (Number(extra.quantity || 0) || 1);
      const extraTotal = Number(extra.total_price ?? fallbackTotal);
      acc[name].total_spent += Number.isFinite(extraTotal) ? extraTotal : 0;
    }
    return acc;
  }, {} as Record<string, { count: number; total_spent: number }>);

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const earliestOrder = [...orders].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )[0];
  const latestOrder = sortedOrders[0];

  const bestName = sortedOrders.find((order) => order.customerName)?.customerName || 'Kunde';
  const bestEmail = sortedOrders.find((order) => isUsableEmail(order.customerEmail))?.customerEmail || '';
  const bestPhone = sortedOrders.find((order) => order.customerPhone)?.customerPhone || null;
  const pigOrderIds = sortedOrders.filter((order) => order.source === 'pig').map((order) => order.id);
  const eggOrderIds = sortedOrders.filter((order) => order.source === 'egg').map((order) => order.id);
  const chickenOrderIds = sortedOrders.filter((order) => order.source === 'chicken').map((order) => order.id);
  const communications = await fetchCommunicationHistory({
    email: bestEmail || undefined,
    phone: bestPhone || undefined,
    pigOrderIds,
    eggOrderIds,
    chickenOrderIds,
    limit: 300,
  });

  const profile = {
    customer_id: customerId,
    name: bestName,
    email: bestEmail,
    phone: bestPhone,
    first_order_date: earliestOrder?.createdAt,
    last_order_date: latestOrder?.createdAt,
    total_orders: totalOrders,
    completed_orders: completedOrders,
    total_spent: totalSpent,
    avg_order_value: Math.round(avgOrderValue),
    lifetime_value: totalSpent,
    product_preferences: Array.from(productPreferencesMap.entries())
      .map(([product, count]) => ({ product, count }))
      .sort((a, b) => b.count - a.count),
    favorite_extras: Object.entries(extrasOrdered)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count),
    orders: sortedOrders.map((order) => ({
      order_id: order.id,
      order_number: order.orderNumber,
      source: order.source,
      source_label: order.source === 'pig' ? 'Mangalitsa' : order.source === 'egg' ? 'Rugeegg' : 'Kyllinger',
      status: order.status,
      total_amount: order.displayAmountNok,
      paid_amount: order.paidAmountNok,
      created_at: order.createdAt,
      details: order.metadata,
    })),
    communications,
  };

  return NextResponse.json({ profile });
}

async function getOrderDetail(source: 'pig' | 'egg' | 'chicken', orderId: string) {
  if (source === 'pig') {
    const { data, error } = await supabaseAdmin
      .from('orders')
      .select(
        '*, mangalitsa_preset:mangalitsa_box_presets(*), payments(*), order_extras(*, extras_catalog(*))'
      )
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ source, order: data });
  }

  if (source === 'egg') {
    const { data, error } = await supabaseAdmin
      .from('egg_orders')
      .select(
        '*, egg_breeds(*), egg_inventory(*), egg_payments(*), egg_order_additions(*, egg_breeds(*), egg_inventory(*))'
      )
      .eq('id', orderId)
      .maybeSingle();
    if (error || !data) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }
    return NextResponse.json({ source, order: data });
  }

  const { data, error } = await supabaseAdmin
    .from('chicken_orders')
    .select(
      '*, chicken_breeds(*), chicken_hatches(*), chicken_payments(*), chicken_order_additions(*, chicken_breeds(*), chicken_hatches(*))'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  return NextResponse.json({ source, order: data });
}

async function getCustomerStats() {
  const unifiedOrders = await fetchAllUnifiedOrders();
  const customerKeys = new Set<string>();
  const customerOrderCount = new Map<string, number>();

  let totalRevenue = 0;
  for (const order of unifiedOrders) {
    const identity = resolveCustomerIdentity(order);
    customerKeys.add(identity.customerId);
    customerOrderCount.set(identity.customerId, (customerOrderCount.get(identity.customerId) || 0) + 1);
    totalRevenue += order.paidAmountNok;
  }

  const repeatCount = Array.from(customerOrderCount.values()).filter((count) => count > 1).length;
  const totalCustomers = customerKeys.size;
  const avgCustomerValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;

  return NextResponse.json({
    stats: {
      total_customers: totalCustomers,
      repeat_customers: repeatCount,
      repeat_rate: totalCustomers > 0 ? (repeatCount / totalCustomers) * 100 : 0,
      avg_customer_value: Math.round(avgCustomerValue),
      total_lifetime_value: totalRevenue,
    },
  });
}
