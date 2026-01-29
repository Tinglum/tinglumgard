import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { vippsClient } from '@/lib/vipps/api-client';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, payments(*), order_extras(*, extras_catalog(*))')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.user_id !== session.userId && !session.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const depositPayment = order.payments?.find(
      (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
    );

    if (!depositPayment) {
      return NextResponse.json(
        { error: 'Deposit must be paid first' },
        { status: 400 }
      );
    }

    const remainderPayment = order.payments?.find(
      (p: any) => p.payment_type === 'remainder' && p.status === 'completed'
    );

    if (remainderPayment) {
      return NextResponse.json(
        { error: 'Remainder already paid' },
        { status: 400 }
      );
    }

    if (order.locked_at) {
      return NextResponse.json({ error: 'Order is locked' }, { status: 400 });
    }

    // Use the remainder amount from the order (already calculated and may be customized)
    const remainderAmount = order.remainder_amount;

    // Create shorter reference (max 50 chars) using order number
    const shortReference = `REM-${order.order_number}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';

    // Generate callback authorization token
    const { randomBytes } = await import('crypto');
    const callbackToken = randomBytes(16).toString('hex');

    // Prepare customer info if available
    const customerInfo: any = {};
    if (order.customer_email && order.customer_email !== 'pending@vipps.no') {
      customerInfo.email = order.customer_email;
    }
    if (order.customer_phone) {
      customerInfo.phoneNumber = order.customer_phone;
    }

    // Create session data with extended configuration
    const sessionData: any = {
      merchantInfo: {
        callbackUrl: `${appUrl}/api/webhooks/vipps`,
        returnUrl: `${appUrl}/min-side`,
        termsAndConditionsUrl: `${appUrl}/vilkar`,
        callbackAuthorizationToken: callbackToken,
      },
      transaction: {
        amount: {
          currency: 'NOK',
          value: remainderAmount * 100,
        },
        reference: shortReference,
        paymentDescription: `Restbetaling ordre ${order.order_number}`,
      },
      configuration: {
        userFlow: 'WEB_REDIRECT',
      },
    };

    // Add customer info if we have it
    if (Object.keys(customerInfo).length > 0) {
      sessionData.prefillCustomer = customerInfo;
    }

    console.log('Creating remainder payment session:', {
      reference: shortReference,
      amount: remainderAmount,
      hasCustomerInfo: Object.keys(customerInfo).length > 0,
    });

    const vippsResult = await vippsClient.createCheckoutSession(sessionData);

    const { data: payment, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        order_id: order.id,
        payment_type: 'remainder',
        amount_nok: remainderAmount,
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

    await supabaseAdmin
      .from('orders')
      .update({
        vipps_remainder_order_id: vippsResult.sessionId,
      })
      .eq('id', order.id);

    return NextResponse.json({
      success: true,
      redirectUrl: vippsResult.checkoutFrontendUrl,
      paymentId: payment.id,
      amount: remainderAmount,
    });
  } catch (error) {
    console.error('Error creating remainder payment:', error);
    return NextResponse.json(
      { error: 'Failed to create payment' },
      { status: 500 }
    );
  }
}
