import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/email/client'
import { logError } from '@/lib/logger'

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
      <p>Rugeeggene sendes i morgen. Du finner bestillingen på Min side.</p>
      <p>
        <a class="button" href="${params.appUrl}/rugeegg/mine-bestillinger">Gå til Min side</a>
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
    const token = request.headers.get('x-cron-secret') || request.nextUrl.searchParams.get('token')
    if (secret && token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = toDateOnly(new Date())
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tinglum.no'

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
      if (!order.customer_email || order.customer_email === 'pending@vipps.no') continue

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

        await sendEmail({
          to: order.customer_email,
          subject: `Bestilling kansellert - ${order.order_number}`,
          html: buildForfeitHtml({
            customerName: order.customer_name,
            orderNumber: order.order_number,
            breedName: resolveBreedName(order.egg_breeds),
            weekNumber: order.week_number,
          }),
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

      await sendEmail({
        to: order.customer_email,
        subject: `Påminnelse om restbetaling - ${order.order_number}`,
        html: buildReminderHtml({
          customerName: order.customer_name,
          orderNumber: order.order_number,
          breedName: resolveBreedName(order.egg_breeds),
          weekNumber: order.week_number,
          remainderNok: Math.round(order.remainder_amount / 100).toLocaleString('nb-NO'),
          dueDate: dueDateLabel,
          appUrl,
        }),
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
        if (!order.customer_email || order.customer_email === 'pending@vipps.no') continue
        if (order.reminder_day_before_sent) continue

        const deliveryDate = toDateOnly(order.delivery_monday)
        const daysUntil = daysBetween(deliveryDate, today)
        if (daysUntil !== 1) continue

        await sendEmail({
          to: order.customer_email,
          subject: `Levering i morgen - ${order.order_number}`,
          html: buildDayBeforeHtml({
            customerName: order.customer_name,
            orderNumber: order.order_number,
            breedName: resolveBreedName(order.egg_breeds),
            weekNumber: order.week_number,
            appUrl,
          }),
        })

        await supabaseAdmin
          .from('egg_orders')
          .update({ reminder_day_before_sent: true })
          .eq('id', order.id)

        dayBeforeSent += 1
      }
    }

    return NextResponse.json({
      success: true,
      remindersSent,
      forfeits,
      dayBeforeSent,
    })
  } catch (error) {
    logError('egg-reminders-main', error)
    return NextResponse.json({ error: 'Failed to run reminders' }, { status: 500 })
  }
}

