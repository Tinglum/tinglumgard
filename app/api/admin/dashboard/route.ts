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
    // Fetch all orders with payments
    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg),
        payments (*)
      `);

    if (ordersError) throw ordersError;

    // Calculate dashboard metrics
    const metrics = calculateDashboardMetrics((orders || []).map((order) => normalizeOrderForDisplay(order)));

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
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

  // Product breakdown — use preset names as keys instead of raw kg
  const boxCounts: Record<string, number> = {};
  let totalKg = 0;
  for (const order of orders) {
    const size = getEffectiveBoxSize(order);
    if (!size) continue;
    totalKg += size;
    // Use display name (preset name) if available, otherwise fall back to "Xkg"
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
