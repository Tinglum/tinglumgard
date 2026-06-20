import { supabaseAdmin } from '@/lib/supabase/server'

export interface GoatStat {
  goat_id: string
  name: string
  tag_number: string | null
  accent_color: string
  status: string
  total_grams: number
  session_count: number
  morning_grams: number
  evening_grams: number
  health_flags: Record<string, number>
}

export interface PipelineBucket { status: string; count: number; total_liters: number }
export interface QualityBucket { score: number; count: number }
export interface ProductionStatusBucket { status: string; count: number; total_yield_kg: number }
export interface FunnelData {
  collected_grams_90d: number
  batched_liters: number
  yield_kg: number
  production_batch_count: number
}

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

export async function getGoatStats(days = 30): Promise<GoatStat[]> {
  const sinceStr = new Date(Date.now() - days * 864e5).toISOString().slice(0, 10)

  const [{ data: goats }, { data: sessions }] = await Promise.all([
    supabaseAdmin.from('milk_goats').select('id, name, tag_number, accent_color, status').order('display_order'),
    supabaseAdmin.from('milk_daily_sessions').select('id, session_type').gte('milking_date', sinceStr),
  ])
  if (!goats?.length) return []

  const sessionIds = (sessions || []).map(s => s.id)
  const sessionTypeMap = new Map((sessions || []).map(s => [s.id, s.session_type]))

  const goatMap = new Map<string, GoatStat>(
    goats.map(g => [g.id, {
      goat_id: g.id, name: g.name, tag_number: g.tag_number,
      accent_color: g.accent_color || '#8B7355', status: g.status,
      total_grams: 0, session_count: 0, morning_grams: 0, evening_grams: 0, health_flags: {},
    }])
  )

  if (sessionIds.length) {
    const { data: entries } = await supabaseAdmin
      .from('milk_session_entries')
      .select('goat_id, grams, health_flag, session_id')
      .in('session_id', sessionIds)

    for (const e of entries || []) {
      const s = goatMap.get(e.goat_id)
      if (!s) continue
      const g = Number(e.grams || 0)
      s.total_grams += g
      s.session_count++
      const type = sessionTypeMap.get(e.session_id)
      if (type === 'morning') s.morning_grams += g
      else if (type === 'evening') s.evening_grams += g
      if (e.health_flag && e.health_flag !== 'normal') {
        s.health_flags[e.health_flag] = (s.health_flags[e.health_flag] || 0) + 1
      }
    }
  }

  return Array.from(goatMap.values())
    .map(g => ({ ...g, total_grams: Math.round(g.total_grams), morning_grams: Math.round(g.morning_grams), evening_grams: Math.round(g.evening_grams) }))
    .sort((a, b) => b.total_grams - a.total_grams)
}

export async function getPipelineAnalytics(): Promise<{
  milkPipeline: PipelineBucket[]
  qualityDistribution: QualityBucket[]
  productionByStatus: ProductionStatusBucket[]
  funnel: FunnelData
}> {
  const since90 = new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10)

  const [{ data: batches }, { data: prodBatches }, { data: sessions90 }] = await Promise.all([
    supabaseAdmin.from('milk_batches').select('pipeline_status, liters_raw'),
    supabaseAdmin.from('dairy_production_batches').select('status, quality_score, yield_kg, milk_liters_used'),
    supabaseAdmin.from('milk_daily_sessions').select('total_grams').gte('milking_date', since90),
  ])

  const pipeMap = new Map<string, { count: number; liters: number }>()
  for (const b of batches || []) {
    const ex = pipeMap.get(b.pipeline_status) || { count: 0, liters: 0 }
    ex.count++; ex.liters += Number(b.liters_raw || 0)
    pipeMap.set(b.pipeline_status, ex)
  }

  const qualMap = new Map<number, number>()
  const statusMap = new Map<string, { count: number; yield: number }>()
  for (const pb of prodBatches || []) {
    if (pb.quality_score) qualMap.set(pb.quality_score, (qualMap.get(pb.quality_score) || 0) + 1)
    const ex = statusMap.get(pb.status) || { count: 0, yield: 0 }
    ex.count++; ex.yield += Number(pb.yield_kg || 0)
    statusMap.set(pb.status, ex)
  }

  return {
    milkPipeline: Array.from(pipeMap.entries()).map(([status, v]) => ({ status, count: v.count, total_liters: Math.round(v.liters * 10) / 10 })),
    qualityDistribution: Array.from({ length: 10 }, (_, i) => ({ score: i + 1, count: qualMap.get(i + 1) || 0 })),
    productionByStatus: Array.from(statusMap.entries()).map(([status, v]) => ({ status, count: v.count, total_yield_kg: Math.round(v.yield * 100) / 100 })),
    funnel: {
      collected_grams_90d: Math.round((sessions90 || []).reduce((s, r) => s + Number(r.total_grams || 0), 0)),
      batched_liters: Math.round((batches || []).reduce((s, b) => s + Number(b.liters_raw || 0), 0) * 10) / 10,
      yield_kg: Math.round((prodBatches || []).reduce((s, pb) => s + Number(pb.yield_kg || 0), 0) * 100) / 100,
      production_batch_count: prodBatches?.length || 0,
    },
  }
}
