import { supabaseAdmin } from '@/lib/supabase/server'

export interface DailyTrend {
  date: string
  total_grams: number
  morning: number
  evening: number
}

export interface YieldAnalysis {
  product_type: string
  batch_count: number
  avg_yield_pct: number
  total_milk_used: number
  total_yield_kg: number
}

export interface RecipeSuccess {
  recipe_id: string
  recipe_name: string
  product_type: string
  batches_made: number
  avg_quality: number | null
  avg_yield_pct: number | null
}

export interface MilkerStats {
  milker_name: string
  session_count: number
  active_days: number
  morning_sessions: number
  evening_sessions: number
  total_grams: number
  avg_session_grams: number
  last_session_date: string
}

export async function getProductionTrends(days = 30): Promise<DailyTrend[]> {
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabaseAdmin
    .from('milk_daily_sessions')
    .select('milking_date, session_type, total_grams')
    .gte('milking_date', since.toISOString().slice(0, 10))
    .order('milking_date', { ascending: true })

  if (error || !data) return []

  const byDate = new Map<string, { total: number; morning: number; evening: number }>()
  for (const row of data) {
    const existing = byDate.get(row.milking_date) || { total: 0, morning: 0, evening: 0 }
    const grams = Number(row.total_grams || 0)
    existing.total += grams
    if (row.session_type === 'morning') existing.morning += grams
    else if (row.session_type === 'evening') existing.evening += grams
    byDate.set(row.milking_date, existing)
  }

  return Array.from(byDate.entries()).map(([date, vals]) => ({
    date,
    total_grams: Math.round(vals.total),
    morning: Math.round(vals.morning),
    evening: Math.round(vals.evening),
  }))
}

export async function getYieldAnalysis(): Promise<YieldAnalysis[]> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('product_type, milk_liters_used, yield_kg, yield_percentage')
    .not('yield_kg', 'is', null)

  if (error || !data) return []

  const byType = new Map<string, { count: number; totalMilk: number; totalYield: number; totalPct: number }>()
  for (const row of data) {
    const existing = byType.get(row.product_type) || { count: 0, totalMilk: 0, totalYield: 0, totalPct: 0 }
    existing.count++
    existing.totalMilk += Number(row.milk_liters_used || 0)
    existing.totalYield += Number(row.yield_kg || 0)
    existing.totalPct += Number(row.yield_percentage || 0)
    byType.set(row.product_type, existing)
  }

  return Array.from(byType.entries()).map(([type, vals]) => ({
    product_type: type,
    batch_count: vals.count,
    avg_yield_pct: Math.round((vals.totalPct / vals.count) * 10) / 10,
    total_milk_used: Math.round(vals.totalMilk * 10) / 10,
    total_yield_kg: Math.round(vals.totalYield * 100) / 100,
  }))
}

export async function getRecipeSuccessRates(): Promise<RecipeSuccess[]> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('recipe_id, product_type, quality_score, yield_percentage, dairy_recipes(name)')
    .not('recipe_id', 'is', null)

  if (error || !data) return []

  const byRecipe = new Map<string, {
    name: string; type: string; count: number
    totalQuality: number; qualityCount: number
    totalYield: number; yieldCount: number
  }>()

  for (const row of data as any[]) {
    const rid = row.recipe_id
    const existing = byRecipe.get(rid) || {
      name: row.dairy_recipes?.name || 'Unknown',
      type: row.product_type,
      count: 0, totalQuality: 0, qualityCount: 0, totalYield: 0, yieldCount: 0,
    }
    existing.count++
    if (row.quality_score) { existing.totalQuality += row.quality_score; existing.qualityCount++ }
    if (row.yield_percentage) { existing.totalYield += Number(row.yield_percentage); existing.yieldCount++ }
    byRecipe.set(rid, existing)
  }

  return Array.from(byRecipe.entries()).map(([id, vals]) => ({
    recipe_id: id,
    recipe_name: vals.name,
    product_type: vals.type,
    batches_made: vals.count,
    avg_quality: vals.qualityCount > 0 ? Math.round((vals.totalQuality / vals.qualityCount) * 10) / 10 : null,
    avg_yield_pct: vals.yieldCount > 0 ? Math.round((vals.totalYield / vals.yieldCount) * 10) / 10 : null,
  }))
}

export async function getMilkerStats(): Promise<MilkerStats[]> {
  const { data, error } = await supabaseAdmin
    .from('milk_daily_sessions')
    .select('milker_name, session_type, total_grams, milking_date')
    .in('session_type', ['morning', 'evening'])
    .order('milking_date', { ascending: false })

  if (error || !data) return []

  const byMilker = new Map<string, {
    sessionCount: number
    activeDates: Set<string>
    morningSessions: number
    eveningSessions: number
    totalGrams: number
    lastSessionDate: string
  }>()

  for (const row of data) {
    const milkerName = String(row.milker_name || '').trim()
    if (!milkerName) continue

    const existing = byMilker.get(milkerName) || {
      sessionCount: 0,
      activeDates: new Set<string>(),
      morningSessions: 0,
      eveningSessions: 0,
      totalGrams: 0,
      lastSessionDate: row.milking_date,
    }

    existing.sessionCount += 1
    existing.activeDates.add(row.milking_date)
    existing.totalGrams += Number(row.total_grams || 0)
    if (row.session_type === 'morning') existing.morningSessions += 1
    if (row.session_type === 'evening') existing.eveningSessions += 1
    if (row.milking_date > existing.lastSessionDate) existing.lastSessionDate = row.milking_date

    byMilker.set(milkerName, existing)
  }

  return Array.from(byMilker.entries())
    .map(([milkerName, stats]) => ({
      milker_name: milkerName,
      session_count: stats.sessionCount,
      active_days: stats.activeDates.size,
      morning_sessions: stats.morningSessions,
      evening_sessions: stats.eveningSessions,
      total_grams: Math.round(stats.totalGrams),
      avg_session_grams: stats.sessionCount > 0 ? Math.round(stats.totalGrams / stats.sessionCount) : 0,
      last_session_date: stats.lastSessionDate,
    }))
    .sort((a, b) => b.total_grams - a.total_grams)
}
