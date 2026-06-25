import { NextRequest, NextResponse } from 'next/server'
import { manuallyConfirmOrder } from '@/lib/email/order-resilience'

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

/**
 * POST /api/orders/[id]/manual-confirm  (pig / Mangalitsa)
 * Called by the confirmation page after a second failed Vipps attempt.
 * Confirms the order manually (payment still owed), flags it, and notifies admin.
 */
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const orderId = String(params.id || '').trim()
  if (!orderId || !isUuid(orderId)) {
    return NextResponse.json({ error: 'Invalid order id' }, { status: 400 })
  }

  const result = await manuallyConfirmOrder({
    scope: 'pig',
    orderId,
    sourcePath: '/api/orders/[id]/manual-confirm',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: result.status || 400 })
  }

  return NextResponse.json({ success: true, alreadyConfirmed: result.alreadyConfirmed })
}
