'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Milk,
  ChefHat,
  BookOpen,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Plus,
  Minus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  ChevronDown,
} from 'lucide-react'
import type {
  MilkOpsTab,
  MilkGoat,
  MilkDailySession,
  MilkSessionEntry,
  MilkOpsDayState,
  SessionType,
  MilkingMethod,
  HealthFlag,
} from '@/lib/milk/types'
import { computeNetGrams, gramsToDeciliters, decilitersToGrams, BOTTLE_TARE_GRAMS } from '@/lib/milk/types'
import { DairyProduction } from './DairyProduction'
import { RecipeLibrary } from './RecipeLibrary'
import { InventoryAging } from './InventoryAging'
import { MilkAnalytics } from './MilkAnalytics'

// ─── State ──────────────────────────────────────────────────────────────────

interface LineageGoat {
  id: string
  name: string
  ear_tag?: string
}

interface DashboardState {
  tab: MilkOpsTab
  date: string
  loading: boolean
  error: string | null
  goats: MilkGoat[]
  sessions: MilkDailySession[]
  entries: (MilkSessionEntry & { goat_name?: string })[]
  dayState: MilkOpsDayState | null
  kpi: {
    total_grams: number
    morning_grams: number
    evening_grams: number
    goats_milked: number
    health_flags: number
    avg_7d: number
    avg_30d: number
  }
  saving: Record<string, 'saving' | 'saved' | 'error'>
}

type Action =
  | { type: 'SET_TAB'; tab: MilkOpsTab }
  | { type: 'SET_DATE'; date: string }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'SET_ERROR'; error: string | null }
  | { type: 'SET_DATA'; payload: Partial<DashboardState> }
  | { type: 'UPDATE_SESSION'; session: MilkDailySession }
  | { type: 'UPDATE_ENTRY'; entry: MilkSessionEntry & { goat_name?: string } }
  | { type: 'REMOVE_ENTRY'; id: string }
  | { type: 'SET_SAVE_STATE'; id: string; state: 'saving' | 'saved' | 'error' }
  | { type: 'SET_DAY_STATE'; dayState: MilkOpsDayState }

function todayOslo(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' })
}

const initialState: DashboardState = {
  tab: 'milking',
  date: todayOslo(),
  loading: true,
  error: null,
  goats: [],
  sessions: [],
  entries: [],
  dayState: null,
  kpi: { total_grams: 0, morning_grams: 0, evening_grams: 0, goats_milked: 0, health_flags: 0, avg_7d: 0, avg_30d: 0 },
  saving: {},
}

function reducer(state: DashboardState, action: Action): DashboardState {
  switch (action.type) {
    case 'SET_TAB':
      return { ...state, tab: action.tab }
    case 'SET_DATE':
      return { ...state, date: action.date, loading: true }
    case 'SET_LOADING':
      return { ...state, loading: action.loading }
    case 'SET_ERROR':
      return { ...state, error: action.error, loading: false }
    case 'SET_DATA':
      return { ...state, ...action.payload, loading: false, error: null }
    case 'UPDATE_SESSION': {
      const sessions = state.sessions.map((s) => (s.id === action.session.id ? action.session : s))
      if (!sessions.find((s) => s.id === action.session.id)) sessions.push(action.session)
      // Recalculate KPI totals from sessions
      const totalGrams = sessions.reduce((sum, s) => sum + Number(s.total_grams || 0), 0)
      const morn = sessions.find((s) => s.session_type === 'morning')
      const eve = sessions.find((s) => s.session_type === 'evening')
      return {
        ...state,
        sessions,
        kpi: {
          ...state.kpi,
          total_grams: totalGrams,
          morning_grams: Number(morn?.total_grams || 0),
          evening_grams: Number(eve?.total_grams || 0),
        },
      }
    }
    case 'UPDATE_ENTRY': {
      const entries = state.entries.map((e) => (e.id === action.entry.id ? action.entry : e))
      if (!entries.find((e) => e.id === action.entry.id)) entries.push(action.entry)
      return { ...state, entries }
    }
    case 'REMOVE_ENTRY':
      return { ...state, entries: state.entries.filter((e) => e.id !== action.id) }
    case 'SET_SAVE_STATE':
      return { ...state, saving: { ...state.saving, [action.id]: action.state } }
    case 'SET_DAY_STATE':
      return { ...state, dayState: action.dayState }
    default:
      return state
  }
}

// ─── Tabs config ────────────────────────────────────────────────────────────

const TABS: { id: MilkOpsTab; icon: typeof Milk; labelNo: string; labelEn: string }[] = [
  { id: 'milking', icon: Milk, labelNo: 'Melking', labelEn: 'Milking' },
  { id: 'production', icon: ChefHat, labelNo: 'Produksjon', labelEn: 'Production' },
  { id: 'recipes', icon: BookOpen, labelNo: 'Oppskrifter', labelEn: 'Recipes' },
  { id: 'inventory', icon: Package, labelNo: 'Lager', labelEn: 'Inventory' },
  { id: 'analytics', icon: BarChart3, labelNo: 'Analyse', labelEn: 'Analytics' },
]

// ─── Autosave ───────────────────────────────────────────────────────────────

const AUTOSAVE_DELAY = 180

function useAutosave() {
  const timers = useRef<Map<string, NodeJS.Timeout>>(new Map())

  const schedule = useCallback((key: string, fn: () => Promise<void>) => {
    const existing = timers.current.get(key)
    if (existing) clearTimeout(existing)
    timers.current.set(
      key,
      setTimeout(async () => {
        timers.current.delete(key)
        await fn()
      }, AUTOSAVE_DELAY)
    )
  }, [])

  useEffect(() => {
    return () => {
      timers.current.forEach((t) => clearTimeout(t))
    }
  }, [])

  return { schedule }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MilkOpsDashboard() {
  const { lang } = useLanguage()
  const [state, dispatch] = useReducer(reducer, initialState)
  const { schedule } = useAutosave()
  const [lineageGoats, setLineageGoats] = useState<LineageGoat[]>([])
  const [addGoatDropdown, setAddGoatDropdown] = useState<string | null>(null) // sessionId

  // ── Fetch daily data ────────────────────────────────────────────────────

  const fetchDaily = useCallback(async (date: string) => {
    try {
      dispatch({ type: 'SET_LOADING', loading: true })
      const res = await fetch(`/api/milk/daily?date=${date}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      dispatch({
        type: 'SET_DATA',
        payload: {
          sessions: data.sessions || [],
          entries: data.entries || [],
          goats: data.goats || [],
          dayState: data.day_state || null,
          kpi: data.kpi || initialState.kpi,
        },
      })
    } catch (err: any) {
      dispatch({ type: 'SET_ERROR', error: err?.message || 'Failed to load' })
    }
  }, [])

  // ── Fetch goat lineage data ─────────────────────────────────────────────

  useEffect(() => {
    async function fetchLineage() {
      try {
        const res = await fetch('/api/milk/goat-lineage')
        if (res.ok) {
          const data = await res.json()
          setLineageGoats(data.goats || [])
        }
      } catch {}
    }
    fetchLineage()
  }, [])

  useEffect(() => {
    fetchDaily(state.date)
  }, [state.date, fetchDaily])

  // ── Date navigation ─────────────────────────────────────────────────────

  const shiftDate = (days: number) => {
    const d = new Date(state.date)
    d.setDate(d.getDate() + days)
    dispatch({ type: 'SET_DATE', date: d.toISOString().slice(0, 10) })
  }

  const isToday = state.date === todayOslo()

  // ── Save session ────────────────────────────────────────────────────────

  const saveSession = async (sessionId: string, updates: Record<string, unknown>) => {
    const key = `session-${sessionId}`
    dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saving' })
    try {
      const res = await fetch(`/api/milk/daily/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!res.ok) throw new Error()
      const { row } = await res.json()
      dispatch({ type: 'UPDATE_SESSION', session: row })
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saved' })
      if (navigator.vibrate) navigator.vibrate(30)
      setTimeout(() => dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saved' }), 2000)
    } catch {
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'error' })
    }
  }

  // ── Save entry (per-goat) ───────────────────────────────────────────────

  const saveEntry = async (entry: { session_id: string; goat_id: string; grams: number; health_flag?: HealthFlag; health_notes?: string; id?: string }) => {
    const key = `entry-${entry.goat_id}-${entry.session_id}`
    dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saving' })
    try {
      const url = entry.id ? `/api/milk/entries/${entry.id}` : '/api/milk/entries'
      const method = entry.id ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      })
      if (!res.ok) throw new Error()
      const { entry: saved } = await res.json()
      const goatName = lineageGoats.find((g) => g.id === saved.goat_id)?.name || state.goats.find((g) => g.id === saved.goat_id)?.name
      dispatch({ type: 'UPDATE_ENTRY', entry: { ...saved, goat_name: goatName } })
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saved' })
      if (navigator.vibrate) navigator.vibrate(30)
    } catch {
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'error' })
    }
  }

  const removeEntry = async (entryId: string) => {
    try {
      await fetch(`/api/milk/entries/${entryId}`, { method: 'DELETE' })
      dispatch({ type: 'REMOVE_ENTRY', id: entryId })
    } catch {}
  }

  // ── Update session with recalculated total_grams ────────────────────────

  const updateSessionWeight = (session: MilkDailySession, field: string, value: number) => {
    const updated = { ...session, [field]: value }
    const netGrams = computeNetGrams(
      updated.gross_weight_grams || 0,
      updated.bottle_count || 0,
      updated.custom_tare_grams || 0
    )
    updated.total_grams = netGrams
    dispatch({ type: 'UPDATE_SESSION', session: updated })
    const saveKey = `session-${session.id}`
    schedule(saveKey, () =>
      saveSession(session.id, {
        [field]: value,
        total_grams: netGrams,
        gross_weight_grams: updated.gross_weight_grams,
        bottle_count: updated.bottle_count,
        custom_tare_grams: updated.custom_tare_grams,
      })
    )
  }

  // ── Prefill day ─────────────────────────────────────────────────────────

  const handlePrefill = async () => {
    try {
      const res = await fetch('/api/milk/daily/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: state.date }),
      })
      if (!res.ok) throw new Error()
      await fetchDaily(state.date)
    } catch {}
  }

  // ── Format ──────────────────────────────────────────────────────────────

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00')
    return date.toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    })
  }

  const formatGrams = (g: number) => {
    if (g >= 1000) return `${(g / 1000).toFixed(1).replace('.0', '')} kg`
    return `${g} g`
  }

  const formatDl = (g: number) => `${gramsToDeciliters(g)} dL`

  // ── Get goats participating in a session ─────────────────────────────────

  const getSessionGoats = (sessionId: string) => {
    const sessionEntries = state.entries.filter((e) => e.session_id === sessionId)
    return sessionEntries.map((e) => ({
      ...e,
      name: e.goat_name || lineageGoats.find((g) => g.id === e.goat_id)?.name || '?',
    }))
  }

  // Available lineage goats not yet added to this session
  const getAvailableGoats = (sessionId: string) => {
    const usedIds = state.entries.filter((e) => e.session_id === sessionId).map((e) => e.goat_id)
    return lineageGoats.filter((g) => !usedIds.includes(g.id))
  }

  // ── Render ──────────────────────────────────────────────────────────────

  const morningSession = state.sessions.find((s) => s.session_type === 'morning')
  const eveningSession = state.sessions.find((s) => s.session_type === 'evening')

  return (
    <div className="max-w-2xl mx-auto px-4 pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-neutral-50 pt-4 pb-3 border-b border-neutral-200">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl font-semibold text-neutral-900 tracking-tight">
            {lang === 'no' ? 'Melkelogg' : 'Milk Log'}
          </h1>
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button onClick={() => shiftDate(-1)} className="p-2 rounded-lg hover:bg-neutral-200 active:bg-neutral-300 transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => !isToday && dispatch({ type: 'SET_DATE', date: todayOslo() })}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-medium transition-colors', isToday ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300')}
          >
            {formatDate(state.date)}
            {isToday && <span className="ml-1.5 text-neutral-400">{lang === 'no' ? '(i dag)' : '(today)'}</span>}
          </button>
          <button onClick={() => shiftDate(1)} className="p-2 rounded-lg hover:bg-neutral-200 active:bg-neutral-300 transition-colors">
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  state.tab === tab.id ? 'bg-neutral-900 text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-200'
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {lang === 'no' ? tab.labelNo : tab.labelEn}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      {state.loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
        </div>
      ) : state.error ? (
        <div className="py-20 text-center">
          <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
          <p className="text-sm text-neutral-600">{state.error}</p>
          <button onClick={() => fetchDaily(state.date)} className="mt-3 text-sm text-neutral-900 underline">
            {lang === 'no' ? 'Prøv igjen' : 'Retry'}
          </button>
        </div>
      ) : state.tab === 'milking' ? (
        <div className="space-y-4 mt-4">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard label={lang === 'no' ? 'Totalt' : 'Total'} value={formatGrams(state.kpi.total_grams)} sub={formatDl(state.kpi.total_grams)} accent />
            <KpiCard label={lang === 'no' ? 'Snitt 7d' : 'Avg 7d'} value={formatGrams(state.kpi.avg_7d)} />
            <KpiCard label={lang === 'no' ? 'Snitt 30d' : 'Avg 30d'} value={formatGrams(state.kpi.avg_30d)} />
          </div>

          {/* Sessions */}
          {state.sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-neutral-500 mb-3">
                {lang === 'no' ? 'Ingen melkeøkter registrert.' : 'No milking sessions yet.'}
              </p>
              <button onClick={handlePrefill}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors">
                <Plus className="w-4 h-4" />
                {lang === 'no' ? 'Start dagens melking' : "Start today's milking"}
              </button>
            </div>
          ) : (
            <>
              {[morningSession, eveningSession].filter(Boolean).map((session) => {
                if (!session) return null
                const isMorning = session.session_type === 'morning'
                const sessionEntries = state.entries.filter((e) => e.session_id === session.id)
                const saveKey = `session-${session.id}`
                const netGrams = computeNetGrams(
                  session.gross_weight_grams || 0,
                  session.bottle_count || 0,
                  session.custom_tare_grams || 0
                )
                const hasWeight = netGrams > 0
                const netDl = gramsToDeciliters(netGrams)
                const usedGrams = sessionEntries.reduce((s, e) => s + Number(e.grams || 0), 0)
                const remainingGrams = Math.max(0, netGrams - usedGrams)
                const availableGoats = getAvailableGoats(session.id)

                return (
                  <div key={session.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                    {/* Session header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        {isMorning ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-indigo-500" />}
                        <span className="text-sm font-medium text-neutral-900">
                          {isMorning ? (lang === 'no' ? 'Morgen' : 'Morning') : (lang === 'no' ? 'Kveld' : 'Evening')}
                        </span>
                        {/* Milking method toggle */}
                        <div className="flex rounded-lg border border-neutral-200 overflow-hidden text-[11px]">
                          {(['machine', 'hand'] as MilkingMethod[]).map((m) => (
                            <button key={m}
                              onClick={() => {
                                dispatch({ type: 'UPDATE_SESSION', session: { ...session, milking_method: m } })
                                schedule(saveKey + '-method', () => saveSession(session.id, { milking_method: m }))
                              }}
                              className={cn('px-2 py-1 transition-colors',
                                session.milking_method === m ? 'bg-neutral-900 text-white' : 'text-neutral-500 hover:bg-neutral-100'
                              )}
                            >
                              {m === 'machine' ? (lang === 'no' ? 'Maskin' : 'Machine') : (lang === 'no' ? 'Hånd' : 'Hand')}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <SaveIndicator state={state.saving[saveKey]} />
                        <span className="text-lg font-semibold text-neutral-900 tabular-nums">
                          {formatGrams(netGrams)}
                        </span>
                      </div>
                    </div>

                    {/* Weight inputs */}
                    <div className="px-4 py-3 space-y-3 border-b border-neutral-100">
                      <div className="flex items-center gap-3">
                        <label className="text-xs text-neutral-500 w-28 shrink-0">{lang === 'no' ? 'Bruttovekt' : 'Gross weight'}</label>
                        <div className="flex items-center gap-1.5 flex-1">
                          <input type="number" inputMode="numeric" min="0"
                            value={session.gross_weight_grams || ''}
                            onChange={(e) => updateSessionWeight(session, 'gross_weight_grams', parseInt(e.target.value) || 0)}
                            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                            placeholder="0" />
                          <span className="text-xs text-neutral-400">g</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs text-neutral-500 w-28 shrink-0">{lang === 'no' ? 'Flasker' : 'Bottles'}</label>
                        <div className="flex items-center gap-2 flex-1">
                          <button onClick={() => updateSessionWeight(session, 'bottle_count', Math.max(0, (session.bottle_count || 0) - 1))}
                            className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-8 text-center text-sm font-medium tabular-nums">{session.bottle_count || 0}</span>
                          <button onClick={() => updateSessionWeight(session, 'bottle_count', (session.bottle_count || 0) + 1)}
                            className="w-8 h-8 rounded-lg border border-neutral-200 flex items-center justify-center hover:bg-neutral-100 active:bg-neutral-200 transition-colors">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-[11px] text-neutral-400 ml-1">
                            ({BOTTLE_TARE_GRAMS}g × {session.bottle_count || 0} = {(session.bottle_count || 0) * BOTTLE_TARE_GRAMS}g)
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="text-xs text-neutral-500 w-28 shrink-0">{lang === 'no' ? 'Annen beholder' : 'Custom tare'}</label>
                        <div className="flex items-center gap-1.5 flex-1">
                          <input type="number" inputMode="numeric" min="0"
                            value={session.custom_tare_grams || ''}
                            onChange={(e) => updateSessionWeight(session, 'custom_tare_grams', parseInt(e.target.value) || 0)}
                            className="w-24 rounded-lg border border-neutral-200 px-3 py-2 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                            placeholder="0" />
                          <span className="text-xs text-neutral-400">g</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
                        <span className="text-xs font-medium text-neutral-700">{lang === 'no' ? 'Netto melk' : 'Net milk'}</span>
                        <span className="text-base font-semibold text-neutral-900 tabular-nums">
                          {formatGrams(netGrams)} <span className="text-sm font-normal text-neutral-500">({formatDl(netGrams)})</span>
                        </span>
                      </div>
                    </div>

                    {/* Per-goat section — only shows AFTER total weight is entered */}
                    {hasWeight && (
                      <div className="divide-y divide-neutral-100">
                        <div className="px-4 py-2 bg-neutral-50/50 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-neutral-500 uppercase tracking-wide">
                            {lang === 'no' ? 'Per geit' : 'Per goat'}
                          </span>
                          {/* Add goat button */}
                          <div className="relative">
                            <button
                              onClick={() => setAddGoatDropdown(addGoatDropdown === session.id ? null : session.id)}
                              disabled={availableGoats.length === 0}
                              className="inline-flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3 h-3" />
                              {lang === 'no' ? 'Legg til geit' : 'Add goat'}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {/* Dropdown */}
                            {addGoatDropdown === session.id && availableGoats.length > 0 && (
                              <div className="absolute right-0 top-full mt-1 z-20 bg-white border border-neutral-200 rounded-lg shadow-lg max-h-60 overflow-y-auto min-w-48">
                                {availableGoats.map((goat) => (
                                  <button key={goat.id}
                                    onClick={async () => {
                                      setAddGoatDropdown(null)
                                      // If only one goat, auto-fill with all milk
                                      const isOnlyGoat = sessionEntries.length === 0
                                      const grams = isOnlyGoat ? netGrams : 0
                                      await saveEntry({
                                        session_id: session.id,
                                        goat_id: goat.id,
                                        grams,
                                        health_flag: 'normal',
                                      })
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm hover:bg-neutral-100 flex items-center gap-2"
                                  >
                                    <span className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-[10px] font-bold text-neutral-600">
                                      {goat.name.charAt(0)}
                                    </span>
                                    {goat.name}
                                    {goat.ear_tag && <span className="text-[10px] text-neutral-400">#{goat.ear_tag}</span>}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Goat entries */}
                        {sessionEntries.length === 0 ? (
                          <div className="px-4 py-6 text-center text-xs text-neutral-400">
                            {lang === 'no' ? 'Legg til geiter for å fordele melken' : 'Add goats to distribute milk'}
                          </div>
                        ) : (
                          sessionEntries.map((entry) => {
                            const goatName = entry.goat_name || lineageGoats.find((g) => g.id === entry.goat_id)?.name || '?'
                            const entryKey = `entry-${entry.goat_id}-${session.id}`
                            const entryGrams = Number(entry.grams || 0)
                            const entryDl = gramsToDeciliters(entryGrams)
                            // Slider max = this goat's current share + remaining unallocated
                            const sliderMaxGrams = entryGrams + remainingGrams
                            const sliderMaxDl = Math.ceil(gramsToDeciliters(sliderMaxGrams))

                            return (
                              <div key={entry.id} className="px-4 py-3 space-y-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                    {goatName.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-neutral-900 truncate">{goatName}</div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <input type="number" inputMode="decimal" step="0.1" min="0"
                                      value={entryDl || ''}
                                      onChange={(e) => {
                                        const dlVal = parseFloat(e.target.value) || 0
                                        const gramsVal = decilitersToGrams(dlVal)
                                        dispatch({ type: 'UPDATE_ENTRY', entry: { ...entry, grams: gramsVal, goat_name: goatName } })
                                        schedule(entryKey, () => saveEntry({ session_id: session.id, goat_id: entry.goat_id, grams: gramsVal, id: entry.id }))
                                      }}
                                      className="w-16 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                                      placeholder="0" />
                                    <span className="text-xs text-neutral-400 w-4">dL</span>
                                    <SaveIndicator state={state.saving[entryKey]} small />
                                    <button onClick={() => removeEntry(entry.id)} className="p-1 rounded hover:bg-red-100 text-neutral-400 hover:text-red-500 transition-colors">
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {/* Slider — range is 0 to max available */}
                                <input type="range" min="0" max={sliderMaxDl} step="1"
                                  value={Math.round(entryDl)}
                                  onChange={(e) => {
                                    const dlVal = parseInt(e.target.value)
                                    const gramsVal = decilitersToGrams(dlVal)
                                    dispatch({ type: 'UPDATE_ENTRY', entry: { ...entry, grams: gramsVal, goat_name: goatName } })
                                    schedule(entryKey, () => saveEntry({ session_id: session.id, goat_id: entry.goat_id, grams: gramsVal, id: entry.id }))
                                  }}
                                  className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer accent-neutral-900" />
                              </div>
                            )
                          })
                        )}

                        {/* Session entry total */}
                        {sessionEntries.length > 0 && (
                          <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                            <span className="text-xs text-neutral-500">{lang === 'no' ? 'Fordelt' : 'Allocated'}</span>
                            <div className="text-right">
                              <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                                {formatGrams(usedGrams)} <span className="text-xs font-normal text-neutral-500">({formatDl(usedGrams)})</span>
                              </span>
                              {remainingGrams > 0 && (
                                <div className="text-[11px] text-amber-600">
                                  {formatGrams(remainingGrams)} {lang === 'no' ? 'ufordelt' : 'unallocated'}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notes */}
                    <div className="p-4 border-t border-neutral-100">
                      <textarea value={session.notes || ''}
                        onChange={(e) => {
                          dispatch({ type: 'UPDATE_SESSION', session: { ...session, notes: e.target.value } })
                          schedule(`${saveKey}-notes`, () => saveSession(session.id, { notes: e.target.value }))
                        }}
                        placeholder={lang === 'no' ? 'Notater...' : 'Notes...'}
                        rows={2}
                        className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none" />
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      ) : state.tab === 'production' ? (
        <DairyProduction lang={lang} />
      ) : state.tab === 'recipes' ? (
        <RecipeLibrary lang={lang} />
      ) : state.tab === 'inventory' ? (
        <InventoryAging lang={lang} />
      ) : state.tab === 'analytics' ? (
        <MilkAnalytics lang={lang} />
      ) : null}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={cn('rounded-xl px-3 py-3 text-center', accent ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200')}>
      <div className={cn('text-lg font-semibold tabular-nums', accent ? 'text-white' : 'text-neutral-900')}>{value}</div>
      {sub && <div className={cn('text-[10px] tabular-nums', 'text-neutral-400')}>{sub}</div>}
      <div className={cn('text-[11px]', accent ? 'text-neutral-400' : 'text-neutral-500')}>{label}</div>
    </div>
  )
}

function SaveIndicator({ state, small }: { state?: 'saving' | 'saved' | 'error'; small?: boolean }) {
  if (!state) return null
  const size = small ? 'w-3 h-3' : 'w-4 h-4'
  if (state === 'saving') return <Loader2 className={cn(size, 'animate-spin text-neutral-400')} />
  if (state === 'saved') return <CheckCircle2 className={cn(size, 'text-emerald-500')} />
  return <AlertTriangle className={cn(size, 'text-red-500')} />
}
