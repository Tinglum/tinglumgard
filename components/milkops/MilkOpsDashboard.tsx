'use client'

import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import {
  Milk,
  ArrowRightLeft,
  ChefHat,
  BookOpen,
  Package,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Plus,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import type {
  MilkOpsTab,
  MilkGoat,
  MilkDailySession,
  MilkSessionEntry,
  MilkOpsDayState,
  SessionType,
  HealthFlag,
} from '@/lib/milk/types'
import { MilkPipeline } from './MilkPipeline'
import { DairyProduction } from './DairyProduction'
import { RecipeLibrary } from './RecipeLibrary'
import { InventoryAging } from './InventoryAging'
import { MilkAnalytics } from './MilkAnalytics'

// ─── State ──────────────────────────────────────────────────────────────────

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
    total_liters: number
    morning_liters: number
    evening_liters: number
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
  kpi: { total_liters: 0, morning_liters: 0, evening_liters: 0, goats_milked: 0, health_flags: 0, avg_7d: 0, avg_30d: 0 },
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
      return { ...state, sessions }
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
  { id: 'pipeline', icon: ArrowRightLeft, labelNo: 'Melkerør', labelEn: 'Pipeline' },
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
  const [showGoatModal, setShowGoatModal] = useState(false)

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

  // ── Save session (total liters) ─────────────────────────────────────────

  const saveSession = async (sessionId: string, updates: Partial<MilkDailySession>) => {
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

  const saveEntry = async (entry: { session_id: string; goat_id: string; liters: number; health_flag?: HealthFlag; health_notes?: string; id?: string }) => {
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
      const goat = state.goats.find((g) => g.id === saved.goat_id)
      dispatch({ type: 'UPDATE_ENTRY', entry: { ...saved, goat_name: goat?.name } })
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'saved' })
      if (navigator.vibrate) navigator.vibrate(30)
    } catch {
      dispatch({ type: 'SET_SAVE_STATE', id: key, state: 'error' })
    }
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

  const formatLiters = (n: number) => {
    return n.toFixed(1).replace('.0', '') + ' L'
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
            🥛 {lang === 'no' ? 'Melkelogg' : 'Milk Log'}
          </h1>
          <div className="flex items-center gap-1 text-xs text-neutral-500">
            {state.dayState?.status === 'closed' && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">
                {lang === 'no' ? 'Avsluttet' : 'Closed'}
              </span>
            )}
          </div>
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => shiftDate(-1)}
            className="p-2 rounded-lg hover:bg-neutral-200 active:bg-neutral-300 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={() => !isToday && dispatch({ type: 'SET_DATE', date: todayOslo() })}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              isToday ? 'bg-neutral-900 text-white' : 'bg-neutral-200 text-neutral-700 hover:bg-neutral-300'
            )}
          >
            {formatDate(state.date)}
            {isToday && <span className="ml-1.5 text-neutral-400">{lang === 'no' ? '(i dag)' : '(today)'}</span>}
          </button>
          <button
            onClick={() => shiftDate(1)}
            className="p-2 rounded-lg hover:bg-neutral-200 active:bg-neutral-300 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mt-3 overflow-x-auto scrollbar-hide -mx-4 px-4">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = state.tab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => dispatch({ type: 'SET_TAB', tab: tab.id })}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                  active
                    ? 'bg-neutral-900 text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-neutral-200'
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
          <button
            onClick={() => fetchDaily(state.date)}
            className="mt-3 text-sm text-neutral-900 underline"
          >
            {lang === 'no' ? 'Prøv igjen' : 'Retry'}
          </button>
        </div>
      ) : state.tab === 'milking' ? (
        <div className="space-y-4 mt-4">
          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-2">
            <KpiCard
              label={lang === 'no' ? 'Totalt' : 'Total'}
              value={formatLiters(state.kpi.total_liters)}
              accent
            />
            <KpiCard
              label={lang === 'no' ? 'Snitt 7d' : 'Avg 7d'}
              value={formatLiters(state.kpi.avg_7d)}
            />
            <KpiCard
              label={lang === 'no' ? 'Snitt 30d' : 'Avg 30d'}
              value={formatLiters(state.kpi.avg_30d)}
            />
          </div>

          {/* Sessions */}
          {state.sessions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-sm text-neutral-500 mb-3">
                {lang === 'no' ? 'Ingen melkeøkter registrert.' : 'No milking sessions yet.'}
              </p>
              <button
                onClick={handlePrefill}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 transition-colors"
              >
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

                return (
                  <div
                    key={session.id}
                    className="rounded-xl border border-neutral-200 bg-white overflow-hidden"
                  >
                    {/* Session header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-neutral-50 border-b border-neutral-100">
                      <div className="flex items-center gap-2">
                        {isMorning ? (
                          <Sun className="w-4 h-4 text-amber-500" />
                        ) : (
                          <Moon className="w-4 h-4 text-indigo-500" />
                        )}
                        <span className="text-sm font-medium text-neutral-900">
                          {isMorning
                            ? lang === 'no' ? 'Morgen' : 'Morning'
                            : lang === 'no' ? 'Kveld' : 'Evening'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <SaveIndicator state={state.saving[saveKey]} />
                        <span className="text-lg font-semibold text-neutral-900 tabular-nums">
                          {formatLiters(Number(session.total_liters || 0))}
                        </span>
                      </div>
                    </div>

                    {/* Total liters input (quick mode — no goats) */}
                    {state.goats.length === 0 ? (
                      <div className="p-4">
                        <label className="text-xs text-neutral-500 mb-1 block">
                          {lang === 'no' ? 'Totalt liter' : 'Total liters'}
                        </label>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.1"
                          min="0"
                          value={session.total_liters || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0
                            dispatch({
                              type: 'UPDATE_SESSION',
                              session: { ...session, total_liters: val },
                            })
                            schedule(saveKey, () => saveSession(session.id, { total_liters: val }))
                          }}
                          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                          placeholder="0.0"
                        />
                        <textarea
                          value={session.notes || ''}
                          onChange={(e) => {
                            dispatch({
                              type: 'UPDATE_SESSION',
                              session: { ...session, notes: e.target.value },
                            })
                            schedule(`${saveKey}-notes`, () =>
                              saveSession(session.id, { notes: e.target.value })
                            )
                          }}
                          placeholder={lang === 'no' ? 'Notater...' : 'Notes...'}
                          rows={2}
                          className="mt-2 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
                        />
                      </div>
                    ) : (
                      /* Per-goat entries */
                      <div className="divide-y divide-neutral-100">
                        {state.goats
                          .filter((g) => g.status === 'active')
                          .map((goat) => {
                            const entry = sessionEntries.find((e) => e.goat_id === goat.id)
                            const entryKey = `entry-${goat.id}-${session.id}`

                            return (
                              <div key={goat.id} className="flex items-center gap-3 px-4 py-3">
                                <div
                                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                                  style={{ backgroundColor: goat.accent_color }}
                                >
                                  {goat.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-neutral-900 truncate">
                                    {goat.name}
                                  </div>
                                  {goat.tag_number && (
                                    <div className="text-[11px] text-neutral-400">#{goat.tag_number}</div>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="number"
                                    inputMode="decimal"
                                    step="0.1"
                                    min="0"
                                    value={entry?.liters ?? ''}
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0
                                      const updatedEntry = {
                                        session_id: session.id,
                                        goat_id: goat.id,
                                        liters: val,
                                        health_flag: entry?.health_flag || ('normal' as HealthFlag),
                                        id: entry?.id,
                                      }
                                      if (entry) {
                                        dispatch({
                                          type: 'UPDATE_ENTRY',
                                          entry: { ...entry, liters: val, goat_name: goat.name },
                                        })
                                      }
                                      schedule(entryKey, () => saveEntry(updatedEntry))
                                    }}
                                    className="w-20 rounded-lg border border-neutral-200 px-2 py-1.5 text-sm text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
                                    placeholder="0.0"
                                  />
                                  <span className="text-xs text-neutral-400 w-3">L</span>
                                  <SaveIndicator state={state.saving[entryKey]} small />
                                </div>
                                {entry && entry.health_flag !== 'normal' && (
                                  <span className="text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700">
                                    ⚠️
                                  </span>
                                )}
                              </div>
                            )
                          })}
                        {/* Session total */}
                        <div className="flex items-center justify-between px-4 py-3 bg-neutral-50">
                          <span className="text-xs text-neutral-500">
                            {lang === 'no' ? 'Sum fra geiter' : 'Sum from goats'}
                          </span>
                          <span className="text-sm font-semibold text-neutral-900 tabular-nums">
                            {formatLiters(
                              sessionEntries.reduce((sum, e) => sum + Number(e.liters || 0), 0)
                            )}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Add goats prompt if none */}
              {state.goats.length === 0 && (
                <button
                  onClick={() => setShowGoatModal(true)}
                  className="w-full text-center py-3 rounded-xl border border-dashed border-neutral-300 text-sm text-neutral-500 hover:bg-neutral-100 transition-colors"
                >
                  <Plus className="w-4 h-4 inline mr-1" />
                  {lang === 'no' ? 'Legg til geiter for per-geit-sporing' : 'Add goats for per-goat tracking'}
                </button>
              )}
            </>
          )}

          {/* Quick notes for the day */}
          {state.sessions.length > 0 && (
            <div className="rounded-xl border border-neutral-200 bg-white p-4">
              <h3 className="text-sm font-medium text-neutral-900 mb-2">
                {lang === 'no' ? 'Dagens notater' : "Today's notes"}
              </h3>
              <textarea
                value={state.sessions[0]?.notes || ''}
                onChange={(e) => {
                  const session = state.sessions[0]
                  if (!session) return
                  dispatch({
                    type: 'UPDATE_SESSION',
                    session: { ...session, notes: e.target.value },
                  })
                  schedule('day-notes', () => saveSession(session.id, { notes: e.target.value }))
                }}
                placeholder={lang === 'no' ? 'Uvanlig oppførsel, vær, sykdom...' : 'Unusual behavior, weather, illness...'}
                rows={3}
                className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20 resize-none"
              />
            </div>
          )}
        </div>
      ) : (
        state.tab === 'pipeline' ? (
        <MilkPipeline lang={lang} date={state.date} />
      ) : state.tab === 'production' ? (
        <DairyProduction lang={lang} />
      ) : state.tab === 'recipes' ? (
        <RecipeLibrary lang={lang} />
      ) : state.tab === 'inventory' ? (
        <InventoryAging lang={lang} />
      ) : state.tab === 'analytics' ? (
        <MilkAnalytics lang={lang} />
      ) : null
      )}

      {/* Goat add modal */}
      {showGoatModal && (
        <GoatAddModal
          lang={lang}
          onClose={() => setShowGoatModal(false)}
          onSaved={() => {
            setShowGoatModal(false)
            fetchDaily(state.date)
          }}
        />
      )}
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl px-3 py-3 text-center',
        accent ? 'bg-neutral-900 text-white' : 'bg-white border border-neutral-200'
      )}
    >
      <div className={cn('text-lg font-semibold tabular-nums', accent ? 'text-white' : 'text-neutral-900')}>
        {value}
      </div>
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

function GoatAddModal({
  lang,
  onClose,
  onSaved,
}: {
  lang: string
  onClose: () => void
  onSaved: () => void
}) {
  const [name, setName] = useState('')
  const [tagNumber, setTagNumber] = useState('')
  const [breed, setBreed] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/milk/goats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), tag_number: tagNumber.trim() || null, breed: breed.trim() || null }),
      })
      if (res.ok) onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-neutral-900">
          {lang === 'no' ? 'Legg til geit' : 'Add goat'}
        </h2>
        <div>
          <label className="text-xs text-neutral-500">{lang === 'no' ? 'Navn' : 'Name'} *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            placeholder={lang === 'no' ? 'F.eks. Luna' : 'E.g. Luna'}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-neutral-500">{lang === 'no' ? 'Øremerke' : 'Tag #'}</label>
            <input
              type="text"
              value={tagNumber}
              onChange={(e) => setTagNumber(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder="40012"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-500">{lang === 'no' ? 'Rase' : 'Breed'}</label>
            <input
              type="text"
              value={breed}
              onChange={(e) => setBreed(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
              placeholder={lang === 'no' ? 'Norsk melkegeit' : 'Norwegian dairy goat'}
            />
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-neutral-200 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            {lang === 'no' ? 'Avbryt' : 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : lang === 'no' ? 'Lagre' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
