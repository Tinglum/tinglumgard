import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildAdminOrderLink, buildCustomerOrderLink } from '@/lib/email/links';
import { vippsClient } from '@/lib/vipps/api-client';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';

export type ProductScope = 'pig' | 'egg' | 'chicken';

const TABLE: Record<ProductScope, string> = {
  pig: 'orders',
  egg: 'egg_orders',
  chicken: 'chicken_orders',
};

const PRODUCT_LABEL: Record<ProductScope, string> = {
  pig: 'Ullgris',
  egg: 'Rugeegg',
  chicken: 'Kyllinger',
};

const REORDER_PATH: Record<ProductScope, string> = {
  pig: '/produkt',
  egg: '/rugeegg',
  chicken: '/kyllinger',
};

function normalizeEmail(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function formatNok(amount: unknown): string {
  return `kr ${Math.round(Number(amount) || 0).toLocaleString('nb-NO')}`;
}

// Egg amounts are stored in øre; pig/chicken in NOK.
function depositOwedNok(scope: ProductScope, order: any): number {
  if (scope === 'egg') return Math.round(Number(order.deposit_amount || 0) / 100);
  return Math.round(Number(order.deposit_amount_nok ?? order.deposit_amount ?? 0));
}

function dispatchOrderRef(scope: ProductScope, orderId: string) {
  if (scope === 'egg') return { eggOrderId: orderId } as const;
  if (scope === 'chicken') return { chickenOrderId: orderId } as const;
  return { orderId } as const;
}

/**
 * Notify a customer that their unpaid order was cancelled. No-op when the order
 * has no usable contact email (e.g. a Vipps-pending placeholder).
 */
export async function sendOrderCancelledEmail(params: {
  scope: ProductScope;
  order: { id: string; order_number: string; customer_name?: string | null; customer_email?: string | null };
  reasonText?: string;
  sourcePath: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const email = normalizeEmail(params.order.customer_email);
  if (!email || email === VIPPS_PENDING_EMAIL) return { sent: false, reason: 'missing_customer_email' };

  const rendered = await renderManagedTemplate({
    templateKey: 'order.cancelled.customer',
    locale: 'no',
    variables: {
      customer_name: params.order.customer_name || 'Kunde',
      order_number: params.order.order_number,
      product_label: PRODUCT_LABEL[params.scope],
      reason_text:
        params.reasonText ||
        'Betalingen ble ikke fullført i tide, så reservasjonen ble frigitt.',
      order_url: `${APP_BASE_URL}${REORDER_PATH[params.scope]}`,
    },
  });

  if (!rendered) return { sent: false, reason: 'template_not_found' };

  const result = await dispatchEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    classification: 'transactional',
    templateKey: rendered.templateKey,
    sourcePath: params.sourcePath,
    ...dispatchOrderRef(params.scope, params.order.id),
    idempotency: {
      source: 'order-cancelled',
      entity: params.scope === 'egg' ? 'egg_order' : params.scope === 'chicken' ? 'chicken_order' : 'order',
      id: params.order.id,
      template: 'order.cancelled.customer',
    },
  });

  return { sent: result.success && !result.skipped, reason: result.error || result.skipReason };
}

/**
 * Flag an order for manual review, persist the reason, and email the admin.
 */
export async function flagOrderForReview(params: {
  scope: ProductScope;
  order: any;
  reason: string;
  amountOwedNok?: number;
  sourcePath: string;
}): Promise<void> {
  const { scope, order, reason } = params;

  await supabaseAdmin
    .from(TABLE[scope])
    .update({ flagged_for_review: true, flag_reason: reason })
    .eq('id', order.id);

  const adminEmail = normalizeEmail(process.env.EMAIL_FROM ?? '');
  if (!adminEmail) return;

  const rendered = await renderManagedTemplate({
    templateKey: 'admin.order.flagged',
    locale: 'no',
    variables: {
      order_number: order.order_number,
      product_label: PRODUCT_LABEL[scope],
      customer_name: order.customer_name || 'Kunde',
      customer_email: order.customer_email || 'Ikke oppgitt',
      customer_phone: order.customer_phone || 'Ikke oppgitt',
      flag_reason: reason,
      amount_owed_nok: formatNok(params.amountOwedNok ?? depositOwedNok(scope, order)),
      admin_url: buildAdminOrderLink(APP_BASE_URL, scope, String(order.id)),
    },
  });

  if (!rendered) return;

  await dispatchEmail({
    to: adminEmail,
    subject: rendered.subject,
    html: rendered.html,
    classification: 'system',
    templateKey: rendered.templateKey,
    sourcePath: params.sourcePath,
    ...dispatchOrderRef(scope, order.id),
    idempotency: {
      source: 'order-flagged',
      entity: scope === 'egg' ? 'egg_order' : scope === 'chicken' ? 'chicken_order' : 'order',
      id: order.id,
      template: 'admin.order.flagged',
    },
  });
}

/**
 * Send the "Vipps failed but we confirmed your order manually" email to the
 * customer. Payment is still owed — this does not represent a charge.
 */
export async function sendManualConfirmationEmail(params: {
  scope: ProductScope;
  order: any;
  sourcePath: string;
}): Promise<{ sent: boolean; reason?: string }> {
  const email = normalizeEmail(params.order.customer_email);
  if (!email || email === VIPPS_PENDING_EMAIL) return { sent: false, reason: 'missing_customer_email' };

  const rendered = await renderManagedTemplate({
    templateKey: 'order.manual_confirmed.customer',
    locale: 'no',
    variables: {
      customer_name: params.order.customer_name || 'Kunde',
      order_number: params.order.order_number,
      product_label: PRODUCT_LABEL[params.scope],
      amount_owed_nok: formatNok(depositOwedNok(params.scope, params.order)),
      order_url: buildCustomerOrderLink(APP_BASE_URL, params.scope, String(params.order.id)),
    },
  });

  if (!rendered) return { sent: false, reason: 'template_not_found' };

  const result = await dispatchEmail({
    to: email,
    subject: rendered.subject,
    html: rendered.html,
    classification: 'transactional',
    templateKey: rendered.templateKey,
    sourcePath: params.sourcePath,
    ...dispatchOrderRef(params.scope, params.order.id),
    idempotency: {
      source: 'order-manual-confirmed',
      entity: params.scope === 'egg' ? 'egg_order' : params.scope === 'chicken' ? 'chicken_order' : 'order',
      id: params.order.id,
      template: 'order.manual_confirmed.customer',
    },
  });

  return { sent: result.success && !result.skipped, reason: result.error || result.skipReason };
}

/**
 * Mark an order as manually confirmed after repeated Vipps failures.
 * The order is kept in its existing (unpaid) state — no payment is recorded —
 * but it is flagged, the inventory stays reserved, and both the customer and
 * the admin are notified. Idempotent.
 *
 * Eligibility: not already paid, still in a pre-payment state, and at least two
 * payment attempts have been made.
 */
export async function manuallyConfirmOrder(params: {
  scope: ProductScope;
  orderId: string;
  sourcePath: string;
  force?: boolean;
}): Promise<
  | { ok: true; alreadyConfirmed: boolean }
  | { ok: false; reason: string; status?: number }
> {
  const { scope, orderId } = params;
  const paymentsRel = scope === 'egg' ? 'egg_payments' : scope === 'chicken' ? 'chicken_payments' : 'payments';
  const vippsIdCol = scope === 'pig' ? 'vipps_session_id' : 'vipps_order_id';

  const { data: order, error } = await supabaseAdmin
    .from(TABLE[scope])
    .select(`*, ${paymentsRel}(payment_type, status, ${vippsIdCol})`)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return { ok: false, reason: 'order_not_found', status: 404 };

  if (order.manual_confirmation) return { ok: true, alreadyConfirmed: true };

  const payments: Array<{ payment_type: string; status: string; [k: string]: any }> = Array.isArray((order as any)[paymentsRel])
    ? (order as any)[paymentsRel]
    : [];
  const depositPaid = payments.some((p) => p.payment_type === 'deposit' && p.status === 'completed');
  if (depositPaid) return { ok: false, reason: 'already_paid', status: 409 };

  // Guard against a slow webhook: if Vipps actually reports the deposit as paid,
  // don't manually confirm — let the webhook / reconcile cron record the payment.
  const depositPayment = payments.find((p) => p.payment_type === 'deposit' && p[vippsIdCol]);
  if (!params.force && depositPayment) {
    try {
      const session = await vippsClient.getCheckoutSession(String(depositPayment[vippsIdCol]));
      if (session?.sessionState === 'PaymentSuccessful' && session?.paymentDetails?.state === 'AUTHORIZED') {
        return { ok: false, reason: 'already_paid', status: 409 };
      }
    } catch {
      // Session lookup failed (expired/not found) — proceed with manual confirmation.
    }
  }

  const activeStatuses = ['pending', 'draft'];
  if (!params.force && !activeStatuses.includes(String(order.status))) {
    return { ok: false, reason: `not_eligible_status_${order.status}`, status: 409 };
  }

  const attempts = Number(order.payment_attempts) || 0;
  if (!params.force && attempts < 2) {
    return { ok: false, reason: 'too_few_attempts', status: 409 };
  }

  const reason = `Vipps-betaling feilet ${attempts} ganger — bekreftet manuelt, betaling utestående`;

  const { error: updateError } = await supabaseAdmin
    .from(TABLE[scope])
    .update({
      manual_confirmation: true,
      manual_confirmed_at: new Date().toISOString(),
      flagged_for_review: true,
      flag_reason: reason,
    })
    .eq('id', order.id);

  if (updateError) return { ok: false, reason: 'update_failed', status: 500 };

  await sendManualConfirmationEmail({ scope, order, sourcePath: params.sourcePath }).catch(() => {});
  await flagOrderForReview({ scope, order, reason, sourcePath: params.sourcePath }).catch(() => {});

  return { ok: true, alreadyConfirmed: false };
}

export { PRODUCT_LABEL, TABLE as ORDER_TABLE };
