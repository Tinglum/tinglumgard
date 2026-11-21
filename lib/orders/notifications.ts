import crypto from 'node:crypto';
import { supabaseAdmin } from '@/lib/supabase/server';
import { dispatchEmail } from '@/lib/email/dispatch';
import { renderManagedTemplate } from '@/lib/email/render';
import { buildAdminOrderLink, buildCustomerOrderLink } from '@/lib/email/links';
import { logError } from '@/lib/logger';
import { APP_BASE_URL, VIPPS_PENDING_EMAIL } from '@/lib/constants/app';
import {
  PIG_DISPLAY_HOST,
  pigShareLinks,
  qualifyingPigReferrals,
} from '@/lib/pig-campaign';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function formatNok(amount: number): string {
  return `${Math.round(Number(amount || 0)).toLocaleString('nb-NO')} kr`;
}

export function getPigDeliveryLabel(deliveryType: string): string {
  if (deliveryType === 'pickup_farm') return 'Henting på gården i Namdalseid (tid avtales)';
  if (deliveryType === 'pickup_e6') return 'Møtepunkt langs E6 mot Oslo · Mandag 21. desember';
  if (deliveryType === 'delivery_trondheim') return 'Henting i Trondheim · Søndag 20. desember';
  if (deliveryType === 'pickup_oslo') return 'Henting på Majorstuen, Oslo · Mandag 21. desember';
  return deliveryType || 'Avtales';
}

function buildPigExtrasHtml(extraProducts: Array<{ name?: string; quantity?: number; unit_type?: string }>): string {
  if (!Array.isArray(extraProducts) || extraProducts.length === 0) return '';
  const items = extraProducts
    .map((extra) => `<li>${extra.name || 'Tillegg'} (${extra.quantity || 1} ${extra.unit_type || 'stk'})</li>`)
    .join('');
  return `<div style="margin-top:12px;padding-top:12px;border-top:1px solid #d5cebf;font-size:13px"><strong>Tilleggsprodukter:</strong><ul style="margin:6px 0 0 18px;padding:0">${items}</ul></div>`;
}

function generateShortBuyerCode(): string {
  const bytes = crypto.randomBytes(4);
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `VENN${suffix}`;
}

export async function ensurePigOrderReferralCode(order: {
  id: string;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
}): Promise<string | null> {
  const email = String(order.customer_email || '').trim().toLowerCase();
  const phone = String(order.customer_phone || '').trim();

  // 1. Check for a code already linked to this paid order
  const { data: byOrder } = await supabaseAdmin
    .from('referral_codes')
    .select('id, code, is_active, max_uses')
    .eq('order_id', order.id)
    .maybeSingle();

  if (byOrder?.code) {
    if (!byOrder.is_active) {
      await supabaseAdmin.from('referral_codes').update({ is_active: true }).eq('id', byOrder.id);
    }
    return byOrder.code;
  }

  // 2. Check for an existing non-ambassador code for this customer (e.g. from a cancelled prior attempt)
  const filters: string[] = [];
  if (email && email !== VIPPS_PENDING_EMAIL) filters.push(`owner_email.ilike.${email}`);
  if (phone) filters.push(`owner_phone.eq.${phone}`);

  if (filters.length > 0) {
    const { data: existingList } = await supabaseAdmin
      .from('referral_codes')
      .select('id, code, order_id, is_active')
      .or(filters.join(','))
      .not('code', 'ilike', 'JUL26%')
      .order('created_at', { ascending: false })
      .limit(5);

    for (const candidate of existingList || []) {
      let canRepoint = !candidate.order_id;
      if (candidate.order_id) {
        const { data: linkedOrder } = await supabaseAdmin
          .from('orders')
          .select('status')
          .eq('id', candidate.order_id)
          .maybeSingle();
        if (!linkedOrder || ['draft', 'cancelled', 'forfeited'].includes(linkedOrder.status)) {
          canRepoint = true;
        }
      }
      if (canRepoint) {
        await supabaseAdmin
          .from('referral_codes')
          .update({ order_id: order.id, is_active: true, max_uses: 5 })
          .eq('id', candidate.id);
        return candidate.code;
      }
    }
  }

  // 3. Create a fresh personal buyer referral code linked to this paid order
  const ownerPhone = phone || (email ? `email:${email}` : `order:${order.id}`);
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateShortBuyerCode();
    const { error: insertErr } = await supabaseAdmin.from('referral_codes').insert({
      code,
      owner_phone: ownerPhone,
      owner_name: order.customer_name || null,
      owner_email: email && email !== VIPPS_PENDING_EMAIL ? email : null,
      order_id: order.id,
      max_uses: 5,
      current_uses: 0,
      is_active: true,
    });
    if (!insertErr) return code;
  }
  return null;
}

export function buildPigReferralShareBlockHtml(params: {
  code: string;
  originalBoxPrice: number;
  paidFriendsCount: number;
}): string {
  const { code, originalBoxPrice, paidFriendsCount } = params;
  const links = pigShareLinks(code, 'no');
  const displayUrl = `${PIG_DISPLAY_HOST}/?ref=${code}`;
  const perFriend = Math.round(originalBoxPrice * 0.1);
  const maxCredit = Math.round(originalBoxPrice * 0.5);
  const remainingFriends = Math.max(0, 5 - paidFriendsCount);
  const progressLine =
    paidFriendsCount > 0
      ? `<p style="margin:0 0 14px;padding:10px 14px;background:#3a3d33;color:#dfaa8b;font-size:13px"><strong>Status nå:</strong> Du har <strong>${paidFriendsCount} av 5 venner</strong> (${formatNok(paidFriendsCount * perFriend)} i bonus). ${remainingFriends > 0 ? `${remainingFriends} til dekker resten av boksen.` : 'Hele restbeløpet på boksen er dekket!'}</p>`
      : '';

  return `
<div style="background:#292b24;color:#faf6ed;padding:28px 30px;margin:24px 0 0">
  <div style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#dfaa8b;margin:0 0 8px">Din personlige delelenke</div>
  <div style="font-family:'Barlow Condensed','Bahnschrift Condensed','DIN Condensed',Arial,sans-serif;font-weight:700;font-size:32px;line-height:1.02;text-transform:uppercase;color:#faf6ed;margin:0 0 10px">GI VENNER 15 % RABATT.<br><span style="color:#dfaa8b">FÅ RESTEN AV BOKSEN DEKKET.</span></div>
  <p style="margin:0 0 14px;font-size:14px;line-height:1.65;color:#e6e1d5">Hver nye venn som bestiller via lenken din og betaler forskuddet gir deg <strong>${formatNok(perFriend)} i bonus</strong> (10 % av ordinær bokspris). Med <strong>5 venner</strong> får du <strong>${formatNok(maxCredit)}</strong> – da er hele restbeløpet på selve boksen dekket!</p>
  ${progressLine}
  <div style="font-size:12px;color:#c7c8b8;margin:0 0 10px">Trykk på en knapp for å dele ferdig utfylt melding:</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr>
    <td width="25%" style="padding:0 6px 0 0"><a href="${links.whatsapp}" style="display:block;border:1px solid #76796a;color:#faf6ed;text-decoration:none;text-align:center;padding:12px 4px;font-size:12px;font-weight:700">WhatsApp ↗</a></td>
    <td width="25%" style="padding:0 6px 0 0"><a href="${links.facebook}" style="display:block;border:1px solid #76796a;color:#faf6ed;text-decoration:none;text-align:center;padding:12px 4px;font-size:12px;font-weight:700">Facebook ↗</a></td>
    <td width="25%" style="padding:0 6px 0 0"><a href="${links.smsHub}" style="display:block;border:1px solid #76796a;color:#faf6ed;text-decoration:none;text-align:center;padding:12px 4px;font-size:12px;font-weight:700">SMS ↗</a></td>
    <td width="25%" style="padding:0"><a href="${links.instagramHub}" style="display:block;border:1px solid #76796a;color:#faf6ed;text-decoration:none;text-align:center;padding:12px 4px;font-size:12px;font-weight:700">Instagram ↗</a></td>
  </tr></table>
  <p style="margin:14px 0 6px;font-size:13px;color:#e6e1d5">Din personlige lenke: <a href="${links.url}" style="color:#dfaa8b;font-weight:700;text-decoration:underline">${displayUrl}</a></p>
  <p style="margin:0;font-size:11px;line-height:1.55;color:#a9aa9c">Vennene får 15 % rabatt på sin boks. Bonusen trekkes automatisk fra restbeløpet på boksen din (maks 5 venner; transport og tillegg dekkes ikke). <a href="${links.hub}" style="color:#dfaa8b">Åpne delingssiden ↗</a></p>
</div>`;
}

export async function buildPigOrderEmailVariables(orderId: string) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || APP_BASE_URL).replace(/\/+$/, '');
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select(`
      id, order_number, customer_name, customer_email, customer_phone,
      status, ribbe_choice, delivery_type, extra_products,
      total_amount, deposit_amount, remainder_amount, box_price_nok,
      referral_discount_amount, rebate_discount_amount,
      confirmation_email_sent_at, flagged_for_review, flag_reason,
      mangalitsa_preset:mangalitsa_box_presets(name_no, name_en, target_weight_kg, price_nok),
      payments(payment_type, status, amount_nok)
    `)
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;

  const preset = Array.isArray(order.mangalitsa_preset) ? order.mangalitsa_preset[0] : order.mangalitsa_preset;
  const boxDisplay = preset?.name_no || preset?.name_en || 'Mangalitsa-boks';
  const completedDeposit = ((order.payments as Array<{ payment_type: string; status: string; amount_nok: number }> | null) || [])
    .find((p) => p.payment_type === 'deposit' && p.status === 'completed');
  const depositPaidNok = Number(completedDeposit?.amount_nok || order.deposit_amount || 0);
  const discountAmount = Number(order.referral_discount_amount || order.rebate_discount_amount || 0);
  const discountLabel = order.referral_discount_amount ? 'Vennerabatt' : 'Kunderabatt';
  const originalBoxPrice = Number(order.box_price_nok || preset?.price_nok || order.total_amount || 3100);
  const perFriendCredit = Math.round(originalBoxPrice * 0.1);

  const referralCode = await ensurePigOrderReferralCode(order);
  let paidFriendsCount = 0;
  if (referralCode) {
    const { data: codeRow } = await supabaseAdmin
      .from('referral_codes')
      .select('id')
      .eq('code', referralCode)
      .maybeSingle();
    if (codeRow?.id) {
      const { data: refs } = await supabaseAdmin
        .from('referrals')
        .select('id, order_id, referee_phone, referee_email, created_at')
        .eq('referral_code_id', codeRow.id);
      if (refs && refs.length > 0) {
        const refOrderIds = refs.map((r) => r.order_id).filter(Boolean);
        const { data: refOrders } = await supabaseAdmin
          .from('orders')
          .select('id, status, payments(payment_type, status)')
          .in('id', refOrderIds);
        paidFriendsCount = qualifyingPigReferrals(refs as any, (refOrders || []) as any).length;
      }
    }
  }

  const firstName = String(order.customer_name || 'du').trim().split(/\s+/)[0] || 'du';
  const deliveryLabel = getPigDeliveryLabel(String(order.delivery_type || ''));
  const extrasHtml = buildPigExtrasHtml((order.extra_products as any[]) || []);
  const referralShareHtml = referralCode
    ? buildPigReferralShareBlockHtml({ code: referralCode, originalBoxPrice, paidFriendsCount })
    : '';

  return {
    order,
    appUrl,
    customerEmail: String(order.customer_email || '').trim().toLowerCase(),
    referralCode,
    paidFriendsCount,
    variables: {
      customer_name: order.customer_name || 'Kunde',
      customer_first_name: firstName,
      order_number: order.order_number,
      box_label: boxDisplay,
      ribbe_choice: order.ribbe_choice || 'Velges/bekreftet i bestillingen',
      delivery_label: deliveryLabel,
      extras_html: extrasHtml,
      discount_html:
        discountAmount > 0
          ? `<tr><td style="padding:6px 0;color:#b53e2d">${discountLabel}</td><td align="right" style="padding:6px 0;color:#b53e2d"><strong>-${formatNok(discountAmount)}</strong></td></tr>`
          : '',
      total_amount_nok: formatNok(order.total_amount),
      deposit_amount_nok: formatNok(depositPaidNok),
      remainder_amount_nok: formatNok(order.remainder_amount),
      per_friend_credit_nok: formatNok(perFriendCredit),
      paid_friends_count: paidFriendsCount,
      referral_code: referralCode || '',
      referral_url_display: referralCode ? `${PIG_DISPLAY_HOST}/?ref=${referralCode}` : PIG_DISPLAY_HOST,
      referral_share_html: referralShareHtml,
      order_url: buildCustomerOrderLink(appUrl, 'pig', order.id),
      admin_url: buildAdminOrderLink(appUrl, 'pig', order.id),
      tip_index: 0,
    },
    adminVariables: {
      order_number: order.order_number,
      customer_name: order.customer_name || 'Kunde',
      customer_email: String(order.customer_email || '').trim().toLowerCase() || 'Ikke oppgitt',
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
  };
}

export async function sendPigLifecycleEmail(params: {
  orderId: string;
  templateKey: string;
  sourcePath: string;
  overrideTo?: string;
  subjectPrefix?: string;
}): Promise<{ ok: boolean; queueId?: string; reason?: string }> {
  const ctx = await buildPigOrderEmailVariables(params.orderId);
  if (!ctx) return { ok: false, reason: 'order_not_found' };
  const to = (params.overrideTo || ctx.customerEmail).trim().toLowerCase();
  if (!to || to === VIPPS_PENDING_EMAIL) return { ok: false, reason: 'missing_email' };

  const rendered = await renderManagedTemplate({
    templateKey: params.templateKey,
    locale: 'no',
    variables: ctx.variables,
  });
  if (!rendered) return { ok: false, reason: `missing_template:${params.templateKey}` };

  const res = await dispatchEmail({
    to,
    toPhone: params.overrideTo ? undefined : (ctx.order.customer_phone || undefined),
    subject: params.subjectPrefix ? `${params.subjectPrefix}${rendered.subject}` : rendered.subject,
    html: rendered.html,
    classification: 'transactional',
    templateKey: rendered.templateKey,
    sourcePath: params.sourcePath,
    orderId: params.overrideTo ? undefined : ctx.order.id,
  });
  return { ok: Boolean(res.success), queueId: res.queueId, reason: res.error };
}

export async function sendPigDepositConfirmationEmails(params: {
  orderId: string;
  sourcePath: string;
  includeAdmin?: boolean;
}): Promise<{ ok: boolean; customerSent: boolean; adminSent: boolean; reason?: string }> {
  const { orderId, sourcePath, includeAdmin = true } = params;
  const ctx = await buildPigOrderEmailVariables(orderId);
  if (!ctx) {
    return { ok: false, customerSent: false, adminSent: false, reason: 'order_not_found' };
  }

  let customerSent = false;
  let adminSent = false;

  if (ctx.customerEmail && ctx.customerEmail !== VIPPS_PENDING_EMAIL) {
    try {
      const sent = await sendPigLifecycleEmail({
        orderId,
        templateKey: 'pig.order.deposit.confirmed.customer',
        sourcePath,
      });
      customerSent = sent.ok;
      if (customerSent) {
        const updatePayload: Record<string, unknown> = {
          confirmation_email_sent_at: new Date().toISOString(),
        };
        if (ctx.order.flagged_for_review && ctx.order.flag_reason === 'Mangler bekreftelse på e-post') {
          updatePayload.flagged_for_review = false;
          updatePayload.flag_reason = null;
        }
        await supabaseAdmin.from('orders').update(updatePayload).eq('id', ctx.order.id);
      }
    } catch (err) {
      logError('pig-deposit-confirmation-customer', err, { orderId });
    }
  }

  const adminEmail = String(process.env.EMAIL_FROM || 'post@tinglum.com').trim().toLowerCase();
  if (includeAdmin && adminEmail) {
    try {
      const renderedAdmin = await renderManagedTemplate({
        templateKey: 'admin.order.deposit.confirmed.pig',
        locale: 'no',
        variables: ctx.adminVariables,
      });

      if (renderedAdmin) {
        const res = await dispatchEmail({
          to: adminEmail,
          subject: renderedAdmin.subject,
          html: renderedAdmin.html,
          classification: 'system',
          templateKey: renderedAdmin.templateKey,
          sourcePath,
          orderId: ctx.order.id,
        });
        adminSent = Boolean(res.success);
      }
    } catch (err) {
      logError('pig-deposit-confirmation-admin', err, { orderId });
    }
  }

  return { ok: customerSent || adminSent, customerSent, adminSent };
}
