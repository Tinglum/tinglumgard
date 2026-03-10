import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';

type ChickenBreedRelation =
  | { name?: string | null; name_no?: string | null; name_en?: string | null }
  | Array<{ name?: string | null; name_no?: string | null; name_en?: string | null }>
  | null;

type ChickenAdditionRelation = {
  quantity_hens?: number | null;
  quantity_roosters?: number | null;
  chicken_breeds?: ChickenBreedRelation;
};

type ChickenOrderLine = {
  breedName: string;
  hens: number;
  roosters: number;
};

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

function pickBreedName(relation: ChickenBreedRelation): string {
  const breed = Array.isArray(relation) ? relation[0] : relation;
  return breed?.name_no || breed?.name_en || breed?.name || 'Kyllinger';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function summarizeOrder(order: any): { breedLabel: string; hens: number; roosters: number; lines: ChickenOrderLine[] } {
  const aggregate = new Map<string, ChickenOrderLine>();
  const addLine = (breedName: string, hens: number, roosters: number) => {
    const key = (breedName || 'Kyllinger').trim() || 'Kyllinger';
    const existing = aggregate.get(key) || { breedName: key, hens: 0, roosters: 0 };
    existing.hens += Number(hens || 0);
    existing.roosters += Number(roosters || 0);
    aggregate.set(key, existing);
  };

  addLine(pickBreedName(order?.chicken_breeds || null), Number(order?.quantity_hens || 0), Number(order?.quantity_roosters || 0));

  const additions: ChickenAdditionRelation[] = Array.isArray(order?.chicken_order_additions)
    ? order.chicken_order_additions
    : [];

  for (const addition of additions) {
    addLine(
      pickBreedName(addition?.chicken_breeds || null),
      Number(addition?.quantity_hens || 0),
      Number(addition?.quantity_roosters || 0)
    );
  }

  const lines = Array.from(aggregate.values()).filter((line) => line.hens > 0 || line.roosters > 0);
  const hens = lines.reduce((sum, line) => sum + line.hens, 0);
  const roosters = lines.reduce((sum, line) => sum + line.roosters, 0);

  return {
    breedLabel: lines.map((line) => line.breedName).join(' + '),
    hens,
    roosters,
    lines,
  };
}

function buildOrderLinesHtml(lines: ChickenOrderLine[], locale: 'no' | 'en'): string {
  if (!lines.length) {
    return locale === 'en' ? '<p>No order lines registered.</p>' : '<p>Ingen ordrelinjer registrert.</p>';
  }

  const lineItems = lines
    .map((line) => {
      const breed = escapeHtml(line.breedName);
      if (locale === 'en') {
        if (line.roosters > 0) {
          return `<li>${breed}: ${line.hens} hens, ${line.roosters} roosters</li>`;
        }
        return `<li>${breed}: ${line.hens} hens</li>`;
      }

      if (line.roosters > 0) {
        return `<li>${breed}: ${line.hens} høner, ${line.roosters} haner</li>`;
      }
      return `<li>${breed}: ${line.hens} høner</li>`;
    })
    .join('');

  return `<ul>${lineItems}</ul>`;
}

function buildTotalBirdsLabel(hens: number, roosters: number, locale: 'no' | 'en'): string {
  if (locale === 'en') {
    return `${hens} hens, ${roosters} roosters`;
  }
  return `${hens} høner, ${roosters} haner`;
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
    '*, chicken_breeds(*), chicken_order_additions(quantity_hens, quantity_roosters, chicken_breeds(*))';

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

  const summary = summarizeOrder(order);
  const pickupDate = order.pickup_monday ? new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO') : '';
  const orderLinesHtmlNo = buildOrderLinesHtml(summary.lines, 'no');
  const orderLinesHtmlEn = buildOrderLinesHtml(summary.lines, 'en');

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
        breed_name: summary.breedLabel,
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
        order_url: `${appUrl}/min-side?chickenOrderId=${order.id}`,
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
          breed_name: summary.breedLabel,
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
          order_url: `${appUrl}/admin?tab=chicken-orders&orderId=${order.id}`,
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
