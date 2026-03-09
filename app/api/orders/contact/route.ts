import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function normalizePhone(value?: string | null) {
  return (value || '').replace(/\D/g, '');
}

function isPhoneMatch(sessionPhone: string, orderPhone: string) {
  if (!sessionPhone || !orderPhone) return false;
  if (sessionPhone === orderPhone) return true;

  const sessionSuffix8 = sessionPhone.slice(-8);
  const orderSuffix8 = orderPhone.slice(-8);
  if (sessionSuffix8.length === 8 && orderSuffix8.length === 8 && sessionSuffix8 === orderSuffix8) {
    return true;
  }

  const sessionSuffix4 = sessionPhone.slice(-4);
  const orderSuffix4 = orderPhone.slice(-4);
  return sessionSuffix4.length === 4 && orderSuffix4.length === 4 && sessionSuffix4 === orderSuffix4;
}

async function getConfiguredContactEmail() {
  const { data: appConfig } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', 'contact_email')
    .maybeSingle();

  const appEmail = typeof appConfig?.value === 'string' ? appConfig.value.trim() : '';
  if (appEmail) return appEmail;

  const { data: legacyConfig } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('key', 'contact_email')
    .maybeSingle();

  const legacyEmail = typeof legacyConfig?.value === 'string' ? legacyConfig.value.trim() : '';
  return legacyEmail || 'post@tinglum.no';
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  try {
    const { orderNumber, orderDetails, message } = await request.json();
    const trimmedMessage = (message || '').trim();

    if (!trimmedMessage || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!session.phoneNumber) {
      return NextResponse.json({ error: 'Missing phone number in session' }, { status: 400 });
    }

    let matchedOrder: { id: string } | null = null;
    const normalizedSessionPhone = normalizePhone(session.phoneNumber);
    const normalizedSessionEmail = normalizeEmail(session.email as string | undefined);

    const { data: orderCandidates } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, customer_phone, customer_email')
      .eq('order_number', orderNumber)
      .limit(5);

    if (orderCandidates?.length) {
      matchedOrder =
        orderCandidates.find((order: any) => {
          const ownsByUserId = Boolean(order.user_id) && order.user_id === session.userId;
          const ownsByPhone = isPhoneMatch(normalizedSessionPhone, normalizePhone(order.customer_phone));
          const ownsByEmail =
            Boolean(normalizedSessionEmail) &&
            Boolean(normalizeEmail(order.customer_email)) &&
            normalizeEmail(order.customer_email) === normalizedSessionEmail;

          return ownsByUserId || ownsByPhone || ownsByEmail;
        }) || null;
    }

    const matchedOrderData = orderCandidates?.find((o: any) => o.id === matchedOrder?.id);
    const { data: createdMessage, error: createMessageError } = await supabaseAdmin
      .from('customer_messages')
      .insert({
        order_id: matchedOrder?.id || null,
        customer_phone: (matchedOrderData?.customer_phone as string) || session.phoneNumber,
        customer_name: session.name || null,
        customer_email: (matchedOrderData?.customer_email as string) || session.email || null,
        subject: `Henvendelse om ordre ${orderNumber}`,
        message: trimmedMessage,
        message_type: 'support',
        status: 'open',
        priority: 'normal',
      })
      .select('id')
      .single();

    if (createMessageError) {
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    const contactEmail = await getConfiguredContactEmail();
    const adminRendered = await renderManagedTemplate({
      templateKey: 'support.contact.admin.new',
      locale: 'no',
      variables: {
        customer_name: session.name || 'Kunde',
        customer_email: session.email || 'Ikke oppgitt',
        customer_phone: session.phoneNumber || '',
        order_number: orderNumber,
        order_details: orderDetails || '',
        message_text: trimmedMessage,
      },
    });

    if (adminRendered) {
      await dispatchEmail({
        to: contactEmail,
        subject: adminRendered.subject,
        html: adminRendered.html,
        classification: 'support',
        templateKey: adminRendered.templateKey,
        sourcePath: '/api/orders/contact',
        customerMessageId: createdMessage.id,
      });
    }

    if (session.email) {
      const customerRendered = await renderManagedTemplate({
        templateKey: 'support.contact.customer.confirmation',
        locale: 'no',
        variables: {
          customer_name: session.name || 'Kunde',
          order_number: orderNumber,
          message_text: trimmedMessage,
          customer_email: session.email || '',
          customer_phone: session.phoneNumber || '',
        },
      });

      if (customerRendered) {
        await dispatchEmail({
          to: session.email,
          subject: customerRendered.subject,
          html: customerRendered.html,
          classification: 'support',
          templateKey: customerRendered.templateKey,
          sourcePath: '/api/orders/contact',
          customerMessageId: createdMessage.id,
        });
      }
    }

    return NextResponse.json({
      success: true,
      messageId: createdMessage.id,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
