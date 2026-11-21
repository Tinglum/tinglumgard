import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildAdminOrderLink, buildCustomerOrderLink } from '@/lib/email/links';
import { logError } from '@/lib/logger';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';

function formatNok(amount: number): string {
  return `kr ${Math.round(Number(amount || 0)).toLocaleString('nb-NO')}`;
}

export function getPigDeliveryLabel(deliveryType: string): string {
  if (deliveryType === 'pickup_farm') return 'Henting på gården i Namdalseid';
  if (deliveryType === 'pickup_e6') return 'Møtepunkt langs E6 mot Oslo';
  if (deliveryType === 'delivery_trondheim') return 'Henting i Trondheim';
  if (deliveryType === 'pickup_oslo') return 'Henting på Majorstuen, Oslo';
  return deliveryType || 'Avtales';
}

function buildPigExtrasHtml(extraProducts: Array<{ name?: string; quantity?: number; unit_type?: string }>): string {
  if (!Array.isArray(extraProducts) || extraProducts.length === 0) return '';
  let html = '<p><strong>Tilleggsprodukter:</strong></p><ul>';
  for (const extra of extraProducts) {
    html += `<li>${extra.name || 'Tillegg'} (${extra.quantity || 1} ${extra.unit_type || 'stk'})</li>`;
  }
  html += '</ul>';
  return html;
}

export async function sendPigDepositConfirmationEmails(params: {
  orderId: string;
  sourcePath: string;
  includeAdmin?: boolean;
}): Promise<{ ok: boolean; customerSent: boolean; adminSent: boolean; reason?: string }> {
  const { orderId, sourcePath, includeAdmin = true } = params;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || APP_BASE_URL).replace(/\/+$/, '');

  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_email, customer_phone,
      status, ribbe_choice, delivery_type, extra_products,
      total_amount, deposit_amount, remainder_amount,
      referral_discount_amount, rebate_discount_amount,
      confirmation_email_sent_at, flagged_for_review, flag_reason,
      mangalitsa_preset:mangalitsa_box_presets(name_no, name_en, target_weight_kg),
      payments(payment_type, status, amount_nok)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, customerSent: false, adminSent: false, reason: error?.message || 'order_not_found' };
  }

  const preset = Array.isArray(order.mangalitsa_preset) ? order.mangalitsa_preset[0] : order.mangalitsa_preset;
  const boxDisplay = preset?.name_no || preset?.name_en || 'Mangalitsa-boks';
  const completedDeposit = ((order.payments as Array<{ payment_type: string; status: string; amount_nok: number }> | null) || [])
    .find((p) => p.payment_type === 'deposit' && p.status === 'completed');
  const depositPaidNok = Number(completedDeposit?.amount_nok || order.deposit_amount || 0);
  const discountAmount = Number(order.referral_discount_amount || order.rebate_discount_amount || 0);
  const discountLabel = order.referral_discount_amount ? 'Vennerabatt' : 'Rabattkode';
  const deliveryLabel = getPigDeliveryLabel(String(order.delivery_type || ''));
  const extrasHtml = buildPigExtrasHtml((order.extra_products as any[]) || []);

  let customerSent = false;
  let adminSent = false;

  const customerEmail = String(order.customer_email || '').trim().toLowerCase();
  if (customerEmail && customerEmail !== VIPPS_PENDING_EMAIL) {
    try {
      const rendered = await renderManagedTemplate({
        templateKey: 'pig.order.deposit.confirmed.customer',
        locale: 'no',
        variables: {
          customer_name: order.customer_name || 'Kunde',
          order_number: order.order_number,
          box_label: boxDisplay,
          ribbe_choice: order.ribbe_choice || 'Ikke valgt',
          delivery_label: deliveryLabel,
          extras_html: extrasHtml,
          discount_html:
            discountAmount > 0
              ? `<p><strong>${discountLabel}:</strong> -${formatNok(discountAmount)}</p>`
              : '',
          total_amount_nok: formatNok(order.total_amount),
          deposit_amount_nok: formatNok(depositPaidNok),
          remainder_amount_nok: formatNok(order.remainder_amount),
          order_url: buildCustomerOrderLink(appUrl, 'pig', order.id),
          tip_index: 0,
        },
      });

      if (rendered) {
        const res = await dispatchEmail({
          to: customerEmail,
          toPhone: order.customer_phone || undefined,
          subject: rendered.subject,
          html: rendered.html,
          classification: 'transactional',
          templateKey: rendered.templateKey,
          sourcePath,
          orderId: order.id,
        });
        customerSent = Boolean(res.success);
        if (customerSent) {
          const updatePayload: Record<string, unknown> = {
            confirmation_email_sent_at: new Date().toISOString(),
          };
          if (order.flagged_for_review && order.flag_reason === 'Mangler bekreftelse på e-post') {
            updatePayload.flagged_for_review = false;
            updatePayload.flag_reason = null;
          }
          await supabaseAdmin.from('orders').update(updatePayload).eq('id', order.id);
        }
      }
    } catch (err) {
      logError('pig-deposit-confirmation-customer', err, { orderId: order.id });
    }
  }

  const adminEmail = String(process.env.EMAIL_FROM || 'post@tinglum.com').trim().toLowerCase();
  if (includeAdmin && adminEmail) {
    try {
      const renderedAdmin = await renderManagedTemplate({
        templateKey: 'admin.order.deposit.confirmed.pig',
        locale: 'no',
        variables: {
          order_number: order.order_number,
          customer_name: order.customer_name || 'Kunde',
          customer_email: customerEmail || 'Ikke oppgitt',
          customer_phone: order.customer_phone || 'Ikke oppgitt',
          box_label: boxDisplay,
          ribbe_choice: order.ribbe_choice || 'Ikke valgt',
          delivery_label: deliveryLabel,
          extras_html: extrasHtml,
          discount_amount_nok: formatNok(discountAmount),
          deposit_amount_nok: formatNok(depositPaidNok),
          remainder_amount_nok: formatNok(order.remainder_amount),
          total_amount_nok: formatNok(order.total_amount),
          admin_url: buildAdminOrderLink(appUrl, 'pig', order.id),
        },
      });

      if (renderedAdmin) {
        const res = await dispatchEmail({
          to: adminEmail,
          subject: renderedAdmin.subject,
          html: renderedAdmin.html,
          classification: 'system',
          templateKey: renderedAdmin.templateKey,
          sourcePath,
          orderId: order.id,
        });
        adminSent = Boolean(res.success);
      }
    } catch (err) {
      logError('pig-deposit-confirmation-admin', err, { orderId: order.id });
    }
  }

  return { ok: customerSent || adminSent, customerSent, adminSent };
}
