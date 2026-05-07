import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { isMissingEmailRelationError } from '@/lib/email/schema';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getEffectiveBoxSize, normalizeOrderForDisplay } from '@/lib/orders/display';
import { needsAdminAttention } from '@/lib/messages/admin-attention';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const lastLogin = searchParams.get('lastLogin');
    const eggWeekOffset = parseEggWeekOffset(searchParams.get('eggWeekOffset'));
    const section = searchParams.get('section');

    if (section === 'eggWeekTracker') {
      const eggWeekTracker = await fetchEggWeekTracker(eggWeekOffset);
      return NextResponse.json({ eggWeekTracker });
    }

    // Fetch all data in parallel
    const [
      pigResult,
      eggResult,
      chickenResult,
      messageResult,
      emailActivityResult,
      healthResult,
      calendarResult,
      eggWeekTrackerResult,
    ] = await Promise.all([
      fetchPigData(),
      fetchEggData(),
      fetchChickenData(),
      fetchMessageStats(),
      fetchEmailActivity(),
      fetchHealthAlerts(),
      fetchUpcomingDates(),
      fetchEggWeekTracker(eggWeekOffset),
    ]);

    // Build unified response
    const pigMetrics = calculateDashboardMetrics(pigResult);

    // Egg summary
    const eggOrders = eggResult;
    const eggActiveOrders = eggOrders.filter(
      (o: any) => !['cancelled', 'forfeited'].includes(o.status)
    );
    const eggFullyPaid = eggOrders.filter((o: any) => {
      const hasDeposit = (o.egg_payments || []).some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      );
      if (!hasDeposit) return false;
      const remainderPaid = (o.egg_payments || []).reduce((sum: number, p: any) => {
        if (p.payment_type !== 'remainder' || p.status !== 'completed') return sum;
        return sum + (p.amount_nok || 0) * 100;
      }, 0);
      return remainderPaid >= (o.remainder_amount || 0);
    });
    const eggUnpaidDeposits = eggOrders.filter((o: any) => {
      if (['cancelled', 'forfeited'].includes(o.status)) return false;
      return !(o.egg_payments || []).some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      );
    });
    const eggUnpaidRemainders = eggOrders.filter((o: any) => {
      if (['cancelled', 'forfeited'].includes(o.status)) return false;
      const hasDeposit = (o.egg_payments || []).some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      );
      if (!hasDeposit) return false;
      const remainderPaid = (o.egg_payments || []).reduce((sum: number, p: any) => {
        if (p.payment_type !== 'remainder' || p.status !== 'completed') return sum;
        return sum + (p.amount_nok || 0) * 100;
      }, 0);
      return remainderPaid < (o.remainder_amount || 0) && (o.remainder_amount || 0) > 0;
    });
    const eggRevenue = eggOrders.reduce((sum: number, o: any) => {
      return sum + (o.egg_payments || []).reduce((pSum: number, p: any) => {
        if (p.status !== 'completed') return pSum;
        return pSum + (p.amount_nok || 0);
      }, 0);
    }, 0);

    // Egg shipping missing (Posten orders not in terminal status missing fields)
    const eggShippingMissing = eggOrders.filter((o: any) => {
      if (o.delivery_method !== 'posten') return false;
      if (['shipped', 'delivered', 'cancelled', 'forfeited'].includes(o.status)) return false;
      const hasShippingName = Boolean(String(o.shipping_name || o.customer_name || '').trim());
      const hasShippingPhone = Boolean(String(o.shipping_phone || o.customer_phone || '').trim());
      const hasShippingAddress = Boolean(String(o.shipping_address || '').trim());
      const hasShippingPostalCode = Boolean(String(o.shipping_postal_code || '').trim());
      const hasShippingCity = Boolean(String(o.shipping_city || '').trim());
      return !(hasShippingName && hasShippingPhone && hasShippingAddress && hasShippingPostalCode && hasShippingCity);
    });

    // Egg ready-to-ship (fully paid + Posten delivery + not shipped/delivered)
    const eggReadyToShip = eggFullyPaid.filter((o: any) => {
      return o.delivery_method === 'posten' && !['shipped', 'delivered'].includes(o.status);
    });

    // Chicken summary
    const chickenOrders = chickenResult;
    const chickenActiveOrders = chickenOrders.filter(
      (o: any) => !['cancelled', 'forfeited'].includes(o.status)
    );

    // Action items
    const pigUnpaidDeposits = pigMetrics.outstanding_deposits;
    const pigUnpaidRemainders = pigMetrics.outstanding_remainders;
    const totalUnpaidCount = pigUnpaidDeposits.length + pigUnpaidRemainders.length +
      eggUnpaidDeposits.length + eggUnpaidRemainders.length;
    // NOTE: Pig amounts are stored in NOK, egg amounts are stored in ore.
    // Convert egg values to NOK before summing to avoid 100x inflated totals.
    const eggUnpaidDepositsNok = eggUnpaidDeposits.reduce(
      (sum: number, o: any) => sum + Number(o.deposit_amount || 0) / 100,
      0
    );
    const eggUnpaidRemaindersNok = eggUnpaidRemainders.reduce((sum: number, o: any) => {
      const remainderPaidOre = (o.egg_payments || []).reduce((pSum: number, p: any) => {
        if (p.payment_type !== 'remainder' || p.status !== 'completed') return pSum;
        return pSum + (p.amount_nok || 0) * 100;
      }, 0);
      const remainingOre = Math.max(0, Number(o.remainder_amount || 0) - remainderPaidOre);
      return sum + remainingOre / 100;
    }, 0);

    const totalUnpaidValue =
      pigMetrics.summary.outstanding_deposits_value +
      pigMetrics.summary.outstanding_remainders_value +
      eggUnpaidDepositsNok +
      eggUnpaidRemaindersNok;

    const actionItems = {
      unpaid: {
        count: totalUnpaidCount,
        value: totalUnpaidValue,
      },
      readyToShip: {
        count: eggReadyToShip.length,
      },
      unreadMessages: {
        count: messageResult.attention_required,
      },
      shippingMissing: {
        count: eggShippingMissing.length,
      },
    };

    // Key metrics
    const totalOrders = pigMetrics.summary.total_orders + eggActiveOrders.length + chickenActiveOrders.length;
    const totalRevenue = pigMetrics.summary.total_revenue + eggRevenue;

    const keyMetrics = {
      totalOrders,
      totalRevenue,
      avgOrderValue: pigMetrics.summary.avg_order_value,
      totalKgSold: pigMetrics.product_breakdown.total_kg,
    };

    // New orders since last login
    let newOrders: any[] = [];
    if (lastLogin) {
      const since = new Date(lastLogin);
      const recentPig = pigResult
        .filter((o: any) => new Date(o.created_at) > since)
        .map((o: any) => ({
          order_number: o.order_number,
          customer_name: o.customer_name,
          product_type: 'pig',
          amount: o.total_amount,
          created_at: o.created_at,
        }));
      const recentEgg = eggOrders
        .filter((o: any) => new Date(o.created_at) > since)
        .map((o: any) => ({
          order_number: o.order_number,
          customer_name: o.customer_name,
          product_type: 'egg',
          // egg order amounts are stored in ore
          amount: Number(o.total_amount || 0) / 100,
          created_at: o.created_at,
        }));
      const recentChicken = chickenOrders
        .filter((o: any) => new Date(o.created_at) > since)
        .map((o: any) => ({
          order_number: o.order_number,
          customer_name: o.customer_name,
          product_type: 'chicken',
          amount: o.total_amount_nok,
          created_at: o.created_at,
        }));
      newOrders = [...recentPig, ...recentEgg, ...recentChicken]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 10);
    }

    return NextResponse.json({
      pig: pigMetrics,
      egg: {
        total_orders: eggActiveOrders.length,
        revenue: eggRevenue,
        fully_paid: eggFullyPaid.length,
        unpaid_deposits: eggUnpaidDeposits.length,
        unpaid_remainders: eggUnpaidRemainders.length,
        shipping_missing: eggShippingMissing.length,
        ready_to_ship: eggReadyToShip.length,
      },
      chicken: {
        total_orders: chickenActiveOrders.length,
        active_hatches: chickenOrders.filter((o: any) => o.status === 'confirmed' || o.status === 'pending').length,
      },
      actionItems,
      keyMetrics,
      upcomingDates: calendarResult,
      eggWeekTracker: eggWeekTrackerResult,
      emailActivity: emailActivityResult,
      newOrders,
      messages: messageResult,
      healthAlerts: healthResult,
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}

function parseEggWeekOffset(raw: string | null) {
  const parsed = Number.parseInt(raw || '0', 10);

  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(-52, Math.min(52, parsed));
}

async function fetchPigData() {
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg),
      payments (*)
    `);

  if (error) throw error;
  return (orders || []).map((order) => normalizeOrderForDisplay(order));
}

async function fetchEggData() {
  const { data, error } = await supabaseAdmin
    .from('egg_orders')
    .select('*, egg_breeds(*), egg_payments(*), egg_order_additions(subtotal)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchChickenData() {
  const { data, error } = await supabaseAdmin
    .from('chicken_orders')
    .select('*, chicken_breeds(name), chicken_hatches(hatch_date), chicken_payments(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

async function fetchMessageStats() {
  const { data, error } = await supabaseAdmin
    .from('customer_messages')
    .select(`
      id,
      status,
      initiated_by,
      created_at,
      message_replies (
        created_at,
        is_internal,
        is_from_customer
      )
    `);

  if (error) {
    console.warn('Could not fetch messages:', error.message);
    return { total: 0, open: 0, in_progress: 0, resolved: 0, attention_required: 0 };
  }

  const messages = data || [];
  return {
    total: messages.length,
    open: messages.filter((m) => m.status === 'open').length,
    in_progress: messages.filter((m) => m.status === 'in_progress').length,
    resolved: messages.filter((m) => m.status === 'resolved').length,
    attention_required: messages.filter(needsAdminAttention).length,
  };
}

type DashboardEmailOrderSource = 'pig' | 'egg' | 'chicken';

type DashboardOrderLookup = {
  source: DashboardEmailOrderSource;
  id: string;
  orderNumber: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
};

type DashboardMessageLookup = {
  id: string;
  subject: string | null;
  customerName: string | null;
  customerEmail: string | null;
  customerPhone: string | null;
  relatedOrderSource: DashboardEmailOrderSource | null;
  relatedOrderId: string | null;
};

type DashboardFlowLookup = {
  templateKey: string | null;
  eventType: string | null;
  productScope: string | null;
};

type DashboardQueueLookup = {
  id: string;
  status: string | null;
  classification: string | null;
  toEmail: string | null;
  subject: string | null;
  templateKey: string | null;
  sourcePath: string | null;
  createdAt: string | null;
  campaignId: string | null;
  orderId: string | null;
  eggOrderId: string | null;
  chickenOrderId: string | null;
  customerMessageId: string | null;
};

type DashboardEmailItem = {
  id: string;
  status: string;
  classification: string;
  label: string;
  subject: string | null;
  templateKey: string | null;
  flowKey: string | null;
  toEmail: string | null;
  customerName: string | null;
  customerLookupId: string | null;
  scheduledFor: string | null;
  sentAt: string | null;
  createdAt: string | null;
  lastError: string | null;
  relatedOrderSource: DashboardEmailOrderSource | null;
  relatedOrderNumber: string | null;
  relatedMessageId: string | null;
  eventType: string | null;
  productScope: string | null;
  emailCenterTab: 'lifecycle' | 'queue' | 'history';
};

function uniqueStrings(values: Array<string | null | undefined>): string[] {
  const set = new Set<string>();

  for (const value of values) {
    const normalized = String(value || '').trim();
    if (!normalized) continue;
    set.add(normalized);
  }

  return Array.from(set);
}

function normalizeDashboardOrderSource(entityType?: string | null): DashboardEmailOrderSource | null {
  const normalized = String(entityType || '').trim().toLowerCase();

  if (normalized === 'order') return 'pig';
  if (normalized === 'egg_order') return 'egg';
  if (normalized === 'chicken_order') return 'chicken';

  return null;
}

function buildOrderLookupKey(source: DashboardEmailOrderSource, id: string) {
  return `${source}:${id}`;
}

function buildCustomerLookupId(params: {
  email?: string | null;
  phone?: string | null;
  orderNumber?: string | null;
}) {
  const email = String(params.email || '').trim();
  if (email) return email;

  const phone = String(params.phone || '').trim();
  if (phone) return phone;

  const orderNumber = String(params.orderNumber || '').trim();
  if (orderNumber) return orderNumber;

  return null;
}

function humanizeEmailKey(value?: string | null) {
  const normalized = String(value || '').trim();
  if (!normalized) return 'Email';

  return normalized
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

async function fetchDashboardOrderLookup(orderIds: {
  pig: string[];
  egg: string[];
  chicken: string[];
}) {
  const lookup = new Map<string, DashboardOrderLookup>();

  const [pigResult, eggResult, chickenResult] = await Promise.all([
    orderIds.pig.length > 0
      ? supabaseAdmin
          .from('orders')
          .select('id, order_number, customer_name, customer_email, customer_phone')
          .in('id', orderIds.pig)
      : Promise.resolve({ data: [], error: null }),
    orderIds.egg.length > 0
      ? supabaseAdmin
          .from('egg_orders')
          .select('id, order_number, customer_name, customer_email, customer_phone')
          .in('id', orderIds.egg)
      : Promise.resolve({ data: [], error: null }),
    orderIds.chicken.length > 0
      ? supabaseAdmin
          .from('chicken_orders')
          .select('id, order_number, customer_name, customer_email, customer_phone')
          .in('id', orderIds.chicken)
      : Promise.resolve({ data: [], error: null }),
  ]);

  for (const [source, result] of [
    ['pig', pigResult],
    ['egg', eggResult],
    ['chicken', chickenResult],
  ] as Array<[DashboardEmailOrderSource, { data: any[] | null; error: any }]>) {
    if (result.error) throw result.error;

    for (const row of result.data || []) {
      lookup.set(buildOrderLookupKey(source, String(row.id)), {
        source,
        id: String(row.id),
        orderNumber: row.order_number ? String(row.order_number) : null,
        customerName: row.customer_name ? String(row.customer_name) : null,
        customerEmail: row.customer_email ? String(row.customer_email) : null,
        customerPhone: row.customer_phone ? String(row.customer_phone) : null,
      });
    }
  }

  return lookup;
}

async function fetchDashboardMessageLookup(messageIds: string[]) {
  const lookup = new Map<string, DashboardMessageLookup>();
  if (messageIds.length === 0) return lookup;

  const { data, error } = await supabaseAdmin
    .from('customer_messages')
    .select('id, subject, customer_name, customer_email, customer_phone, related_order_source, related_order_id')
    .in('id', messageIds);

  if (error) throw error;

  for (const row of data || []) {
    lookup.set(String(row.id), {
      id: String(row.id),
      subject: row.subject ? String(row.subject) : null,
      customerName: row.customer_name ? String(row.customer_name) : null,
      customerEmail: row.customer_email ? String(row.customer_email) : null,
      customerPhone: row.customer_phone ? String(row.customer_phone) : null,
      relatedOrderSource: normalizeDashboardOrderSource(
        row.related_order_source === 'pig'
          ? 'order'
          : row.related_order_source === 'egg'
            ? 'egg_order'
            : row.related_order_source === 'chicken'
              ? 'chicken_order'
              : ''
      ),
      relatedOrderId: row.related_order_id ? String(row.related_order_id) : null,
    });
  }

  return lookup;
}

async function fetchDashboardFlowLookup(flowKeys: string[]) {
  const lookup = new Map<string, DashboardFlowLookup>();
  if (flowKeys.length === 0) return lookup;

  const { data, error } = await supabaseAdmin
    .from('email_flows')
    .select('flow_key, template_key, event_type, product_scope')
    .in('flow_key', flowKeys);

  if (error) throw error;

  for (const row of data || []) {
    lookup.set(String(row.flow_key), {
      templateKey: row.template_key ? String(row.template_key) : null,
      eventType: row.event_type ? String(row.event_type) : null,
      productScope: row.product_scope ? String(row.product_scope) : null,
    });
  }

  return lookup;
}

async function fetchDashboardQueueLookup(queueIds: string[]) {
  const lookup = new Map<string, DashboardQueueLookup>();
  if (queueIds.length === 0) return lookup;

  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select(
      'id, status, classification, to_email, subject, template_key, source_path, created_at, campaign_id, order_id, egg_order_id, chicken_order_id, customer_message_id'
    )
    .in('id', queueIds);

  if (error) throw error;

  for (const row of data || []) {
    lookup.set(String(row.id), {
      id: String(row.id),
      status: row.status ? String(row.status) : null,
      classification: row.classification ? String(row.classification) : null,
      toEmail: row.to_email ? String(row.to_email) : null,
      subject: row.subject ? String(row.subject) : null,
      templateKey: row.template_key ? String(row.template_key) : null,
      sourcePath: row.source_path ? String(row.source_path) : null,
      createdAt: row.created_at ? String(row.created_at) : null,
      campaignId: row.campaign_id ? String(row.campaign_id) : null,
      orderId: row.order_id ? String(row.order_id) : null,
      eggOrderId: row.egg_order_id ? String(row.egg_order_id) : null,
      chickenOrderId: row.chicken_order_id ? String(row.chicken_order_id) : null,
      customerMessageId: row.customer_message_id ? String(row.customer_message_id) : null,
    });
  }

  return lookup;
}

function resolveDashboardOrderRef(params: {
  sourceFromEntity?: DashboardEmailOrderSource | null;
  idFromEntity?: string | null;
  queue?: DashboardQueueLookup | null;
  message?: DashboardMessageLookup | null;
}) {
  if (params.queue?.orderId) {
    return { source: 'pig' as const, id: params.queue.orderId };
  }
  if (params.queue?.eggOrderId) {
    return { source: 'egg' as const, id: params.queue.eggOrderId };
  }
  if (params.queue?.chickenOrderId) {
    return { source: 'chicken' as const, id: params.queue.chickenOrderId };
  }
  if (params.message?.relatedOrderSource && params.message.relatedOrderId) {
    return { source: params.message.relatedOrderSource, id: params.message.relatedOrderId };
  }
  if (params.sourceFromEntity && params.idFromEntity) {
    return { source: params.sourceFromEntity, id: params.idFromEntity };
  }

  return { source: null, id: null };
}

async function fetchEmailActivity() {
  const emptyResult = {
    upcomingWeek: [] as DashboardEmailItem[],
    sentLastWeek: [] as DashboardEmailItem[],
    counts: {
      upcomingWeek: 0,
      sentLastWeek: 0,
    },
  };

  const now = new Date();
  const nowIso = now.toISOString();
  const nextWeekIso = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const weekAgoIso = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

  try {
    let upcomingRows: any[] = [];
    let sentRows: any[] = [];
    let upcomingCount = 0;
    let sentCount = 0;

    const [upcomingCountResult, sentCountResult] = await Promise.all([
      supabaseAdmin
        .from('email_flow_instances')
        .select('id', { count: 'exact', head: true })
        .in('status', ['scheduled', 'enqueued'])
        .gte('scheduled_for', nowIso)
        .lte('scheduled_for', nextWeekIso),
      supabaseAdmin
        .from('email_dispatch_queue')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'sent')
        .gte('sent_at', weekAgoIso)
        .lte('sent_at', nowIso),
    ]);

    if (!upcomingCountResult.error) {
      upcomingCount = Number(upcomingCountResult.count || 0);
    } else if (!isMissingEmailRelationError(upcomingCountResult.error)) {
      throw upcomingCountResult.error;
    }

    if (!sentCountResult.error) {
      sentCount = Number(sentCountResult.count || 0);
    } else if (!isMissingEmailRelationError(sentCountResult.error)) {
      throw sentCountResult.error;
    }

    const upcomingResult = await supabaseAdmin
      .from('email_flow_instances')
      .select('id, flow_key, entity_type, entity_id, status, to_email, scheduled_for, created_at, last_error, queue_id')
      .in('status', ['scheduled', 'enqueued'])
      .gte('scheduled_for', nowIso)
      .lte('scheduled_for', nextWeekIso)
      .order('scheduled_for', { ascending: true })
      .limit(12);

    if (upcomingResult.error) {
      if (!isMissingEmailRelationError(upcomingResult.error)) {
        throw upcomingResult.error;
      }
    } else {
      upcomingRows = upcomingResult.data || [];
    }

    const sentResult = await supabaseAdmin
      .from('email_dispatch_queue')
      .select(
        'id, status, classification, to_email, template_key, subject, source_path, sent_at, created_at, last_error, order_id, egg_order_id, chicken_order_id, customer_message_id'
      )
      .eq('status', 'sent')
      .gte('sent_at', weekAgoIso)
      .lte('sent_at', nowIso)
      .order('sent_at', { ascending: false })
      .limit(12);

    if (sentResult.error) {
      if (!isMissingEmailRelationError(sentResult.error)) {
        throw sentResult.error;
      }

      const legacyResult = await supabaseAdmin
        .from('email_log')
        .select('id, recipient, subject, sent_at, created_at, order_id')
        .gte('sent_at', weekAgoIso)
        .lte('sent_at', nowIso)
        .order('sent_at', { ascending: false })
        .limit(12);

      if (legacyResult.error && !isMissingEmailRelationError(legacyResult.error)) {
        throw legacyResult.error;
      }

      sentRows = (legacyResult.data || []).map((row: any) => ({
        id: row.id,
        status: 'sent',
        classification: 'system',
        to_email: row.recipient,
        template_key: null,
        subject: row.subject,
        source_path: 'legacy.email_log',
        sent_at: row.sent_at || row.created_at,
        created_at: row.created_at,
        last_error: null,
        order_id: row.order_id,
        egg_order_id: null,
        chicken_order_id: null,
        customer_message_id: null,
      }));
      sentCount = sentRows.length;
    } else {
      sentRows = sentResult.data || [];
    }

    const flowLookup = await fetchDashboardFlowLookup(
      uniqueStrings(upcomingRows.map((row: any) => row.flow_key))
    );

    const queueLookup = await fetchDashboardQueueLookup(
      uniqueStrings(upcomingRows.map((row: any) => row.queue_id))
    );

    const messageLookup = await fetchDashboardMessageLookup(
      uniqueStrings(
        sentRows.map((row: any) => row.customer_message_id).concat(
          Array.from(queueLookup.values()).map((row) => row.customerMessageId)
        )
      )
    );

    const orderIds = {
      pig: [] as string[],
      egg: [] as string[],
      chicken: [] as string[],
    };

    for (const row of sentRows) {
      if (row.order_id) orderIds.pig.push(String(row.order_id));
      if (row.egg_order_id) orderIds.egg.push(String(row.egg_order_id));
      if (row.chicken_order_id) orderIds.chicken.push(String(row.chicken_order_id));

      const message = row.customer_message_id ? messageLookup.get(String(row.customer_message_id)) : null;
      if (message?.relatedOrderSource && message.relatedOrderId) {
        orderIds[message.relatedOrderSource].push(message.relatedOrderId);
      }
    }

    for (const row of upcomingRows) {
      const entitySource = normalizeDashboardOrderSource(row.entity_type);
      const entityId = row.entity_id ? String(row.entity_id) : null;
      if (entitySource && entityId) {
        orderIds[entitySource].push(entityId);
      }

      const queue = row.queue_id ? queueLookup.get(String(row.queue_id)) : null;
      if (queue?.orderId) orderIds.pig.push(queue.orderId);
      if (queue?.eggOrderId) orderIds.egg.push(queue.eggOrderId);
      if (queue?.chickenOrderId) orderIds.chicken.push(queue.chickenOrderId);

      const message = queue?.customerMessageId ? messageLookup.get(queue.customerMessageId) : null;
      if (message?.relatedOrderSource && message.relatedOrderId) {
        orderIds[message.relatedOrderSource].push(message.relatedOrderId);
      }
    }

    const orderLookup = await fetchDashboardOrderLookup({
      pig: uniqueStrings(orderIds.pig),
      egg: uniqueStrings(orderIds.egg),
      chicken: uniqueStrings(orderIds.chicken),
    });

    const upcomingWeek = upcomingRows.map((row: any) => {
      const entitySource = normalizeDashboardOrderSource(row.entity_type);
      const entityId = row.entity_id ? String(row.entity_id) : null;
      const queue = row.queue_id ? queueLookup.get(String(row.queue_id)) || null : null;
      const message = queue?.customerMessageId ? messageLookup.get(queue.customerMessageId) || null : null;
      const orderRef = resolveDashboardOrderRef({
        sourceFromEntity: entitySource,
        idFromEntity: entityId,
        queue,
        message,
      });
      const order =
        orderRef.source && orderRef.id ? orderLookup.get(buildOrderLookupKey(orderRef.source, orderRef.id)) || null : null;

      const customerName =
        order?.customerName ||
        message?.customerName ||
        null;
      const customerEmail =
        queue?.toEmail ||
        (row.to_email ? String(row.to_email) : null) ||
        order?.customerEmail ||
        message?.customerEmail ||
        null;
      const customerPhone = order?.customerPhone || message?.customerPhone || null;

      const templateKey = queue?.templateKey || flowLookup.get(String(row.flow_key || ''))?.templateKey || null;
      const label = queue?.subject || humanizeEmailKey(templateKey || row.flow_key);

      return {
        id: String(row.id),
        status: String(row.status || 'scheduled'),
        classification: queue?.classification || 'system',
        label,
        subject: queue?.subject || null,
        templateKey,
        flowKey: row.flow_key ? String(row.flow_key) : null,
        toEmail: customerEmail,
        customerName,
        customerLookupId: buildCustomerLookupId({
          email: customerEmail,
          phone: customerPhone,
          orderNumber: order?.orderNumber,
        }),
        scheduledFor: row.scheduled_for ? String(row.scheduled_for) : null,
        sentAt: null,
        createdAt: queue?.createdAt || (row.created_at ? String(row.created_at) : null),
        lastError: row.last_error ? String(row.last_error) : null,
        relatedOrderSource: orderRef.source,
        relatedOrderNumber: order?.orderNumber || null,
        relatedMessageId: queue?.customerMessageId || null,
        eventType: flowLookup.get(String(row.flow_key || ''))?.eventType || null,
        productScope: flowLookup.get(String(row.flow_key || ''))?.productScope || orderRef.source || null,
        emailCenterTab: row.queue_id ? 'queue' : 'lifecycle',
      } satisfies DashboardEmailItem;
    });

    const sentLastWeek = sentRows.map((row: any) => {
      const message = row.customer_message_id ? messageLookup.get(String(row.customer_message_id)) || null : null;
      const orderRef = resolveDashboardOrderRef({
        sourceFromEntity: row.order_id ? 'pig' : row.egg_order_id ? 'egg' : row.chicken_order_id ? 'chicken' : null,
        idFromEntity:
          row.order_id ? String(row.order_id) : row.egg_order_id ? String(row.egg_order_id) : row.chicken_order_id ? String(row.chicken_order_id) : null,
        message,
      });
      const order =
        orderRef.source && orderRef.id ? orderLookup.get(buildOrderLookupKey(orderRef.source, orderRef.id)) || null : null;
      const customerEmail =
        row.to_email ? String(row.to_email) : order?.customerEmail || message?.customerEmail || null;
      const customerPhone = order?.customerPhone || message?.customerPhone || null;
      const customerName = order?.customerName || message?.customerName || null;
      const templateKey = row.template_key ? String(row.template_key) : null;

      return {
        id: String(row.id),
        status: String(row.status || 'sent'),
        classification: row.classification ? String(row.classification) : 'system',
        label: row.subject ? String(row.subject) : humanizeEmailKey(templateKey || row.source_path),
        subject: row.subject ? String(row.subject) : null,
        templateKey,
        flowKey: null,
        toEmail: customerEmail,
        customerName,
        customerLookupId: buildCustomerLookupId({
          email: customerEmail,
          phone: customerPhone,
          orderNumber: order?.orderNumber,
        }),
        scheduledFor: null,
        sentAt: row.sent_at ? String(row.sent_at) : null,
        createdAt: row.created_at ? String(row.created_at) : null,
        lastError: row.last_error ? String(row.last_error) : null,
        relatedOrderSource: orderRef.source,
        relatedOrderNumber: order?.orderNumber || null,
        relatedMessageId: row.customer_message_id ? String(row.customer_message_id) : null,
        eventType: null,
        productScope: orderRef.source,
        emailCenterTab: 'history',
      } satisfies DashboardEmailItem;
    });

    return {
      upcomingWeek,
      sentLastWeek,
      counts: {
        upcomingWeek: upcomingCount || upcomingWeek.length,
        sentLastWeek: sentCount || sentLastWeek.length,
      },
    };
  } catch (error: any) {
    if (!isMissingEmailRelationError(error)) {
      console.warn('Could not build dashboard email activity:', error?.message || error);
    }
    return emptyResult;
  }
}

async function fetchHealthAlerts() {
  const alerts: Array<{ level: 'warning' | 'error'; message: string }> = [];

  try {
    // Check inventory utilization
    const { data: config } = await supabaseAdmin
      .from('config')
      .select('key, value')
      .in('key', ['max_kg_available']);

    const maxKg = parseInt(config?.find((c) => c.key === 'max_kg_available')?.value || '0');

    if (maxKg > 0) {
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('box_size, status, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)')
        .not('status', 'eq', 'cancelled');

      const allocatedKg = orders?.reduce((sum, o) => sum + getEffectiveBoxSize(o), 0) || 0;
      const remaining = maxKg - allocatedKg;

      if (remaining <= 0) {
        alerts.push({ level: 'error', message: 'Grislager er fullt – lukk bestillinger' });
      } else if (remaining < 100) {
        alerts.push({ level: 'warning', message: `Kun ${remaining} kg gris igjen` });
      }
    }

    // Check for stuck payments (older than 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: stuckOrders } = await supabaseAdmin
      .from('orders')
      .select('id')
      .eq('status', 'draft')
      .lt('created_at', sevenDaysAgo);

    if (stuckOrders && stuckOrders.length > 0) {
      alerts.push({
        level: 'warning',
        message: `${stuckOrders.length} grisbestilling(er) venter på forskudd i over 7 dager`,
      });
    }
  } catch {
    // Health alerts are non-critical
  }

  return alerts;
}

async function fetchUpcomingDates() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];

  // Current week Monday→Sunday + next week Monday→Sunday
  const dayOfWeek = now.getDay(); // 0=Sun,1=Mon,...
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + mondayOffset);
  const thisSunday = new Date(thisMonday);
  thisSunday.setDate(thisMonday.getDate() + 6);
  const nextMonday = new Date(thisMonday);
  nextMonday.setDate(thisMonday.getDate() + 7);
  const nextSunday = new Date(nextMonday);
  nextSunday.setDate(nextMonday.getDate() + 6);

  // Query range covers both weeks
  const weekStartStr = thisMonday.toISOString().split('T')[0];
  const weekEndStr = nextSunday.toISOString().split('T')[0];
  const nextWeekStartStr = nextMonday.toISOString().split('T')[0];

  // Tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  try {
    // Pig orders pending pickup (no specific date, just undelivered)
    const { data: pigOrders } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, delivery_type, status, pickup_date, pickup_time')
      .not('status', 'in', '(cancelled,forfeited,draft,pending)')
      .is('marked_delivered_at', null);

    // Egg orders this week — shipping (Posten)
    const { data: eggPostenOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, delivery_method, delivery_monday, status, pickup_date, pickup_time')
      .eq('delivery_method', 'posten')
      .not('status', 'in', '(cancelled,forfeited,delivered,shipped,pending)')
      .gte('delivery_monday', weekStartStr)
      .lte('delivery_monday', weekEndStr)
      .order('delivery_monday', { ascending: true });

    // Egg orders this week — pickup
    const { data: eggPickupOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, delivery_method, delivery_monday, status, pickup_date, pickup_time')
      .neq('delivery_method', 'posten')
      .not('status', 'in', '(cancelled,forfeited,delivered)')
      .gte('delivery_monday', weekStartStr)
      .lte('delivery_monday', weekEndStr)
      .order('delivery_monday', { ascending: true });

    // Chicken orders this week
    const { data: chickenOrders } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, customer_name, delivery_method, pickup_monday, status, pickup_date, pickup_time')
      .not('status', 'in', '(cancelled,forfeited,picked_up)')
      .gte('pickup_monday', weekStartStr)
      .lte('pickup_monday', weekEndStr)
      .order('pickup_monday', { ascending: true });

    // Helper to format order for response
    const formatOrder = (o: any, type: 'egg' | 'chicken' | 'pig') => ({
      id: o.id,
      order_number: o.order_number,
      customer_name: o.customer_name || '',
      delivery_method: o.delivery_method || o.delivery_type || '',
      status: o.status,
      pickup_date: o.pickup_date || o.pickup_monday || o.delivery_monday || null,
      pickup_time: o.pickup_time || null,
      type,
    });

    // Group by date helper
    const groupByDate = (orders: any[], dateField: string, type: 'egg' | 'chicken') => {
      const groups: Record<string, any[]> = {};
      for (const o of orders || []) {
        const date = o[dateField];
        if (!date) continue;
        if (!groups[date]) groups[date] = [];
        groups[date].push(formatOrder(o, type));
      }
      return Object.entries(groups)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, orders]) => ({ date, orders }));
    };

    // Pickups: egg pickups + chicken pickups (by date)
    const eggPickupGroups = groupByDate(eggPickupOrders || [], 'delivery_monday', 'egg');
    const chickenPickupGroups = groupByDate(
      (chickenOrders || []).filter((o: any) => o.delivery_method !== 'delivery_namsos_trondheim'),
      'pickup_monday',
      'chicken'
    );
    // Merge pickup groups by date
    const pickupMap: Record<string, any[]> = {};
    for (const g of [...eggPickupGroups, ...chickenPickupGroups]) {
      if (!pickupMap[g.date]) pickupMap[g.date] = [];
      pickupMap[g.date].push(...g.orders);
    }
    // Split pickups into this week / next week
    const splitByWeek = (map: Record<string, any[]>) => {
      const thisWeek: Array<{ date: string; orders: any[] }> = [];
      const nextWeek: Array<{ date: string; orders: any[] }> = [];
      for (const [date, orders] of Object.entries(map).sort(([a], [b]) => a.localeCompare(b))) {
        if (date < nextWeekStartStr) {
          thisWeek.push({ date, orders });
        } else {
          nextWeek.push({ date, orders });
        }
      }
      return { thisWeek, nextWeek };
    };

    const pickupWeeks = splitByWeek(pickupMap);

    // Shipments: egg posten + chicken delivery
    const eggShipmentGroups = groupByDate(eggPostenOrders || [], 'delivery_monday', 'egg');
    const chickenShipmentGroups = groupByDate(
      (chickenOrders || []).filter((o: any) => o.delivery_method === 'delivery_namsos_trondheim'),
      'pickup_monday',
      'chicken'
    );
    const shipmentMap: Record<string, any[]> = {};
    for (const g of [...eggShipmentGroups, ...chickenShipmentGroups]) {
      if (!shipmentMap[g.date]) shipmentMap[g.date] = [];
      shipmentMap[g.date].push(...g.orders);
    }
    const shipmentWeeks = splitByWeek(shipmentMap);

    // Pending pig pickups (individual orders, no date)
    const pendingPigPickups = (pigOrders || []).map((o: any) => formatOrder(o, 'pig'));

    return {
      pickups: { thisWeek: pickupWeeks.thisWeek, nextWeek: pickupWeeks.nextWeek },
      shipments: { thisWeek: shipmentWeeks.thisWeek, nextWeek: shipmentWeeks.nextWeek },
      pendingPigPickups,
    };
  } catch {
    return {
      pickups: { thisWeek: [], nextWeek: [] },
      shipments: { thisWeek: [], nextWeek: [] },
      pendingPigPickups: [],
    };
  }
}

async function fetchEggWeekTracker(weekOffset = 0) {
  try {
    // Date math — Oslo timezone for "today"
    const osloNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Oslo' }));
    const trackerDate = new Date(osloNow);

    // Keep the previous operational egg week visible through all of Monday.
    if (osloNow.getDay() === 1) {
      trackerDate.setDate(trackerDate.getDate() - 1);
    }

    // ISO week: Monday = start
    const dayOfWeek = trackerDate.getDay(); // 0=Sun,1=Mon,...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const thisMonday = new Date(trackerDate);
    thisMonday.setDate(trackerDate.getDate() + mondayOffset);
    thisMonday.setDate(thisMonday.getDate() + (weekOffset * 7));
    const thisSunday = new Date(thisMonday);
    thisSunday.setDate(thisMonday.getDate() + 6);
    const nextMonday = new Date(thisMonday);
    nextMonday.setDate(thisMonday.getDate() + 7);

    const fmt = (d: Date) => [
      d.getFullYear(),
      String(d.getMonth() + 1).padStart(2, '0'),
      String(d.getDate()).padStart(2, '0'),
    ].join('-');

    const thisMondayStr = fmt(thisMonday);
    const nextMondayStr = fmt(nextMonday);

    // ISO week number
    const target = new Date(Date.UTC(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate()));
    const dayNum = target.getUTCDay() || 7;
    target.setUTCDate(target.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
    const weekNumber = Math.ceil((((target.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);

    const collectionStarted = trackerDate >= thisMonday;
    const collectionComplete = trackerDate > thisSunday;
    const collectionEndDate = collectionStarted
      ? new Date(collectionComplete ? thisSunday : trackerDate)
      : null;
    const collectionEndStr = collectionEndDate ? fmt(collectionEndDate) : null;

    // Days collected (Mon=1 through the viewed week's collection day index)
    const dayIndex = dayOfWeek === 0 ? 7 : dayOfWeek; // Mon=1..Sun=7
    const daysCollected = !collectionStarted ? 0 : collectionComplete ? 7 : dayIndex;
    const daysRemaining = 7 - daysCollected;

    // 4 parallel queries (orders + additions combined in one query)
    const [ordersWithAdditionsRes, collectedRes, forecastRes, breedsRes] = await Promise.all([
      // 1. Egg orders for next Monday delivery, with their additions
      supabaseAdmin
        .from('egg_orders')
        .select('breed_id, quantity, egg_order_additions(breed_id, quantity)')
        .eq('delivery_monday', nextMondayStr)
        .not('status', 'in', '(cancelled,forfeited)'),

      // 2. Eggs collected in the viewed week (Mon through the current collection end)
      collectionEndStr
        ? supabaseAdmin
            .from('egg_daily_collections')
            .select('breed_id, sellable_standard')
            .gte('collection_date', thisMondayStr)
            .lte('collection_date', collectionEndStr)
        : Promise.resolve({ data: [], error: null }),

      // 3. Forecast for this collection week (keyed by delivery_monday = next Monday)
      supabaseAdmin
        .from('egg_weekly_forecasts')
        .select('breed_id, forecast_eggs')
        .eq('delivery_monday', nextMondayStr),

      // 4. Active breeds for names and colors
      supabaseAdmin
        .from('egg_breeds')
        .select('id, name, accent_color')
        .eq('active', true)
        .order('display_order', { ascending: true }),
    ]);

    // Build breed lookup
    const breedMap = new Map<string, { name: string; accentColor: string }>();
    for (const b of breedsRes.data || []) {
      breedMap.set(b.id, { name: b.name, accentColor: b.accent_color || '#6b7280' });
    }

    // Aggregate orders by breed (base quantity + additions)
    const ordersByBreed = new Map<string, number>();
    for (const o of ordersWithAdditionsRes.data || []) {
      // Base order quantity
      ordersByBreed.set(o.breed_id, (ordersByBreed.get(o.breed_id) || 0) + (o.quantity || 0));
      // Addition quantities (each addition has its own breed_id)
      const additions = (o as any).egg_order_additions || [];
      for (const a of additions) {
        ordersByBreed.set(a.breed_id, (ordersByBreed.get(a.breed_id) || 0) + (a.quantity || 0));
      }
    }

    // Aggregate collected by breed
    const collectedByBreed = new Map<string, number>();
    for (const c of collectedRes.data || []) {
      collectedByBreed.set(c.breed_id, (collectedByBreed.get(c.breed_id) || 0) + (c.sellable_standard || 0));
    }

    // Forecast by breed
    const forecastByBreed = new Map<string, number>();
    for (const f of forecastRes.data || []) {
      forecastByBreed.set(f.breed_id, f.forecast_eggs || 0);
    }

    // Collect all breed IDs that appear in any dataset
    const allBreedIds = new Set(
      Array.from(ordersByBreed.keys())
        .concat(Array.from(collectedByBreed.keys()))
        .concat(Array.from(forecastByBreed.keys()))
    );

    // Build per-breed array
    const breeds: Array<{
      breedName: string;
      accentColor: string;
      orders: number;
      collected: number;
      forecast: number;
    }> = [];

    let ordersTotal = 0;
    let collectedTotal = 0;
    let forecastTotal = 0;

    // Sort breeds by display order (iterate active breeds first, then any extras)
    const sortedBreedIds: string[] = [];
    for (const b of breedsRes.data || []) {
      if (allBreedIds.has(b.id)) {
        sortedBreedIds.push(b.id);
        allBreedIds.delete(b.id);
      }
    }
    // Add any remaining breeds not in the active list
    const remainingIds = Array.from(allBreedIds);
    for (const id of remainingIds) {
      sortedBreedIds.push(id);
    }

    for (const breedId of sortedBreedIds) {
      const info = breedMap.get(breedId) || { name: 'Ukjent', accentColor: '#6b7280' };
      const orders = ordersByBreed.get(breedId) || 0;
      const collected = collectedByBreed.get(breedId) || 0;
      const forecast = forecastByBreed.get(breedId) || 0;

      ordersTotal += orders;
      collectedTotal += collected;
      forecastTotal += forecast;

      breeds.push({
        breedName: info.name,
        accentColor: info.accentColor,
        orders,
        collected,
        forecast,
      });
    }

    // Day abbreviations for collection window label
    const dayAbbrevNo = ['son', 'man', 'tir', 'ons', 'tor', 'fre', 'lor'];
    const collectionDayOfWeek = collectionEndDate?.getDay() ?? 1;
    const collectionDayIndex = collectionDayOfWeek === 0 ? 7 : collectionDayOfWeek;
    const collectionDayAbbrev = dayAbbrevNo[collectionDayOfWeek] || 'i dag';
    const collectionWindow = !collectionStarted
      ? 'ikke startet'
      : collectionComplete
        ? 'man\u2013son'
        : collectionDayIndex <= 1
          ? 'man'
          : `man\u2013${collectionDayAbbrev}`;

    // Format week range for display
    const fmtShort = (d: Date) => `${d.getDate()}. ${['jan','feb','mar','apr','mai','jun','jul','aug','sep','okt','nov','des'][d.getMonth()]}`;
    const weekRange = `${fmtShort(thisMonday)} \u2013 ${fmtShort(thisSunday)}`;

    return {
      weekLabel: `Uke ${weekNumber}`,
      weekRange,
      collectionWindow,
      daysCollected,
      daysRemaining,
      nextMonday: nextMondayStr,
      ordersTotal,
      collectedTotal,
      forecastTotal,
      missingNow: ordersTotal - collectedTotal,
      predictedEndOfWeek: ordersTotal - forecastTotal,
      breeds,
    };
  } catch (err) {
    console.error('Failed to fetch egg week tracker:', err);
    return null;
  }
}

function calculateDashboardMetrics(orders: any[]) {
  // Payment tracking
  const outstandingDeposits = orders.filter(
    (o) => o.status === 'draft' && !o.payments?.some((p: any) => p.payment_type === 'deposit' && p.status === 'completed')
  );

  const outstandingRemainders = orders.filter(
    (o) => ['deposit_paid', 'paid'].includes(o.status) &&
    !o.payments?.some((p: any) => p.payment_type === 'remainder' && p.status === 'completed')
  );

  // Revenue calculations
  const totalRevenue = orders.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    return sum + completedPayments.reduce((pSum: number, p: any) => pSum + p.amount_nok, 0);
  }, 0);

  const totalDepositRevenue = orders.reduce((sum, order) => {
    const depositPayment = order.payments?.find((p: any) => p.payment_type === 'deposit' && p.status === 'completed');
    return sum + (depositPayment?.amount_nok || 0);
  }, 0);

  const totalRemainderRevenue = orders.reduce((sum, order) => {
    const remainderPayment = order.payments?.find((p: any) => p.payment_type === 'remainder' && p.status === 'completed');
    return sum + (remainderPayment?.amount_nok || 0);
  }, 0);

  // Order status breakdown
  const statusCounts = orders.reduce((acc, order) => {
    acc[order.status] = (acc[order.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Product breakdown
  const boxCounts: Record<string, number> = {};
  let totalKg = 0;
  for (const order of orders) {
    const size = getEffectiveBoxSize(order);
    if (!size) continue;
    totalKg += size;
    const presetName = order.display_box_name_no || order.mangalitsa_preset?.name_no;
    const key = presetName ? `${presetName} (${size} kg)` : `${size} kg`;
    boxCounts[key] = (boxCounts[key] || 0) + 1;
  }

  const productBreakdown = {
    box_counts: boxCounts,
    total_kg: totalKg,
  };

  // Mangalitsa-specific aggregation
  const mangalitsaOrders = orders.filter((o: any) => o.is_mangalitsa || o.mangalitsa_preset_id);
  const mangalitsaRevenue = mangalitsaOrders.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    return sum + completedPayments.reduce((pSum: number, p: any) => pSum + p.amount_nok, 0);
  }, 0);
  const presetBreakdown: Record<string, number> = {};
  for (const order of mangalitsaOrders) {
    const name = order.display_box_name_no || order.mangalitsa_preset?.name_no || 'Ukjent';
    presetBreakdown[name] = (presetBreakdown[name] || 0) + 1;
  }

  // Delivery type breakdown
  const deliveryBreakdown = orders.reduce((acc, order) => {
    acc[order.delivery_type] = (acc[order.delivery_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Ribbe choice breakdown
  const ribbeBreakdown = orders.reduce((acc, order) => {
    if (order.ribbe_choice) {
      acc[order.ribbe_choice] = (acc[order.ribbe_choice] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Extras aggregation
  const extrasAggregation = orders.reduce((acc, order) => {
    if (order.extra_products && Array.isArray(order.extra_products)) {
      order.extra_products.forEach((extra: any) => {
        if (!acc[extra.slug]) {
          acc[extra.slug] = {
            name: extra.name,
            total_quantity: 0,
            total_revenue: 0,
          };
        }
        acc[extra.slug].total_quantity += extra.quantity;
        const extraRev = extra.total_price ?? (extra.price_nok ? extra.price_nok * (extra.quantity ?? 1) : 0);
        acc[extra.slug].total_revenue += extraRev;
      });
    }
    return acc;
  }, {} as Record<string, any>);

  // Average order value
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Payment completion rates
  const depositCompletionRate = orders.length > 0
    ? (orders.filter((o) => o.payments?.some((p: any) => p.payment_type === 'deposit' && p.status === 'completed')).length / orders.length) * 100
    : 0;

  const remainderCompletionRate = orders.filter((o) => o.status !== 'draft').length > 0
    ? (orders.filter((o) => o.payments?.some((p: any) => p.payment_type === 'remainder' && p.status === 'completed')).length /
       orders.filter((o) => o.status !== 'draft').length) * 100
    : 0;

  return {
    summary: {
      total_orders: orders.length,
      total_revenue: totalRevenue,
      total_deposit_revenue: totalDepositRevenue,
      total_remainder_revenue: totalRemainderRevenue,
      avg_order_value: Math.round(avgOrderValue),
      outstanding_deposits_count: outstandingDeposits.length,
      outstanding_remainders_count: outstandingRemainders.length,
      outstanding_deposits_value: outstandingDeposits.reduce((sum, o) => sum + o.deposit_amount, 0),
      outstanding_remainders_value: outstandingRemainders.reduce((sum, o) => sum + o.remainder_amount, 0),
    },
    status_breakdown: statusCounts,
    product_breakdown: productBreakdown,
    delivery_breakdown: deliveryBreakdown,
    ribbe_breakdown: ribbeBreakdown,
    extras_aggregation: extrasAggregation,
    completion_rates: {
      deposit: Math.round(depositCompletionRate),
      remainder: Math.round(remainderCompletionRate),
    },
    outstanding_deposits: outstandingDeposits.map((o) => ({
      order_number: o.order_number,
      customer_name: o.customer_name,
      deposit_amount: o.deposit_amount,
      created_at: o.created_at,
    })),
    outstanding_remainders: outstandingRemainders.map((o) => ({
      order_number: o.order_number,
      customer_name: o.customer_name,
      remainder_amount: o.remainder_amount,
      status: o.status,
    })),
    mangalitsa: {
      total_orders: mangalitsaOrders.length,
      revenue: mangalitsaRevenue,
      preset_breakdown: Object.entries(presetBreakdown).map(([name, count]) => ({ name, count })),
    },
  };
}
