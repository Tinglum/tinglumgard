import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Returns ISO week number + year for a Monday date
function isoWeekOf(monday: Date): { year: number; week: number } {
  const jan4 = new Date(monday.getFullYear(), 0, 4)
  const startOfWeek1 = new Date(jan4)
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7))
  const diff = (monday.getTime() - startOfWeek1.getTime()) / 86400000
  const week = Math.floor(diff / 7) + 1
  if (week < 1) {
    return isoWeekOf(new Date(monday.getFullYear() - 1, 11, 28))
  }
  if (week > 52) {
    const dec28 = new Date(monday.getFullYear(), 11, 28)
    const dec28Week = isoWeekOf(dec28).week
    if (week > dec28Week) return { year: monday.getFullYear() + 1, week: 1 }
  }
  return { year: monday.getFullYear(), week }
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function nextMonday(from: Date): Date {
  const d = new Date(from)
  const day = d.getDay()
  const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7 || 7
  d.setDate(d.getDate() + daysUntilMonday)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * POST /api/admin/eggs/inventory/bulk-restore
 * Body: { breed_id: string, eggs_per_week: number, until?: string (YYYY-MM-DD) }
 *
 * Creates or restores egg_inventory rows for each upcoming Monday up to `until`
 * (defaults to July 31 of current year). Sets eggs_available, status=open,
 * manual_override=true so future forecast syncs don't overwrite the values.
 */
export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

  try {
    const body = await request.json()
    const breedId: string = body.breed_id
    const eggsPerWeek: number = Number(body.eggs_per_week)
    const untilStr: string = body.until || `${new Date().getFullYear()}-07-31`

    if (!breedId) return NextResponse.json({ error: 'breed_id is required' }, { status: 400 })
    if (!Number.isInteger(eggsPerWeek) || eggsPerWeek < 0) {
      return NextResponse.json({ error: 'eggs_per_week must be a non-negative integer' }, { status: 400 })
    }

    const untilDate = new Date(`${untilStr}T23:59:59`)
    if (Number.isNaN(untilDate.getTime())) {
      return NextResponse.json({ error: 'Invalid until date' }, { status: 400 })
    }

    // Build list of upcoming Mondays
    const mondays: Date[] = []
    let cursor = nextMonday(new Date())
    while (cursor <= untilDate) {
      mondays.push(new Date(cursor))
      cursor.setDate(cursor.getDate() + 7)
    }

    if (mondays.length === 0) {
      return NextResponse.json({ updated: 0, created: 0, weeks: [] })
    }

    // Load existing rows for this breed in the date range
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, year, week_number, eggs_allocated')
      .eq('breed_id', breedId)
      .gte('delivery_monday', toDateStr(mondays[0]))
      .lte('delivery_monday', toDateStr(mondays[mondays.length - 1]))

    if (fetchErr) throw fetchErr

    const existingMap = new Map<string, { id: string; eggs_allocated: number }>()
    for (const row of existing || []) {
      existingMap.set(`${row.year}-${row.week_number}`, { id: row.id, eggs_allocated: row.eggs_allocated || 0 })
    }

    let updated = 0
    let created = 0
    const weeks: string[] = []

    for (const monday of mondays) {
      const { year, week } = isoWeekOf(monday)
      const key = `${year}-${week}`
      const deliveryMonday = toDateStr(monday)
      const safeEggs = Math.max(eggsPerWeek, existingMap.get(key)?.eggs_allocated || 0)
      const status = safeEggs > 0 ? 'open' : 'sold_out'

      if (existingMap.has(key)) {
        await supabaseAdmin
          .from('egg_inventory')
          .update({
            eggs_available: safeEggs,
            manual_override: true,
            manual_adjustment: safeEggs,
            forecast_source: 'manual',
            status,
          })
          .eq('id', existingMap.get(key)!.id)
        updated++
      } else {
        await supabaseAdmin
          .from('egg_inventory')
          .insert({
            breed_id: breedId,
            year,
            week_number: week,
            delivery_monday: deliveryMonday,
            eggs_available: safeEggs,
            eggs_allocated: 0,
            auto_forecast_eggs: safeEggs,
            manual_adjustment: safeEggs,
            manual_override: true,
            forecast_source: 'manual',
            status,
          })
        created++
      }
      weeks.push(`${year} Uke ${week} (${deliveryMonday})`)
    }

    return NextResponse.json({ updated, created, weeks })
  } catch (error) {
    logError('inventory-bulk-restore', error)
    return NextResponse.json({ error: 'Failed to restore inventory' }, { status: 500 })
  }
}
