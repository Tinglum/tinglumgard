import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function getISOWeekMonday(date: Date): string {
  // Returns the Monday of the ISO week containing `date` as YYYY-MM-DD
  const d = new Date(date)
  const day = d.getUTCDay() // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day) // shift so Monday = 0
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().slice(0, 10)
}

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const daysParam = searchParams.get('days')
    let days = daysParam ? Number.parseInt(daysParam, 10) : 90
    days = Math.max(7, Math.min(365, days))

    const since = new Date()
    since.setUTCDate(since.getUTCDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('egg_daily_collections')
      .select(`
        collection_date,
        breed_id,
        too_small,
        dirty,
        cracked,
        shell_defect,
        other_unsellable,
        total_collected,
        sellable_standard,
        egg_breeds!inner(name, accent_color)
      `)
      .gte('collection_date', sinceStr)
      .order('collection_date', { ascending: true })

    if (error) throw error

    // Group by breed, then by ISO week
    type WeekBucket = {
      week: string
      too_small: number
      dirty: number
      cracked: number
      shell_defect: number
      other_unsellable: number
      total_collected: number
      sellable_standard: number
      days: number
    }

    type BreedAcc = {
      breed_id: string
      breed_name: string
      accent_color: string
      weeks: Record<string, WeekBucket>
    }

    const breedMap: Record<string, BreedAcc> = {}

    for (const row of data ?? []) {
      const breedsRel = row.egg_breeds as { name: string; accent_color: string } | { name: string; accent_color: string }[] | null
      const breedName = Array.isArray(breedsRel) ? breedsRel[0]?.name : breedsRel?.name
      const accentColor = Array.isArray(breedsRel) ? breedsRel[0]?.accent_color : breedsRel?.accent_color

      const breedId = row.breed_id as string

      if (!breedMap[breedId]) {
        breedMap[breedId] = {
          breed_id: breedId,
          breed_name: breedName ?? breedId,
          accent_color: accentColor ?? '#6b7280',
          weeks: {},
        }
      }

      const monday = getISOWeekMonday(new Date(row.collection_date as string))

      if (!breedMap[breedId].weeks[monday]) {
        breedMap[breedId].weeks[monday] = {
          week: monday,
          too_small: 0,
          dirty: 0,
          cracked: 0,
          shell_defect: 0,
          other_unsellable: 0,
          total_collected: 0,
          sellable_standard: 0,
          days: 0,
        }
      }

      const bucket = breedMap[breedId].weeks[monday]
      bucket.too_small += (row.too_small as number) ?? 0
      bucket.dirty += (row.dirty as number) ?? 0
      bucket.cracked += (row.cracked as number) ?? 0
      bucket.shell_defect += (row.shell_defect as number) ?? 0
      bucket.other_unsellable += (row.other_unsellable as number) ?? 0
      bucket.total_collected += (row.total_collected as number) ?? 0
      bucket.sellable_standard += (row.sellable_standard as number) ?? 0
      bucket.days += 1
    }

    const breeds = Object.values(breedMap).map((b) => ({
      breed_id: b.breed_id,
      breed_name: b.breed_name,
      accent_color: b.accent_color,
      weeks: Object.values(b.weeks).sort((a, b) => a.week.localeCompare(b.week)),
    }))

    return NextResponse.json({ breeds, days })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch reject trends' }, { status: 500 })
  }
}
