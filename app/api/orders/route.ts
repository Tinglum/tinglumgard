import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { vippsClient } from '@/lib/vipps/api-client';
import { POST as checkoutPost } from '@/app/api/checkout/route';
import { normalizeOrderForDisplay } from '@/lib/orders/display';

function buildShippingUpdate(details: any) {
  if (!details || typeof details !== 'object') return null;

  const firstName = details.firstName || details.first_name || '';
  const lastName = details.lastName || details.last_name || '';
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  const email = details.email || details.emailAddress || '';
  const phone = details.phoneNumber || details.phone_number || '';
  const street = details.streetAddress || details.addressLine1 || details.address || '';
  const postal = details.postalCode || details.zipCode || '';
  const city = details.city || '';
  const country = details.country || '';

  const update: Record<string, string> = {};
  if (name) update.shipping_name = name;
  if (email) update.shipping_email = email;
  if (phone) update.shipping_phone = phone;
  if (street) update.shipping_address = street;
  if (postal) update.shipping_postal_code = postal;
  if (city) update.shipping_city = city;
  if (country) update.shipping_country = country;

  if (name) update.customer_name = name;
  if (email) update.customer_email = email;
  if (phone) update.customer_phone = phone;

  return Object.keys(update).length ? update : null;
}

function pickLatestPendingDeposit(payments: any[] = []) {
  return payments
    .filter((payment) => payment.payment_type === 'deposit' && payment.status === 'pending')
    .sort((a, b) => {
      const aTs = new Date(a.created_at || 0).getTime();
      const bTs = new Date(b.created_at || 0).getTime();
      return bTs - aTs;
    })[0];
}

async function getCheckoutSessionFromPayment(payment: any) {
  const candidates = [
    payment?.idempotency_key as string | undefined,
    payment?.vipps_session_id as string | undefined,
    payment?.vipps_order_id as string | undefined,
  ];

  let lastError: unknown;
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (!value || seen.has(value)) continue;
    seen.add(value);

    try {
      return await vippsClient.getCheckoutSession(value);
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) throw lastError;
  return null;
}

async function reconcilePigOrder(order: any) {
  const completedDeposit = (order.payments || []).find(
    (payment: any) => payment.payment_type === 'deposit' && payment.status === 'completed'
  );

  if (completedDeposit && order.status === 'draft') {
    const { error: statusErr } = await supabaseAdmin
      .from('orders')
      .update({ status: 'deposit_paid' })
      .eq('id', order.id);

    if (statusErr) {
      console.error('Failed to self-heal pig order status:', statusErr);
      return order;
    }

    return {
      ...order,
      status: 'deposit_paid',
    };
  }

  const depositPayment = pickLatestPendingDeposit(order.payments || []);

  if (!depositPayment) {
    return order;
  }

  if (!depositPayment.idempotency_key && !depositPayment.vipps_session_id && !depositPayment.vipps_order_id) {
    return order;
  }

  try {
    const session = await getCheckoutSessionFromPayment(depositPayment);
    if (!session) {
      return order;
    }

    const sessionState = session?.sessionState as string | undefined;

    if (sessionState !== 'PaymentSuccessful') {
      return order;
    }

    const paidAt = new Date().toISOString();
    const shippingDetails = session?.shippingDetails || session?.billingDetails;
    const shippingUpdate = buildShippingUpdate(shippingDetails);

    if (shippingUpdate) {
      await supabaseAdmin
        .from('orders')
        .update(shippingUpdate)
        .eq('id', order.id);
    }

    await supabaseAdmin
      .from('payments')
      .update({ status: 'completed', paid_at: paidAt, webhook_processed_at: paidAt })
      .eq('id', depositPayment.id)
      .throwOnError();

    await supabaseAdmin
      .from('orders')
      .update({ status: 'deposit_paid' })
      .eq('id', order.id)
      .throwOnError();

    return {
      ...order,
      status: 'deposit_paid',
      ...(shippingUpdate ? shippingUpdate : {}),
      payments: (order.payments || []).map((payment: any) =>
        payment.id === depositPayment.id
          ? { ...payment, status: 'completed', paid_at: paidAt }
          : payment
      ),
    };
  } catch (error) {
    console.error('Failed to reconcile pig order payment:', error);
    return order;
  }
}

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    // Fetch orders that belong to the user by user_id
    const { data: userOrders, error: userOrdersError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg),
        payments (*)
      `)
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false });

    if (userOrdersError) throw userOrdersError;

    // Also fetch anonymous orders that match the user's phone number or email
    // This allows us to link orders made before they logged in
    const { data: anonymousOrders, error: anonymousError } = await supabaseAdmin
      .from('orders')
      .select(`
        *,
        mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, name_en, target_weight_kg),
        payments (*)
      `)
      .is('user_id', null)
      .or(`customer_phone.eq.${session.phoneNumber},customer_email.eq.${session.email}`)
      .order('created_at', { ascending: false });

    if (anonymousError) throw anonymousError;

    // Link matching anonymous orders to the current user
    if (anonymousOrders && anonymousOrders.length > 0) {
      console.log(`Linking ${anonymousOrders.length} anonymous orders to user ${session.userId} by phone/email match`);

      const { error: updateError } = await supabaseAdmin
        .from('orders')
        .update({ user_id: session.userId })
        .in('id', anonymousOrders.map(o => o.id));

      if (updateError) {
        // If foreign key constraint fails, the user doesn't exist in auth.users yet
        // This can happen with Vipps login where the session exists but user record doesn't
        // Just log and continue - orders will still be shown via phone/email match
        console.warn('Could not link anonymous orders (user may not exist in auth.users yet):', updateError.message);
      } else {
        // Update the orders in memory to reflect the change
        anonymousOrders.forEach(order => {
          order.user_id = session.userId;
        });
      }
    }

    // Combine both sets of orders and dedupe by order id
    const combinedOrders = [...(userOrders || []), ...(anonymousOrders || [])];
    const uniqueOrders = new Map<string, any>();
    for (const order of combinedOrders) {
      uniqueOrders.set(order.id, order);
    }
    const allOrders = Array.from(uniqueOrders.values());

    // Sort by created_at descending
    allOrders.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const reconciledOrders = [];
    for (const order of allOrders) {
      reconciledOrders.push(await reconcilePigOrder(order));
    }

    return NextResponse.json({ orders: reconciledOrders.map((order) => normalizeOrderForDisplay(order)) });
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

// Alias order creation to checkout flow so clients can POST to /api/orders
export async function POST(request: NextRequest) {
  return checkoutPost(request);
}
