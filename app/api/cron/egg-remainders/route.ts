import { NextRequest, NextResponse } from 'next/server'
import { getEggAdditionOfferState } from '@/lib/eggs/addition-offer'
import { getDayBeforeOfferAvailabilityForWeek } from '@/lib/eggs/day-before-offer-availability'
import { supabaseAdmin } from '@/lib/supabase/server'
import { dispatchEmail } from '@/lib/email/dispatch'
import { renderManagedTemplate } from '@/lib/email/render'
import { buildCustomerOrderLink } from '@/lib/email/links'
import { sendOrderCancelledEmail } from '@/lib/email/order-resilience'
import { logError } from '@/lib/logger'
import { VIPPS_PENDING_EMAIL, PENDING_ORDER_EXPIRY_HOURS, APP_BASE_URL } from '@/lib/constants/app'

const REMINDER_DAYS = [11, 9, 7, 6]

function toDateOnly(value: string | Date) {
  const date = new Date(value)
  return new Date(date.toISOString().split('T')[0])
}
function daysBetween(future: Date, today: Date) {
  const diffMs = future.getTime() - today.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

function buildReminderHtml(params: {
  customerName: string
  orderNumber: string
  breedName: string
  weekNumber: number
  remainderNok: string
  dueDate: string
  appUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
    .muted { color: #6b7280; font-size: 14px; }
    .amount { font-size: 18px; font-weight: 700; margin: 12px 0; }
    .button { display: inline-block; background: #111827; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">Påminnelse om restbetaling</div>
      <p>Hei ${params.customerName},</p>
      <p class="muted">Bestilling ${params.orderNumber} · ${params.breedName} · Uke ${params.weekNumber}</p>
      <div class="amount">Restbeløp: kr ${params.remainderNok}</div>
      <p>Vennligst betal innen ${params.dueDate} for å beholde bestillingen.</p>
      <p>
        <a class="button" href="${params.appUrl}/rugeegg/mine-bestillinger">Betal restbeløp</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function buildForfeitHtml(params: {
  customerName: string
  orderNumber: string
  breedName: string
  weekNumber: number
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
    .muted { color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">Bestilling kansellert</div>
      <p>Hei ${params.customerName},</p>
      <p class="muted">Bestilling ${params.orderNumber} · ${params.breedName} · Uke ${params.weekNumber}</p>
      <p>Restbetalingen ble ikke mottatt innen fristen. Bestillingen er derfor kansellert og eggene er frigitt.</p>
    </div>
  </div>
</body>
</html>`
}

function buildDayBeforeHtml(params: {
  customerName: string
  orderId: string
  orderNumber: string
  breedName: string
  weekNumber: number
  appUrl: string
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #111827; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 24px; }
    .title { font-size: 20px; font-weight: 700; margin-bottom: 10px; }
    .muted { color: #6b7280; font-size: 14px; }
    .button { display: inline-block; background: #111827; color: #fff; padding: 12px 18px; border-radius: 8px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="title">Levering i morgen</div>
      <p>Hei ${params.customerName},</p>
      <p class="muted">Bestilling ${params.orderNumber} · ${params.breedName} · Uke ${params.weekNumber}</p>
      <p>Rugeeggene sendes i morgen. Du kan legge til ekstra egg i dag med 30% rabatt, så lenge lageret rekker.</p>
      <p>
        <a class="button" href="${params.appUrl}/rugeegg/mine-bestillinger/${params.orderId}/betaling">Legg til egg i dag</a>
      </p>
    </div>
  </div>
</body>
</html>`
}

function resolveBreedName(relation: any) {
  if (!relation) return 'Rugeegg'
  if (Array.isArray(relation)) {
    return relation[0]?.name || 'Rugeegg'
  }
  return relation?.name || 'Rugeegg'
}

async function releaseInventory(inventoryId: string, quantity: number) {
  const { data: inventory, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('eggs_allocated, eggs_available, status')
    .eq('id', inventoryId)
    .single()

  if (inventoryError || !inventory) {
    logError('egg-forfeit-inventory-fetch', inventoryError)
    return
  }

  const nextAllocated = Math.max(0, (inventory.eggs_allocated || 0) - quantity)
  const remainingAfter = inventory.eggs_available - nextAllocated
  let nextStatus = inventory.status
  if (remainingAfter <= 0) {
    nextStatus = 'sold_out'
  } else if (inventory.status === 'sold_out') {
    nextStatus = 'open'
  }

  const { error: updateError } = await supabaseAdmin
    .from('egg_inventory')
    .update({ eggs_allocated: nextAllocated, status: nextStatus })
    .eq('id', inventoryId)

  if (updateError) {
    logError('egg-forfeit-inventory-update', updateError)
  }
}

export async function GET(request: NextRequest) {
  try {
    const secret = process.env.CRON_SECRET
    const token = request.headers.get('x-cron-secret')
    if (secret) {
      if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      const { timingSafeEqual } = await import('crypto')
      const secretBuf = Buffer.from(secret)
      const tokenBuf = Buffer.from(token)
      const valid = secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)
      if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = toDateOnly(new Date())
    const appUrl = APP_BASE_URL

    const { data: pendingOrders, error: pendingError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, customer_email, status, created_at, manual_confirmation, inventory_id, quantity, egg_order_additions(inventory_id, quantity)')
      .eq('status', 'pending')

    if (pendingError) {
      logError('egg-pending-fetch', pendingError)
    } else {
      const cutoff = new Date()
      cutoff.setHours(cutoff.getHours() - PENDING_ORDER_EXPIRY_HOURS)

      for (const order of pendingOrders || []) {
        if (!order.created_at) continue
        if (order.manual_confirmation) continue // Manually confirmed (payment owed) — never auto-cancel
        if (new Date(order.created_at) > cutoff) continue

        await releaseInventory(order.inventory_id, order.quantity)
        for (const addition of order.egg_order_additions || []) {
          await releaseInventory(addition.inventory_id, addition.quantity)
        }

        await supabaseAdmin
          .from('egg_orders')
          .update({
            status: 'cancelled',
            forfeit_reason: 'Deposit not paid in time',
            forfeited_at: new Date().toISOString(),
          })
          .eq('id', order.id)

        await sendOrderCancelledEmail({
          scope: 'egg',
          order,
          reasonText: 'Forskuddet ble ikke betalt innen fristen, så reservasjonen ble frigitt.',
          sourcePath: 'cron.egg-remainders',
        }).catch((e) => logError('egg-pending-cancel-email', e))
      }
    }

    const { data: orders, error } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, customer_email, status, week_number, delivery_monday, remainder_due_date, reminder_11_sent, reminder_9_sent, reminder_7_sent, reminder_6_sent, remainder_amount, inventory_id, quantity, egg_payments(*), egg_breeds(name)')
      .eq('status', 'deposit_paid')

    if (error) {
      logError('egg-reminders-fetch', error)
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 })
    }

    let remindersSent = 0
    let forfeits = 0
    let dayBeforeSent = 0

    for (const order of orders || []) {
      const depositPaid = order.egg_payments?.some(
        (p: any) => p.payment_type === 'deposit' && p.status === 'completed'
      )
      const remainderPaid = order.egg_payments?.some(
        (p: any) => p.payment_type === 'remainder' && p.status === 'completed'
      )

      if (!depositPaid || remainderPaid) continue
      if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue

      const deliveryDate = toDateOnly(order.delivery_monday)
      const daysUntil = daysBetween(deliveryDate, today)
      const remainderDueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null

      if (remainderDueDate && today > remainderDueDate) {
        const { data: additions } = await supabaseAdmin
          .from('egg_order_additions')
          .select('inventory_id, quantity')
          .eq('egg_order_id', order.id)

        await releaseInventory(order.inventory_id, order.quantity)
        for (const addition of additions || []) {
          await releaseInventory(addition.inventory_id, addition.quantity)
        }

        await supabaseAdmin
          .from('egg_orders')
          .update({
            status: 'forfeited',
            forfeited_at: new Date().toISOString(),
            forfeit_reason: 'Remainder not paid by due date',
          })
          .eq('id', order.id)

        const renderedForfeit = await renderManagedTemplate({
          templateKey: 'egg.order.forfeited',
          locale: 'no',
          variables: {
            customer_name: order.customer_name,
            order_number: order.order_number,
            breed_name: resolveBreedName(order.egg_breeds),
            week_number: order.week_number,
          },
        })
        const forfeitHtml = renderedForfeit?.html ?? buildForfeitHtml({
          customerName: order.customer_name,
          orderNumber: order.order_number,
          breedName: resolveBreedName(order.egg_breeds),
          weekNumber: order.week_number,
        })
        const forfeitSubject = renderedForfeit?.subject ?? `Bestilling kansellert - ${order.order_number}`

        await dispatchEmail({
          to: order.customer_email,
          subject: forfeitSubject,
          html: forfeitHtml,
          eggOrderId: order.id,
          classification: 'transactional',
          sourcePath: 'cron.egg-remainders',
          templateKey: 'egg.order.forfeited',
          flowKey: 'egg.remainder.forfeit',
          sendImmediately: true,
        })

        forfeits += 1
        continue
      }

      if (!REMINDER_DAYS.includes(daysUntil)) continue

      const reminderField =
        daysUntil === 11
          ? 'reminder_11_sent'
          : daysUntil === 9
            ? 'reminder_9_sent'
            : daysUntil === 7
              ? 'reminder_7_sent'
              : 'reminder_6_sent'

      if (order[reminderField]) continue

      const dueDateLabel = remainderDueDate
        ? remainderDueDate.toLocaleDateString('nb-NO')
        : deliveryDate.toLocaleDateString('nb-NO')

      const renderedReminder = await renderManagedTemplate({
        templateKey: 'egg.remainder.reminder',
        locale: 'no',
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          breed_name: resolveBreedName(order.egg_breeds),
          week_number: order.week_number,
          remainder_amount_nok: `kr ${Math.round(order.remainder_amount / 100).toLocaleString('nb-NO')}`,
          due_date: dueDateLabel,
          days_left: daysUntil,
          order_url: buildCustomerOrderLink(appUrl, 'egg', order.id),
        },
      })
      const reminderHtml = renderedReminder?.html ?? buildReminderHtml({
        customerName: order.customer_name,
        orderNumber: order.order_number,
        breedName: resolveBreedName(order.egg_breeds),
        weekNumber: order.week_number,
        remainderNok: Math.round(order.remainder_amount / 100).toLocaleString('nb-NO'),
        dueDate: dueDateLabel,
        appUrl,
      })
      const reminderSubject = renderedReminder?.subject ?? `Påminnelse om restbetaling - ${order.order_number}`

      await dispatchEmail({
        to: order.customer_email,
        subject: reminderSubject,
        html: reminderHtml,
        eggOrderId: order.id,
        classification: 'transactional',
        sourcePath: 'cron.egg-remainders',
        templateKey: 'egg.remainder.reminder',
        flowKey: 'egg.remainder.reminder',
        sendImmediately: true,
      })

      await supabaseAdmin
        .from('egg_orders')
        .update({ [reminderField]: true })
        .eq('id', order.id)

      remindersSent += 1
    }

    const { data: paidOrders, error: paidError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, customer_email, status, week_number, delivery_monday, reminder_day_before_sent, egg_breeds(name)')
      .in('status', ['fully_paid', 'preparing'])

    if (paidError) {
      logError('egg-day-before-fetch', paidError)
    } else {
      for (const order of paidOrders || []) {
        if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue
        if (order.reminder_day_before_sent) continue

        const deliveryDate = toDateOnly(order.delivery_monday)
        const daysUntil = daysBetween(deliveryDate, today)
        if (daysUntil !== 1) continue

        const offerState = getEggAdditionOfferState(order.delivery_monday)
        if (!offerState.useActualCollectedStock || offerState.actualCutoffHour !== 12) continue

        const deliveryYear = Number.parseInt(String(order.delivery_monday || '').slice(0, 4), 10)
        if (!deliveryYear || !order.week_number) continue

        const availability = await getDayBeforeOfferAvailabilityForWeek({
          year: deliveryYear,
          weekNumber: Number(order.week_number || 0),
          deliveryMonday: String(order.delivery_monday || ''),
        })

        if (availability.totalAvailable <= 0) continue

        const renderedDayBefore = await renderManagedTemplate({
          templateKey: 'egg.order.add_more.day_before',
          locale: 'no',
          variables: {
            customer_name: order.customer_name,
            order_id: order.id,
            order_number: order.order_number,
            breed_name: resolveBreedName(order.egg_breeds),
            week_number: order.week_number,
            app_url: appUrl,
          },
        })
        const dayBeforeHtml = renderedDayBefore?.html ?? buildDayBeforeHtml({
          customerName: order.customer_name,
          orderId: order.id,
          orderNumber: order.order_number,
          breedName: resolveBreedName(order.egg_breeds),
          weekNumber: order.week_number,
          appUrl,
        })
        const dayBeforeSubject = renderedDayBefore?.subject ?? `Levering i morgen - ${order.order_number}`

        await dispatchEmail({
          to: order.customer_email,
          subject: dayBeforeSubject,
          html: dayBeforeHtml,
          eggOrderId: order.id,
          classification: 'transactional',
          sourcePath: 'cron.egg-remainders',
          templateKey: 'egg.order.add_more.day_before',
          flowKey: 'egg.order.day_before',
          sendImmediately: true,
        })

        await supabaseAdmin
          .from('egg_orders')
          .update({ reminder_day_before_sent: true })
          .eq('id', order.id)

        dayBeforeSent += 1
      }
    }

    // === CHICKEN REMAINDER REMINDERS ===
    const CHICKEN_REMINDER_DAYS = [7, 5, 3, 1]

    const { data: chickenOrders } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, customer_name, customer_email, status, pickup_monday, remainder_due_date, remainder_amount_nok, reminder_7_sent, reminder_5_sent, reminder_3_sent, reminder_1_sent, chicken_breeds(name)')
      .eq('status', 'deposit_paid')
      .eq('remainder_payment_enabled', true)

    let chickenRemindersSent = 0

    for (const order of chickenOrders || []) {
      if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue

      const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
      if (!dueDate) continue

      const daysUntil = daysBetween(dueDate, today)
      if (!CHICKEN_REMINDER_DAYS.includes(daysUntil)) continue

      const reminderField = daysUntil === 7 ? 'reminder_7_sent'
        : daysUntil === 5 ? 'reminder_5_sent'
        : daysUntil === 3 ? 'reminder_3_sent'
        : 'reminder_1_sent'

      if (order[reminderField]) continue

      const breedName = resolveBreedName(order.chicken_breeds)
      const renderedReminder = await renderManagedTemplate({
        templateKey: 'chicken.remainder.reminder',
        locale: 'no',
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          breed_name: breedName,
          remainder_amount_nok: `kr ${Math.round(order.remainder_amount_nok || 0).toLocaleString('nb-NO')}`,
          due_date: dueDate.toLocaleDateString('nb-NO'),
        },
      })

      await dispatchEmail({
        to: order.customer_email,
        subject: renderedReminder?.subject ?? `Påminnelse om restbetaling - ${order.order_number}`,
        html: renderedReminder?.html ?? buildReminderHtml({
          customerName: order.customer_name,
          orderNumber: order.order_number,
          breedName,
          weekNumber: 0,
          remainderNok: Math.round(order.remainder_amount_nok || 0).toLocaleString('nb-NO'),
          dueDate: dueDate.toLocaleDateString('nb-NO'),
          appUrl,
        }),
        chickenOrderId: order.id,
        classification: 'transactional',
        sourcePath: 'cron.egg-remainders',
        templateKey: 'chicken.remainder.reminder',
        sendImmediately: true,
      })

      await supabaseAdmin.from('chicken_orders').update({ [reminderField]: true }).eq('id', order.id)
      chickenRemindersSent += 1
    }

    // === PORK REMAINDER REMINDERS ===
    const PORK_REMINDER_DAYS = [7, 5, 3, 1]

    const { data: porkOrders } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, customer_name, customer_email, status, remainder_due_date')
      .in('status', ['deposit_paid'])
      .eq('remainder_payment_enabled', true)
      .not('remainder_due_date', 'is', null)

    let porkRemindersSent = 0

    for (const order of porkOrders || []) {
      if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue

      const dueDate = order.remainder_due_date ? toDateOnly(order.remainder_due_date) : null
      if (!dueDate) continue

      const daysUntil = daysBetween(dueDate, today)
      if (!PORK_REMINDER_DAYS.includes(daysUntil)) continue

      const renderedReminder = await renderManagedTemplate({
        templateKey: 'pig.order.remainder.reminder',
        locale: 'no',
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          due_date: dueDate.toLocaleDateString('nb-NO'),
        },
      })

      await dispatchEmail({
        to: order.customer_email,
        subject: renderedReminder?.subject ?? `Påminnelse om restbetaling - ${order.order_number}`,
        html: renderedReminder?.html ?? `<p>Hei ${order.customer_name}, husk restbetaling for bestilling ${order.order_number} innen ${dueDate.toLocaleDateString('nb-NO')}.</p>`,
        orderId: order.id,
        classification: 'transactional',
        sourcePath: 'cron.egg-remainders',
        templateKey: 'pig.order.remainder.reminder',
        sendImmediately: true,
      })

      porkRemindersSent += 1
    }

    // === CHICKEN DAY-BEFORE ADDITION OFFER ===
    const { data: chickenReadyOrders } = await supabaseAdmin
      .from('chicken_orders')
      .select('id, order_number, customer_name, customer_email, status, pickup_monday, pickup_week, reminder_day_before_sent, chicken_breeds(name)')
      .in('status', ['fully_paid', 'ready_for_pickup'])

    let chickenDayBeforeSent = 0

    for (const order of chickenReadyOrders || []) {
      if (!order.customer_email || order.customer_email === VIPPS_PENDING_EMAIL) continue
      if (order.reminder_day_before_sent) continue

      const pickupDate = toDateOnly(order.pickup_monday)
      const daysUntil = daysBetween(pickupDate, today)
      if (daysUntil !== 1) continue

      // Check if any hatch has available birds
      const { data: hatches } = await supabaseAdmin
        .from('chicken_hatches')
        .select('id, available_hens, available_roosters, chicken_breeds(name)')
        .gt('available_hens', 0)

      if (!hatches || hatches.length === 0) continue

      const rendered = await renderManagedTemplate({
        templateKey: 'chicken.order.add_more.day_before',
        locale: 'no',
        variables: {
          customer_name: order.customer_name,
          order_number: order.order_number,
          breed_name: resolveBreedName(order.chicken_breeds),
          pickup_week: order.pickup_week ? String(order.pickup_week) : '',
          order_url: `${APP_BASE_URL}/kyllinger/mine-bestillinger/${order.id}`,
        },
      })

      await dispatchEmail({
        to: order.customer_email,
        subject: rendered?.subject ?? `Ekstra kyllinger i morgen? - ${order.order_number}`,
        html: rendered?.html ?? `<p>Hei ${order.customer_name}! Vi har ekstra kyllinger tilgjengelig i morgen. <a href="${APP_BASE_URL}/kyllinger/mine-bestillinger/${order.id}">Legg til her</a>.</p>`,
        chickenOrderId: order.id,
        classification: 'transactional',
        sourcePath: 'cron.egg-remainders',
        templateKey: 'chicken.order.add_more.day_before',
        sendImmediately: true,
      })

      await supabaseAdmin
        .from('chicken_orders')
        .update({ reminder_day_before_sent: true })
        .eq('id', order.id)

      chickenDayBeforeSent += 1
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      forfeits,
      dayBeforeSent,
      chickenRemindersSent,
      porkRemindersSent,
      chickenDayBeforeSent,
    })
  } catch (error) {
    logError('egg-reminders-main', error)
    return NextResponse.json({ error: 'Failed to run reminders' }, { status: 500 })
  }
}
