import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { supabaseAdmin } from '@/lib/supabase/server';

function normalizeEmail(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
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
  const requestedAmount = Number(body?.amountNok);
  const note = typeof body?.note === 'string' ? body.note.trim() : '';
  const sendReceipt = body?.sendReceipt !== false;
  const locale: 'no' | 'en' = body?.locale === 'en' ? 'en' : 'no';

  const { data: order, error } = await supabaseAdmin
    .from('chicken_orders')
    .select('id, order_number, customer_name, customer_email, status, remainder_amount_nok')
    .eq('id', params.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const remainderAmountNok = Number.isFinite(requestedAmount)
    ? Math.max(0, Math.round(requestedAmount))
    : Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)));

  const nowIso = new Date().toISOString();
  const collectedBy = session.email || session.name || 'admin';
  const status = String(order.status || '');
  const nextStatus = status === 'deposit_paid' || status === 'ready_for_pickup' ? 'fully_paid' : status;

  await supabaseAdmin
    .from('chicken_orders')
    .update({
      status: nextStatus,
      remainder_collected_at: nowIso,
      remainder_collected_by: collectedBy,
      remainder_collection_note: note || null,
    })
    .eq('id', order.id);

  await supabaseAdmin.from('chicken_payments').insert({
    chicken_order_id: order.id,
    payment_type: 'remainder',
    amount_nok: remainderAmountNok,
    status: 'completed',
    paid_at: nowIso,
    idempotency_key: `manual-collect-${order.id}-${Date.now()}`,
  });

  const customerEmail = normalizeEmail(order.customer_email);
  let queueId: string | null = null;
  let emailError: string | null = null;
  let emailSent = false;

  if (sendReceipt && customerEmail && customerEmail !== 'pending@vipps.no') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_BASE_URL || 'https://tinglumgard.no';
    const rendered = await renderManagedTemplate({
      templateKey: 'chicken.remainder.collected',
      locale,
      variables: {
        customer_name: String(order.customer_name || 'Kunde'),
        order_number: String(order.order_number || ''),
        remainder_amount_nok: `kr ${remainderAmountNok.toLocaleString('nb-NO')}`,
        order_url: buildCustomerOrderLink(appUrl, 'chicken', String(order.id)),
      },
    });

    if (!rendered) {
      emailError = 'template_not_found:chicken.remainder.collected';
    } else {
      const result = await dispatchEmail({
        to: customerEmail,
        subject: rendered.subject,
        html: rendered.html,
        classification: 'transactional',
        templateKey: rendered.templateKey,
        locale,
        sourcePath: '/api/admin/chickens/orders/[id]/collect-remainder',
        productScope: 'chickens',
        flowKey: 'chicken.remainder.collected',
        entityType: 'chicken_order',
        entityId: order.id,
        chickenOrderId: order.id,
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

