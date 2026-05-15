import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { renderManagedTemplate } from '@/lib/email/render'
import { dispatchEmail } from '@/lib/email/dispatch'
import { buildCustomerOrderLink } from '@/lib/email/links'
import { logError } from '@/lib/logger'

// POST /api/admin/eggs/orders/[id]/send-pickup-email
// Manually sends the "choose your pickup day" email to the customer.
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, customer_email, status, delivery_method, week_number, delivery_monday')
      .eq('id', params.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    if (!order.customer_email) {
      return NextResponse.json({ error: 'Order has no customer email' }, { status: 400 })
    }

    if (!['farm_pickup', 'e6_pickup'].includes(String(order.delivery_method || ''))) {
      return NextResponse.json(
        { error: 'Pickup email is only relevant for farm_pickup and e6_pickup orders' },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    const orderUrl = buildCustomerOrderLink(appUrl, 'egg', String(order.id))

    const rendered = await renderManagedTemplate({
      templateKey: 'egg.pickup.choose_day',
      locale: 'no',
      variables: {
        customer_name: String(order.customer_name || 'Kunde'),
        order_number: String(order.order_number || ''),
        delivery_week: String(order.week_number || ''),
        order_url: orderUrl,
      },
    })

    if (!rendered) {
      return NextResponse.json({ error: 'Template not found: egg.pickup.choose_day' }, { status: 500 })
    }

    await dispatchEmail({
      to: order.customer_email,
      subject: rendered.subject,
      html: rendered.html,
      classification: 'transactional',
      locale: 'no',
      sourcePath: '/api/admin/eggs/orders/[id]/send-pickup-email',
      eggOrderId: String(order.id),
      templateKey: rendered.templateKey,
      metadata: { flow_key: 'egg.pickup.choose_day', manual_send: true },
    })

    return NextResponse.json({ success: true, to: order.customer_email, orderNumber: order.order_number })
  } catch (error) {
    logError('admin-eggs-orders-send-pickup-email', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
