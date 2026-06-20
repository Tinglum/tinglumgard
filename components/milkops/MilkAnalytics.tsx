'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, TrendingUp, Beaker, Star, Activity, Droplets, Award } from 'lucide-react'
import { getProductTypeConfig, gramsToDeciliters } from '@/lib/milk/types'
import type { ProductType } from '@/lib/milk/types'

interface DailyTrend { date: string; total_grams: number; morning: number; evening: number }
interface YieldRow { product_type: string; batch_count: number; avg_yield_pct: number; total_milk_used: number; total_yield_kg: number }
interface RecipeRow { recipe_id: string; recipe_name: string; product_type: string; batches_made: number; avg_quality: number | null; avg_yield_pct: number | null }
interface MilkerRow { milker_name: string; session_count: number; active_days: number; morning_sessions: number; evening_sessions: number; total_grams: number; avg_session_grams: number; last_session_date: string }
interface GoatStat { goat_id: string; name: string; tag_number: string | null; accent_color: string; status: string; total_grams: number; session_count: number; morning_grams: number; evening_grams: number; health_flags: Record<string, number> }
interface PipelineData {
  milkPipeline: { status: string; count: number; total_liters: number }[]
  qualityDistribution: { score: number; count: number }[]
  productionByStatus: { status: string; count: number; total_yield_kg: number }[]
  funnel: { collected_grams_90d: number; batched_liters: number; yield_kg: number; production_batch_count: number }
}

type Tab = 'overview' | 'goats' | 'pipeline' | 'milkers'

const TABS: { id: Tab; labelNo: string; labelEn: string }[] = [
  { id: 'overview', labelNo: 'Oversikt', labelEn: 'Overview' },
  { id: 'goats', labelNo: 'Geiter', labelEn: 'Goats' },
  { id: 'pipeline', labelNo: 'Pipeline', labelEn: 'Pipeline' },
  { id: 'milkers', labelNo: 'Melkere', labelEn: 'Milkers' },
]

const PIPELINE_ORDER = ['raw', 'pasteurizing', 'pasteurized', 'bottling', 'bottled', 'fridged', 'allocated', 'discarded']
const PIPELINE_LABELS: Record<string, { no: string; en: string; color: string }> = {
  raw:          { no: 'Rå',        en: 'Raw',         color: '#f3f4f6' },
  pasteurizing: { no: 'Past.',     en: 'Past.',        color: '#fef3c7' },
  pasteurized:  { no: 'Past.',     en: 'Pasteurized',  color: '#fde68a' },
  bottling:     { no: 'Flasker',   en: 'Bottling',     color: '#fcd34d' },
  bottled:      { no: 'Flasket',   en: 'Bottled',      color: '#f59e0b' },
  fridged:      { no: 'Kjølt',     en: 'Fridged',      color: '#d97706' },
  allocated:    { no: 'Allokert',  en: 'Allocated',    color: '#92400e' },
  discarded:    { no: 'Kassert',   en: 'Discarded',    color: '#fca5a5' },
}
const HEALTH_FLAGS = ['mastitis_suspect', 'colostrum', 'blood_traces', 'off_smell', 'other']
const HEALTH_FLAG_LABELS: Record<string, { no: string; en: string; color: string }> = {
  mastitis_suspect: { no: 'Mastitt',    en: 'Mastitis',   color: '#fca5a5' },
  colostrum:        { no: 'Råmelk',     en: 'Colostrum',  color: '#fde68a' },
  blood_traces:     { no: 'Blod',       en: 'Blood',      color: '#fca5a5' },
  off_smell:        { no: 'Lukt',       en: 'Off smell',  color: '#d1d5db' },
  other:            { no: 'Annet',      en: 'Other',      color: '#e5e7eb' },
}

function fmt(g: number) {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} kg`
  return `${g} g`
}

function donutSlice(cx: number, cy: number, r: number, ir: number, startDeg: number, endDeg: number): string {
  const rad = (d: number) => (d - 90) * Math.PI / 180
  const pt = (ang: number, radius: number) => ({ x: cx + radius * Math.cos(rad(ang)), y: cy + radius * Math.sin(rad(ang)) })
  const gap = 1.5
  const s = pt(startDeg + gap, r), e = pt(endDeg - gap, r)
  const si = pt(startDeg + gap, ir), ei = pt(endDeg - gap, ir)
  const large = (endDeg - startDeg - gap * 2) > 180 ? 1 : 0
  return [
    `M ${s.x.toFixed(2)} ${s.y.toFixed(2)}`,
    `A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`,
    `L ${ei.x.toFixed(2)} ${ei.y.toFixed(2)}`,
    `A ${ir} ${ir} 0 ${large} 0 ${si.x.toFixed(2)} ${si.y.toFixed(2)}`,
    'Z',
  ].join(' ')
}

export function MilkAnalytics({ lang }: { lang: string }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [trends, setTrends] = useState<DailyTrend[]>([])
  const [yields, setYields] = useState<YieldRow[]>([])
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [milkers, setMilkers] = useState<MilkerRow[]>([])
  const [goats, setGoats] = useState<GoatStat[]>([])
  const [pipeline, setPipeline] = useState<PipelineData | null>(null)
  const [loading, setLoading] = useState(true)
  const [goatsLoading, setGoatsLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)

  const fetchBase = useCallback(async () => {
    setLoading(true)
    const [tRes, yRes] = await Promise.all([
      fetch('/api/milk/analytics/trends?days=60'),
      fetch('/api/milk/analytics/yield'),
    ])
    if (tRes.ok) { const d = await tRes.json(); setTrends(d.trends || []); setRecipes(d.recipes || []); setMilkers(d.milkers || []) }
    if (yRes.ok) { const d = await yRes.json(); setYields(d.analysis || []) }
    setLoading(false)
  }, [])

  const fetchGoats = useCallback(async () => {
    if (goats.length) return
    setGoatsLoading(true)
    const res = await fetch('/api/milk/analytics/goats?days=30')
    if (res.ok) { const d = await res.json(); setGoats(d.goats || []) }
    setGoatsLoading(false)
  }, [goats.length])

  const fetchPipeline = useCallback(async () => {
    if (pipeline) return
    setPipelineLoading(true)
    const res = await fetch('/api/milk/analytics/pipeline')
    if (res.ok) { const d = await res.json(); setPipeline(d) }
    setPipelineLoading(false)
  }, [pipeline])

  useEffect(() => { fetchBase() }, [fetchBase])
  useEffect(() => { if (tab === 'goats') fetchGoats() }, [tab, fetchGoats])
  useEffect(() => { if (tab === 'pipeline') fetchPipeline() }, [tab, fetchPipeline])

  // ── Computed values from trends ──────────────────────────────────────────
  const trends30 = trends.slice(-30)
  const maxGrams = Math.max(...trends30.map(t => t.total_grams), 1)
  const totalLast30 = trends30.reduce((s, t) => s + t.total_grams, 0)
  const totalLast7 = trends30.slice(-7).reduce((s, t) => s + t.total_grams, 0)
  const prevWeek7 = trends30.slice(-14, -7).reduce((s, t) => s + t.total_grams, 0)
  const avgDaily = trends30.length > 0 ? Math.round(totalLast30 / trends30.length) : 0
  const weekDeltaPct = prevWeek7 > 0 ? Math.round(((totalLast7 - prevWeek7) / prevWeek7) * 100) : null

  const rollingAvg = trends30.map((_, i) => {
    const slice = trends30.slice(Math.max(0, i - 6), i + 1)
    return Math.round(slice.reduce((s, t) => s + t.total_grams, 0) / slice.length)
  })

  const dowMap = new Map<number, number[]>()
  for (const t of trends) {
    const dow = new Date(t.date + 'T12:00:00').getDay()
    const arr = dowMap.get(dow) || []; arr.push(t.total_grams); dowMap.set(dow, arr)
  }
  const dowOrder = [1, 2, 3, 4, 5, 6, 0]
  const dowLabels = lang === 'no' ? ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dowAvgs = dowOrder.map(d => { const vals = dowMap.get(d) || []; return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0 })
  const maxDow = Math.max(...dowAvgs, 1)

  const bestDay = trends.length ? trends.reduce((b, t) => t.total_grams > b.total_grams ? t : b) : null
  let bestWeekTotal = 0, bestWeekLabel = ''
  for (let i = 6; i < trends.length; i++) {
    const w = trends.slice(i - 6, i + 1).reduce((s, t) => s + t.total_grams, 0)
    if (w > bestWeekTotal) { bestWeekTotal = w; bestWeekLabel = trends[i - 6].date.slice(5) + '–' + trends[i].date.slice(5) }
  }
  let streak = 0
  for (let i = trends.length - 1; i >= 0; i--) {
    if (trends[i].total_grams >= avgDaily) streak++; else break
  }

  // ── Goat donut ───────────────────────────────────────────────────────────
  const totalGoatGrams = goats.reduce((s, g) => s + g.total_grams, 0)
  let angle = 0
  const donutSlices = goats
    .filter(g => g.total_grams > 0)
    .map(g => {
      const span = totalGoatGrams > 0 ? (g.total_grams / totalGoatGrams) * 360 : 0
      const path = donutSlice(90, 90, 78, 44, angle, angle + span)
      const mid = angle + span / 2
      angle += span
      return { ...g, span, path, mid }
    })

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  return (
    <div className="space-y-4 mt-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${
              tab === t.id
                ? 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-500 hover:text-neutral-700'
            }`}
          >
            {lang === 'no' ? t.labelNo : t.labelEn}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-2">
            <div className="rounded-xl bg-neutral-900 text-white px-3 py-3 text-center">
              <div className="text-base font-semibold tabular-nums">{fmt(totalLast30)}</div>
              <div className="text-[10px] text-neutral-400">{gramsToDeciliters(totalLast30)} dL</div>
              <div className="text-[10px] text-neutral-400">30 {lang === 'no' ? 'dager' : 'days'}</div>
            </div>
            <div className="rounded-xl bg-white border border-neutral-200 px-3 py-3 text-center">
              <div className="text-base font-semibold tabular-nums">{fmt(totalLast7)}</div>
              <div className="text-[10px] text-neutral-400">{gramsToDeciliters(totalLast7)} dL</div>
              <div className="text-[10px] text-neutral-500">7 {lang === 'no' ? 'dager' : 'days'}</div>
            </div>
            <div className="rounded-xl bg-white border border-neutral-200 px-3 py-3 text-center">
              <div className="text-base font-semibold tabular-nums">{fmt(avgDaily)}</div>
              <div className="text-[10px] text-neutral-400">{gramsToDeciliters(avgDaily)} dL</div>
              <div className="text-[10px] text-neutral-500">{lang === 'no' ? 'snitt/dag' : 'avg/day'}</div>
            </div>
            <div className={`rounded-xl px-3 py-3 text-center border ${weekDeltaPct !== null && weekDeltaPct >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              {weekDeltaPct !== null ? (
                <>
                  <div className={`text-base font-semibold tabular-nums ${weekDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {weekDeltaPct >= 0 ? '+' : ''}{weekDeltaPct}%
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'vs forrige uke' : 'vs last week'}</div>
                  <div className="text-[10px] text-neutral-400">{fmt(totalLast7)} / {fmt(prevWeek7)}</div>
                </>
              ) : (
                <div className="text-[11px] text-neutral-400 mt-2">{lang === 'no' ? 'Ikke nok data' : 'Not enough data'}</div>
              )}
            </div>
          </div>

          {/* Bar chart with rolling avg overlay */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-900">
                {lang === 'no' ? 'Daglig produksjon (30 dager) + 7-dagers snitt' : 'Daily production (30 days) + 7-day rolling avg'}
              </h3>
            </div>
            {trends30.length === 0 ? (
              <p className="text-sm text-neutral-400 text-center py-4">{lang === 'no' ? 'Ingen data ennå' : 'No data yet'}</p>
            ) : (
              <div className="relative">
                <div className="flex items-end gap-[2px] h-28">
                  {trends30.map((day) => {
                    const mPct = (day.morning / maxGrams) * 100
                    const ePct = (day.evening / maxGrams) * 100
                    return (
                      <div key={day.date} className="flex-1 flex flex-col justify-end h-full group relative">
                        <div className="bg-amber-300 rounded-t-sm" style={{ height: `${ePct}%` }} />
                        <div className="bg-amber-500" style={{ height: `${mPct}%` }} />
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                            {day.date.slice(5)}: {fmt(day.total_grams)}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {/* Rolling avg SVG overlay */}
                <svg
                  className="absolute inset-0 w-full h-28 pointer-events-none"
                  viewBox={`0 0 ${trends30.length} 100`}
                  preserveAspectRatio="none"
                >
                  <polyline
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.75"
                    points={rollingAvg.map((v, i) => `${i + 0.5},${100 - (v / maxGrams) * 100}`).join(' ')}
                  />
                </svg>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />{lang === 'no' ? 'Morgen' : 'Morning'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300" />{lang === 'no' ? 'Kveld' : 'Evening'}</span>
              <span className="flex items-center gap-1"><span className="w-3 border-t border-red-500" />{lang === 'no' ? '7-dagers snitt' : '7-day avg'}</span>
            </div>
          </div>

          {/* Day-of-week heatmap */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-900">
                {lang === 'no' ? 'Produksjon per ukedag' : 'Production by weekday'}
              </h3>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {dowLabels.map((label, i) => {
                const avg = dowAvgs[i]
                const pct = avg / maxDow
                const alpha = Math.round(pct * 100)
                return (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div
                      className="w-full h-10 rounded-lg flex items-end justify-center pb-1.5 relative group"
                      style={{ background: `rgba(245,158,11,${0.1 + pct * 0.85})` }}
                      title={`${label}: ${fmt(avg)}`}
                    >
                      <span className="text-[9px] font-semibold text-amber-900 opacity-80">{alpha > 0 ? `${alpha}%` : '–'}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">{label}</span>
                    <span className="text-[9px] text-neutral-400 tabular-nums">{avg > 0 ? fmt(avg) : '–'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Production records */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Award className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-900">
                {lang === 'no' ? 'Rekorder' : 'Records'}
              </h3>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-[10px] text-amber-700 font-medium mb-1">🏆 {lang === 'no' ? 'Beste dag' : 'Best day'}</div>
                {bestDay ? (
                  <>
                    <div className="text-sm font-bold text-neutral-900 tabular-nums">{fmt(bestDay.total_grams)}</div>
                    <div className="text-[10px] text-neutral-500">{bestDay.date}</div>
                  </>
                ) : <div className="text-[10px] text-neutral-400">–</div>}
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-[10px] text-amber-700 font-medium mb-1">📅 {lang === 'no' ? 'Beste uke' : 'Best week'}</div>
                {bestWeekTotal > 0 ? (
                  <>
                    <div className="text-sm font-bold text-neutral-900 tabular-nums">{fmt(bestWeekTotal)}</div>
                    <div className="text-[10px] text-neutral-500">{bestWeekLabel}</div>
                  </>
                ) : <div className="text-[10px] text-neutral-400">–</div>}
              </div>
              <div className="bg-amber-50 rounded-lg p-3">
                <div className="text-[10px] text-amber-700 font-medium mb-1">🔥 {lang === 'no' ? 'Streak over snitt' : 'Days above avg'}</div>
                <div className="text-sm font-bold text-neutral-900">{streak}</div>
                <div className="text-[10px] text-neutral-500">{lang === 'no' ? 'dager på rad' : 'days running'}</div>
              </div>
            </div>
          </div>

          {/* Yield analysis */}
          {yields.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Beaker className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Utbytteanalyse' : 'Yield analysis'}</h3>
              </div>
              <div className="space-y-1.5">
                {yields.map((row) => {
                  const cfg = getProductTypeConfig(row.product_type as ProductType)
                  return (
                    <div key={row.product_type} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{cfg.emoji}</span>
                        <span className="text-sm text-neutral-900">{lang === 'no' ? cfg.labelNo : cfg.labelEn}</span>
                        <span className="text-[11px] text-neutral-400">({row.batch_count}x)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-neutral-500">{row.total_milk_used} L →</span>
                        <span className="font-medium">{row.total_yield_kg} kg</span>
                        <span className="text-emerald-600 font-medium">{row.avg_yield_pct}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Recipe results */}
          {recipes.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Oppskrift-resultater' : 'Recipe results'}</h3>
              </div>
              <div className="space-y-1.5">
                {recipes.map((row) => {
                  const cfg = getProductTypeConfig(row.product_type as ProductType)
                  return (
                    <div key={row.recipe_id} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span>{cfg.emoji}</span>
                        <span className="text-sm text-neutral-900">{row.recipe_name}</span>
                        <span className="text-[11px] text-neutral-400">({row.batches_made}x)</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        {row.avg_quality && <span className="text-amber-600">★ {row.avg_quality}</span>}
                        {row.avg_yield_pct && <span className="text-emerald-600">{row.avg_yield_pct}%</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── GOATS ─────────────────────────────────────────────────────── */}
      {tab === 'goats' && (
        <div className="space-y-4">
          {goatsLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-300" /></div>
          ) : goats.length === 0 ? (
            <div className="text-center py-12 text-sm text-neutral-400">{lang === 'no' ? 'Ingen geiter registrert ennå' : 'No goats registered yet'}</div>
          ) : (
            <>
              {/* Goat production ranking */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Droplets className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-medium text-neutral-900">
                    {lang === 'no' ? 'Produksjon per geit (siste 30 dager)' : 'Per-goat production (last 30 days)'}
                  </h3>
                </div>
                <div className="space-y-2.5">
                  {goats.map((g, i) => {
                    const maxG = goats[0]?.total_grams || 1
                    const pct = (g.total_grams / maxG) * 100
                    return (
                      <div key={g.goat_id} className="flex items-center gap-3">
                        <div className="w-5 text-[11px] text-neutral-400 text-right tabular-nums">{i + 1}</div>
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: g.accent_color }}
                        />
                        <div className="w-20 text-sm text-neutral-700 truncate">{g.name}</div>
                        <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden relative">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${pct}%`, background: g.accent_color, opacity: 0.85 }}
                          />
                          <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-medium text-neutral-700">
                            {fmt(g.total_grams)}
                          </span>
                        </div>
                        <div className="text-[10px] text-neutral-400 w-16 text-right">
                          {g.session_count} {lang === 'no' ? 'økt' : 'sess'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Goat contribution donut + breakdown */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">
                  {lang === 'no' ? 'Bidragsfordeling' : 'Contribution breakdown'}
                </h3>
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <svg viewBox="0 0 180 180" className="w-[140px] h-[140px]">
                      {donutSlices.length > 0 ? donutSlices.map((s) => (
                        <path key={s.goat_id} d={s.path} fill={s.accent_color} opacity="0.88">
                          <title>{s.name}: {totalGoatGrams > 0 ? Math.round((s.total_grams / totalGoatGrams) * 100) : 0}%</title>
                        </path>
                      )) : (
                        <circle cx="90" cy="90" r="78" fill="none" stroke="#e5e7eb" strokeWidth="34" />
                      )}
                      <circle cx="90" cy="90" r="44" fill="white" />
                      <text x="90" y="86" textAnchor="middle" className="text-xs" fontSize="11" fill="#374151" fontWeight="600">{fmt(totalGoatGrams)}</text>
                      <text x="90" y="100" textAnchor="middle" fontSize="9" fill="#9ca3af">{lang === 'no' ? 'totalt' : 'total'}</text>
                    </svg>
                  </div>
                  <div className="flex-1 space-y-2 min-w-0">
                    {goats.filter(g => g.total_grams > 0).map(g => {
                      const pct = totalGoatGrams > 0 ? Math.round((g.total_grams / totalGoatGrams) * 100) : 0
                      return (
                        <div key={g.goat_id} className="flex items-center gap-2 text-sm">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: g.accent_color }} />
                          <span className="text-neutral-700 truncate flex-1">{g.name}</span>
                          <span className="tabular-nums text-neutral-500 text-xs">{pct}%</span>
                          <span className="tabular-nums text-neutral-400 text-[11px]">{gramsToDeciliters(g.total_grams)} dL</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Health flag heatmap */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">
                  {lang === 'no' ? 'Helseflagg' : 'Health flags'}
                </h3>
                {goats.every(g => Object.keys(g.health_flags).length === 0) ? (
                  <p className="text-sm text-neutral-400 text-center py-3">
                    {lang === 'no' ? 'Ingen helseflagg registrert' : 'No health flags recorded'}
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-neutral-500 font-normal pb-2 pr-3">
                            {lang === 'no' ? 'Geit' : 'Goat'}
                          </th>
                          {HEALTH_FLAGS.map(f => (
                            <th key={f} className="text-center text-neutral-500 font-normal pb-2 px-1">
                              {lang === 'no' ? HEALTH_FLAG_LABELS[f].no : HEALTH_FLAG_LABELS[f].en}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {goats.map(g => (
                          <tr key={g.goat_id} className="border-t border-neutral-50">
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full" style={{ background: g.accent_color }} />
                                <span className="text-neutral-700">{g.name}</span>
                              </div>
                            </td>
                            {HEALTH_FLAGS.map(f => {
                              const count = g.health_flags[f] || 0
                              return (
                                <td key={f} className="text-center py-1.5 px-1">
                                  {count > 0 ? (
                                    <span
                                      className="inline-block min-w-[20px] rounded px-1 py-0.5 text-[10px] font-semibold"
                                      style={{ background: HEALTH_FLAG_LABELS[f].color, color: '#374151' }}
                                    >
                                      {count}
                                    </span>
                                  ) : (
                                    <span className="text-neutral-200">–</span>
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── PIPELINE ──────────────────────────────────────────────────── */}
      {tab === 'pipeline' && (
        <div className="space-y-4">
          {pipelineLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-300" /></div>
          ) : !pipeline ? (
            <div className="text-center py-12 text-sm text-neutral-400">{lang === 'no' ? 'Ingen pipeline-data' : 'No pipeline data'}</div>
          ) : (
            <>
              {/* Milk batch pipeline status */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">
                  {lang === 'no' ? 'Melkebatch-status' : 'Milk batch pipeline'}
                </h3>
                {pipeline.milkPipeline.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen batches' : 'No batches'}</p>
                ) : (
                  <div className="flex gap-1 flex-wrap">
                    {PIPELINE_ORDER.map(status => {
                      const bucket = pipeline.milkPipeline.find(b => b.status === status)
                      if (!bucket) return null
                      const cfg = PIPELINE_LABELS[status]
                      return (
                        <div
                          key={status}
                          className="flex flex-col items-center rounded-xl px-3 py-2.5 border border-neutral-100 min-w-[72px]"
                          style={{ background: cfg.color }}
                        >
                          <div className="text-lg font-bold text-neutral-800 tabular-nums">{bucket.count}</div>
                          <div className="text-[10px] text-neutral-600 mt-0.5">{lang === 'no' ? cfg.no : cfg.en}</div>
                          <div className="text-[9px] text-neutral-500">{bucket.total_liters} L</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Production funnel */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">
                  {lang === 'no' ? 'Produksjonstrakt (90 dager)' : 'Production funnel (90 days)'}
                </h3>
                <div className="flex items-center gap-2">
                  <div className="flex-1 text-center bg-amber-50 rounded-xl p-3 border border-amber-100">
                    <div className="text-xl font-bold text-amber-800 tabular-nums">{fmt(pipeline.funnel.collected_grams_90d)}</div>
                    <div className="text-[11px] text-amber-700 mt-1">{gramsToDeciliters(pipeline.funnel.collected_grams_90d)} dL</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'Melket' : 'Collected'}</div>
                  </div>
                  <div className="text-neutral-300 text-lg font-light">→</div>
                  <div className="flex-1 text-center bg-amber-100 rounded-xl p-3 border border-amber-200">
                    <div className="text-xl font-bold text-amber-900 tabular-nums">{pipeline.funnel.batched_liters} L</div>
                    <div className="text-[11px] text-amber-700 mt-1">{pipeline.funnel.production_batch_count} {lang === 'no' ? 'batches' : 'batches'}</div>
                    <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'I batch' : 'Batched'}</div>
                  </div>
                  <div className="text-neutral-300 text-lg font-light">→</div>
                  <div className="flex-1 text-center bg-amber-200 rounded-xl p-3 border border-amber-300">
                    <div className="text-xl font-bold text-amber-950 tabular-nums">{pipeline.funnel.yield_kg} kg</div>
                    <div className="text-[11px] text-amber-800 mt-1">
                      {pipeline.funnel.batched_liters > 0
                        ? `${Math.round((pipeline.funnel.yield_kg / pipeline.funnel.batched_liters) * 100)}% yield`
                        : '–'}
                    </div>
                    <div className="text-[10px] text-neutral-600 mt-0.5">{lang === 'no' ? 'Produsert' : 'Yielded'}</div>
                  </div>
                </div>
              </div>

              {/* Quality score distribution */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Star className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-medium text-neutral-900">
                    {lang === 'no' ? 'Kvalitetsscore-fordeling' : 'Quality score distribution'}
                  </h3>
                </div>
                {pipeline.qualityDistribution.every(b => b.count === 0) ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen kvalitetsvurderinger ennå' : 'No quality scores yet'}</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1.5 h-20">
                      {pipeline.qualityDistribution.map(({ score, count }) => {
                        const maxCount = Math.max(...pipeline.qualityDistribution.map(b => b.count), 1)
                        const pct = (count / maxCount) * 100
                        const amber = score >= 8 ? 'bg-amber-500' : score >= 5 ? 'bg-amber-300' : 'bg-neutral-200'
                        return (
                          <div key={score} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                            <div className={`w-full rounded-t-sm ${amber} transition-all`} style={{ height: `${pct}%` }} />
                            {count > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                  {count}x
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1">
                      {pipeline.qualityDistribution.map(({ score, count }) => (
                        <div key={score} className="flex-1 text-center">
                          <div className="text-[9px] text-neutral-500">{score}</div>
                          {count > 0 && <div className="text-[8px] text-neutral-400">{count}x</div>}
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-1 px-1">
                      <span>{lang === 'no' ? 'Dårlig' : 'Poor'}</span>
                      <span>{lang === 'no' ? 'Utmerket' : 'Excellent'}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Production by status */}
              {pipeline.productionByStatus.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">
                    {lang === 'no' ? 'Produksjonsstatus' : 'Production status'}
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {pipeline.productionByStatus.map(({ status, count, total_yield_kg }) => (
                      <div key={status} className="flex items-center justify-between bg-neutral-50 rounded-lg px-3 py-2">
                        <div>
                          <div className="text-xs font-medium text-neutral-700 capitalize">{status.replace('_', ' ')}</div>
                          <div className="text-[10px] text-neutral-400">{count} {lang === 'no' ? 'batch' : 'batch'}</div>
                        </div>
                        {total_yield_kg > 0 && (
                          <div className="text-sm font-semibold text-neutral-800 tabular-nums">{total_yield_kg} kg</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MILKERS ───────────────────────────────────────────────────── */}
      {tab === 'milkers' && (
        <div className="space-y-4">
          {milkers.length === 0 ? (
            <div className="text-center py-12 text-sm text-neutral-400">{lang === 'no' ? 'Ingen melkerdata' : 'No milker data'}</div>
          ) : (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3">
                <Star className="w-4 h-4 text-neutral-400" />
                <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Melkere' : 'Milkers'}</h3>
              </div>
              <div className="space-y-0">
                {milkers.map((row) => (
                  <div key={row.milker_name} className="flex items-start justify-between gap-3 py-2.5 border-b border-neutral-50 last:border-0">
                    <div>
                      <div className="text-sm font-medium text-neutral-900">{row.milker_name}</div>
                      <div className="text-[11px] text-neutral-500">
                        {row.session_count} {lang === 'no' ? 'økter' : 'sessions'} · {row.active_days} {lang === 'no' ? 'dager' : 'days'}
                      </div>
                      <div className="text-[10px] text-neutral-400">{lang === 'no' ? 'Sist' : 'Last'}: {row.last_session_date}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-neutral-900 tabular-nums">{fmt(row.total_grams)}</div>
                      <div className="text-[11px] text-neutral-500">{lang === 'no' ? 'snitt' : 'avg'} {fmt(row.avg_session_grams)}</div>
                      <div className="text-[10px] text-neutral-400">{row.morning_sessions}/{row.evening_sessions} M/E</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
