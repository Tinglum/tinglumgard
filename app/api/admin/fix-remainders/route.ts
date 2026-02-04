import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';

/**
 * Admin endpoint to fix remainder_amount for all orders
 * remainder_amount should always equal total_amount - deposit_amount
 */
export async function POST() {
  try {
    // Fetch all orders
    const { data: orders, error: fetchError } = await supabaseAdmin
      .from('orders')
      .select('*');

    if (fetchError) {
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!orders || orders.length === 0) {
      return NextResponse.json({ message: 'No orders found' }, { status: 200 });
    }

    const fixes = [];
    let fixedCount = 0;

    for (const order of orders) {
      const correctRemainder = order.total_amount - order.deposit_amount;

      if (order.remainder_amount !== correctRemainder) {
        // Update the order
        const { error: updateError } = await supabaseAdmin
          .from('orders')
          .update({ remainder_amount: correctRemainder })
          .eq('id', order.id);

        if (updateError) {
          fixes.push({
            orderNumber: order.order_number,
            success: false,
            error: updateError.message,
          });
        } else {
          fixes.push({
            orderNumber: order.order_number,
            success: true,
            oldRemainder: order.remainder_amount,
            newRemainder: correctRemainder,
            total: order.total_amount,
            deposit: order.deposit_amount,
          });
          fixedCount++;
        }
      }
    }

    return NextResponse.json({
      totalOrders: orders.length,
      fixedCount,
      fixes,
    });
  } catch (error: any) {
    console.error('Error fixing remainders:', error);
    return NextResponse.json(
      { error: 'Failed to fix remainders' },
      { status: 500 }
    );
  }
}
