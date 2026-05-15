import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

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

function toNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toDateOnly(value?: string | null): Date | null {
  if (!value) return null
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return null
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function getMondayOfIsoWeek(year: number, week: number): Date | null {
  if (!Number.isFinite(year) || !Number.isFinite(week) || week <= 0) return null
  const jan4 = new Date(Date.UTC(year, 0, 4))
  const day = jan4.getUTCDay() || 7
  const mondayWeek1 = new Date(jan4)
  mondayWeek1.setUTCDate(jan4.getUTCDate() - day + 1)
  const monday = new Date(mondayWeek1)
  monday.setUTCDate(mondayWeek1.getUTCDate() + (week - 1) * 7)
  return monday
}

function getAgeWeeks(hatchDate?: string | null, pickupDate?: Date | null): number {
  const hatch = toDateOnly(hatchDate)
  if (!hatch || !pickupDate) return 0
  const diffMs = pickupDate.getTime() - hatch.getTime()
  if (!Number.isFinite(diffMs) || diffMs < 0) return 0
  return Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000))
}

function normalizeChickenOrderFinancials<T extends Record<string, any>>(order: T): T {
  const additionsSubtotal = ((order.chicken_order_additions as Array<any> | undefined) || []).reduce(
    (sum, row) => sum + toNumber(row?.subtotal_nok),
    0
  )
  const baseByPricing =
    toNumber(order.quantity_hens) * toNumber(order.price_per_hen_nok) +
    toNumber(order.quantity_roosters) * toNumber(order.price_per_rooster_nok)
  const deliveryFee = toNumber(order.delivery_fee_nok)
  const totalAmount = toNumber(order.total_amount_nok)
  const expectedBaseFromTotal = Math.max(0, totalAmount - deliveryFee - additionsSubtotal)
  const shouldReconcile =
    totalAmount > 0 && Math.abs(baseByPricing + additionsSubtotal + deliveryFee - totalAmount) > 1

  return {
    ...order,
    subtotal_nok: shouldReconcile ? expectedBaseFromTotal : baseByPricing,
  }
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
    const buildQueries = () => {
      const queries = []

      if (isUuid(session.userId)) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select('*')
            .eq('user_id', session.userId)
        )
      }
      if (normalizedSessionEmail) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select('*')
            .ilike('customer_email', `%${normalizedSessionEmail}%`)
        )
      }
      if (sessionPhoneTail) {
        queries.push(
          supabaseAdmin
            .from('chicken_orders')
            .select('*')
            .ilike('customer_phone', `%${sessionPhoneTail}`)
        )
      }

      return queries
    }

    const queries = buildQueries()

    if (queries.length === 0) {
      return NextResponse.json([])
    }

    const results = await Promise.all(queries)
    const firstError = results.find((result) => result.error)?.error
    if (firstError) {
      logError('chickens-my-orders-fetch', firstError)
      return NextResponse.json({ error: firstError.message || 'Failed to load chicken orders' }, { status: 500 })
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

    const orderIds = data
      .map((order) => String(order.id || '').trim())
      .filter((id) => Boolean(id))

    const paymentsByOrder = new Map<string, any[]>()
    const additionsByOrder = new Map<string, any[]>()
    const breedById = new Map<string, any>()
    const hatchById = new Map<string, { id: string; hatch_date: string }>()

    if (orderIds.length > 0) {
      const [{ data: paymentRows, error: paymentError }, { data: additionRows, error: additionError }] =
        await Promise.all([
          supabaseAdmin.from('chicken_payments').select('*').in('chicken_order_id', orderIds),
          supabaseAdmin.from('chicken_order_additions').select('*').in('chicken_order_id', orderIds),
        ])

      if (paymentError) {
        logError('chickens-my-orders-payments', paymentError)
      } else {
        for (const row of (paymentRows as Array<any>) || []) {
          const key = String(row.chicken_order_id || '')
          if (!paymentsByOrder.has(key)) paymentsByOrder.set(key, [])
          paymentsByOrder.get(key)!.push(row)
        }
      }

      if (additionError) {
        logError('chickens-my-orders-additions', additionError)
      } else {
        for (const row of (additionRows as Array<any>) || []) {
          const key = String(row.chicken_order_id || '')
          if (!additionsByOrder.has(key)) additionsByOrder.set(key, [])
          additionsByOrder.get(key)!.push(row)
        }
      }

      const breedIds = new Set<string>()
      for (const order of data) {
        const breedId = String(order.breed_id || '').trim()
        if (breedId) breedIds.add(breedId)
      }
      for (const rows of Array.from(additionsByOrder.values())) {
        for (const row of rows) {
          const breedId = String(row.breed_id || '').trim()
          if (breedId) breedIds.add(breedId)
        }
      }

      if (breedIds.size > 0) {
        const { data: breedRows, error: breedError } = await supabaseAdmin
          .from('chicken_breeds')
          .select('*')
          .in('id', Array.from(breedIds))

        if (breedError) {
          logError('chickens-my-orders-breeds', breedError)
        } else {
          for (const breed of (breedRows as Array<any>) || []) {
            breedById.set(String(breed.id), breed)
          }
        }
      }

      const hatchIds = new Set<string>()
      for (const order of data) {
        const hatchId = String(order.hatch_id || '').trim()
        if (hatchId) hatchIds.add(hatchId)
      }
      for (const rows of Array.from(additionsByOrder.values())) {
        for (const row of rows) {
          const hatchId = String(row.hatch_id || '').trim()
          if (hatchId) hatchIds.add(hatchId)
        }
      }

      if (hatchIds.size > 0) {
        const { data: hatchRows, error: hatchError } = await supabaseAdmin
          .from('chicken_hatches')
          .select('id, hatch_date')
          .in('id', Array.from(hatchIds))

        if (hatchError) {
          logError('chickens-my-orders-hatches', hatchError)
        } else {
          for (const hatch of (hatchRows as Array<any>) || []) {
            hatchById.set(String(hatch.id), hatch)
          }
        }
      }
    }

    const enriched = data.map((order) => {
      const orderId = String(order.id || '')
      const pickupDate =
        toDateOnly(order.pickup_monday) ||
        getMondayOfIsoWeek(Number(order.pickup_year || 0), Number(order.pickup_week || 0))

      const baseHatch = hatchById.get(String(order.hatch_id || '')) || null

      const additions = (additionsByOrder.get(orderId) || []).map((addition) => {
        const breedId = String(addition.breed_id || '')
        const hatchId = String(addition.hatch_id || '')
        const hatch = hatchById.get(hatchId) || null
        const explicitAge = toNumber(addition.age_weeks_at_pickup)
        const computedAge = getAgeWeeks(hatch?.hatch_date || null, pickupDate)
        return {
          ...addition,
          chicken_breeds: breedById.get(breedId) || null,
          chicken_hatches: hatch,
          age_weeks_at_pickup: explicitAge > 0 ? explicitAge : computedAge,
        }
      })
      const baseBreed = breedById.get(String(order.breed_id || '')) || null
      const explicitBaseAge = toNumber(order.age_weeks_at_pickup)
      const computedBaseAge = getAgeWeeks(baseHatch?.hatch_date || null, pickupDate)
      return {
        ...order,
        chicken_breeds: baseBreed,
        chicken_hatches: baseHatch,
        age_weeks_at_pickup: explicitBaseAge > 0 ? explicitBaseAge : computedBaseAge,
        chicken_payments: paymentsByOrder.get(orderId) || [],
        chicken_order_additions: additions,
      }
    })

    const normalized = enriched.map((order) => normalizeChickenOrderFinancials(order))

    // Link anonymous orders once we have a trusted match on email/phone.
    const anonymousMatches = normalized.filter((order) => !order.user_id).map((order) => order.id)
    if (isUuid(session.userId) && anonymousMatches.length > 0) {
      const { error: linkError } = await supabaseAdmin
        .from('chicken_orders')
        .update({ user_id: session.userId })
        .in('id', anonymousMatches)

      if (linkError) {
        console.warn('Could not link anonymous chicken orders to user:', linkError.message)
      } else {
        for (const order of normalized) {
          if (!order.user_id) order.user_id = session.userId
        }
      }
    }

    normalized.sort((a, b) => {
      if (!a.created_at || !b.created_at) return 0
      return b.created_at.localeCompare(a.created_at)
    })

    return NextResponse.json(normalized)
  } catch (error: any) {
    logError('chickens-my-orders-get', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
