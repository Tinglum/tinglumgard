import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { renderManagedTemplate } from '@/lib/email/render'
import { buildAdminOrderLink } from '@/lib/email/links'
import { sendChickenDepositConfirmationEmails } from '@/lib/chickens/notifications'
import { sendEggDepositConfirmationEmail } from '@/lib/eggs/notifications'
import { sendManualConfirmationEmail, type ProductScope } from '@/lib/email/order-resilience'
import { logError } from '@/lib/logger'
import { VIPPS_PENDING_EMAIL, APP_BASE_URL } from '@/lib/constants/app'

/**
 * Daily safety net: every paid/confirmed order must have received a confirmation
 * email. This finds the ones that didn't, resends where possible, flags the rest,
 * and emails the admin a digest. Wired as a GitHub Actions cron.
 *
 * Detection is queue-based (same signal the app uses elsewhere): an order "has a
 * confirmation" if email_dispatch_queue holds a matching template row that is not
 * cancelled/dead.
 */

const LOOKBACK_DAYS = 120
const ACTIVE_EMAIL_STATUSES = ['sent', 'pending', 'processing']

const CONFIRMATION_KEYS: Record<ProductScope, string[]> = {
  pig: ['pig.order.deposit.confirmed.customer', 'pig.order.remainder.paid.customer', 'order.manual_confirmed.customer'],
  egg: ['egg.order.deposit.confirmed.customer', 'egg.order.remainder.paid.customer', 'order.manual_confirmed.customer'],
  chicken: ['chicken.order.deposit.confirmed.customer', 'chicken.order.remainder.paid.customer', 'order.manual_confirmed.customer'],
}

const PAID_STATUSES: Record<ProductScope, string[]> = {
  pig: ['deposit_paid', 'paid', 'fully_paid', 'ready', 'completed'],
  egg: ['deposit_paid', 'fully_paid', 'shipped', 'delivered', 'preparing'],
  chicken: ['deposit_paid', 'fully_paid', 'ready_for_pickup', 'picked_up'],
}

const TABLE: Record<ProductScope, string> = { pig: 'orders', egg: 'egg_orders', chicken: 'chicken_orders' }
const FK: Record<ProductScope, string> = { pig: 'order_id', egg: 'egg_order_id', chicken: 'chicken_order_id' }

type AuditRow = { scope: ProductScope; orderNumber: string; action: 'resent' | 'failed' | 'flagged' }

function authorize(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token')
  return Boolean(token && token === secret)
}

async function hasConfirmationEmail(scope: ProductScope, orderId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('email_dispatch_queue')
    .select('id')
    .eq(FK[scope], orderId)
    .in('template_key', CONFIRMATION_KEYS[scope])
    .in('status', ACTIVE_EMAIL_STATUSES)
    .limit(1)
    .maybeSingle()
  if (error) {
    logError('confirmation-audit-check', error, { scope, orderId })
    return true // fail safe: don't spam resends if the lookup errors
  }
  return Boolean(data?.id)
}

async function resendEgg(orderId: string): Promise<boolean> {
  const { data: order } = await supabaseAdmin
    .from('egg_orders')
    .select(`
      id, order_number, customer_name, customer_email, status,
      total_amount, deposit_amount, remainder_amount, quantity, week_number,
      price_per_egg, delivery_fee, delivery_method, delivery_monday, breed_id,
      egg_breeds!egg_orders_breed_id_fkey ( name ),
      egg_order_additions ( quantity, price_per_egg, subtotal, breed_id, egg_breeds!egg_order_additions_breed_id_fkey ( name ) )
    `)
    .eq('id', orderId)
    .maybeSingle()
  if (!order) return false
  return sendEggDepositConfirmationEmail(order as any, { sourcePath: 'cron.confirmation-email-audit' })
}

export async function GET(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sinceIso = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()
  const results: AuditRow[] = []
  let missing = 0
  let resent = 0
  let failed = 0

  for (const scope of ['chicken', 'egg', 'pig'] as ProductScope[]) {
    const { data: orders, error } = await supabaseAdmin
      .from(TABLE[scope])
      .select('id, order_number, customer_name, customer_email, status, manual_confirmation, confirmation_email_sent_at')
      .gte('created_at', sinceIso)
      .or(`status.in.(${PAID_STATUSES[scope].join(',')}),manual_confirmation.eq.true`)
      .limit(500)

    if (error) {
      logError('confirmation-audit-fetch', error, { scope })
      continue
    }

    for (const order of orders || []) {
      const email = String(order.customer_email || '').trim().toLowerCase()
      if (!email || email === VIPPS_PENDING_EMAIL) continue
      if (order.confirmation_email_sent_at) continue
      if (await hasConfirmationEmail(scope, order.id)) {
        // Backfill the stamp so we skip it cheaply next time.
        await supabaseAdmin.from(TABLE[scope]).update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', order.id)
        continue
      }

      missing += 1
      let sent = false
      try {
        if (order.manual_confirmation) {
          const r = await sendManualConfirmationEmail({ scope, order, sourcePath: 'cron.confirmation-email-audit' })
          sent = r.sent
        } else if (scope === 'chicken') {
          const r = await sendChickenDepositConfirmationEmails({ orderId: order.id, sourcePath: 'cron.confirmation-email-audit', includeAdmin: false })
          sent = r.ok && r.customerSent
        } else if (scope === 'egg') {
          sent = await resendEgg(order.id)
        }
        // pig: no automatic resend helper — flagged for manual admin resend below.
      } catch (e) {
        logError('confirmation-audit-resend', e, { scope, orderId: order.id })
      }

      if (sent) {
        resent += 1
        await supabaseAdmin.from(TABLE[scope]).update({ confirmation_email_sent_at: new Date().toISOString() }).eq('id', order.id)
        results.push({ scope, orderNumber: order.order_number, action: 'resent' })
      } else {
        failed += 1
        await supabaseAdmin.from(TABLE[scope]).update({ flagged_for_review: true, flag_reason: 'Mangler bekreftelse på e-post' }).eq('id', order.id)
        results.push({ scope, orderNumber: order.order_number, action: scope === 'pig' ? 'flagged' : 'failed' })
      }
    }
  }

  // Email the admin a digest only when there was something to report.
  if (missing > 0) {
    const adminEmail = String(process.env.EMAIL_FROM || '').trim().toLowerCase()
    if (adminEmail) {
      const rowsHtml = results
        .map(
          (r) =>
            `<tr><td style="padding:4px 0;font-size:13px;color:#6B5B4E;">${r.scope} · ${r.orderNumber}</td><td style="padding:4px 0;font-size:13px;color:#1C1210;text-align:right;">${r.action}</td></tr>`
        )
        .join('')
      const detailsHtml = rowsHtml
        ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 0;border:1px solid #E8DFD5;border-radius:8px;"><tr><td style="padding:12px 16px;"><table role="presentation" width="100%">${rowsHtml}</table></td></tr></table>`
        : ''

      try {
        const rendered = await renderManagedTemplate({
          templateKey: 'admin.confirmation.audit',
          locale: 'no',
          variables: {
            missing_count: missing,
            resent_count: resent,
            failed_count: failed,
            details_html: detailsHtml,
            admin_url: `${APP_BASE_URL}/admin?tab=orders`,
          },
        })
        if (rendered) {
          await dispatchEmail({
            to: adminEmail,
            subject: rendered.subject,
            html: rendered.html,
            classification: 'system',
            templateKey: rendered.templateKey,
            sourcePath: 'cron.confirmation-email-audit',
            idempotency: {
              source: 'confirmation-audit',
              entity: 'digest',
              id: new Date().toISOString().slice(0, 10), // one digest per day
              template: 'admin.confirmation.audit',
            },
          })
        }
      } catch (e) {
        logError('confirmation-audit-digest', e)
      }
    }
  }

  return NextResponse.json({ ok: true, missing, resent, failed, results })
}
