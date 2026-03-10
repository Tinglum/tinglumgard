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

function normalizeEmail(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase();
}

function formatNok(amount: unknown): string {
  return `kr ${Math.round(Number(amount) || 0).toLocaleString('nb-NO')}`;
}

function getChickenDeliveryLabel(deliveryMethod: string): string {
  if (deliveryMethod === 'farm_pickup') return 'Henting pa gard';
  if (deliveryMethod === 'delivery_namsos_trondheim') return 'Levering Namsos/Trondheim';
  return deliveryMethod || 'Henting';
}

function pickBreedName(relation: ChickenBreedRelation): string {
  const breed = Array.isArray(relation) ? relation[0] : relation;
  return breed?.name_no || breed?.name_en || breed?.name || 'Kyllinger';
}

function summarizeOrder(order: any): { breedLabel: string; hens: number; roosters: number } {
  const baseBreed = pickBreedName(order?.chicken_breeds || null);
  const breedSet = new Set<string>([baseBreed]);

  const additions: ChickenAdditionRelation[] = Array.isArray(order?.chicken_order_additions)
    ? order.chicken_order_additions
    : [];

  let hens = Number(order?.quantity_hens || 0);
  let roosters = Number(order?.quantity_roosters || 0);

  for (const addition of additions) {
    hens += Number(addition?.quantity_hens || 0);
    roosters += Number(addition?.quantity_roosters || 0);
    const breedName = pickBreedName(addition?.chicken_breeds || null);
    if (breedName) breedSet.add(breedName);
  }

  return {
    breedLabel: Array.from(breedSet).join(' + '),
    hens,
    roosters,
  };
}

export async function sendChickenDepositConfirmationEmails(params: {
  orderId: string;
  sourcePath: string;
  includeAdmin?: boolean;
  idempotencySuffix?: string;
}) {
  const includeAdmin = params.includeAdmin !== false;
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    'https://tinglumgard.no';

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
  const pickupDate = order.pickup_monday
    ? new Date(`${order.pickup_monday}T00:00:00`).toLocaleDateString('nb-NO')
    : '';

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
