import { randomBytes } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildCustomerOrderLink } from '@/lib/email/links';
import { supabaseAdmin } from '@/lib/supabase/server';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';
import { logError } from '@/lib/logger';

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

  try {
    const body = await request.json().catch(() => ({}));
    const requestedAmountNok = Number(body?.amountNok);
    const note = typeof body?.note === 'string' ? body.note.trim() : '';
    const sendReceipt = body?.sendReceipt !== false;
    const locale: 'no' | 'en' = body?.locale === 'en' ? 'en' : 'no';

    const { data: order, error } = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_number, customer_name, customer_email, status, total_amount, deposit_amount, remainder_amount, delivery_type, payments(amount_nok, status, payment_type)'
      )
      .eq('id', params.id)
      .maybeSingle();

    if (error || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const remainderAmountNok = Number.isFinite(requestedAmountNok) && requestedAmountNok > 0
      ? Math.max(0, Math.round(requestedAmountNok))
      : Math.max(0, Math.round(Number(order.remainder_amount || 0)));

    if (remainderAmountNok <= 0) {
      return NextResponse.json({ error: 'Collection amount must be greater than 0' }, { status: 400 });
    }

    // Duplicate guard: check existing completed remainder payments
    const { data: existingRemainderPayments } = await supabaseAdmin
      .from('payments')
      .select('amount_nok, status')
      .eq('order_id', order.id)
      .eq('payment_type', 'remainder')
      .eq('status', 'completed');

    const totalCompletedRemainderNok = (existingRemainderPayments || []).reduce(
      (sum, p) => sum + Math.round(Number(p.amount_nok || 0)),
      0
    );
    const orderRemainderDueNok = Math.max(0, Math.round(Number(order.remainder_amount || 0)));

    if (totalCompletedRemainderNok >= orderRemainderDueNok && orderRemainderDueNok > 0) {
      return NextResponse.json({ error: 'Remainder already fully collected' }, { status: 400 });
    }

    const nowIso = new Date().toISOString();
    const collectedBy = session.email || session.name || 'admin';

    // Determine next status
    const completedPayments: Array<any> = Array.isArray(order.payments)
      ? order.payments.filter((p: any) => p?.status === 'completed')
      : [];
    const alreadyPaidNok = completedPayments.reduce((sum, p) => sum + Math.round(Number(p?.amount_nok || 0)), 0);
    const totalAmountNok = Math.max(0, Math.round(Number(order.total_amount || 0)));
    const totalPaidAfterNok = alreadyPaidNok + remainderAmountNok;
    const nextStatus = totalPaidAfterNok >= totalAmountNok ? 'paid' : 'deposit_paid';

    // Update order status
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ status: nextStatus })
      .eq('id', order.id);

    if (updateError) {
      throw updateError;
    }

    // Insert remainder payment
    await supabaseAdmin.from('payments').insert({
      order_id: order.id,
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
      const deliveryLabel = getDeliveryLabel(String(order.delivery_type || ''));

      const rendered = await renderManagedTemplate({
        templateKey: 'pig.order.remainder.paid.customer',
        locale,
        variables: {
          customer_name: String(order.customer_name || 'Kunde'),
          order_number: String(order.order_number || ''),
          delivery_label: deliveryLabel,
          remainder_amount_nok: `kr ${remainderAmountNok.toLocaleString('nb-NO')}`,
          order_url: buildCustomerOrderLink(appUrl, 'pig', String(order.id)),
        },
      });

      if (!rendered) {
        emailError = 'template_not_found:pig.order.remainder.paid.customer';
      } else {
        const result = await dispatchEmail({
          to: customerEmail,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          locale,
          sourcePath: '/api/admin/orders/[id]/collect-remainder',
          productScope: 'pig',
          entityType: 'order',
          entityId: order.id,
          orderId: order.id,
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
        templateKey: 'admin.pig.remainder.collected',
        sourcePath: '/api/admin/orders/[id]/collect-remainder',
        orderId: order.id,
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      orderId: order.id,
      status: nextStatus,
      collectedAt: nowIso,
      emailSent,
      emailError,
      queueId,
    });
  } catch (error: any) {
    logError('admin-orders-collect-remainder', error);
    return NextResponse.json({ error: 'Failed to collect remainder' }, { status: 500 });
  }
}
