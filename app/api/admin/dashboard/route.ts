import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getEffectiveBoxSize, normalizeOrderForDisplay } from '@/lib/orders/display';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const lastLogin = searchParams.get('lastLogin');

    // Fetch all data in parallel
    const [
      pigResult,
      eggResult,
      chickenResult,
      messageResult,
      healthResult,
      calendarResult,
    ] = await Promise.all([
      fetchPigData(),
      fetchEggData(),
      fetchChickenData(),
      fetchMessageStats(),
      fetchHealthAlerts(),
      fetchUpcomingDates(),
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
      return !(o.shipping_name && o.shipping_phone && o.shipping_address && o.shipping_postal_code && o.shipping_city);
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
        count: messageResult.open + messageResult.in_progress,
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
    .select('id, status');

  if (error) {
    console.warn('Could not fetch messages:', error.message);
    return { total: 0, open: 0, in_progress: 0, resolved: 0 };
  }

  const messages = data || [];
  return {
    total: messages.length,
    open: messages.filter((m) => m.status === 'open').length,
    in_progress: messages.filter((m) => m.status === 'in_progress').length,
    resolved: messages.filter((m) => m.status === 'resolved').length,
  };
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
  const today = new Date().toISOString().split('T')[0];

  try {
    // Upcoming pig pickups
    const { data: pigOrders } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, delivery_type, marked_delivered_at')
      .not('status', 'in', '(cancelled,forfeited,draft,pending)')
      .is('marked_delivered_at', null);

    // Upcoming egg deliveries (Posten)
    const { data: eggPostenOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, delivery_method, delivery_monday, status')
      .eq('delivery_method', 'posten')
      .not('status', 'in', '(cancelled,forfeited,shipped,delivered)')
      .gte('delivery_monday', today)
      .order('delivery_monday', { ascending: true })
      .limit(5);

    // Upcoming egg pickups
    const { data: eggPickupOrders } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, delivery_method, delivery_monday, status')
      .neq('delivery_method', 'posten')
      .not('status', 'in', '(cancelled,forfeited,delivered)')
      .gte('delivery_monday', today)
      .order('delivery_monday', { ascending: true })
      .limit(5);

    const nextPickup = eggPickupOrders?.[0]?.delivery_monday || null;
    const nextSendout = eggPostenOrders?.[0]?.delivery_monday || null;

    return {
      nextPickup: nextPickup
        ? {
            date: nextPickup,
            orderCount: eggPickupOrders?.filter((o: any) => o.delivery_monday === nextPickup).length || 0,
          }
        : null,
      nextSendout: nextSendout
        ? {
            date: nextSendout,
            orderCount: eggPostenOrders?.filter((o: any) => o.delivery_monday === nextSendout).length || 0,
          }
        : null,
      pendingPigPickups: pigOrders?.length || 0,
    };
  } catch {
    return { nextPickup: null, nextSendout: null, pendingPigPickups: 0 };
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
