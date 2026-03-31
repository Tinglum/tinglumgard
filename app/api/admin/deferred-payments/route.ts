import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

/** GET: List orders that were accepted without deposit payment */
export async function GET() {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Find pork orders in draft status with no completed deposit payment
  const { data: porkOrders } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, deposit_amount, status, created_at')
    .eq('status', 'draft')
    .order('created_at', { ascending: false });

  const porkWithNoDeposit: any[] = [];
  for (const order of porkOrders || []) {
    const { data: payments } = await supabaseAdmin
      .from('payments')
      .select('id, status')
      .eq('order_id', order.id)
      .eq('payment_type', 'deposit')
      .eq('status', 'completed')
      .limit(1);
    if (!payments || payments.length === 0) {
      porkWithNoDeposit.push({ ...order, product_type: 'pork' });
    }
  }

  // Find egg orders in pending status with no completed deposit payment
  const { data: eggOrders } = await supabaseAdmin
    .from('egg_orders')
    .select('id, order_number, customer_name, customer_email, deposit_amount, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const eggsWithNoDeposit: any[] = [];
  for (const order of eggOrders || []) {
    const { data: payments } = await supabaseAdmin
      .from('egg_payments')
      .select('id, status')
      .eq('egg_order_id', order.id)
      .eq('payment_type', 'deposit')
      .eq('status', 'completed')
      .limit(1);
    if (!payments || payments.length === 0) {
      eggsWithNoDeposit.push({
        ...order,
        deposit_amount: Math.round((order.deposit_amount || 0) / 100),
        product_type: 'eggs',
      });
    }
  }

  // Find chicken orders in pending status with no completed deposit payment
  const { data: chickenOrders } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, customer_name, customer_email, deposit_amount_nok, status, created_at')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  const chickensWithNoDeposit: any[] = [];
  for (const order of chickenOrders || []) {
    const { data: payments } = await supabaseAdmin
      .from('chicken_payments')
      .select('id, status')
      .eq('chicken_order_id', order.id)
      .eq('payment_type', 'deposit')
      .eq('status', 'completed')
      .limit(1);
    if (!payments || payments.length === 0) {
      chickensWithNoDeposit.push({
        ...order,
        deposit_amount: order.deposit_amount_nok,
        product_type: 'chickens',
      });
    }
  }

  return NextResponse.json({
    orders: [...porkWithNoDeposit, ...eggsWithNoDeposit, ...chickensWithNoDeposit],
  });
}
