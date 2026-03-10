import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function isUuid(value?: string | null): boolean {
  if (!value) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

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

function isPhoneMatch(
  sessionPhone?: string | null,
  orderPhone?: string | null,
  allowShortSuffix = false
): boolean {
  const a = phoneDigits(sessionPhone)
  const b = phoneDigits(orderPhone)
  if (!a || !b) return false
  if (a === b) return true
  if (a.length >= 8 && b.length >= 8) {
    return a.slice(-8) === b.slice(-8)
  }
  if (allowShortSuffix) {
    const shorter = a.length <= b.length ? a : b
    const longer = a.length > b.length ? a : b
    if (shorter.length >= 4 && longer.endsWith(shorter)) {
      return true
    }
  }
  return false
}

function isMissingRelationError(error: any): boolean {
  const message = String(error?.message || '').toLowerCase()
  const details = String(error?.details || '').toLowerCase()
  const hint = String(error?.hint || '').toLowerCase()
  const combined = `${message} ${details} ${hint}`
  return (
    combined.includes('chicken_order_additions') ||
    combined.includes('chicken_payments') ||
    combined.includes('schema cache') ||
    combined.includes('does not exist')
  )
}

export async function GET() {
  const session = await getSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const normalizedSessionEmail = normalizeEmail(session.email as string | undefined)
    const normalizedSessionPhone = normalizePhone(session.phoneNumber as string | undefined)
    const isImpersonating = Boolean((session as any).isImpersonating)
    const sessionPhoneDigits = phoneDigits(normalizedSessionPhone)
    const sessionPhoneTail = sessionPhoneDigits.length >= 8
      ? sessionPhoneDigits.slice(-8)
      : (isImpersonating && sessionPhoneDigits.length >= 4 ? sessionPhoneDigits : '')
    const selectColumns = '*, chicken_breeds(*), chicken_payments(*), chicken_order_additions(*)'

    const buildQueries = (columns: string) => {
      const queries = []

      if (isUuid(session.userId)) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select(columns)
            .eq('user_id', session.userId)
        )
      }
      if (normalizedSessionEmail) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select(columns)
            .ilike('customer_email', `%${normalizedSessionEmail}%`)
        )
      }
      if (sessionPhoneTail) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select(columns)
            .ilike('customer_phone', `%${sessionPhoneTail}`)
        )
      }

      return queries
    }

    let queries = buildQueries(selectColumns)

    if (queries.length === 0) {
      return NextResponse.json([])
    }

    let results = await Promise.all(queries)
    const hasQueryError = results.some((result) => Boolean(result.error))

    if (hasQueryError) {
      const canFallback = results.every((result) => !result.error || isMissingRelationError(result.error))
      if (!canFallback) {
        const firstError = results.find((result) => result.error)?.error
        console.error('Error fetching chicken orders:', firstError)
        return NextResponse.json({ error: firstError?.message || 'Failed to load chicken orders' }, { status: 500 })
      }

      queries = buildQueries('*')
      results = await Promise.all(queries)
      const fallbackError = results.find((result) => result.error)?.error
      if (fallbackError) {
        console.error('Error fetching chicken orders (fallback):', fallbackError)
        return NextResponse.json({ error: fallbackError.message }, { status: 500 })
      }
    }

    const combined = new Map<string, any>()
    for (const result of results) {
      for (const order of (result.data as Array<any>) || []) {
        const ownsByUserId = Boolean(session.userId) && order.user_id === session.userId
        const ownsByEmail = isEmailMatch(normalizedSessionEmail, order.customer_email)
        const ownsByPhone = isPhoneMatch(normalizedSessionPhone, order.customer_phone, isImpersonating)

        if (!ownsByUserId && !ownsByEmail && !ownsByPhone) {
          continue
        }

        combined.set(order.id, order)
      }
    }

    // Extra safety where existing rows may have inconsistent formatting/casing.
    if (combined.size === 0 && (normalizedSessionEmail || normalizedSessionPhone)) {
      const { data: recentOrders, error: recentError } = await supabaseAdmin
        .from('chicken_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)

      if (!recentError) {
        for (const order of (recentOrders as Array<any>) || []) {
          const ownsByEmail = isEmailMatch(normalizedSessionEmail, order.customer_email)
          const ownsByPhone = isPhoneMatch(normalizedSessionPhone, order.customer_phone, isImpersonating)
          if (ownsByEmail || ownsByPhone) {
            combined.set(order.id, order)
          }
        }
      }
    }

    const data = Array.from(combined.values())

    // Link anonymous orders once we have a trusted match on email/phone.
    const anonymousMatches = data.filter((order) => !order.user_id).map((order) => order.id)
    if (isUuid(session.userId) && anonymousMatches.length > 0) {
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
