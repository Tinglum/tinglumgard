import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const weeksParam = searchParams.get('weeks')
    let weeks = weeksParam ? Number.parseInt(weeksParam, 10) : 16
    weeks = Math.max(4, Math.min(52, weeks))

    const { data, error } = await supabaseAdmin
      .from('egg_inventory')
      .select(`
        id,
        breed_id,
        year,
        week_number,
        delivery_monday,
        eggs_available,
        eggs_allocated,
        eggs_remaining,
        status,
        egg_breeds!inner(name, accent_color)
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(weeks * 20)

    if (error) throw error

    type InventoryRow = {
      id: string
      breed_id: string
      breed_name: string
      accent_color: string
      year: number
      week_number: number
      delivery_monday: string | null
      eggs_available: number
      eggs_allocated: number
      eggs_remaining: number
      status: string
      sell_through_pct: number
      sold_out: boolean
    }

    const rows: InventoryRow[] = []

    for (const row of data ?? []) {
      const breedsRel = row.egg_breeds as { name: string; accent_color: string } | { name: string; accent_color: string }[] | null
      const breedName = Array.isArray(breedsRel) ? breedsRel[0]?.name : breedsRel?.name
      const accentColor = Array.isArray(breedsRel) ? breedsRel[0]?.accent_color : breedsRel?.accent_color

      const eggs_available = (row.eggs_available as number) ?? 0
      const eggs_allocated = (row.eggs_allocated as number) ?? 0
      const eggs_remaining = (row.eggs_remaining as number) ?? 0

      const sell_through_pct =
        eggs_available > 0
          ? Math.round((eggs_allocated / eggs_available) * 100 * 10) / 10
          : 0

      const sold_out = eggs_remaining === 0 && eggs_allocated > 0

      rows.push({
        id: row.id as string,
        breed_id: row.breed_id as string,
        breed_name: breedName ?? (row.breed_id as string),
        accent_color: accentColor ?? '#6b7280',
        year: row.year as number,
        week_number: row.week_number as number,
        delivery_monday: row.delivery_monday as string | null,
        eggs_available,
        eggs_allocated,
        eggs_remaining,
        status: row.status as string,
        sell_through_pct,
        sold_out,
      })
    }

    // Per-breed summary
    type BreedSummaryAcc = {
      breed_name: string
      accent_color: string
      total_available: number
      total_allocated: number
      weeks_total: number
      weeks_sold_out: number
    }

    const breedSummaryMap: Record<string, BreedSummaryAcc> = {}

    for (const row of rows) {
      if (!breedSummaryMap[row.breed_id]) {
        breedSummaryMap[row.breed_id] = {
          breed_name: row.breed_name,
          accent_color: row.accent_color,
          total_available: 0,
          total_allocated: 0,
          weeks_total: 0,
          weeks_sold_out: 0,
        }
      }
      const s = breedSummaryMap[row.breed_id]
      s.total_available += row.eggs_available
      s.total_allocated += row.eggs_allocated
      s.weeks_total += 1
      if (row.sold_out) s.weeks_sold_out += 1
    }

    const breed_summary = Object.entries(breedSummaryMap)
      .map(([breed_id, s]) => ({
        breed_id,
        breed_name: s.breed_name,
        accent_color: s.accent_color,
        total_available: s.total_available,
        total_allocated: s.total_allocated,
        overall_sell_through:
          s.total_available > 0
            ? Math.round((s.total_allocated / s.total_available) * 100 * 10) / 10
            : 0,
        weeks_total: s.weeks_total,
        weeks_sold_out: s.weeks_sold_out,
      }))
      .sort((a, b) => b.overall_sell_through - a.overall_sell_through)

    return NextResponse.json({ rows, breed_summary, weeks })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch sell-through data' }, { status: 500 })
  }
}
