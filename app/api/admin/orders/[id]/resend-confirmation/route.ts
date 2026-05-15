import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { VIPPS_PENDING_EMAIL, APP_BASE_URL } from '@/lib/constants/app';

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function getDeliveryLabel(deliveryType: string): string {
  if (deliveryType === 'pickup_farm') return 'Henting på gård';
  if (deliveryType === 'pickup_e6') return 'Henting ved E6';
  if (deliveryType === 'delivery_trondheim') return 'Levering i Trondheim';
  return deliveryType || 'Henting';
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const includeAdmin = body?.includeAdmin !== false;
  const resendToken = String(body?.resendToken || 'manual').trim() || 'manual';
  const force = body?.force === true;
  const suffix = force ? `manual-${Date.now()}` : `manual-${resendToken}`;

  const appUrl = APP_BASE_URL;

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .select('id, order_number, customer_name, customer_email, status, delivery_type, deposit_amount, remainder_amount, total_amount')
    .eq('id', params.id)
    .maybeSingle();

  if (orderError) {
    return NextResponse.json(
      { error: 'Could not load order for resend', details: orderError.message || null },
      { status: 500 }
    );
  }

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const customerEmail = normalizeEmail(order.customer_email);
  if (!customerEmail || customerEmail === VIPPS_PENDING_EMAIL) {
    return NextResponse.json(
      { error: 'Customer email is missing on this order', reason: 'missing_customer_email' },
      { status: 409 }
    );
  }

  const orderUrl = buildCustomerOrderLink(appUrl, 'pig', String(order.id));
  const deliveryLabel = getDeliveryLabel(String(order.delivery_type || ''));

  const rendered = await renderManagedTemplate({
    templateKey: 'pig.order.deposit.confirmed.customer',
    locale: 'no',
    variables: {
      customer_name: order.customer_name || 'Kunde',
      order_number: String(order.order_number || ''),
      delivery_label: deliveryLabel,
      order_url: orderUrl,
    },
  });

  let customerSent = false;
  let customerReason: string | null = null;

  if (!rendered) {
    customerReason = 'template_not_found:pig.order.deposit.confirmed.customer';
  } else {
    const result = await dispatchEmail({
      to: customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      classification: 'transactional',
      templateKey: rendered.templateKey,
      sourcePath: '/api/admin/orders/[id]/resend-confirmation',
      orderId: String(order.id),
      idempotency: {
        source: 'pig-deposit-confirmed',
        entity: 'order',
        id: `${String(order.id)}:${suffix}`,
        template: rendered.templateKey,
      },
    });
    customerSent = result.success && !result.skipped;
    if (!customerSent) {
      customerReason = result.error || result.skipReason || 'dispatch_failed';
    }
  }

  let adminSent = false;
  let adminReason: string | null = null;

  if (includeAdmin) {
    const adminEmail = normalizeEmail(process.env.EMAIL_FROM ?? '');
    if (adminEmail) {
      const adminRendered = await renderManagedTemplate({
        templateKey: 'admin.order.deposit.confirmed.pig',
        locale: 'no',
        variables: {
          order_number: String(order.order_number || ''),
          customer_name: order.customer_name || 'Kunde',
          customer_email: order.customer_email || '',
          delivery_label: deliveryLabel,
          order_url: buildCustomerOrderLink(appUrl, 'pig', String(order.id)),
        },
      });

      if (adminRendered) {
        const adminResult = await dispatchEmail({
          to: adminEmail,
          subject: adminRendered.subject,
          html: adminRendered.html,
          classification: 'system',
          templateKey: adminRendered.templateKey,
          sourcePath: '/api/admin/orders/[id]/resend-confirmation',
          orderId: String(order.id),
          idempotency: {
            source: 'pig-deposit-confirmed-admin',
            entity: 'order',
            id: `${String(order.id)}:${suffix}`,
            template: adminRendered.templateKey,
          },
        });
        adminSent = adminResult.success && !adminResult.skipped;
        if (!adminSent) {
          adminReason = adminResult.error || adminResult.skipReason || 'dispatch_failed';
        }
      } else {
        adminReason = 'template_not_found:admin.order.deposit.confirmed.pig';
      }
    } else {
      adminReason = 'missing_admin_email';
    }
  }

  if (!customerSent && !adminSent) {
    const reason = customerReason || adminReason || 'no_recipients_or_templates';
    return NextResponse.json(
      {
        error:
          reason.startsWith('template_not_found')
            ? 'Email template is missing for pork confirmation'
            : reason === 'missing_customer_email'
              ? 'Customer email is missing on this order'
              : reason === 'missing_admin_email'
                ? 'Admin email is missing (EMAIL_FROM)'
                : 'No confirmation email was sent',
        reason,
      },
      { status: 409 }
    );
  }

  return NextResponse.json({
    success: true,
    force,
    resendToken,
    customerSent,
    adminSent,
    customerReason: customerReason || null,
    adminReason: adminReason || null,
  });
}
