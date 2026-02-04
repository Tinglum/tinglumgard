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
    // Try full select; fallback if the DB schema doesn't include some columns
    let { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*, payments(*), order_extras(*, extras_catalog(*))')
      .eq('id', params.id)
      .single();

    if (orderError || !order) {
      const fallback = await supabaseAdmin
        .from('orders')
        .select(`*, payments(*), order_extras(id, extra_id, quantity, price_nok, unit_price, unit_type, extras_catalog(*))`)
        .eq('id', params.id)
        .single();

      if (fallback.error || !fallback.data) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
      }

      order = fallback.data as any;
    }

    // Check authorization: order must belong to user OR be anonymous (will be linked)
    console.log('Authorization check:', {
      orderUserId: order.user_id,
      sessionUserId: session.userId,
      orderPhone: order.customer_phone,
      sessionPhone: session.phoneNumber,
      orderEmail: order.customer_email,
      sessionEmail: session.email,
    });

    const isOwner = order.user_id === session.userId;
    const isAnonymous = !order.user_id;
    const matchesPhone = session.phoneNumber && order.customer_phone === session.phoneNumber;
    const matchesEmail = session.email && order.customer_email === session.email;
    const isAuthorized = isOwner || isAnonymous || matchesPhone || matchesEmail || session.isAdmin;

    if (!isAuthorized) {
      console.error('Authorization failed:', {
        isOwner,
        isAnonymous,
        matchesPhone,
        matchesEmail,
        isAdmin: session.isAdmin
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Link anonymous order to logged-in user
    if (isAnonymous && session.userId) {
      const { error: linkError } = await supabaseAdmin
        .from('orders')
        .update({ user_id: session.userId })
        .eq('id', order.id);

      if (linkError) {
        // User might not exist in auth.users yet (Vipps login creates session before user record)
        // This is OK - authorization still works via phone/email match
        console.warn('Could not link order to user (may not exist in auth.users yet):', linkError.message);
      } else {
        order.user_id = session.userId;
      }
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

    // Use the remainder amount from the order (already calculated and may be customized)
    const remainderAmount = order.remainder_amount;

    const remainderPayment = order.payments?.find(
      (p: any) => p.payment_type === 'remainder'
    );

    // If payment exists and is completed, return error
    if (remainderPayment?.status === 'completed') {
      return NextResponse.json(
        { error: 'Remainder already paid' },
        { status: 400 }
      );
    }

    // Note: We don't reuse pending sessions because Vipps tokens expire
    // Always create a new session for better UX

    if (order.locked_at) {
      return NextResponse.json({ error: 'Order is locked' }, { status: 400 });
    }

    // Create shorter reference (max 50 chars) using order number
    const shortReference = `REM-${order.order_number}`;
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no';

    // Generate callback authorization token
    const { randomBytes } = await import('crypto');
    const callbackToken = randomBytes(16).toString('hex');

    // Create session data - remainder payment is payment-only with NO customer info collection
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
        // Skip all customer information collection - payment only
        elements: 'PaymentOnly',
      },
    };

    console.log('Creating remainder payment session (payment only, no customer info):', {
      reference: shortReference,
      amount: remainderAmount,
    });

    const vippsResult = await vippsClient.createCheckoutSession(sessionData);

    // Try to insert, or update if it already exists
    let payment;
    const { data: insertedPayment, error: paymentError } = await supabaseAdmin
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
      // If duplicate key, update the existing payment
      if (paymentError.code === '23505') {
        const { data: updatedPayment, error: updateError } = await supabaseAdmin
          .from('payments')
          .update({
            vipps_session_id: vippsResult.sessionId,
            amount_nok: remainderAmount,
            status: 'pending',
          })
          .eq('idempotency_key', shortReference)
          .select()
          .single();

        if (updateError) {
          console.error('Failed to update payment record:', updateError);
          return NextResponse.json(
            { error: 'Failed to update payment record' },
            { status: 500 }
          );
        }
        payment = updatedPayment;
      } else {
        console.error('Failed to create payment record:', paymentError);
        return NextResponse.json(
          { error: 'Failed to create payment record' },
          { status: 500 }
        );
      }
    } else {
      payment = insertedPayment;
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
