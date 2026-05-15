import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { buildEggOrderLinesHtml, summarizeEggOrderLines } from '@/lib/eggs/email-lines';
import { VIPPS_PENDING_EMAIL } from '@/lib/constants';
import { APP_BASE_URL } from '@/lib/constants/app';

function formatOreToNok(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`;
}

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
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
    .from('egg_orders')
    .select(`
      id, order_number, customer_name, customer_email, status,
      total_amount, deposit_amount, remainder_amount,
      quantity, week_number, price_per_egg, delivery_fee, delivery_method, delivery_monday,
      breed_id,
      egg_breeds!egg_orders_breed_id_fkey ( name ),
      egg_order_additions ( quantity, price_per_egg, subtotal, breed_id, egg_breeds!egg_order_additions_breed_id_fkey ( name ) )
    `)
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

  const eggSummary = summarizeEggOrderLines(order as any, 'no');
  const eggSummaryEn = summarizeEggOrderLines(order as any, 'en');
  const baseQuantity = eggSummary.baseQuantity;
  const additionsQuantity = eggSummary.additionsQuantity;
  const totalQuantity = eggSummary.totalQuantity;
  const breedName = eggSummary.breedLabel || 'Rugeegg';
  const orderLinesHtml = buildEggOrderLinesHtml(eggSummary.lines, 'no', {
    deliveryFeeOre: Number((order as any).delivery_fee || 0),
    deliveryLabel: String((order as any).delivery_method || ''),
  });
  const orderLinesHtmlEn = buildEggOrderLinesHtml(eggSummaryEn.lines, 'en', {
    deliveryFeeOre: Number((order as any).delivery_fee || 0),
    deliveryLabel: String((order as any).delivery_method || ''),
  });
  const orderUrl = buildCustomerOrderLink(appUrl, 'egg', String(order.id));

  const rendered = await renderManagedTemplate({
    templateKey: 'egg.order.deposit.confirmed.customer',
    locale: 'no',
    variables: {
      customer_name: order.customer_name || 'Kunde',
      order_number: String(order.order_number || ''),
      breed_name: breedName,
      week_number: order.week_number,
      base_quantity: baseQuantity,
      additions_quantity: additionsQuantity,
      total_quantity: totalQuantity,
      order_lines_html: orderLinesHtml,
      order_lines_html_en: orderLinesHtmlEn,
      total_amount_nok: formatOreToNok(order.total_amount),
      deposit_amount_nok: formatOreToNok(order.deposit_amount),
      remainder_amount_nok: formatOreToNok(order.remainder_amount),
      order_url: orderUrl,
      tip_index: 0,
    },
  });

  let customerSent = false;
  let customerReason: string | null = null;

  if (!rendered) {
    customerReason = 'template_not_found:egg.order.deposit.confirmed.customer';
  } else {
    const result = await dispatchEmail({
      to: customerEmail,
      subject: rendered.subject,
      html: rendered.html,
      classification: 'transactional',
      templateKey: rendered.templateKey,
      sourcePath: '/api/admin/eggs/orders/[id]/resend-confirmation',
      eggOrderId: String(order.id),
      idempotency: {
        source: 'egg-deposit-confirmed',
        entity: 'egg_order',
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
        templateKey: 'admin.order.deposit.confirmed.egg',
        locale: 'no',
        variables: {
          order_number: String(order.order_number || ''),
          customer_name: order.customer_name || 'Kunde',
          customer_email: order.customer_email || '',
          breed_name: breedName,
          week_number: order.week_number,
          base_quantity: baseQuantity,
          additions_quantity: additionsQuantity,
          total_quantity: totalQuantity,
          order_lines_html: orderLinesHtml,
          order_lines_html_en: orderLinesHtmlEn,
          total_amount_nok: formatOreToNok(order.total_amount),
          deposit_amount_nok: formatOreToNok(order.deposit_amount),
          remainder_amount_nok: formatOreToNok(order.remainder_amount),
          order_url: orderUrl,
        },
      });

      if (adminRendered) {
        const adminResult = await dispatchEmail({
          to: adminEmail,
          subject: adminRendered.subject,
          html: adminRendered.html,
          classification: 'system',
          templateKey: adminRendered.templateKey,
          sourcePath: '/api/admin/eggs/orders/[id]/resend-confirmation',
          eggOrderId: String(order.id),
          idempotency: {
            source: 'egg-deposit-confirmed-admin',
            entity: 'egg_order',
            id: `${String(order.id)}:${suffix}`,
            template: adminRendered.templateKey,
          },
        });
        adminSent = adminResult.success && !adminResult.skipped;
        if (!adminSent) {
          adminReason = adminResult.error || adminResult.skipReason || 'dispatch_failed';
        }
      } else {
        adminReason = 'template_not_found:admin.order.deposit.confirmed.egg';
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
            ? 'Email template is missing for egg confirmation'
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
