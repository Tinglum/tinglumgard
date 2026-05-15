import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { logError } from '@/lib/logger';
import { APP_BASE_URL } from '@/lib/constants/app';

/** POST: Send payment request email to customer for a deferred order */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orderId, productType, customerName, customerEmail, orderNumber } = body;

  if (!orderId || !productType || !customerEmail) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const appUrl = APP_BASE_URL;
  const orderParam = productType === 'eggs' ? 'eggOrderId' : productType === 'chickens' ? 'chickenOrderId' : 'orderId';
  const paymentLink = `${appUrl}/min-side?${orderParam}=${orderId}`;

  const rendered = await renderManagedTemplate({
    templateKey: 'deferred.deposit.request',
    locale: 'no',
    variables: {
      customer_name: customerName || 'Kunde',
      order_number: orderNumber,
      payment_url: paymentLink,
    },
  });

  if (!rendered) {
    return NextResponse.json({ error: 'Email template not found' }, { status: 500 });
  }

  const result = await dispatchEmail({
    to: customerEmail,
    subject: rendered.subject,
    html: rendered.html,
    ...(productType === 'eggs' ? { eggOrderId: orderId } : {}),
    ...(productType === 'chickens' ? { chickenOrderId: orderId } : {}),
    ...(productType !== 'eggs' && productType !== 'chickens' ? { orderId } : {}),
    classification: 'transactional',
    templateKey: 'deferred.deposit.request',
    sourcePath: '/api/admin/deferred-payments/request-payment',
    flowKey: 'deferred.deposit.request',
    sendImmediately: true,
  });

  if (!result.success) {
    logError('admin-deferred-payment-email', new Error(result.error || 'Failed to send email'));
    return NextResponse.json({ error: result.error || 'Failed to send email' }, { status: 500 });
  }

  return NextResponse.json({ success: true, emailId: result.id, queueId: result.queueId });
}
