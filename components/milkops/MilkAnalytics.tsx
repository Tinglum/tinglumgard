'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2, TrendingUp, Beaker, Star, Activity, Droplets, Award, FlaskConical, Thermometer, Package } from 'lucide-react'
import { getProductTypeConfig, gramsToDeciliters } from '@/lib/milk/types'
import type { ProductType } from '@/lib/milk/types'

interface DailyTrend { date: string; total_grams: number; morning: number; evening: number }
interface YieldRow { product_type: string; batch_count: number; avg_yield_pct: number; total_milk_used: number; total_yield_kg: number }
interface RecipeRow { recipe_id: string; recipe_name: string; product_type: string; batches_made: number; avg_quality: number | null; avg_yield_pct: number | null }
interface MilkerRow { milker_name: string; session_count: number; active_days: number; morning_sessions: number; evening_sessions: number; total_grams: number; avg_session_grams: number; last_session_date: string }
interface MilkerDetail { milker_name: string; this_month: { grams: number; sessions: number }; last_month: { grams: number; sessions: number }; best_session_grams: number; best_session_date: string | null; rank_this: number; rank_change: number | null }
interface GoatStat { goat_id: string; name: string; tag_number: string | null; accent_color: string; status: string; total_grams: number; session_count: number; morning_grams: number; evening_grams: number; health_flags: Record<string, number>; weekly_totals: number[] }
interface PipelineData {
  milkPipeline: { status: string; count: number; total_liters: number }[]
  qualityDistribution: { score: number; count: number }[]
  productionByStatus: { status: string; count: number; total_yield_kg: number }[]
  funnel: { collected_grams_90d: number; batched_liters: number; yield_kg: number; production_batch_count: number }
  agingBatches: { id: string; batch_code: string; product_type: string; recipe_name: string | null; aging_start: string | null; aging_target_date: string | null; aging_temp: number | null; aging_humidity: number | null; yield_kg: number | null; quality_score: number | null; days_in: number; days_total: number | null; progress_pct: number }[]
  revenue: { total_nok: number; sold_batches: number; total_yield_kg: number; by_type: { product_type: string; batch_count: number; total_nok: number; total_yield_kg: number; avg_price_per_kg: number }[] }
}
interface SessionData {
  completion: { total_days: number; complete_days: number; only_morning: number; only_evening: number }
  methods: { method: string; session_count: number; total_grams: number; avg_grams: number }[]
  temperatures: { date: string; session_type: string; temp: number }[]
  bottles: { date: string; count: number }[]
  monthly: { month: string; total_grams: number; session_count: number }[]
}

type Tab = 'overview' | 'goats' | 'pipeline' | 'sessions' | 'milkers'

const TABS: { id: Tab; labelNo: string; labelEn: string }[] = [
  { id: 'overview', labelNo: 'Oversikt', labelEn: 'Overview' },
  { id: 'goats', labelNo: 'Geiter', labelEn: 'Goats' },
  { id: 'pipeline', labelNo: 'Pipeline', labelEn: 'Pipeline' },
  { id: 'sessions', labelNo: 'Sesjon', labelEn: 'Sessions' },
  { id: 'milkers', labelNo: 'Melkere', labelEn: 'Milkers' },
]

const PIPELINE_ORDER = ['raw', 'pasteurizing', 'pasteurized', 'bottling', 'bottled', 'fridged', 'allocated', 'discarded']
const PIPELINE_LABELS: Record<string, { no: string; en: string; color: string }> = {
  raw:          { no: 'Rå',       en: 'Raw',        color: '#f3f4f6' },
  pasteurizing: { no: 'Pasteur.', en: 'Pasteur.',   color: '#fef3c7' },
  pasteurized:  { no: 'Past.',    en: 'Pasteurized', color: '#fde68a' },
  bottling:     { no: 'Flasker',  en: 'Bottling',   color: '#fcd34d' },
  bottled:      { no: 'Flasket',  en: 'Bottled',    color: '#f59e0b' },
  fridged:      { no: 'Kjølt',    en: 'Fridged',    color: '#d97706' },
  allocated:    { no: 'Allokert', en: 'Allocated',  color: '#92400e' },
  discarded:    { no: 'Kassert',  en: 'Discarded',  color: '#fca5a5' },
}
const HEALTH_FLAGS = ['mastitis_suspect', 'colostrum', 'blood_traces', 'off_smell', 'other']
const HEALTH_LABELS: Record<string, { no: string; en: string; color: string }> = {
  mastitis_suspect: { no: 'Mastitt',  en: 'Mastitis',  color: '#fca5a5' },
  colostrum:        { no: 'Råmelk',   en: 'Colostrum', color: '#fde68a' },
  blood_traces:     { no: 'Blod',     en: 'Blood',     color: '#fca5a5' },
  off_smell:        { no: 'Lukt',     en: 'Off smell', color: '#d1d5db' },
  other:            { no: 'Annet',    en: 'Other',     color: '#e5e7eb' },
}

function fmt(g: number) {
  if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} kg`
  return `${g} g`
}

function ringArc(pct: number, cx: number, cy: number, r: number): string {
  const clamped = Math.min(0.9999, Math.max(0.0001, pct))
  const rad = (d: number) => (d - 90) * Math.PI / 180
  const deg = clamped * 360
  return [
    `M ${(cx + r * Math.cos(rad(0))).toFixed(2)} ${(cy + r * Math.sin(rad(0))).toFixed(2)}`,
    `A ${r} ${r} 0 ${deg > 180 ? 1 : 0} 1 ${(cx + r * Math.cos(rad(deg))).toFixed(2)} ${(cy + r * Math.sin(rad(deg))).toFixed(2)}`,
  ].join(' ')
}

function milkerInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

function milkerColor(name: string): string {
  const colors = ['#d97706','#0891b2','#7c3aed','#059669','#dc2626','#d946ef','#ea580c','#16a34a']
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return colors[h % colors.length]
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
  const [sessions, setSessions] = useState<SessionData | null>(null)
  const [milkerDetails, setMilkerDetails] = useState<MilkerDetail[]>([])
  const [h2hA, setH2hA] = useState('')
  const [h2hB, setH2hB] = useState('')
  const [loading, setLoading] = useState(true)
  const [goatsLoading, setGoatsLoading] = useState(false)
  const [pipelineLoading, setPipelineLoading] = useState(false)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [milkerDetailsLoading, setMilkerDetailsLoading] = useState(false)

  const fetchBase = useCallback(async () => {
    setLoading(true)
    const [tRes, yRes] = await Promise.all([
      fetch('/api/milk/analytics/trends?days=90'),
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

  const fetchSessions = useCallback(async () => {
    if (sessions) return
    setSessionsLoading(true)
    const res = await fetch('/api/milk/analytics/sessions')
    if (res.ok) { const d = await res.json(); setSessions(d) }
    setSessionsLoading(false)
  }, [sessions])

  const fetchMilkerDetails = useCallback(async () => {
    if (milkerDetails.length) return
    setMilkerDetailsLoading(true)
    const res = await fetch('/api/milk/analytics/milker-details')
    if (res.ok) { const d = await res.json(); setMilkerDetails(d.details || []) }
    setMilkerDetailsLoading(false)
  }, [milkerDetails.length])

  useEffect(() => { fetchBase() }, [fetchBase])
  useEffect(() => { if (tab === 'goats') fetchGoats() }, [tab, fetchGoats])
  useEffect(() => { if (tab === 'pipeline') fetchPipeline() }, [tab, fetchPipeline])
  useEffect(() => { if (tab === 'sessions') fetchSessions() }, [tab, fetchSessions])
  useEffect(() => { if (tab === 'milkers') fetchMilkerDetails() }, [tab, fetchMilkerDetails])

  // ── Computed from trends (excluding zero-production days) ─────────────────
  const trends30 = trends.slice(-30)
  const activeDays30 = trends30.filter(t => t.total_grams > 0)
  const maxGrams = Math.max(...activeDays30.map(t => t.total_grams), 1)
  const totalLast30 = activeDays30.reduce((s, t) => s + t.total_grams, 0)
  const activeLast7 = activeDays30.filter((t, i) => i >= activeDays30.length - 7)
  const totalLast7 = activeLast7.reduce((s, t) => s + t.total_grams, 0)
  const prevWeekActive = activeDays30.filter((t, i) => i >= activeDays30.length - 14 && i < activeDays30.length - 7)
  const prevWeek7 = prevWeekActive.reduce((s, t) => s + t.total_grams, 0)
  const avgDaily = activeDays30.length > 0 ? Math.round(totalLast30 / activeDays30.length) : 0
  const weekDeltaPct = prevWeek7 > 0 ? Math.round(((totalLast7 - prevWeek7) / prevWeek7) * 100) : null

  const rollingAvg = trends30.map((_, i) => {
    const slice = trends30.slice(Math.max(0, i - 6), i + 1).filter(t => t.total_grams > 0)
    return slice.length > 0 ? Math.round(slice.reduce((s, t) => s + t.total_grams, 0) / slice.length) : 0
  })

  const dowMap = new Map<number, number[]>()
  for (const t of trends) {
    if (t.total_grams === 0) continue
    const dow = new Date(t.date + 'T12:00:00').getDay()
    const arr = dowMap.get(dow) || []
    arr.push(t.total_grams)
    dowMap.set(dow, arr)
  }
  const dowOrder = [1, 2, 3, 4, 5, 6, 0]
  const dowLabels = lang === 'no' ? ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'] : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const dowAvgs = dowOrder.map(d => { const vals = dowMap.get(d) || []; return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0 })
  const maxDow = Math.max(...dowAvgs, 1)

  const bestDay = activeDays30.length ? activeDays30.reduce((b, t) => t.total_grams > b.total_grams ? t : b) : null
  let bestWeekTotal = 0, bestWeekLabel = ''
  for (let i = 6; i < activeDays30.length; i++) {
    const w = activeDays30.slice(i - 6, i + 1).reduce((s, t) => s + t.total_grams, 0)
    if (w > bestWeekTotal) { bestWeekTotal = w; bestWeekLabel = activeDays30[i - 6].date.slice(5) + '–' + activeDays30[i].date.slice(5) }
  }
  let streak = 0
  for (let i = activeDays30.length - 1; i >= 0; i--) { if (activeDays30[i].total_grams >= avgDaily) streak++; else break }

  // Production calendar heatmap: last 84 days (12 weeks), aligned to Mon
  const calDayMap = new Map(trends.map(t => [t.date, t.total_grams]))
  const maxCalGrams = Math.max(...trends.map(t => t.total_grams), 1)
  const calStartRaw = new Date(Date.now() - 83 * 864e5)
  const calDow = calStartRaw.getDay()
  const calMondayOffset = calDow === 0 ? -6 : 1 - calDow
  const calStart = new Date(calStartRaw.getTime() + calMondayOffset * 864e5)
  const calDays: { date: string; grams: number }[] = []
  for (let i = 0; i < 84; i++) {
    const d = new Date(calStart.getTime() + i * 864e5)
    const ds = d.toISOString().slice(0, 10)
    calDays.push({ date: ds, grams: calDayMap.get(ds) || 0 })
  }
  const calWeeks: typeof calDays[] = []
  for (let w = 0; w < 12; w++) calWeeks.push(calDays.slice(w * 7, w * 7 + 7))

  // Morning vs Evening weekly ratio (last 8 weeks from active days only)
  const meWeeks: { label: string; morningPct: number; eveningPct: number }[] = []
  for (let w = 7; w >= 0; w--) {
    const slice = activeDays30.slice(-(w + 1) * 7, w === 0 ? undefined : -w * 7)
    if (slice.length === 0) continue
    const m = slice.reduce((s, t) => s + t.morning, 0)
    const e = slice.reduce((s, t) => s + t.evening, 0)
    const total = m + e
    if (total === 0) continue
    const start = slice[0]?.date.slice(5) || ''
    meWeeks.push({ label: start, morningPct: Math.round((m / total) * 100), eveningPct: Math.round((e / total) * 100) })
  }

  // Goat donut
  const totalGoatGrams = goats.reduce((s, g) => s + g.total_grams, 0)
  let angle = 0
  const donutSlices = goats.filter(g => g.total_grams > 0).map(g => {
    const span = totalGoatGrams > 0 ? (g.total_grams / totalGoatGrams) * 360 : 0
    const path = donutSlice(90, 90, 78, 44, angle, angle + span)
    angle += span
    return { ...g, span, path }
  })

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  const SubLoader = () => <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-neutral-300" /></div>
  const Empty = ({ text }: { text: string }) => <div className="text-center py-12 text-sm text-neutral-400">{text}</div>

  return (
    <div className="space-y-4 mt-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-neutral-100 rounded-xl p-1">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 text-xs font-medium py-1.5 rounded-lg transition-all ${tab === t.id ? 'bg-white text-neutral-900 shadow-sm' : 'text-neutral-500 hover:text-neutral-700'}`}>
            {lang === 'no' ? t.labelNo : t.labelEn}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ──────────────────────────────────────────────────── */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Summary row */}
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
                  <div className={`text-base font-semibold tabular-nums ${weekDeltaPct >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{weekDeltaPct >= 0 ? '+' : ''}{weekDeltaPct}%</div>
                  <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'vs forrige uke' : 'vs last week'}</div>
                  <div className="text-[10px] text-neutral-400">{fmt(totalLast7)} / {fmt(prevWeek7)}</div>
                </>
              ) : <div className="text-[11px] text-neutral-400 mt-3">{lang === 'no' ? 'Ikke nok data' : 'Not enough data'}</div>}
            </div>
          </div>

          {/* Bar chart + rolling avg */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Daglig produksjon (30 dager) + 7-dagers snitt' : 'Daily production (30 days) + 7-day avg'}</h3>
            </div>
            {trends30.length === 0 ? <p className="text-sm text-neutral-400 text-center py-4">{lang === 'no' ? 'Ingen data' : 'No data'}</p> : (
              <div className="relative">
                <div className="flex items-end gap-[2px] h-28">
                  {trends30.map((day) => (
                    <div key={day.date} className="flex-1 flex flex-col justify-end h-full group relative">
                      <div className="bg-amber-300 rounded-t-sm" style={{ height: `${(day.evening / maxGrams) * 100}%` }} />
                      <div className="bg-amber-500" style={{ height: `${(day.morning / maxGrams) * 100}%` }} />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">{day.date.slice(5)}: {fmt(day.total_grams)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                <svg className="absolute inset-0 w-full h-28 pointer-events-none" viewBox={`0 0 ${trends30.length} 100`} preserveAspectRatio="none">
                  <polyline fill="none" stroke="#dc2626" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.75"
                    points={rollingAvg.map((v, i) => `${i + 0.5},${100 - (v / maxGrams) * 100}`).join(' ')} />
                </svg>
              </div>
            )}
            <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />{lang === 'no' ? 'Morgen' : 'Morning'}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300" />{lang === 'no' ? 'Kveld' : 'Evening'}</span>
              <span className="flex items-center gap-1"><span className="inline-block w-4 border-t border-red-500" />{lang === 'no' ? '7-dagers snitt' : '7-day avg'}</span>
            </div>
          </div>

          {/* 12-week production calendar */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-neutral-400" />
              <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Produksjonskalender (12 uker)' : 'Production calendar (12 weeks)'}</h3>
            </div>
            <div className="flex gap-1">
              {calWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1 flex-1">
                  {week.map((day) => {
                    const pct = day.grams / maxCalGrams
                    const isFuture = day.date > new Date().toISOString().slice(0, 10)
                    return (
                      <div key={day.date} className="aspect-square rounded-sm group relative"
                        style={{ background: isFuture ? 'transparent' : day.grams === 0 ? '#f5f5f4' : `rgba(245,158,11,${0.12 + pct * 0.85})`, border: isFuture ? '1px solid #e5e7eb' : 'none' }}
                        title={`${day.date}: ${fmt(day.grams)}`}>
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10 pointer-events-none">
                          <div className="bg-neutral-900 text-white text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap">{day.date.slice(5)}{day.grams > 0 ? ` · ${fmt(day.grams)}` : ''}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-2 text-[9px] text-neutral-400">
              <span>{lang === 'no' ? 'Mindre' : 'Less'}</span>
              <div className="flex gap-0.5 items-center">
                {[0.12, 0.35, 0.58, 0.80, 0.97].map((a, i) => (
                  <div key={i} className="w-3 h-3 rounded-sm" style={{ background: `rgba(245,158,11,${a})` }} />
                ))}
              </div>
              <span>{lang === 'no' ? 'Mer' : 'More'}</span>
            </div>
          </div>

          {/* Morning vs Evening weekly drift */}
          {meWeeks.length > 1 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-3">
                {lang === 'no' ? 'Morgen / Kveld-fordeling (8 uker)' : 'Morning / Evening split (8 weeks)'}
              </h3>
              <div className="space-y-1.5">
                {meWeeks.map((w) => (
                  <div key={w.label} className="flex items-center gap-2">
                    <span className="text-[10px] text-neutral-400 w-10 flex-shrink-0">{w.label}</span>
                    <div className="flex-1 flex h-4 rounded-md overflow-hidden">
                      <div className="bg-amber-500 flex items-center justify-end pr-1 transition-all" style={{ width: `${w.morningPct}%` }}>
                        {w.morningPct > 15 && <span className="text-[9px] text-white font-medium">{w.morningPct}%</span>}
                      </div>
                      <div className="bg-amber-200 flex items-center justify-start pl-1 transition-all" style={{ width: `${w.eveningPct}%` }}>
                        {w.eveningPct > 15 && <span className="text-[9px] text-amber-800 font-medium">{w.eveningPct}%</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-400">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />{lang === 'no' ? 'Morgen' : 'Morning'}</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-200" />{lang === 'no' ? 'Kveld' : 'Evening'}</span>
              </div>
            </div>
          )}

          {/* Day-of-week heatmap */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Produksjon per ukedag' : 'Production by weekday'}</h3>
            <div className="grid grid-cols-7 gap-1.5">
              {dowLabels.map((label, i) => {
                const avg = dowAvgs[i]; const pct = avg / maxDow
                return (
                  <div key={label} className="flex flex-col items-center gap-1">
                    <div className="w-full h-10 rounded-lg flex items-end justify-center pb-1.5"
                      style={{ background: `rgba(245,158,11,${0.1 + pct * 0.85})` }} title={`${label}: ${fmt(avg)}`}>
                      <span className="text-[9px] font-semibold text-amber-900 opacity-80">{pct > 0.1 ? `${Math.round(pct * 100)}%` : '–'}</span>
                    </div>
                    <span className="text-[10px] text-neutral-500">{label}</span>
                    <span className="text-[9px] text-neutral-400 tabular-nums">{avg > 0 ? fmt(avg) : '–'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Records */}
          <div className="rounded-xl border border-neutral-200 bg-white p-4">
            <div className="flex items-center gap-2 mb-3"><Award className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Rekorder' : 'Records'}</h3></div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '🏆', label: lang === 'no' ? 'Beste dag' : 'Best day', value: bestDay ? fmt(bestDay.total_grams) : '–', sub: bestDay?.date || '' },
                { icon: '📅', label: lang === 'no' ? 'Beste uke' : 'Best week', value: bestWeekTotal > 0 ? fmt(bestWeekTotal) : '–', sub: bestWeekLabel },
                { icon: '🔥', label: lang === 'no' ? 'Streak' : 'Streak', value: `${streak}`, sub: lang === 'no' ? 'dager over snitt' : 'days above avg' },
              ].map(({ icon, label, value, sub }) => (
                <div key={label} className="bg-amber-50 rounded-lg p-3">
                  <div className="text-[10px] text-amber-700 font-medium mb-1">{icon} {label}</div>
                  <div className="text-sm font-bold text-neutral-900 tabular-nums">{value}</div>
                  <div className="text-[10px] text-neutral-500">{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Yield + Recipes */}
          {yields.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3"><Beaker className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Utbytteanalyse' : 'Yield analysis'}</h3></div>
              {yields.map((row) => {
                const cfg = getProductTypeConfig(row.product_type as ProductType)
                return (
                  <div key={row.product_type} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                    <div className="flex items-center gap-2"><span>{cfg.emoji}</span><span className="text-sm text-neutral-900">{lang === 'no' ? cfg.labelNo : cfg.labelEn}</span><span className="text-[11px] text-neutral-400">({row.batch_count}x)</span></div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-neutral-500">{row.total_milk_used} L →</span>
                      <span className="font-medium">{row.total_yield_kg} kg</span>
                      <span className="text-emerald-600 font-medium">{row.avg_yield_pct}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {recipes.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <div className="flex items-center gap-2 mb-3"><Star className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Oppskrift-resultater' : 'Recipe results'}</h3></div>
              {recipes.map((row) => {
                const cfg = getProductTypeConfig(row.product_type as ProductType)
                return (
                  <div key={row.recipe_id} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                    <div className="flex items-center gap-2"><span>{cfg.emoji}</span><span className="text-sm text-neutral-900">{row.recipe_name}</span><span className="text-[11px] text-neutral-400">({row.batches_made}x)</span></div>
                    <div className="flex items-center gap-3 text-sm">
                      {row.avg_quality && <span className="text-amber-600">★ {row.avg_quality}</span>}
                      {row.avg_yield_pct && <span className="text-emerald-600">{row.avg_yield_pct}%</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── GOATS ─────────────────────────────────────────────────────── */}
      {tab === 'goats' && (
        <div className="space-y-4">
          {goatsLoading ? <SubLoader /> : goats.length === 0 ? <Empty text={lang === 'no' ? 'Ingen geiter registrert' : 'No goats registered'} /> : (
            <>
              {/* Ranking with weekly sparklines */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2"><Droplets className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Produksjon per geit (30 dager)' : 'Per-goat production (30 days)'}</h3></div>
                  <div className="flex gap-3 text-[9px] text-neutral-400">
                    {['W4','W3','W2','W1'].map(w => <span key={w}>{w}</span>)}
                  </div>
                </div>
                <div className="space-y-2.5">
                  {goats.map((g, i) => {
                    const maxG = goats[0]?.total_grams || 1
                    const maxWeekly = Math.max(...g.weekly_totals, 1)
                    return (
                      <div key={g.goat_id} className="flex items-center gap-2">
                        <div className="w-4 text-[10px] text-neutral-400 text-right">{i + 1}</div>
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: g.accent_color }} />
                        <div className="w-16 text-sm text-neutral-700 truncate">{g.name}</div>
                        <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden relative">
                          <div className="h-full rounded-full" style={{ width: `${(g.total_grams / maxG) * 100}%`, background: g.accent_color, opacity: 0.85 }} />
                          <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-medium text-neutral-700">{fmt(g.total_grams)}</span>
                        </div>
                        {/* 4-week sparkline */}
                        <div className="flex items-end gap-0.5 h-5 flex-shrink-0">
                          {g.weekly_totals.map((w, wi) => (
                            <div key={wi} className="w-2.5 rounded-t-sm" style={{ height: `${Math.max(15, (w / maxWeekly) * 100)}%`, background: g.accent_color, opacity: 0.6 + wi * 0.1 }} title={`${fmt(w)}`} />
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="mt-3 text-[9px] text-neutral-400 text-right">{lang === 'no' ? 'Sparkline: eldre → nyere' : 'Sparkline: oldest → newest'}</div>
              </div>

              {/* Donut */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Bidragsfordeling' : 'Contribution breakdown'}</h3>
                <div className="flex gap-6 items-center">
                  <div className="flex-shrink-0">
                    <svg viewBox="0 0 180 180" className="w-[140px] h-[140px]">
                      {donutSlices.length > 0 ? donutSlices.map(s => (
                        <path key={s.goat_id} d={s.path} fill={s.accent_color} opacity="0.88">
                          <title>{s.name}: {totalGoatGrams > 0 ? Math.round((s.total_grams / totalGoatGrams) * 100) : 0}%</title>
                        </path>
                      )) : <circle cx="90" cy="90" r="78" fill="none" stroke="#e5e7eb" strokeWidth="34" />}
                      <circle cx="90" cy="90" r="44" fill="white" />
                      <text x="90" y="86" textAnchor="middle" fontSize="11" fill="#374151" fontWeight="600">{fmt(totalGoatGrams)}</text>
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

              {/* Health flags */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Helseflagg' : 'Health flags'}</h3>
                {goats.every(g => Object.keys(g.health_flags).length === 0) ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen helseflagg registrert' : 'No health flags recorded'}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr>
                          <th className="text-left text-neutral-500 font-normal pb-2 pr-3">{lang === 'no' ? 'Geit' : 'Goat'}</th>
                          {HEALTH_FLAGS.map(f => <th key={f} className="text-center text-neutral-500 font-normal pb-2 px-1">{lang === 'no' ? HEALTH_LABELS[f].no : HEALTH_LABELS[f].en}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {goats.map(g => (
                          <tr key={g.goat_id} className="border-t border-neutral-50">
                            <td className="py-1.5 pr-3">
                              <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full" style={{ background: g.accent_color }} /><span className="text-neutral-700">{g.name}</span></div>
                            </td>
                            {HEALTH_FLAGS.map(f => {
                              const count = g.health_flags[f] || 0
                              return (
                                <td key={f} className="text-center py-1.5 px-1">
                                  {count > 0 ? (
                                    <span className="inline-block min-w-[20px] rounded px-1 py-0.5 text-[10px] font-semibold" style={{ background: HEALTH_LABELS[f].color, color: '#374151' }}>{count}</span>
                                  ) : <span className="text-neutral-200">–</span>}
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
          {pipelineLoading ? <SubLoader /> : !pipeline ? <Empty text={lang === 'no' ? 'Ingen data' : 'No data'} /> : (
            <>
              {/* Pipeline status */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Melkebatch-status' : 'Milk batch pipeline'}</h3>
                {pipeline.milkPipeline.length === 0 ? <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen batches' : 'No batches'}</p> : (
                  <div className="flex gap-1 flex-wrap">
                    {PIPELINE_ORDER.map(status => {
                      const bucket = pipeline.milkPipeline.find(b => b.status === status)
                      if (!bucket) return null
                      const cfg = PIPELINE_LABELS[status]
                      return (
                        <div key={status} className="flex flex-col items-center rounded-xl px-3 py-2.5 border border-neutral-100 min-w-[72px]" style={{ background: cfg.color }}>
                          <div className="text-lg font-bold text-neutral-800 tabular-nums">{bucket.count}</div>
                          <div className="text-[10px] text-neutral-600 mt-0.5">{lang === 'no' ? cfg.no : cfg.en}</div>
                          <div className="text-[9px] text-neutral-500">{bucket.total_liters} L</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Funnel */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Produksjonstrakt (90 dager)' : 'Production funnel (90 days)'}</h3>
                <div className="flex items-center gap-2">
                  {[
                    { bg: 'bg-amber-50 border-amber-100', val: fmt(pipeline.funnel.collected_grams_90d), sub: `${gramsToDeciliters(pipeline.funnel.collected_grams_90d)} dL`, label: lang === 'no' ? 'Melket' : 'Collected', textColor: 'text-amber-800' },
                    null,
                    { bg: 'bg-amber-100 border-amber-200', val: `${pipeline.funnel.batched_liters} L`, sub: `${pipeline.funnel.production_batch_count} batches`, label: lang === 'no' ? 'I batch' : 'Batched', textColor: 'text-amber-900' },
                    null,
                    { bg: 'bg-amber-200 border-amber-300', val: `${pipeline.funnel.yield_kg} kg`, sub: pipeline.funnel.batched_liters > 0 ? `${Math.round((pipeline.funnel.yield_kg / pipeline.funnel.batched_liters) * 100)}% yield` : '–', label: lang === 'no' ? 'Produsert' : 'Yielded', textColor: 'text-amber-950' },
                  ].map((item, idx) => item === null ? (
                    <div key={idx} className="text-neutral-300 text-xl">→</div>
                  ) : (
                    <div key={idx} className={`flex-1 text-center rounded-xl p-3 border ${item.bg}`}>
                      <div className={`text-lg font-bold tabular-nums ${item.textColor}`}>{item.val}</div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">{item.sub}</div>
                      <div className="text-[10px] text-neutral-400 mt-0.5">{item.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Aging board */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3"><FlaskConical className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Modningstavle' : 'Aging board'}</h3></div>
                {pipeline.agingBatches.length === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen batches under modning' : 'Nothing aging'}</p>
                ) : (
                  <div className="space-y-3">
                    {pipeline.agingBatches.map(b => {
                      const cfg = getProductTypeConfig(b.product_type as ProductType)
                      return (
                        <div key={b.id} className="border border-neutral-100 rounded-xl p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                              <div className="flex items-center gap-1.5 text-sm font-medium text-neutral-900">
                                <span>{cfg.emoji}</span>
                                <span>{b.batch_code}</span>
                                {b.recipe_name && <span className="text-neutral-400 font-normal text-xs">· {b.recipe_name}</span>}
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-0.5 flex gap-3">
                                {b.aging_start && <span>{lang === 'no' ? 'Start' : 'Start'}: {b.aging_start}</span>}
                                {b.aging_temp && <span>{b.aging_temp}°C</span>}
                                {b.aging_humidity && <span>{b.aging_humidity}% RH</span>}
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <div className="text-sm font-semibold text-neutral-800">{b.days_in} {lang === 'no' ? 'dager' : 'days'}</div>
                              {b.days_total && <div className="text-[10px] text-neutral-400">/ {b.days_total} {lang === 'no' ? 'totalt' : 'total'}</div>}
                            </div>
                          </div>
                          {b.days_total !== null && (
                            <div className="w-full bg-neutral-100 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all" style={{ width: `${b.progress_pct}%`, background: b.progress_pct >= 100 ? '#10b981' : '#f59e0b' }} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Revenue */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-3"><Package className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Inntekter' : 'Revenue'}</h3></div>
                {pipeline.revenue.sold_batches === 0 ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen solgte batches ennå' : 'No sold batches yet'}</p>
                ) : (
                  <>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-emerald-800">{pipeline.revenue.total_nok.toLocaleString('no')} kr</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'Total inntekt' : 'Total revenue'}</div>
                      </div>
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-neutral-800">{pipeline.revenue.sold_batches}</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'Solgte batches' : 'Batches sold'}</div>
                      </div>
                      <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-center">
                        <div className="text-lg font-bold text-neutral-800">{pipeline.revenue.total_yield_kg > 0 ? Math.round(pipeline.revenue.total_nok / pipeline.revenue.total_yield_kg) : 0} kr/kg</div>
                        <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'Snitt per kg' : 'Avg per kg'}</div>
                      </div>
                    </div>
                    {pipeline.revenue.by_type.length > 0 && (
                      <div className="space-y-1.5">
                        {pipeline.revenue.by_type.map(r => {
                          const cfg = getProductTypeConfig(r.product_type as ProductType)
                          return (
                            <div key={r.product_type} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                              <div className="flex items-center gap-2"><span>{cfg.emoji}</span><span className="text-sm text-neutral-900">{lang === 'no' ? cfg.labelNo : cfg.labelEn}</span><span className="text-[11px] text-neutral-400">({r.batch_count}x)</span></div>
                              <div className="flex items-center gap-3 text-sm">
                                <span className="text-neutral-500">{r.total_yield_kg} kg</span>
                                <span className="font-medium text-emerald-700">{r.total_nok.toLocaleString('no')} kr</span>
                                <span className="text-neutral-400 text-xs">{r.avg_price_per_kg} kr/kg</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Quality histogram */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-4"><Star className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Kvalitetsscore' : 'Quality scores'}</h3></div>
                {pipeline.qualityDistribution.every(b => b.count === 0) ? (
                  <p className="text-sm text-neutral-400 text-center py-3">{lang === 'no' ? 'Ingen vurderinger ennå' : 'No scores yet'}</p>
                ) : (
                  <>
                    <div className="flex items-end gap-1.5 h-20">
                      {pipeline.qualityDistribution.map(({ score, count }) => {
                        const maxC = Math.max(...pipeline.qualityDistribution.map(b => b.count), 1)
                        const amber = score >= 8 ? 'bg-amber-500' : score >= 5 ? 'bg-amber-300' : 'bg-neutral-200'
                        return (
                          <div key={score} className="flex-1 flex flex-col items-center gap-1 h-full justify-end group relative">
                            <div className={`w-full rounded-t-sm ${amber}`} style={{ height: `${(count / maxC) * 100}%` }} />
                            {count > 0 && (
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                                <div className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">{count}x</div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <div className="flex gap-1.5 mt-1">{pipeline.qualityDistribution.map(({ score }) => <div key={score} className="flex-1 text-center text-[9px] text-neutral-500">{score}</div>)}</div>
                    <div className="flex justify-between text-[9px] text-neutral-400 mt-0.5 px-1"><span>{lang === 'no' ? 'Dårlig' : 'Poor'}</span><span>{lang === 'no' ? 'Utmerket' : 'Excellent'}</span></div>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── SESSIONS ──────────────────────────────────────────────────── */}
      {tab === 'sessions' && (
        <div className="space-y-4">
          {sessionsLoading ? <SubLoader /> : !sessions ? <Empty text={lang === 'no' ? 'Ingen sesjonsdata' : 'No session data'} /> : (
            <>
              {/* Completion rate */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Sesjonsdekning (90 dager)' : 'Session coverage (90 days)'}</h3>
                <div className="grid grid-cols-4 gap-3 text-center">
                  {[
                    { val: sessions.completion.total_days, label: lang === 'no' ? 'Dager totalt' : 'Total days', bg: 'bg-neutral-50' },
                    { val: sessions.completion.complete_days, label: lang === 'no' ? 'Fulle dager (M+K)' : 'Complete (M+E)', bg: 'bg-emerald-50', color: 'text-emerald-700' },
                    { val: sessions.completion.only_morning, label: lang === 'no' ? 'Kun morgen' : 'Morning only', bg: 'bg-amber-50', color: 'text-amber-700' },
                    { val: sessions.completion.only_evening, label: lang === 'no' ? 'Kun kveld' : 'Evening only', bg: 'bg-blue-50', color: 'text-blue-700' },
                  ].map(({ val, label, bg, color }) => (
                    <div key={label} className={`rounded-xl p-3 ${bg} border border-neutral-100`}>
                      <div className={`text-2xl font-bold ${color || 'text-neutral-800'}`}>{val}</div>
                      <div className="text-[10px] text-neutral-500 mt-1 leading-tight">{label}</div>
                    </div>
                  ))}
                </div>
                {sessions.completion.total_days > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
                      <span>{lang === 'no' ? 'Fulldekningsrate' : 'Full coverage rate'}</span>
                      <span>{Math.round((sessions.completion.complete_days / sessions.completion.total_days) * 100)}%</span>
                    </div>
                    <div className="w-full bg-neutral-100 rounded-full h-2">
                      <div className="h-2 bg-emerald-500 rounded-full" style={{ width: `${(sessions.completion.complete_days / sessions.completion.total_days) * 100}%` }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Milking method comparison */}
              {sessions.methods.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Melkemetode' : 'Milking method'}</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {sessions.methods.map(m => (
                      <div key={m.method} className="bg-neutral-50 border border-neutral-100 rounded-xl p-4">
                        <div className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-2">{m.method === 'machine' ? (lang === 'no' ? 'Maskin' : 'Machine') : (lang === 'no' ? 'Hånd' : 'Hand')}</div>
                        <div className="text-2xl font-bold text-neutral-900">{fmt(m.total_grams)}</div>
                        <div className="text-[11px] text-neutral-500 mt-1">{m.session_count} {lang === 'no' ? 'økter' : 'sessions'}</div>
                        <div className="text-[11px] text-neutral-400">{lang === 'no' ? 'Snitt' : 'Avg'}: {fmt(m.avg_grams)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Temperature log */}
              {sessions.temperatures.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-3"><Thermometer className="w-4 h-4 text-neutral-400" /><h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Temperaturlogg' : 'Temperature log'}</h3></div>
                  {(() => {
                    const temps = sessions.temperatures
                    const minT = Math.floor(Math.min(...temps.map(t => t.temp))) - 1
                    const maxT = Math.ceil(Math.max(...temps.map(t => t.temp))) + 1
                    const rangeT = maxT - minT || 1
                    const w = temps.length
                    return (
                      <div className="relative h-24">
                        <svg className="w-full h-24" viewBox={`0 0 ${w} ${rangeT}`} preserveAspectRatio="none">
                          <polyline fill="none" stroke="#d97706" strokeWidth="0.4" strokeLinecap="round" strokeLinejoin="round"
                            points={temps.map((t, i) => `${i + 0.5},${maxT - t.temp}`).join(' ')} />
                          {temps.map((t, i) => (
                            <circle key={i} cx={i + 0.5} cy={maxT - t.temp} r="0.5" fill={t.session_type === 'morning' ? '#f59e0b' : '#93c5fd'} />
                          ))}
                        </svg>
                        <div className="flex justify-between text-[9px] text-neutral-400 mt-1">
                          <span>{temps[0]?.date.slice(5)}</span>
                          <span>{Math.round((minT + maxT) / 2)}°C {lang === 'no' ? 'midtpunkt' : 'midpoint'}</span>
                          <span>{temps[temps.length - 1]?.date.slice(5)}</span>
                        </div>
                      </div>
                    )
                  })()}
                  <div className="flex items-center gap-4 mt-1 text-[10px] text-neutral-400">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" />{lang === 'no' ? 'Morgen' : 'Morning'}</span>
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-300" />{lang === 'no' ? 'Kveld' : 'Evening'}</span>
                  </div>
                </div>
              )}

              {/* Bottle tracker */}
              {sessions.bottles.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Flasker fylt' : 'Bottles filled'}</h3>
                  <div className="flex items-center gap-4 mb-3">
                    <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                      <div className="text-2xl font-bold text-amber-800">{sessions.bottles.reduce((s, b) => s + b.count, 0)}</div>
                      <div className="text-[10px] text-neutral-500 mt-0.5">{lang === 'no' ? 'Totalt' : 'Total'}</div>
                    </div>
                    <div className="flex-1 flex items-end gap-[2px] h-10">
                      {sessions.bottles.slice(-30).map(b => {
                        const maxB = Math.max(...sessions.bottles.map(x => x.count), 1)
                        return (
                          <div key={b.date} className="flex-1 bg-amber-400 rounded-t-sm" style={{ height: `${(b.count / maxB) * 100}%` }} title={`${b.date}: ${b.count}`} />
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly seasonality */}
              {sessions.monthly.length > 1 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Månedlig produksjon' : 'Monthly production'}</h3>
                  {(() => {
                    const maxM = Math.max(...sessions.monthly.map(m => m.total_grams), 1)
                    return (
                      <div className="space-y-2">
                        {sessions.monthly.map(m => {
                          const pct = (m.total_grams / maxM) * 100
                          const [year, mon] = m.month.split('-')
                          const label = new Date(Number(year), Number(mon) - 1, 1).toLocaleString(lang === 'no' ? 'no-NO' : 'en-US', { month: 'short', year: '2-digit' })
                          return (
                            <div key={m.month} className="flex items-center gap-3">
                              <span className="text-xs text-neutral-500 w-14 flex-shrink-0">{label}</span>
                              <div className="flex-1 bg-neutral-100 rounded-full h-5 overflow-hidden relative">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                                <span className="absolute inset-0 flex items-center pl-2 text-[10px] font-medium text-neutral-700">{fmt(m.total_grams)}</span>
                              </div>
                              <span className="text-[10px] text-neutral-400 w-14 text-right">{m.session_count} sess</span>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── MILKERS / COMPETITION ─────────────────────────────────────── */}
      {tab === 'milkers' && (
        <div className="space-y-4">
          {milkers.length === 0 ? <Empty text={lang === 'no' ? 'Ingen melkerdata' : 'No milker data'} /> : (
            <>
              {/* 1. MONTHLY LEADERBOARD */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Award className="w-4 h-4 text-neutral-400" />
                  <h3 className="text-sm font-medium text-neutral-900">{lang === 'no' ? 'Månedlig rangering' : 'Monthly leaderboard'}</h3>
                  {milkerDetailsLoading && <Loader2 className="w-3 h-3 animate-spin text-neutral-300 ml-auto" />}
                </div>
                <div className="space-y-2">
                  {(milkerDetails.length ? milkerDetails : milkers.map((m, i) => ({
                    milker_name: m.milker_name, rank_this: i + 1, rank_change: null,
                    this_month: { grams: 0, sessions: 0 }, last_month: { grams: 0, sessions: 0 },
                    best_session_grams: 0, best_session_date: null,
                  }))).map((d, i) => {
                    const row = milkers.find(m => m.milker_name === d.milker_name)
                    const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : null
                    const delta = d.last_month.grams > 0 ? Math.round(((d.this_month.grams - d.last_month.grams) / d.last_month.grams) * 100) : null
                    const color = milkerColor(d.milker_name)
                    return (
                      <div key={d.milker_name} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 ${i === 0 ? 'bg-amber-50 border border-amber-100' : 'bg-neutral-50 border border-neutral-100'}`}>
                        <div className="w-7 text-center">{medal || <span className="text-sm text-neutral-400 font-medium">{i + 1}</span>}</div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
                          {milkerInitials(d.milker_name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-neutral-900 truncate">{d.milker_name}</div>
                          <div className="text-[10px] text-neutral-500">{row?.session_count || 0} {lang === 'no' ? 'økter totalt' : 'sessions total'}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-neutral-900 tabular-nums">
                            {d.this_month.grams > 0 ? fmt(d.this_month.grams) : fmt(row?.total_grams || 0)}
                          </div>
                          {delta !== null && (
                            <div className={`text-[10px] font-medium ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                              {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
                            </div>
                          )}
                        </div>
                        {d.rank_change !== null && (
                          <div className={`text-[10px] font-bold w-5 text-center ${d.rank_change > 0 ? 'text-emerald-500' : d.rank_change < 0 ? 'text-red-500' : 'text-neutral-300'}`}>
                            {d.rank_change > 0 ? `↑${d.rank_change}` : d.rank_change < 0 ? `↓${Math.abs(d.rank_change)}` : '–'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 2. CONSISTENCY RINGS */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Konsistens (økt per aktiv dag)' : 'Consistency (sessions per active day)'}</h3>
                <div className="flex flex-wrap gap-4 justify-around">
                  {milkers.map(m => {
                    const sessPerDay = m.active_days > 0 ? m.session_count / m.active_days : 0
                    const pct = Math.min(1, sessPerDay / 2)
                    const color = milkerColor(m.milker_name)
                    const scoreLabel = sessPerDay >= 1.8 ? (lang === 'no' ? 'Utmerket' : 'Excellent') : sessPerDay >= 1.3 ? (lang === 'no' ? 'Bra' : 'Good') : (lang === 'no' ? 'OK' : 'OK')
                    return (
                      <div key={m.milker_name} className="flex flex-col items-center gap-1.5">
                        <div className="relative w-14 h-14">
                          <svg viewBox="0 0 60 60" className="w-14 h-14 -rotate-90">
                            <circle cx="30" cy="30" r="22" fill="none" stroke="#f5f5f4" strokeWidth="6" />
                            <path d={ringArc(pct, 30, 30, 22)} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[11px] font-bold" style={{ color }}>{Math.round(pct * 100)}%</span>
                          </div>
                        </div>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ background: color }}>
                          {milkerInitials(m.milker_name)}
                        </div>
                        <div className="text-[10px] text-neutral-600 font-medium text-center max-w-[64px] truncate">{m.milker_name.split(' ')[0]}</div>
                        <div className="text-[9px] text-neutral-400">{scoreLabel}</div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* 3. PERSONAL RECORDS */}
              {milkerDetails.length > 0 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Personlige rekorder' : 'Personal records'}</h3>
                  <div className="space-y-2">
                    {milkerDetails.map(d => {
                      const color = milkerColor(d.milker_name)
                      const row = milkers.find(m => m.milker_name === d.milker_name)
                      return (
                        <div key={d.milker_name} className="flex items-center gap-3 py-2 border-b border-neutral-50 last:border-0">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ background: color }}>
                            {milkerInitials(d.milker_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-neutral-900">{d.milker_name}</div>
                            <div className="text-[10px] text-neutral-400">{row?.session_count} {lang === 'no' ? 'økter' : 'sessions'} · {lang === 'no' ? 'snitt' : 'avg'} {fmt(row?.avg_session_grams || 0)}</div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-bold text-amber-600 tabular-nums">🏆 {fmt(d.best_session_grams)}</div>
                            <div className="text-[10px] text-neutral-400">{d.best_session_date || '–'}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* 4. HEAD-TO-HEAD */}
              {milkers.length >= 2 && (
                <div className="rounded-xl border border-neutral-200 bg-white p-4">
                  <h3 className="text-sm font-medium text-neutral-900 mb-3">{lang === 'no' ? 'Ansikt til ansikt' : 'Head to head'}</h3>
                  <div className="flex gap-2 mb-4">
                    {([h2hA, h2hB] as const).map((val, idx) => (
                      <select key={idx} value={val}
                        onChange={e => idx === 0 ? setH2hA(e.target.value) : setH2hB(e.target.value)}
                        className="flex-1 text-sm border border-neutral-200 rounded-lg px-2 py-1.5 bg-white text-neutral-700 focus:outline-none focus:ring-1 focus:ring-amber-400">
                        <option value="">{lang === 'no' ? '— Velg melker —' : '— Select milker —'}</option>
                        {milkers.map(m => <option key={m.milker_name} value={m.milker_name}>{m.milker_name}</option>)}
                      </select>
                    ))}
                  </div>
                  {h2hA && h2hB && h2hA !== h2hB ? (() => {
                    const a = milkers.find(m => m.milker_name === h2hA)!
                    const b = milkers.find(m => m.milker_name === h2hB)!
                    const da = milkerDetails.find(m => m.milker_name === h2hA)
                    const db = milkerDetails.find(m => m.milker_name === h2hB)
                    const colorA = milkerColor(h2hA), colorB = milkerColor(h2hB)
                    const stats: { label: string; a: number | string; b: number | string; higherWins?: boolean }[] = [
                      { label: lang === 'no' ? 'Total produksjon' : 'Total production', a: a.total_grams, b: b.total_grams, higherWins: true },
                      { label: lang === 'no' ? 'Snitt per økt' : 'Avg per session', a: a.avg_session_grams, b: b.avg_session_grams, higherWins: true },
                      { label: lang === 'no' ? 'Antall økter' : 'Sessions', a: a.session_count, b: b.session_count, higherWins: true },
                      { label: lang === 'no' ? 'Aktive dager' : 'Active days', a: a.active_days, b: b.active_days, higherWins: true },
                      { label: lang === 'no' ? 'Morgenøkter' : 'Morning sess.', a: a.morning_sessions, b: b.morning_sessions, higherWins: true },
                      { label: lang === 'no' ? 'Kveldsøkter' : 'Evening sess.', a: a.evening_sessions, b: b.evening_sessions, higherWins: true },
                      ...(da && db ? [{ label: lang === 'no' ? 'Beste økt' : 'Best session', a: da.best_session_grams, b: db.best_session_grams, higherWins: true }] : []),
                      ...(da && db && (da.this_month.grams > 0 || db.this_month.grams > 0) ? [{ label: lang === 'no' ? 'Denne måneden' : 'This month', a: da.this_month.grams, b: db.this_month.grams, higherWins: true }] : []),
                    ]
                    return (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="flex-1 flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: colorA }}>{milkerInitials(h2hA)}</div>
                            <span className="font-semibold text-sm text-neutral-900">{h2hA.split(' ')[0]}</span>
                          </div>
                          <div className="text-xs text-neutral-400 font-medium">vs</div>
                          <div className="flex-1 flex items-center justify-end gap-2">
                            <span className="font-semibold text-sm text-neutral-900 text-right">{h2hB.split(' ')[0]}</span>
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ background: colorB }}>{milkerInitials(h2hB)}</div>
                          </div>
                        </div>
                        {stats.map(({ label, a: av, b: bv, higherWins }) => {
                          const an = Number(av), bn = Number(bv)
                          const aWins = higherWins ? an > bn : an < bn
                          const bWins = higherWins ? bn > an : bn < an
                          return (
                            <div key={label} className="flex items-center gap-2 py-1.5 border-b border-neutral-50 last:border-0">
                              <div className={`flex-1 text-sm font-semibold tabular-nums text-right ${aWins ? 'text-amber-600' : 'text-neutral-500'}`}>{typeof av === 'number' && av > 500 ? fmt(av) : av}</div>
                              <div className="w-28 text-center text-[10px] text-neutral-400">{label}</div>
                              <div className={`flex-1 text-sm font-semibold tabular-nums ${bWins ? 'text-amber-600' : 'text-neutral-500'}`}>{typeof bv === 'number' && bv > 500 ? fmt(bv) : bv}</div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })() : (
                    <p className="text-center text-sm text-neutral-400 py-2">{lang === 'no' ? 'Velg to ulike melkere' : 'Pick two different milkers'}</p>
                  )}
                </div>
              )}

              {/* 5. ACHIEVEMENT BADGES */}
              <div className="rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-medium text-neutral-900 mb-4">{lang === 'no' ? 'Merker & titler' : 'Badges & titles'}</h3>
                {(() => {
                  const maxGramsM = Math.max(...milkers.map(m => m.total_grams))
                  const maxSessions = Math.max(...milkers.map(m => m.session_count))
                  const maxMorning = Math.max(...milkers.map(m => m.morning_sessions))
                  const maxEvening = Math.max(...milkers.map(m => m.evening_sessions))
                  const maxBest = milkerDetails.length ? Math.max(...milkerDetails.map(d => d.best_session_grams)) : 0
                  const mostGrowth = milkerDetails.length ? milkerDetails.reduce((best, d) => {
                    const pct = d.last_month.grams > 0 ? (d.this_month.grams - d.last_month.grams) / d.last_month.grams : 0
                    const bestPct = best.last_month.grams > 0 ? (best.this_month.grams - best.last_month.grams) / best.last_month.grams : 0
                    return pct > bestPct ? d : best
                  }, milkerDetails[0]) : null

                  const BADGES: { key: string; emoji: string; no: string; en: string; color: string; test: (m: MilkerRow, d?: MilkerDetail) => boolean }[] = [
                    { key: 'top', emoji: '🥛', no: 'Toppmelker', en: 'Top Producer', color: 'bg-amber-100 text-amber-800', test: m => m.total_grams === maxGramsM },
                    { key: 'active', emoji: '⚡', no: 'Mest aktiv', en: 'Most Active', color: 'bg-blue-100 text-blue-800', test: m => m.session_count === maxSessions },
                    { key: 'morning', emoji: '🌅', no: 'Morgen-mester', en: 'Morning Master', color: 'bg-orange-100 text-orange-800', test: m => m.morning_sessions === maxMorning && maxMorning > 0 },
                    { key: 'evening', emoji: '🌙', no: 'Kveld-kongen', en: 'Evening King', color: 'bg-indigo-100 text-indigo-800', test: m => m.evening_sessions === maxEvening && maxEvening > 0 },
                    { key: 'record', emoji: '💎', no: 'Rekord-holder', en: 'Record Holder', color: 'bg-purple-100 text-purple-800', test: (m, d) => !!d && d.best_session_grams === maxBest && maxBest > 0 },
                    { key: 'growth', emoji: '📈', no: 'Mest vekst', en: 'Most Growth', color: 'bg-emerald-100 text-emerald-800', test: (m, d) => !!mostGrowth && !!d && d.milker_name === mostGrowth.milker_name && d.this_month.grams > d.last_month.grams },
                    { key: 'hundred', emoji: '💯', no: '100 økter', en: '100 sessions', color: 'bg-neutral-100 text-neutral-700', test: m => m.session_count >= 100 },
                    { key: 'streak7', emoji: '🔥', no: 'Vane-melker', en: 'Habit Milker', color: 'bg-red-100 text-red-800', test: m => m.active_days >= 14 },
                  ]

                  return (
                    <div className="space-y-3">
                      {milkers.map(m => {
                        const d = milkerDetails.find(x => x.milker_name === m.milker_name)
                        const earned = BADGES.filter(b => b.test(m, d))
                        const color = milkerColor(m.milker_name)
                        return (
                          <div key={m.milker_name} className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5" style={{ background: color }}>
                              {milkerInitials(m.milker_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-neutral-900 mb-1.5">{m.milker_name}</div>
                              {earned.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5">
                                  {earned.map(b => (
                                    <span key={b.key} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.color}`}>
                                      {b.emoji} {lang === 'no' ? b.no : b.en}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[11px] text-neutral-400">{lang === 'no' ? 'Ingen merker ennå' : 'No badges yet'}</span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
