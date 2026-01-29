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
    const action = searchParams.get('action');
    const customerId = searchParams.get('customerId');

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
  // Fetch all orders and aggregate by customer
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id,
      customer_name,
      customer_email,
      customer_phone,
      total_amount,
      status,
      created_at,
      payments (
        amount_nok,
        status
      )
    `)
    .order('created_at', { ascending: false });

  if (error) throw error;

  // Aggregate customer data
  const customerMap = new Map();

  orders?.forEach((order) => {
    const email = order.customer_email;

    if (!customerMap.has(email)) {
      customerMap.set(email, {
        email,
        name: order.customer_name,
        phone: order.customer_phone,
        first_order_date: order.created_at,
        last_order_date: order.created_at,
        total_orders: 0,
        completed_orders: 0,
        total_spent: 0,
        lifetime_value: 0,
        at_risk: false,
      });
    }

    const customer = customerMap.get(email);
    customer.total_orders++;

    if (order.status === 'completed') {
      customer.completed_orders++;
    }

    // Calculate actual spent amount from completed payments
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    const orderSpent = completedPayments.reduce((sum: number, p: any) => sum + p.amount_nok, 0);
    customer.total_spent += orderSpent;
    customer.lifetime_value += orderSpent;

    // Update date ranges
    if (new Date(order.created_at) < new Date(customer.first_order_date)) {
      customer.first_order_date = order.created_at;
    }
    if (new Date(order.created_at) > new Date(customer.last_order_date)) {
      customer.last_order_date = order.created_at;
    }

    // Mark as at risk if they have uncompleted orders
    if (order.status === 'draft' || order.status === 'deposit_paid') {
      customer.at_risk = true;
    }
  });

  const customers = Array.from(customerMap.values())
    .sort((a, b) => b.lifetime_value - a.lifetime_value);

  return NextResponse.json({
    customers,
    total_customers: customers.length,
    repeat_customers: customers.filter(c => c.total_orders > 1).length,
  });
}

async function getCustomerProfile(email: string) {
  // Fetch all orders for this customer
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      payments (*),
      order_extras (
        *,
        extras_catalog (*)
      )
    `)
    .eq('customer_email', email)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!orders || orders.length === 0) {
    return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  }

  // Calculate customer metrics
  const totalOrders = orders.length;
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const totalSpent = orders.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    return sum + completedPayments.reduce((pSum: number, p: any) => pSum + p.amount_nok, 0);
  }, 0);

  const avgOrderValue = totalOrders > 0 ? totalSpent / totalOrders : 0;

  // Product preferences
  const productPreferences = orders.reduce((acc, order) => {
    const key = `${order.box_size}kg - ${order.ribbe_choice}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Favorite extras
  const extrasOrdered = orders.reduce((acc, order) => {
    if (order.order_extras && Array.isArray(order.order_extras)) {
      order.order_extras.forEach((extra: any) => {
        const name = extra.extras_catalog?.name_no || extra.name;
        if (!acc[name]) {
          acc[name] = { count: 0, total_spent: 0 };
        }
        acc[name].count++;
        acc[name].total_spent += extra.total_price || 0;
      });
    }
    return acc;
  }, {} as Record<string, any>);

  const profile = {
    name: orders[0].customer_name,
    email: orders[0].customer_email,
    phone: orders[0].customer_phone,
    first_order_date: orders[orders.length - 1].created_at,
    last_order_date: orders[0].created_at,
    total_orders: totalOrders,
    completed_orders: completedOrders,
    total_spent: totalSpent,
    avg_order_value: Math.round(avgOrderValue),
    lifetime_value: totalSpent,
    product_preferences: Object.entries(productPreferences)
      .map(([product, count]) => ({ product, count: count as number }))
      .sort((a, b) => b.count - a.count),
    favorite_extras: Object.entries(extrasOrdered)
      .map(([name, data]) => ({ name, ...(data as any) }))
      .sort((a: any, b: any) => b.count - a.count),
    orders: orders.map(o => ({
      order_number: o.order_number,
      status: o.status,
      total_amount: o.total_amount,
      created_at: o.created_at,
    })),
  };

  return NextResponse.json({ profile });
}

async function getCustomerStats() {
  // Get aggregated customer statistics
  const { data: orders, error } = await supabaseAdmin
    .from('orders')
    .select('customer_email, total_amount, status, created_at, payments(amount_nok, status)');

  if (error) throw error;

  const customerEmails = new Set(orders?.map(o => o.customer_email));
  const repeatCustomers = orders?.reduce((acc, order) => {
    acc[order.customer_email] = (acc[order.customer_email] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const repeatCount = Object.values(repeatCustomers || {}).filter((count: any) => count > 1).length;

  // Calculate total revenue from completed payments
  const totalRevenue = orders?.reduce((sum, order) => {
    const completedPayments = order.payments?.filter((p: any) => p.status === 'completed') || [];
    return sum + completedPayments.reduce((pSum: number, p: any) => pSum + p.amount_nok, 0);
  }, 0) || 0;

  const avgCustomerValue = customerEmails.size > 0 ? totalRevenue / customerEmails.size : 0;

  return NextResponse.json({
    stats: {
      total_customers: customerEmails.size,
      repeat_customers: repeatCount,
      repeat_rate: customerEmails.size > 0 ? (repeatCount / customerEmails.size) * 100 : 0,
      avg_customer_value: Math.round(avgCustomerValue),
      total_lifetime_value: totalRevenue,
    },
  });
}
