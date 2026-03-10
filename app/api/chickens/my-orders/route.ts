import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function normalizeEmail(value?: string | null): string {
  return String(value || '').trim().toLowerCase()
}

function normalizePhone(value?: string | null): string {
  return String(value || '').trim()
}

function phoneDigits(value?: string | null): string {
  return String(value || '').replace(/\D/g, '')
}

function isEmailMatch(sessionEmail?: string | null, orderEmail?: string | null): boolean {
  const a = normalizeEmail(sessionEmail)
  const b = normalizeEmail(orderEmail)
  if (!a || !b) return false
  return a === b
}

function isPhoneMatch(sessionPhone?: string | null, orderPhone?: string | null): boolean {
  const a = phoneDigits(sessionPhone)
  const b = phoneDigits(orderPhone)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 8 && b.length >= 8) {
    return a.slice(-8) === b.slice(-8)
  }
  return false
}

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const normalizedSessionEmail = normalizeEmail(session.email as string | undefined)
    const normalizedSessionPhone = normalizePhone(session.phoneNumber as string | undefined)
    const sessionPhoneTail = phoneDigits(normalizedSessionPhone).slice(-8)
    const selectColumns = '*, chicken_breeds(*), chicken_payments(*), chicken_order_additions(*)'
    const queries = []

    if (session.userId) {
      queries.push(
        supabaseAdmin
          .from('chicken_orders')
          .select(selectColumns)
          .eq('user_id', session.userId)
      )
    }
    if (normalizedSessionEmail) {
      queries.push(
        supabaseAdmin
          .from('chicken_orders')
          .select(selectColumns)
          .ilike('customer_email', normalizedSessionEmail)
      )
    }
    if (sessionPhoneTail) {
      queries.push(
        supabaseAdmin
          .from('chicken_orders')
          .select(selectColumns)
          .ilike('customer_phone', `%${sessionPhoneTail}`)
      )
    }

    if (queries.length === 0) {
      return NextResponse.json([])
    }

    const results = await Promise.all(queries)
    for (const result of results) {
      if (result.error) {
        console.error('Error fetching chicken orders:', result.error)
        return NextResponse.json({ error: result.error.message }, { status: 500 })
      }
    }

    const combined = new Map<string, any>()
    for (const result of results) {
      for (const order of result.data || []) {
        const ownsByUserId = Boolean(session.userId) && order.user_id === session.userId
        const ownsByEmail = isEmailMatch(normalizedSessionEmail, order.customer_email)
        const ownsByPhone = isPhoneMatch(normalizedSessionPhone, order.customer_phone)

        if (!ownsByUserId && !ownsByEmail && !ownsByPhone) {
          continue
        }

        combined.set(order.id, order)
      }
    }

    const data = Array.from(combined.values())

    // Link anonymous orders once we have a trusted match on email/phone.
    const anonymousMatches = data.filter((order) => !order.user_id).map((order) => order.id)
    if (session.userId && anonymousMatches.length > 0) {
      const { error: linkError } = await supabaseAdmin
        .from('chicken_orders')
        .update({ user_id: session.userId })
        .in('id', anonymousMatches)

      if (linkError) {
        console.warn('Could not link anonymous chicken orders to user:', linkError.message)
      } else {
        for (const order of data) {
          if (!order.user_id) order.user_id = session.userId
        }
      }
    }

    data.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return b.created_at.localeCompare(a.created_at)
    })

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
