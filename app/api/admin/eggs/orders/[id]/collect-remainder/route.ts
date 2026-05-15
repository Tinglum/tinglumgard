import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { buildEggOrderLinesHtml, summarizeEggOrderLines } from '@/lib/eggs/email-lines';
import { supabaseAdmin } from '@/lib/supabase/server';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';

function normalizeEmail(value: unknown): string {
  return String(value || '').trim().toLowerCase();
}

function formatOreToNok(amountOre: number): string {
  return `kr ${Math.round((Number(amountOre) || 0) / 100).toLocaleString('nb-NO')}`;
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
  const requestedAmountOre = Number(body?.amountOre);
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  const sendReceipt = body?.sendReceipt !== false;
  const locale: 'no' | 'en' = body?.locale === 'en' ? 'en' : 'no';

  const { data: order, error } = await supabaseAdmin
    .from('egg_orders')
    .select(
      `id, order_number, customer_name, customer_email, status, total_amount, remainder_amount,
       quantity, price_per_egg, delivery_fee, delivery_method, delivery_monday, week_number, deposit_amount,
       breed_id,
       egg_breeds!egg_orders_breed_id_fkey ( name ),
       egg_order_additions ( quantity, price_per_egg, subtotal, breed_id, egg_breeds!egg_order_additions_breed_id_fkey ( name ) ),
       egg_payments ( payment_type, status, amount_nok )`
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const remainderAmountOre = Number.isFinite(requestedAmountOre) && requestedAmountOre > 0
    ? Math.round(requestedAmountOre)
    : Math.max(0, Math.round(Number(order.remainder_amount || 0)));

  if (remainderAmountOre <= 0) {
    return NextResponse.json({ error: 'Collection amount must be greater than 0' }, { status: 400 });
  }

  // Duplicate guard: check existing completed remainder payments
  const { data: existingRemainderPayments } = await supabaseAdmin
    .from('egg_payments')
    .select('amount_nok, status')
    .eq('egg_order_id', order.id)
    .eq('payment_type', 'remainder')
    .eq('status', 'completed');

  const totalCompletedRemainderOre = (existingRemainderPayments || []).reduce(
    (sum, p) => sum + Math.round((Number(p.amount_nok || 0)) * 100),
    0
  );
  const orderRemainderDueOre = Math.max(0, Math.round(Number(order.remainder_amount || 0)));

  if (totalCompletedRemainderOre >= orderRemainderDueOre && orderRemainderDueOre > 0) {
    return NextResponse.json({ error: 'Remainder already fully collected' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const collectedBy = session.email || session.name || 'admin';

  // Determine next status
  const payments: Array<any> = Array.isArray(order.egg_payments) ? order.egg_payments : [];
  const completedPaymentsAmountOre = payments.reduce((sum, p) => {
    if (p?.status !== 'completed') return sum;
    return sum + Math.round((Number(p?.amount_nok || 0)) * 100);
  }, 0);
  const totalPaidAfterOre = completedPaymentsAmountOre + remainderAmountOre;
  const totalAmountOre = Math.max(0, Math.round(Number(order.total_amount || 0)));
  const nextStatus = totalPaidAfterOre >= totalAmountOre ? 'fully_paid' : 'deposit_paid';

  // Update order status
  const { error: updateError } = await supabaseAdmin
    .from('egg_orders')
    .update({ status: nextStatus })
    .eq('id', order.id);

  if (updateError) {
    throw updateError;
  }

  // Insert remainder payment
  await supabaseAdmin.from('egg_payments').insert({
    egg_order_id: order.id,
    payment_type: 'remainder',
    amount_nok: remainderAmountOre / 100,
    status: 'completed',
    paid_at: nowIso,
    idempotency_key: `manual-collect-${order.id}-${randomBytes(8).toString('hex')}`,
  });

  const customerEmail = normalizeEmail(order.customer_email);
  let queueId: string | null = null;
  let emailError: string | null = null;
  let emailSent = false;

  if (sendReceipt && customerEmail && customerEmail !== VIPPS_PENDING_EMAIL) {
    const appUrl = APP_BASE_URL;

    const eggSummary = summarizeEggOrderLines(order as any, locale);
    const orderLinesHtml = buildEggOrderLinesHtml(eggSummary.lines, locale, {
      deliveryFeeOre: Number(order.delivery_fee || 0),
      deliveryLabel: String(order.delivery_method || ''),
    });
    const eggSummaryEn = locale === 'en' ? eggSummary : summarizeEggOrderLines(order as any, 'en');
    const orderLinesHtmlEn = buildEggOrderLinesHtml(eggSummaryEn.lines, 'en', {
      deliveryFeeOre: Number(order.delivery_fee || 0),
      deliveryLabel: String(order.delivery_method || ''),
    });

    const rendered = await renderManagedTemplate({
      templateKey: 'egg.order.remainder.paid.customer',
      locale,
      variables: {
        customer_name: String(order.customer_name || 'Kunde'),
        order_number: String(order.order_number || ''),
        breed_name: eggSummary.breedLabel || 'Rugeegg',
        base_quantity: eggSummary.baseQuantity,
        additions_quantity: eggSummary.additionsQuantity,
        total_quantity: eggSummary.totalQuantity,
        order_lines_html: orderLinesHtml,
        order_lines_html_en: orderLinesHtmlEn,
        total_amount_nok: formatOreToNok(order.total_amount),
        remainder_amount_nok: formatOreToNok(remainderAmountOre),
        order_url: buildCustomerOrderLink(appUrl, 'egg', String(order.id)),
        tip_index: 1,
      },
    });

    if (!rendered) {
      emailError = 'template_not_found:egg.order.remainder.paid.customer';
    } else {
      const result = await dispatchEmail({
        to: customerEmail,
        subject: rendered.subject,
        html: rendered.html,
        classification: 'transactional',
        templateKey: rendered.templateKey,
        locale,
        sourcePath: '/api/admin/eggs/orders/[id]/collect-remainder',
        productScope: 'eggs',
        flowKey: 'egg.order.remainder.paid.customer',
        entityType: 'egg_order',
        entityId: order.id,
        eggOrderId: order.id,
        metadata: {
          collected_by: collectedBy,
          collection_note: note || null,
        },
      });
      queueId = result.queueId || null;
      emailSent = result.success && !result.skipped;
      if (!emailSent) {
        emailError = result.error || result.skipReason || 'dispatch_failed';
      }
    }
  }

  // Non-blocking admin alert
  const adminEmailAddr = process.env.EMAIL_FROM ? String(process.env.EMAIL_FROM).trim().toLowerCase() : '';
  if (adminEmailAddr) {
    dispatchEmail({
      to: adminEmailAddr,
      subject: `Restbetaling registrert – ${order.order_number}`,
      html: `<p>Restbetaling på ${formatOreToNok(remainderAmountOre)} er registrert manuelt for ordre ${order.order_number} (${order.customer_name}) av ${collectedBy}.</p>`,
      classification: 'system',
      templateKey: 'admin.egg.remainder.collected',
      sourcePath: '/api/admin/eggs/orders/[id]/collect-remainder',
      eggOrderId: order.id,
    }).catch(() => {});
  }

  return NextResponse.json({
    success: true,
    orderId: order.id,
    status: nextStatus,
    remainderCollectedAt: nowIso,
    queueId,
    emailSent,
    emailError,
  });
}
