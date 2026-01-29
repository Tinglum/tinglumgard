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

    // If there's a pending deposit payment, check if it's still valid
    if (existingDepositPayment && existingDepositPayment.status === 'pending') {
      console.log('Found existing pending deposit payment:', existingDepositPayment.id);

      // Try to get the session info from Vipps
      try {
        const sessionId = existingDepositPayment.vipps_session_id || existingDepositPayment.vipps_order_id;

        if (existingDepositPayment.vipps_session_id) {
          // Use Checkout API v3
          const checkoutSession = await vippsClient.getCheckoutSession(sessionId);
          console.log('Existing session state:', checkoutSession.sessionState);

          if (checkoutSession.sessionState === 'SessionCreated' || checkoutSession.sessionState === 'PaymentInitiated') {
            console.log('Reusing existing valid session');
            return NextResponse.json({
              success: true,
              redirectUrl: checkoutSession.checkoutFrontendUrl || `https://checkout${process.env.VIPPS_ENV === 'test' ? '.test' : ''}.vipps.no/${sessionId}`,
              paymentId: existingDepositPayment.id,
              amount: existingDepositPayment.amount_nok,
            });
          } else {
            console.log('Existing session invalid, will create new one');
            // Session expired or terminated, delete the old payment record and create new
            await supabaseAdmin
              .from('payments')
              .delete()
              .eq('id', existingDepositPayment.id);
          }
        }
      } catch (error) {
        console.error('Error fetching existing Vipps payment:', error);
        // If we can't fetch the session (404, expired, etc), delete and create new
        console.log('Deleting failed/expired payment record');
        await supabaseAdmin
          .from('payments')
          .delete()
          .eq('id', existingDepositPayment.id);
      }
    }

    // Use the deposit amount from the order (which may be customized)
    const depositAmount = order.deposit_amount;

    // Create shorter reference (max 50 chars) using order number
    const shortReference = `DEP-${order.order_number}`;
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

    // Create Vipps Checkout v3 session with extended configuration
    const sessionData: any = {
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
        // Configure to collect customer information in Vipps
        customerInteraction: 'CUSTOMER_PRESENT',
      },
      // Add logistics configuration to handle shipping
      logistics: {
        dynamicOptionsCallback: null, // No dynamic shipping options
        fixedOptions: [
          {
            id: order.delivery_type,
            priority: 0,
            isDefault: true,
            brand: 'OTHER', // Required field - use OTHER for custom pickup/delivery
            title: order.delivery_type === 'pickup_farm' ? 'Henting på gård' :
                   order.delivery_type === 'pickup_e6' ? 'Henting E6' :
                   'Levering Trondheim',
            description: 'Valgt leveringsmåte',
            amount: {
              currency: 'NOK',
              value: 0, // Shipping cost included in total
            },
          },
        ],
      },
    };

    // Add customer info if we have it
    if (Object.keys(customerInfo).length > 0) {
      sessionData.prefillCustomer = customerInfo;
    }

    console.log('Creating Vipps Checkout session with config:', {
      reference: shortReference,
      amount: depositAmount,
      hasCustomerInfo: Object.keys(customerInfo).length > 0,
      orderId: order.id,
    });

    const vippsResult = await vippsClient.createCheckoutSession(sessionData);

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
