import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { vippsClient } from '@/lib/vipps/api-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Fetch the order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, payments(*)')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Check if deposit already exists
    const existingDepositPayment = order.payments?.find(
      (p: any) => p.payment_type === 'deposit'
    );

    if (existingDepositPayment && existingDepositPayment.status === 'completed') {
      return NextResponse.json(
        { error: 'Deposit already paid' },
        { status: 400 }
      );
    }

    // If there's a pending deposit payment, return its redirect URL
    if (existingDepositPayment && existingDepositPayment.status === 'pending') {
      // Try to get the session info from Vipps
      try {
        const sessionId = existingDepositPayment.vipps_session_id || existingDepositPayment.vipps_order_id;

        if (existingDepositPayment.vipps_session_id) {
          // Use Checkout API v3
          const checkoutSession = await vippsClient.getCheckoutSession(sessionId);

          if (checkoutSession.sessionState === 'SessionCreated' || checkoutSession.sessionState === 'PaymentInitiated') {
            const checkoutBaseUrl = process.env.VIPPS_ENV === 'test'
              ? 'https://checkout.test.vipps.no'
              : 'https://checkout.vipps.no';

            return NextResponse.json({
              success: true,
              redirectUrl: `${checkoutBaseUrl}/${sessionId}`,
              paymentId: existingDepositPayment.id,
              amount: existingDepositPayment.amount_nok,
            });
          }
        } else {
          // Fallback to legacy ePayment API
          const vippsPayment = await vippsClient.getPayment(sessionId);

          if (vippsPayment.state === 'CREATED') {
            return NextResponse.json({
              success: true,
              redirectUrl: `https://api${process.env.VIPPS_ENV === 'test' ? 'test' : ''}.vipps.no/checkout/v2/session/${sessionId}`,
              paymentId: existingDepositPayment.id,
              amount: existingDepositPayment.amount_nok,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching existing Vipps payment:', error);
      }
    }

    // Calculate deposit amount (1% of base price)
    const basePrice = order.box_size === 8 ? 3500 : 4800;
    const depositAmount = Math.floor(basePrice * 0.01);

    // Create shorter reference (max 50 chars) using order number
    const shortReference = `DEP-${order.order_number}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';

    // Generate callback authorization token
    const { randomBytes } = await import('crypto');
    const callbackToken = randomBytes(16).toString('hex');

    // Create Vipps Checkout v3 session
    const vippsResult = await vippsClient.createCheckoutSession({
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/bestill/bekreftelse?orderId=${order.id}`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: depositAmount * 100, // Convert to øre
        },
        reference: shortReference,
        paymentDescription: `Depositum ordre ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
      },
    });

    // Store payment record in database
    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        payment_type: 'deposit',
        amount_nok: depositAmount,
        vipps_session_id: vippsResult.sessionId,
        status: 'pending',
        idempotency_key: shortReference,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create payment record:', paymentError);
      return NextResponse.json(
        { error: 'Failed to create payment record' },
        { status: 500 }
      );
    }

    // Update order with Vipps session reference
    await supabaseAdmin
      .from('orders')
      .update({
        vipps_deposit_order_id: vippsResult.sessionId,
      })
      .eq('id', order.id);

    return NextResponse.json({
      success: true,
      redirectUrl: vippsResult.checkoutFrontendUrl,
      paymentId: payment.id,
      amount: depositAmount,
    });
  } catch (error) {
    console.error('Error creating deposit payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create payment', details: errorMessage },
      { status: 500 }
    );
  }
}
