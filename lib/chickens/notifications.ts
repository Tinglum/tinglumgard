import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildAdminOrderLink, buildCustomerOrderLink } from '@/lib/email/links';
import {
  buildChickenBreedAgeLabel,
  buildChickenOrderLinesHtml,
  buildTotalBirdsLabel,
  summarizeChickenOrderLines,
} from '@/lib/chickens/email-lines';

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function formatNok(amount: unknown): string {
  return `kr ${Math.round(Number(amount) || 0).toLocaleString('nb-NO')}`;
}

function getChickenDeliveryLabel(deliveryMethod: string): string {
  if (deliveryMethod === 'farm_pickup') return 'Henting på gården';
  if (deliveryMethod === 'delivery_namsos_trondheim') return 'Levering Namsos/Trondheim';
  return deliveryMethod || 'Henting';
}

export async function sendChickenDepositConfirmationEmails(params: {
  orderId: string;
  sourcePath: string;
  includeAdmin?: boolean;
  idempotencySuffix?: string;
}) {
  const includeAdmin = params.includeAdmin !== false;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';

  const selectClause =
    '*, chicken_breeds(*), chicken_hatches(hatch_date), chicken_order_additions(hatch_id, quantity_hens, quantity_roosters, subtotal_nok, price_per_hen_nok, price_per_rooster_nok, chicken_breeds(*), chicken_hatches(hatch_date))';

  const { data: byId, error: byIdError } = await supabaseAdmin
    .from('chicken_orders')
    .select(selectClause)
    .eq('id', String(params.orderId).trim())
    .maybeSingle();

  let order = byId;
  let queryError = byIdError;

  if (!order && !queryError) {
    const { data: byOrderNumber, error: byOrderNumberError } = await supabaseAdmin
      .from('chicken_orders')
      .select(selectClause)
      .eq('order_number', String(params.orderId).trim())
      .maybeSingle();
    order = byOrderNumber;
    queryError = byOrderNumberError;
  }

  if (queryError) {
    return {
      ok: false as const,
      reason: 'order_query_failed' as const,
      errorMessage: String(queryError?.message || 'Unknown query error'),
      customerSent: false,
      adminSent: false,
      customerReason: null,
      adminReason: null,
    };
  }

  if (!order) {
    return {
      ok: false as const,
      reason: 'order_not_found' as const,
      errorMessage: null,
      customerSent: false,
      adminSent: false,
      customerReason: null,
      adminReason: null,
    };
  }

  const summary = summarizeChickenOrderLines(order);
  const breedLabelWithAgeNo = buildChickenBreedAgeLabel(summary.lines, 'no');
  const breedLabelWithAgeEn = buildChickenBreedAgeLabel(summary.lines, 'en');
  const pickupDate = order.pickup_monday ? new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO') : '';
  const chickenDeliveryOpts = { deliveryFeeNok: Number(order.delivery_fee_nok || 0), deliveryLabel: getChickenDeliveryLabel(String(order.delivery_method || '')) };
  const orderLinesHtmlNo = buildChickenOrderLinesHtml(summary.lines, 'no', chickenDeliveryOpts);
  const orderLinesHtmlEn = buildChickenOrderLinesHtml(summary.lines, 'en', chickenDeliveryOpts);

  const customerEmail = normalizeEmail(order.customer_email);
  let customerSent = false;
  let customerReason: string | null = null;

  if (customerEmail && customerEmail !== 'pending@vipps.no') {
    const rendered = await renderManagedTemplate({
      templateKey: 'chicken.order.deposit.confirmed.customer',
      locale: 'no',
      variables: {
        customer_name: order.customer_name || 'Kunde',
        order_number: order.order_number,
        breed_name: breedLabelWithAgeNo,
        breed_name_en: breedLabelWithAgeEn,
        breed_name_plain: summary.breedLabel,
        quantity_hens: summary.hens,
        quantity_roosters: summary.roosters,
        total_birds_label: buildTotalBirdsLabel(summary.hens, summary.roosters, 'no'),
        total_birds_label_en: buildTotalBirdsLabel(summary.hens, summary.roosters, 'en'),
        order_lines_html: orderLinesHtmlNo,
        order_lines_html_en: orderLinesHtmlEn,
        pickup_date: pickupDate,
        delivery_label: getChickenDeliveryLabel(String(order.delivery_method || '')),
        total_amount_nok: formatNok(order.total_amount_nok),
        deposit_amount_nok: formatNok(order.deposit_amount_nok),
        remainder_amount_nok: formatNok(order.remainder_amount_nok),
        order_url: buildCustomerOrderLink(appUrl, 'chicken', String(order.id)),
      },
    });

    if (rendered) {
      const result = await dispatchEmail({
        to: customerEmail,
        subject: rendered.subject,
        html: rendered.html,
        classification: 'transactional',
        templateKey: rendered.templateKey,
        sourcePath: params.sourcePath,
        chickenOrderId: order.id,
        idempotency: {
          source: 'chicken-deposit-confirmed',
          entity: 'chicken_order',
          id: params.idempotencySuffix ? `${order.id}:${params.idempotencySuffix}` : order.id,
          template: rendered.templateKey,
        },
      });

      customerSent = result.success && !result.skipped;
      if (!customerSent) {
        customerReason = result.error || result.skipReason || 'dispatch_failed';
      }
    } else {
      customerReason = 'template_not_found:chicken.order.deposit.confirmed.customer';
    }
  } else {
    customerReason = 'missing_customer_email';
  }

  let adminSent = false;
  let adminReason: string | null = null;
  if (includeAdmin) {
    const adminEmail = normalizeEmail(process.env.EMAIL_FROM || '');
    if (adminEmail) {
      const rendered = await renderManagedTemplate({
        templateKey: 'admin.order.deposit.confirmed.chicken',
        locale: 'no',
        variables: {
          order_number: order.order_number,
          customer_name: order.customer_name || 'Kunde',
          customer_email: order.customer_email || '',
          customer_phone: order.customer_phone || 'Ikke oppgitt',
          breed_name: breedLabelWithAgeNo,
          breed_name_en: breedLabelWithAgeEn,
          breed_name_plain: summary.breedLabel,
          quantity_hens: summary.hens,
          quantity_roosters: summary.roosters,
          total_birds_label: buildTotalBirdsLabel(summary.hens, summary.roosters, 'no'),
          total_birds_label_en: buildTotalBirdsLabel(summary.hens, summary.roosters, 'en'),
          order_lines_html: orderLinesHtmlNo,
          order_lines_html_en: orderLinesHtmlEn,
          pickup_week: order.pickup_week,
          pickup_date: pickupDate,
          deposit_amount_nok: formatNok(order.deposit_amount_nok),
          remainder_amount_nok: formatNok(order.remainder_amount_nok),
          total_amount_nok: formatNok(order.total_amount_nok),
          order_url: buildAdminOrderLink(appUrl, 'chicken', String(order.id)),
        },
      });

      if (rendered) {
        const result = await dispatchEmail({
          to: adminEmail,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'system',
          templateKey: rendered.templateKey,
          sourcePath: params.sourcePath,
          chickenOrderId: order.id,
          idempotency: {
            source: 'chicken-deposit-confirmed-admin',
            entity: 'chicken_order',
            id: params.idempotencySuffix ? `${order.id}:${params.idempotencySuffix}` : order.id,
            template: rendered.templateKey,
          },
        });

        adminSent = result.success && !result.skipped;
        if (!adminSent) {
          adminReason = result.error || result.skipReason || 'dispatch_failed';
        }
      } else {
        adminReason = 'template_not_found:admin.order.deposit.confirmed.chicken';
      }
    } else {
      adminReason = 'missing_admin_email';
    }
  }

  return {
    ok: true as const,
    customerSent,
    adminSent,
    customerReason,
    adminReason,
  };
}

