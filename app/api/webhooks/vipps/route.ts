import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { vippsClient } from '@/lib/vipps/client';
import { deductInventory } from '@/lib/utils/inventory';

interface VippsWebhookPayload {
  msn: string;
  reference: string;
  pspReference: string;
  name: string;
  amount?: {
    value: number;
    currency: string;
  };
  timestamp: string;
  idempotencyKey?: string;
}

interface CheckoutWebhookPayload {
  msn: string;
  sessionId: string;
  sessionState: string;
  reference: string;
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');

    if (!authHeader || authHeader !== `Bearer ${process.env.VIPPS_WEBHOOK_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: VippsWebhookPayload | CheckoutWebhookPayload = await request.json();

    // Determine if this is a Checkout v3 webhook or legacy ePayment webhook
    const isCheckoutV3 = 'sessionId' in payload && 'sessionState' in payload;
    const referenceOrSessionId = isCheckoutV3 ? (payload as CheckoutWebhookPayload).sessionId : (payload as VippsWebhookPayload).reference;

    // Check for existing webhook processing
    const existingWebhook = await supabaseAdmin
      .from('payments')
      .select('id, webhook_processed_at, vipps_session_id, vipps_order_id')
      .or(`vipps_session_id.eq.${referenceOrSessionId},vipps_order_id.eq.${referenceOrSessionId}`)
      .maybeSingle();

    if (existingWebhook.data?.webhook_processed_at) {
      console.log('Webhook already processed:', referenceOrSessionId);
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    // Fetch payment details from Vipps
    let isAuthorized = false;

    if (isCheckoutV3) {
      const checkoutSession = await vippsClient.getCheckoutSession(referenceOrSessionId);
      isAuthorized = checkoutSession.sessionState === 'PaymentSuccessful' ||
                     checkoutSession.sessionState === 'PaymentAuthorized';

      if (!isAuthorized) {
        await supabaseAdmin
          .from('payments')
          .update({
            status: checkoutSession.sessionState.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq('vipps_session_id', referenceOrSessionId);

        return NextResponse.json({ success: true, message: 'Payment not authorized yet' });
      }
    } else {
      const paymentDetails = await vippsClient.getPayment(referenceOrSessionId);
      isAuthorized = paymentDetails.state === 'AUTHORIZED' ||
                     paymentDetails.state === 'CAPTURED';

      if (!isAuthorized) {
        await supabaseAdmin
          .from('payments')
          .update({
            status: paymentDetails.state.toLowerCase(),
            updated_at: new Date().toISOString(),
          })
          .eq('vipps_order_id', referenceOrSessionId);

        return NextResponse.json({ success: true, message: 'Payment not authorized yet' });
      }
    }

    // Fetch payment record
    const { data: payment } = await supabaseAdmin
      .from('payments')
      .select(`
        *,
        orders (
          id,
          box_size,
          status
        )
      `)
      .or(`vipps_session_id.eq.${referenceOrSessionId},vipps_order_id.eq.${referenceOrSessionId}`)
      .maybeSingle();

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.webhook_processed_at) {
      return NextResponse.json({ success: true, message: 'Already processed' });
    }

    const now = new Date().toISOString();

    await supabaseAdmin
      .from('payments')
      .update({
        status: 'completed',
        paid_at: now,
        webhook_processed_at: now,
        updated_at: now,
      })
      .eq('id', payment.id);

    const order = Array.isArray(payment.orders) ? payment.orders[0] : payment.orders;

    if (!order) {
      return NextResponse.json({ success: true, message: 'No order found' });
    }

    if (payment.payment_type === 'deposit' && order.status !== 'deposit_paid') {
      await supabaseAdmin
        .from('orders')
        .update({
          status: 'deposit_paid',
          updated_at: now,
        })
        .eq('id', order.id);

      const inventoryResult = await deductInventory(order.id, order.box_size);

      if (!inventoryResult.success) {
        console.error('Failed to deduct inventory:', inventoryResult.error);
      }
    }

    if (payment.payment_type === 'remainder') {
      const { data: allPayments } = await supabaseAdmin
        .from('payments')
        .select('payment_type, status')
        .eq('order_id', order.id);

      const depositPaid = allPayments?.some(
        p => p.payment_type === 'deposit' && p.status === 'completed'
      );
      const remainderPaid = allPayments?.some(
        p => p.payment_type === 'remainder' && p.status === 'completed'
      );

      if (depositPaid && remainderPaid) {
        await supabaseAdmin
          .from('orders')
          .update({
            status: 'paid',
            updated_at: now,
          })
          .eq('id', order.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
