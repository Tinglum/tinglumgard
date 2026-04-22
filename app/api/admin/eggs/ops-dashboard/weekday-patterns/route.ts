import { NextRequest, NextResponse } from 'next/server'
import { enforceEggOpsAccess } from '@/lib/auth/egg-ops-access'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const DOW_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

type DowBucket = { total_sum: number; sellable_sum: number; sample_days: number }

function bucketsToDow(dow: Record<number, DowBucket>) {
  return Array.from({ length: 7 }, (_, i) => {
    const b = dow[i]
    const avg_total = b.sample_days > 0 ? Math.round((b.total_sum / b.sample_days) * 10) / 10 : 0
    const avg_sellable = b.sample_days > 0 ? Math.round((b.sellable_sum / b.sample_days) * 10) / 10 : 0
    const sellable_rate = b.total_sum > 0 ? Math.round((b.sellable_sum / b.total_sum) * 100 * 10) / 10 : 0
    return { day: DOW_NAMES[i], day_index: i, avg_total, avg_sellable, sellable_rate, sample_days: b.sample_days }
  })
}

export async function GET(request: NextRequest) {
  const access = await enforceEggOpsAccess(request, { allowUnauthenticatedWhenDisabled: true })
  if (!access.ok) return access.response

  try {
    const searchParams = request.nextUrl.searchParams
    const daysParam = searchParams.get('days')
    let days = daysParam ? Number.parseInt(daysParam, 10) : 90
    days = Math.max(14, Math.min(365, days))

    const since = new Date()
    since.setUTCDate(since.getUTCDate() - days)
    const sinceStr = since.toISOString().slice(0, 10)

    const { data, error } = await supabaseAdmin
      .from('egg_daily_collections')
      .select(`
        collection_date,
        breed_id,
        total_collected,
        sellable_standard,
        egg_breeds!inner(name, accent_color)
      `)
      .gte('collection_date', sinceStr)

    if (error) throw error

    // DOW buckets per breed: day_index 0=Mon..6=Sun
    type BreedAcc = {
      breed_id: string
      breed_name: string
      accent_color: string
      dow: Record<number, DowBucket>
    }

    const breedMap: Record<string, BreedAcc> = {}

    // Farm-wide DOW buckets
    const farmWide: Record<number, DowBucket> = {}
    for (let i = 0; i < 7; i++) {
      farmWide[i] = { total_sum: 0, sellable_sum: 0, sample_days: 0 }
    }

    for (const row of data ?? []) {
      const breedsRel = row.egg_breeds as { name: string; accent_color: string } | { name: string; accent_color: string }[] | null
      const breedName = Array.isArray(breedsRel) ? breedsRel[0]?.name : breedsRel?.name
      const accentColor = Array.isArray(breedsRel) ? breedsRel[0]?.accent_color : breedsRel?.accent_color

      const breedId = row.breed_id as string
      const d = new Date(row.collection_date as string)
      const jsDay = d.getUTCDay() // 0=Sun
      const dayIndex = (jsDay + 6) % 7 // 0=Mon..6=Sun

      if (!breedMap[breedId]) {
        breedMap[breedId] = {
          breed_id: breedId,
          breed_name: breedName ?? breedId,
          accent_color: accentColor ?? '#6b7280',
          dow: {},
        }
        for (let i = 0; i < 7; i++) {
          breedMap[breedId].dow[i] = { total_sum: 0, sellable_sum: 0, sample_days: 0 }
        }
      }

      const total = (row.total_collected as number) ?? 0
      const sellable = (row.sellable_standard as number) ?? 0

      breedMap[breedId].dow[dayIndex].total_sum += total
      breedMap[breedId].dow[dayIndex].sellable_sum += sellable
      breedMap[breedId].dow[dayIndex].sample_days += 1

      farmWide[dayIndex].total_sum += total
      farmWide[dayIndex].sellable_sum += sellable
      farmWide[dayIndex].sample_days += 1
    }

    const breeds = Object.values(breedMap).map((b) => ({
      breed_id: b.breed_id,
      breed_name: b.breed_name,
      accent_color: b.accent_color,
      dow: bucketsToDow(b.dow),
    }))

    const farm_wide = bucketsToDow(farmWide)

    return NextResponse.json({ breeds, farm_wide, days })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch weekday patterns' }, { status: 500 })
  }
}
