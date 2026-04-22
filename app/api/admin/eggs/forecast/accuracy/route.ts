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
    let weeks = weeksParam ? Number.parseInt(weeksParam, 10) : 12
    weeks = Math.max(4, Math.min(52, weeks))

    const { data: forecasts, error: forecastError } = await supabaseAdmin
      .from('egg_weekly_forecasts')
      .select(`
        id,
        breed_id,
        year,
        week_number,
        delivery_monday,
        forecast_eggs,
        egg_breeds!inner(name, accent_color)
      `)
      .order('year', { ascending: false })
      .order('week_number', { ascending: false })
      .limit(weeks * 20)

    if (forecastError) throw forecastError

    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    type AccuracyRow = {
      breed_id: string
      breed_name: string
      accent_color: string
      year: number
      week_number: number
      delivery_monday: string
      forecast_eggs: number
      actual_eggs: number
      error: number
      pct_error: number | null
      over_forecast: boolean
    }

    const rows: AccuracyRow[] = []

    for (const forecast of forecasts ?? []) {
      const breedsRel = forecast.egg_breeds as { name: string; accent_color: string } | { name: string; accent_color: string }[] | null
      const breedName = Array.isArray(breedsRel) ? breedsRel[0]?.name : breedsRel?.name
      const accentColor = Array.isArray(breedsRel) ? breedsRel[0]?.accent_color : breedsRel?.accent_color

      if (!forecast.delivery_monday) continue

      const deliveryMonday = new Date(forecast.delivery_monday as string)
      deliveryMonday.setUTCHours(0, 0, 0, 0)
      const weekEndDate = new Date(deliveryMonday)
      weekEndDate.setUTCDate(weekEndDate.getUTCDate() + 6)

      // Only compute accuracy for weeks fully in the past
      if (weekEndDate >= today) continue

      const mondayStr = deliveryMonday.toISOString().slice(0, 10)
      const sundayStr = weekEndDate.toISOString().slice(0, 10)

      const { data: actuals, error: actualsError } = await supabaseAdmin
        .from('egg_daily_collections')
        .select('sellable_standard')
        .eq('breed_id', forecast.breed_id as string)
        .gte('collection_date', mondayStr)
        .lte('collection_date', sundayStr)

      if (actualsError) continue
      if (!actuals || actuals.length === 0) continue

      const actual_eggs = actuals.reduce((sum, r) => sum + ((r.sellable_standard as number) ?? 0), 0)
      const forecast_eggs = forecast.forecast_eggs as number
      const error = actual_eggs - forecast_eggs
      const pct_error =
        forecast_eggs === 0
          ? null
          : Math.round(Math.abs(error) / forecast_eggs * 100 * 10) / 10
      const over_forecast = error < 0

      rows.push({
        breed_id: forecast.breed_id as string,
        breed_name: breedName ?? (forecast.breed_id as string),
        accent_color: accentColor ?? '#6b7280',
        year: forecast.year as number,
        week_number: forecast.week_number as number,
        delivery_monday: forecast.delivery_monday as string,
        forecast_eggs,
        actual_eggs,
        error,
        pct_error,
        over_forecast,
      })
    }

    // Per-breed summary
    type BreedSummary = {
      breed_id: string
      breed_name: string
      accent_color: string
      avg_pct_error: number | null
      avg_bias: number
      weeks_over: number
      weeks_under: number
      total_weeks: number
    }

    const summaryMap: Record<string, { breed_name: string; accent_color: string; errors: number[]; pct_errors: number[]; over: number; under: number }> = {}

    for (const row of rows) {
      if (!summaryMap[row.breed_id]) {
        summaryMap[row.breed_id] = {
          breed_name: row.breed_name,
          accent_color: row.accent_color,
          errors: [],
          pct_errors: [],
          over: 0,
          under: 0,
        }
      }
      const s = summaryMap[row.breed_id]
      s.errors.push(row.error)
      if (row.pct_error !== null) s.pct_errors.push(row.pct_error)
      if (row.over_forecast) s.over++
      else s.under++
    }

    const summary: BreedSummary[] = Object.entries(summaryMap).map(([breed_id, s]) => {
      const avg_pct_error =
        s.pct_errors.length > 0
          ? Math.round((s.pct_errors.reduce((a, b) => a + b, 0) / s.pct_errors.length) * 10) / 10
          : null
      const avg_bias =
        s.errors.length > 0
          ? Math.round((s.errors.reduce((a, b) => a + b, 0) / s.errors.length) * 10) / 10
          : 0
      return {
        breed_id,
        breed_name: s.breed_name,
        accent_color: s.accent_color,
        avg_pct_error,
        avg_bias,
        weeks_over: s.over,
        weeks_under: s.under,
        total_weeks: s.errors.length,
      }
    })

    return NextResponse.json({ rows, summary, weeks })
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to fetch forecast accuracy' }, { status: 500 })
  }
}
