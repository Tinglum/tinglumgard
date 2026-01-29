import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { orderId } = await request.json();

    // Fetch order with payments
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(`
        id,
        order_number,
        deposit_amount,
        remainder_amount,
        total_amount,
        payments (
          payment_type,
          amount_nok,
          status
        )
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Find actual payment amounts
    const depositPayment = order.payments?.find((p: any) => p.payment_type === 'deposit');
    const remainderPayment = order.payments?.find((p: any) => p.payment_type === 'remainder');

    if (!depositPayment && !remainderPayment) {
      return NextResponse.json({ error: 'No payments found for this order' }, { status: 400 });
    }

    // Use actual payment amounts
    const actualDepositAmount = depositPayment?.amount_nok || order.deposit_amount;
    const actualRemainderAmount = remainderPayment?.amount_nok || order.remainder_amount;
    const actualTotalAmount = actualDepositAmount + actualRemainderAmount;

    // Check if sync is needed
    const needsSync =
      order.deposit_amount !== actualDepositAmount ||
      order.remainder_amount !== actualRemainderAmount ||
      order.total_amount !== actualTotalAmount;

    if (!needsSync) {
      return NextResponse.json({
        message: 'Order amounts already match payment amounts',
        synced: false,
      });
    }

    // Update order with actual payment amounts
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        deposit_amount: actualDepositAmount,
        remainder_amount: actualRemainderAmount,
        total_amount: actualTotalAmount,
        last_modified_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Order amounts synced with payment amounts',
      synced: true,
      old_values: {
        deposit_amount: order.deposit_amount,
        remainder_amount: order.remainder_amount,
        total_amount: order.total_amount,
      },
      new_values: {
        deposit_amount: actualDepositAmount,
        remainder_amount: actualRemainderAmount,
        total_amount: actualTotalAmount,
      },
    });
  } catch (error) {
    console.error('Sync amounts error:', error);
    return NextResponse.json(
      { error: 'Failed to sync amounts' },
      { status: 500 }
    );
  }
}
