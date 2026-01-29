import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Fetch all orders with date filtering if provided
    let query = supabaseAdmin
      .from('orders')
      .select(`
        *,
        payments (*)
      `)
      .order('created_at', { ascending: false });

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    // Calculate analytics
    const analytics = calculateAnalytics(orders || []);

    return NextResponse.json(analytics);
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

function calculateAnalytics(orders: any[]) {
  // Time series data (orders per week)
  const ordersByWeek = orders.reduce((acc, order) => {
    const date = new Date(order.created_at);
    const week = getWeekNumber(date);
    const key = `${week.year}-W${week.week}`;
    if (!acc[key]) {
      acc[key] = { count: 0, revenue: 0 };
    }
    acc[key].count++;
    acc[key].revenue += order.total_amount;
    return acc;
  }, {} as Record<string, any>);

  // Popular product combinations
  const productCombinations = orders.reduce((acc, order) => {
    const combo = `${order.box_size}kg + ${order.ribbe_choice}`;
    acc[combo] = (acc[combo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Geographic distribution
  const geographic = orders.reduce((acc, order) => {
    acc[order.delivery_type] = (acc[order.delivery_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Customer analysis
  const customerEmails = new Set(orders.map((o) => o.customer_email));
  const repeatCustomers = orders.reduce((acc, order) => {
    const email = order.customer_email;
    acc[email] = (acc[email] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repeatCustomerCount = (Object.values(repeatCustomers) as number[]).filter((count) => count > 1).length;

  // Conversion analysis (from draft to completed)
  const conversionFunnel = {
    total_orders: orders.length,
    draft: orders.filter((o) => o.status === 'draft').length,
    deposit_paid: orders.filter((o) => o.status === 'deposit_paid').length,
    paid: orders.filter((o) => o.status === 'paid').length,
    ready_for_pickup: orders.filter((o) => o.status === 'ready_for_pickup').length,
    completed: orders.filter((o) => o.status === 'completed').length,
    cancelled: orders.filter((o) => o.status === 'cancelled').length,
  };

  // Revenue trends
  const totalRevenue = orders.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    return sum + completedPayments.reduce((pSum: number, p: any) => pSum + p.amount_nok, 0);
  }, 0);

  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Peak ordering periods (by day of week)
  const ordersByDayOfWeek = orders.reduce((acc, order) => {
    const date = new Date(order.created_at);
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    acc[dayOfWeek] = (acc[dayOfWeek] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Extras popularity
  const extrasPopularity = orders.reduce((acc, order) => {
    if (order.extra_products && Array.isArray(order.extra_products)) {
      order.extra_products.forEach((extra: any) => {
        if (!acc[extra.name]) {
          acc[extra.name] = { orders: 0, total_quantity: 0, revenue: 0 };
        }
        acc[extra.name].orders++;
        acc[extra.name].total_quantity += extra.quantity;
        acc[extra.name].revenue += extra.total_price || 0;
      });
    }
    return acc;
  }, {} as Record<string, any>);

  return {
    summary: {
      total_orders: orders.length,
      total_customers: customerEmails.size,
      repeat_customers: repeatCustomerCount,
      total_revenue: totalRevenue,
      avg_order_value: Math.round(avgOrderValue),
    },
    time_series: {
      orders_by_week: Object.entries(ordersByWeek)
        .map(([week, data]) => ({ week, ...(data as any) }))
        .sort((a, b) => a.week.localeCompare(b.week)),
      orders_by_day_of_week: ordersByDayOfWeek,
    },
    products: {
      combinations: Object.entries(productCombinations)
        .map(([combo, count]) => ({ combo, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      extras_popularity: Object.entries(extrasPopularity)
        .map(([name, data]) => ({ name, ...(data as any) }))
        .sort((a: any, b: any) => b.revenue - a.revenue),
    },
    geographic: Object.entries(geographic).map(([type, count]) => ({ type, count })),
    conversion_funnel: conversionFunnel,
    customer_insights: {
      repeat_rate: customerEmails.size > 0 ? (repeatCustomerCount / customerEmails.size) * 100 : 0,
      top_customers: Object.entries(repeatCustomers)
        .filter(([email, count]) => (count as number) > 1)
        .map(([email, count]) => ({ email, order_count: count as number }))
        .sort((a, b) => b.order_count - a.order_count)
        .slice(0, 10),
    },
  };
}

function getWeekNumber(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
}
