import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { supabaseAdmin } from '@/lib/supabase/server';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';

function normalizeEmail(value: unknown): string {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function isMissingChickenCollectionColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { message?: string | null; code?: string | null };
  if (candidate.code === '42703') return true;
  const message = String(candidate.message || '');
  return (
    message.includes('remainder_collected_at') ||
    message.includes('remainder_collected_by') ||
    message.includes('remainder_collection_note')
  );
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
    .select(
      'id, order_number, customer_name, customer_email, status, total_amount_nok, remainder_amount_nok, chicken_payments(amount_nok, status, payment_type)'
    )
    .eq('id', params.id)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  const remainderAmountNok = Number.isFinite(requestedAmount)
    ? Math.max(0, Math.round(requestedAmount))
    : Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)));

  if (remainderAmountNok <= 0) {
    return NextResponse.json({ error: 'Collection amount must be greater than 0' }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const collectedBy = session.email || session.name || 'admin';
  const status = String(order.status || '');
  const completedPayments = Array.isArray(order.chicken_payments)
    ? order.chicken_payments.filter((payment) => payment?.status === 'completed')
    : [];
  const alreadyPaidNok = completedPayments.reduce((sum, payment) => {
    return sum + Math.round(Number(payment?.amount_nok || 0));
  }, 0);
  const totalAmountNok = Math.max(0, Math.round(Number(order.total_amount_nok || 0)));
  const totalPaidAfterCollection = alreadyPaidNok + remainderAmountNok;
  const isFullyPaidAfterCollection = totalPaidAfterCollection >= totalAmountNok;
  const nextStatus = isFullyPaidAfterCollection
    ? status === 'ready_for_pickup'
      ? 'ready_for_pickup'
      : 'fully_paid'
    : status === 'ready_for_pickup'
      ? 'ready_for_pickup'
      : 'deposit_paid';

  const { data: existingRemainderPayments } = await supabaseAdmin
    .from('chicken_payments')
    .select('amount_nok, status')
    .eq('chicken_order_id', order.id)
    .eq('payment_type', 'remainder')
    .eq('status', 'completed');

  const totalCompletedRemainder = (existingRemainderPayments || []).reduce(
    (sum, p) => sum + Math.round(Number(p.amount_nok || 0)),
    0
  );
  const orderRemainderDue = Math.max(0, Math.round(Number(order.remainder_amount_nok || 0)));
  if (totalCompletedRemainder >= orderRemainderDue && orderRemainderDue > 0) {
    return NextResponse.json({ error: 'Remainder already fully collected' }, { status: 400 });
  }

  const primaryOrderUpdate = {
    status: nextStatus,
    remainder_payment_enabled: false,
    remainder_collected_at: nowIso,
    remainder_collected_by: collectedBy,
    remainder_collection_note: note || null,
  };

  const { error: updateError } = await supabaseAdmin
    .from('chicken_orders')
    .update(primaryOrderUpdate)
    .eq('id', order.id);

  if (updateError && isMissingChickenCollectionColumn(updateError)) {
    const { error: fallbackUpdateError } = await supabaseAdmin
      .from('chicken_orders')
      .update({
        status: nextStatus,
        remainder_payment_enabled: false,
      })
      .eq('id', order.id);

    if (fallbackUpdateError) {
      throw fallbackUpdateError;
    }
  } else if (updateError) {
    throw updateError;
  }

  await supabaseAdmin.from('chicken_payments').insert({
    chicken_order_id: order.id,
    payment_type: 'remainder',
    amount_nok: remainderAmountNok,
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

  // Non-blocking admin alert
  const adminEmailAddr = process.env.EMAIL_FROM ? String(process.env.EMAIL_FROM).trim().toLowerCase() : '';
  if (adminEmailAddr) {
    dispatchEmail({
      to: adminEmailAddr,
      subject: `Restbetaling registrert – ${order.order_number}`,
      html: `<p>Restbetaling på kr ${remainderAmountNok.toLocaleString('nb-NO')} er registrert manuelt for ordre ${order.order_number} (${order.customer_name}) av ${collectedBy}.</p>`,
      classification: 'system',
      templateKey: 'admin.chicken.remainder.collected',
      sourcePath: '/api/admin/chickens/orders/[id]/collect-remainder',
      chickenOrderId: order.id,
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
