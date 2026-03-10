'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Minus, Plus, RefreshCw, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/contexts/LanguageContext'
import { cn } from '@/lib/utils'

type DailyRow = {
  id: string | null
  collection_date: string
  breed_id: string
  breed_name: string
  breed_slug: string | null
  accent_color: string
  total_collected: number
  sellable_standard: number
  too_small: number
  dirty: number
  cracked: number
  shell_defect: number
  other_unsellable: number
  notes: string
  updated_at: string | null
}

type ForecastRow = {
  id: string
  breed_id: string
  breed_name: string
  year: number
  week_number: number
  delivery_monday: string
  forecast_eggs: number
  low_stock: boolean
  deficit: boolean
  manual_override: boolean
  inventory_id: string | null
  eggs_available: number | null
  eggs_allocated?: number | null
  inventory_status: string | null
}

type AlertRow = {
  id: string
  alert_type: string
  severity?: 'critical' | 'warning' | 'info'
  acknowledged_at?: string | null
  acknowledged_by?: string | null
  snoozed_until?: string | null
  message: string
  created_at: string
  year?: number
  week_number?: number
}

type DayState = {
  collection_date: string
  status: 'open' | 'in_progress' | 'closed'
  duck_eggs: number
  other_eggs: number
  closed_at?: string | null
  closed_by?: string | null
  reopened_at?: string | null
  reopened_by?: string | null
  reopen_reason?: string | null
}

type DailyResponse = {
  date: string
  day_state?: DayState
  rows: DailyRow[]
  kpi: {
    total_collected: number
    total_sellable: number
    sellable_rate: number
    next_week_estimate: number
    low_stock_breeds: number
  }
}

type OpsDashboardResponse = {
  start_date: string
  end_date: string
  days: number
  summary: Array<{
    breed_id: string
    breed_name: string
    accent_color: string
    avg_daily_sellable: number
    sellable_rate: number
    total_collected: number
    total_sellable: number
  }>
  windows: {
    d7: Array<{ breed_id: string; avg_sellable: number; sellable_rate: number }>
    d14: Array<{ breed_id: string; avg_sellable: number; sellable_rate: number }>
    d30: Array<{ breed_id: string; avg_sellable: number; sellable_rate: number }>
  }
  heatmap: Array<{
    date: string
    breed_id: string
    sellable: number
    total: number
    sellable_rate: number
  }>
}

type AuditRow = {
  id: string
  changed_by: string | null
  change_reason: string | null
  changed_at: string
  egg_daily_collections?: {
    collection_date: string
    breed_id: string
    egg_breeds?: { name?: string | null } | Array<{ name?: string | null }>
  } | null
}

type RowSaveState = {
  saving: boolean
  error: string | null
  success: boolean
}

const DEFAULT_SAVE_STATE: RowSaveState = {
  saving: false,
  error: null,
  success: false,
}

function todayDateOslo(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Oslo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function inputDisplayValue(value: number): string {
  return value === 0 ? '' : String(value)
}

function normalizeDayState(date: string, value?: Partial<DayState> | null): DayState {
  const statusRaw = String(value?.status || 'open')
  const status: DayState['status'] =
    statusRaw === 'closed' || statusRaw === 'in_progress' ? statusRaw : 'open'

  return {
    collection_date: value?.collection_date || date,
    status,
    duck_eggs: Math.max(0, numberOrZero(value?.duck_eggs)),
    other_eggs: Math.max(0, numberOrZero(value?.other_eggs)),
    closed_at: value?.closed_at || null,
    closed_by: value?.closed_by || null,
    reopened_at: value?.reopened_at || null,
    reopened_by: value?.reopened_by || null,
    reopen_reason: value?.reopen_reason || null,
  }
}

function withAlpha(color: string | undefined, alphaHex: string): string | undefined {
  if (!color) return undefined
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return undefined
  return `${color}${alphaHex}`
}

const OFFLINE_QUEUE_KEY = 'eggops.offline.queue.v1'

type OfflineQueueItem = {
  id: string
  endpoint: string
  method: 'POST' | 'PATCH'
  body: Record<string, unknown>
  breedId: string
  queuedAt: string
}

interface EggOpsDailyCollectionProps {
  embedded?: boolean
}

export function EggOpsDailyCollection({ embedded = false }: EggOpsDailyCollectionProps) {
  const { lang, setLang } = useLanguage()

  const copy = useMemo(
    () =>
      lang === 'en'
        ? {
            title: 'EggOps Collection',
            subtitle: 'Tap a breed, enter totals, then classify eggs below standard.',
            date: 'Date',
            language: 'Language',
            langNo: 'NO',
            langEn: 'EN',
            reload: 'Reload',
            recalc: 'Recompute forecasts',
            pickBreed: '1. Pick breed',
            pickBreedHint: 'Choose the breed first, then register in large cards.',
            noBreed: 'No active breeds found.',
            stepMain: '2. Register total and keep',
            stepBad: '3. Classify eggs below standard',
            totalEggs: 'Total eggs collected',
            keepEggs: 'Eggs to keep (sellable)',
            notes: 'Notes',
            save: 'Save row',
            saving: 'Saving...',
            saved: 'Saved',
            lastUpdated: 'Last updated',
            mismatchTitle: 'Count mismatch',
            mismatchBody: 'The sum must match total eggs before save.',
            classified: 'Classified below standard',
            remaining: 'Remaining to classify',
            autoFillOther: 'Auto-fill Other',
            tooSmall: 'Too small',
            dirty: 'Dirty',
            cracked: 'Cracked',
            shellDefect: 'Shell defect',
            other: 'Other',
            qualityRate: 'Sellable rate',
            loading: 'Loading EggOps data...',
            openAlerts: 'Open alerts and errors',
            noAlerts: 'No open alerts or errors.',
            alertsTitle: 'Alerts and errors',
            systemErrors: 'System errors',
            flowAlerts: 'Operational alerts',
            failedDaily: 'Failed to fetch daily rows',
            failedForecast: 'Failed to fetch forecast',
            failedAlerts: 'Failed to fetch alerts',
            failedSave: 'Failed to save row',
            forecastTitle: '4-week forecast for selected breed',
            forecastEmpty: 'No forecast rows for selected breed yet.',
            week: 'Week',
            monday: 'Monday',
            forecastEggs: 'Forecast eggs',
            status: 'Status',
            manual: 'Manual',
            auto: 'Auto',
            setManual: 'Set manual',
            setAuto: 'Set auto',
            manualEggs: 'Manual eggs',
            lowStock: 'Low stock',
            deficit: 'Deficit',
            ok: 'OK',
            active: 'Active',
            kpiCollected: 'Collected today',
            kpiSellable: 'Sellable today',
            kpiRate: 'Sellable rate',
            kpiForecast: 'Next week estimate',
            kpiLow: 'Breeds low stock',
            dayOpen: 'Open',
            dayInProgress: 'In progress',
            dayClosed: 'Closed',
            setInProgress: 'Set in progress',
            closeDay: 'Close day',
            reopenDay: 'Reopen day',
            reopenReason: 'Reopen reason',
            copyYesterday: 'Copy yesterday',
            fastEntry: 'Fast entry',
            bulkMode: 'Bulk mode',
            easyMode: 'Easy huge input',
            detailedMode: 'Detailed mode',
            easyModeHint: 'Large controls only. No forecast/reporting panels.',
            selectAll: 'Select all',
            clearSelection: 'Clear',
            selectedRows: 'selected',
            bulkResetBad: 'Reset bad categories',
            bulkSetNotes: 'Set note',
            bulkClearNotes: 'Clear notes',
            bulkApply: 'Apply bulk',
            reason: 'Reason',
            reasonPlaceholder: 'Required for anomalies or reopening closed day',
            reportCsv: 'Export CSV',
            reportPdf: 'Print/PDF',
            offlineQueued: 'Offline queue',
            syncNow: 'Sync now',
            dashboardTitle: 'Ops dashboard',
            trendTitle: '7/14/30 day trends',
            heatmapTitle: 'Sellable-rate heatmap',
            auditTitle: 'Recent audit changes',
            forecastVsReserved: 'Forecast vs reserved',
            suggestLock: 'Suggest lock',
            suggestOpen: 'Suggest reopen',
            alertAck: 'Acknowledge',
            alertSnooze: 'Snooze 60m',
            alertResolve: 'Resolve',
            severityCritical: 'Critical',
            severityWarning: 'Warning',
            severityInfo: 'Info',
            miscEggs: 'Duck and other eggs',
            duckEggs: 'Duck eggs',
            otherEggsExtra: 'Other eggs',
            saveMisc: 'Save duck/other',
            noBreedSelected: 'Select a breed to register eggs.',
          }
        : {
            title: 'EggOps innsamling',
            subtitle: 'Velg rase, legg inn total og beholdning, sorter deretter usalgbare.',
            date: 'Dato',
            language: 'Språk',
            langNo: 'NO',
            langEn: 'EN',
            reload: 'Last på nytt',
            recalc: 'Reberegn prognoser',
            pickBreed: '1. Velg rase',
            pickBreedHint: 'Trykk på rasen først, fyll deretter inn i store kort.',
            noBreed: 'Ingen aktive raser funnet.',
            stepMain: '2. Registrer total og behold',
            stepBad: '3. Kategoriser under standard',
            totalEggs: 'Totalt innsamlede egg',
            keepEggs: 'Egg å beholde (salgbare)',
            notes: 'Notater',
            save: 'Lagre rad',
            saving: 'Lagrer...',
            saved: 'Lagret',
            lastUpdated: 'Sist oppdatert',
            mismatchTitle: 'Tall stemmer ikke',
            mismatchBody: 'Summen må stemme med totalen for lagring.',
            classified: 'Kategorisert under standard',
            remaining: 'Gjenstår å kategorisere',
            autoFillOther: 'Autofyll Andre',
            tooSmall: 'For små',
            dirty: 'Skitne',
            cracked: 'Sprukne',
            shellDefect: 'Skalldefekt',
            other: 'Andre',
            qualityRate: 'Salgbar rate',
            loading: 'Laster EggOps-data...',
            openAlerts: 'Åpne varsler og feil',
            noAlerts: 'Ingen åpne varsler eller feil.',
            alertsTitle: 'Varsler og feil',
            systemErrors: 'Systemfeil',
            flowAlerts: 'Driftsvarsler',
            failedDaily: 'Kunne ikke hente dagsrader',
            failedForecast: 'Kunne ikke hente prognose',
            failedAlerts: 'Kunne ikke hente varsler',
            failedSave: 'Kunne ikke lagre raden',
            forecastTitle: '4-ukers prognose for valgt rase',
            forecastEmpty: 'Ingen prognoser for valgt rase enda.',
            week: 'Uke',
            monday: 'Mandag',
            forecastEggs: 'Prognose egg',
            status: 'Status',
            manual: 'Manuell',
            auto: 'Auto',
            setManual: 'Sett manuell',
            setAuto: 'Sett auto',
            manualEggs: 'Manuelle egg',
            lowStock: 'Lav lager',
            deficit: 'Underskudd',
            ok: 'OK',
            active: 'Valgt',
            kpiCollected: 'Innsamlet i dag',
            kpiSellable: 'Salgbare i dag',
            kpiRate: 'Salgbar rate',
            kpiForecast: 'Estimat neste uke',
            kpiLow: 'Raser med lav beholdning',
            dayOpen: 'Åpen',
            dayInProgress: 'Pågår',
            dayClosed: 'Lukket',
            setInProgress: 'Sett pågår',
            closeDay: 'Lukk dag',
            reopenDay: 'Åpne dag',
            reopenReason: 'Årsak for gjenåpning',
            copyYesterday: 'Kopier i går',
            fastEntry: 'Rask innlegging',
            bulkMode: 'Bulkmodus',
            easyMode: 'Enkel stor input',
            detailedMode: 'Detaljmodus',
            easyModeHint: 'Kun store kontroller. Skjuler prognose og rapportering.',
            selectAll: 'Velg alle',
            clearSelection: 'Fjern',
            selectedRows: 'valgt',
            bulkResetBad: 'Nullstill usalgbare',
            bulkSetNotes: 'Sett notat',
            bulkClearNotes: 'Fjern notater',
            bulkApply: 'Kjør bulk',
            reason: 'Årsak',
            reasonPlaceholder: 'Kreves ved avvik eller gjenåpning av lukket dag',
            reportCsv: 'Eksporter CSV',
            reportPdf: 'Print/PDF',
            offlineQueued: 'Offline-ko',
            syncNow: 'Synk nå',
            dashboardTitle: 'Driftsdashboard',
            trendTitle: '7/14/30 dagers trend',
            heatmapTitle: 'Heatmap salgbar-rate',
            auditTitle: 'Siste endringer',
            forecastVsReserved: 'Prognose vs reservert',
            suggestLock: 'Foreslå lås',
            suggestOpen: 'Foreslå gjenåpning',
            alertAck: 'Bekreft',
            alertSnooze: 'Slumre 60m',
            alertResolve: 'Lukk varsel',
            severityCritical: 'Kritisk',
            severityWarning: 'Advarsel',
            severityInfo: 'Info',
            miscEggs: 'Andeegg og andre egg',
            duckEggs: 'Andeegg',
            otherEggsExtra: 'Andre egg',
            saveMisc: 'Lagre ande/andre',
            noBreedSelected: 'Velg en rase for å registrere egg.',
          },
    [lang]
  )

  const [selectedDate, setSelectedDate] = useState(todayDateOslo())
  const [daily, setDaily] = useState<DailyResponse | null>(null)
  const [dayState, setDayState] = useState<DayState | null>(null)
  const [rows, setRows] = useState<DailyRow[]>([])
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [dashboard, setDashboard] = useState<OpsDashboardResponse | null>(null)
  const [auditRows, setAuditRows] = useState<AuditRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [nonBlockingErrors, setNonBlockingErrors] = useState<string[]>([])
  const [rowStates, setRowStates] = useState<Record<string, RowSaveState>>({})
  const [recomputing, setRecomputing] = useState(false)
  const [canManualOverride, setCanManualOverride] = useState(false)
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({})
  const [overrideSaving, setOverrideSaving] = useState<Record<string, boolean>>({})
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null)
  const [selectedBreedIds, setSelectedBreedIds] = useState<string[]>([])
  const [alertsOpen, setAlertsOpen] = useState(false)
  const [easyInputMode, setEasyInputMode] = useState(true)
  const [fastEntryMode, setFastEntryMode] = useState(false)
  const [activeFastField, setActiveFastField] = useState<keyof DailyRow | null>(null)
  const [bulkMode, setBulkMode] = useState(false)
  const [bulkNote, setBulkNote] = useState('')
  const [rowReason, setRowReason] = useState('')
  const [dayReason, setDayReason] = useState('')
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([])
  const [syncingOffline, setSyncingOffline] = useState(false)
  const [miscState, setMiscState] = useState<RowSaveState>(DEFAULT_SAVE_STATE)

  useEffect(() => {
    loadAll(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      const raw = window.localStorage.getItem(OFFLINE_QUEUE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setOfflineQueue(parsed)
      }
    } catch {
      // ignore local parse issues
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(offlineQueue))
  }, [offlineQueue])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onOnline = () => {
      void flushOfflineQueue()
    }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineQueue.length])

  useEffect(() => {
    if (typeof navigator === 'undefined') return
    if (!navigator.onLine) return
    if (offlineQueue.length === 0) return
    void flushOfflineQueue()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offlineQueue.length])

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedBreedId(null)
      return
    }
    if (!selectedBreedId || !rows.some((row) => row.breed_id === selectedBreedId)) {
      setSelectedBreedId(rows[0].breed_id)
    }
  }, [rows, selectedBreedId])

  useEffect(() => {
    if (!fastEntryMode) {
      setActiveFastField(null)
      return
    }
    if (!activeFastField) {
      setActiveFastField('total_collected')
    }
  }, [fastEntryMode, activeFastField])

  useEffect(() => {
    const valid = new Set(rows.map((row) => row.breed_id))
    setSelectedBreedIds((prev) => prev.filter((id) => valid.has(id)))
  }, [rows])

  const selectedRow = useMemo(
    () => rows.find((row) => row.breed_id === selectedBreedId) || null,
    [rows, selectedBreedId]
  )

  const selectedForecastRows = useMemo(
    () => forecastRows.filter((row) => row.breed_id === selectedBreedId),
    [forecastRows, selectedBreedId]
  )

  const alertCount = alerts.length + nonBlockingErrors.length + (pageError ? 1 : 0)

  function setRowState(breedId: string, patch: Partial<RowSaveState>) {
    setRowStates((prev) => ({
      ...prev,
      [breedId]: {
        ...(prev[breedId] || DEFAULT_SAVE_STATE),
        ...patch,
      },
    }))
  }

  function enqueueOffline(item: Omit<OfflineQueueItem, 'id' | 'queuedAt'>) {
    const queued: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      queuedAt: new Date().toISOString(),
    }
    setOfflineQueue((prev) => [...prev, queued])
  }

  async function flushOfflineQueue() {
    if (syncingOffline || offlineQueue.length === 0) return
    if (typeof navigator !== 'undefined' && !navigator.onLine) return

    setSyncingOffline(true)
    try {
      const queueSnapshot = [...offlineQueue]
      const failed: OfflineQueueItem[] = []

      for (const item of queueSnapshot) {
        try {
          const res = await fetch(item.endpoint, {
            method: item.method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body),
          })
          if (!res.ok) {
            failed.push(item)
          }
        } catch {
          failed.push(item)
        }
      }

      setOfflineQueue(failed)
      await Promise.all([loadAll(selectedDate), loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly(), loadAuditOnly(selectedDate)])
    } finally {
      setSyncingOffline(false)
    }
  }

  async function loadAll(date: string) {
    setLoading(true)
    setPageError(null)
    setNonBlockingErrors([])
    setMiscState(DEFAULT_SAVE_STATE)

    try {
      const [dailyRes, forecastRes, alertsRes, sessionRes, dashboardRes, auditRes] = await Promise.all([
        fetch(`/api/admin/eggs/daily?date=${encodeURIComponent(date)}`),
        fetch('/api/admin/eggs/forecast?weeks=4'),
        fetch('/api/admin/eggs/alerts?limit=25'),
        fetch('/api/auth/session'),
        fetch('/api/admin/eggs/ops-dashboard?days=30'),
        fetch(`/api/admin/eggs/audit?date=${encodeURIComponent(date)}&limit=25`),
      ])

      if (!dailyRes.ok) throw new Error(copy.failedDaily)
      const dailyData: DailyResponse = await dailyRes.json()
      setDaily(dailyData)
      setDayState(normalizeDayState(date, dailyData.day_state || null))
      setRows(dailyData.rows || [])

      const softErrors: string[] = []

      if (forecastRes.ok) {
        const forecastData = await forecastRes.json()
        setForecastRows(forecastData.rows || [])
      } else {
        setForecastRows([])
        softErrors.push(copy.failedForecast)
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.rows || [])
      } else {
        setAlerts([])
        softErrors.push(copy.failedAlerts)
      }

      if (dashboardRes.ok) {
        const dashboardData: OpsDashboardResponse = await dashboardRes.json()
        setDashboard(dashboardData)
      } else {
        setDashboard(null)
      }

      if (auditRes.ok) {
        const auditData = await auditRes.json()
        setAuditRows(auditData.rows || [])
      } else {
        setAuditRows([])
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        const role = sessionData?.user?.role
        const isAdmin = Boolean(sessionData?.user?.isAdmin)
        setCanManualOverride(Boolean(sessionData?.authenticated && (isAdmin || role === 'admin')))
      } else {
        setCanManualOverride(false)
      }

      setNonBlockingErrors(softErrors)
      if (softErrors.length > 0) {
        setAlertsOpen(true)
      }
    } catch (error: any) {
      setPageError(error?.message || 'Failed to load data')
      setAlertsOpen(true)
    } finally {
      setLoading(false)
    }
  }

  function updateRowField(breedId: string, field: keyof DailyRow, value: string) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.breed_id !== breedId) return row
        if (field === 'notes') {
          return { ...row, notes: value }
        }
        return { ...row, [field]: numberOrZero(value) }
      })
    )
    setRowState(breedId, { success: false, error: null })
  }

  function stepField(breedId: string, field: keyof DailyRow, delta: number) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.breed_id !== breedId) return row
        const current = numberOrZero(row[field])
        return { ...row, [field]: Math.max(0, current + delta) }
      })
    )
    setRowState(breedId, { success: false, error: null })
  }

  function setDayMiscField(field: 'duck_eggs' | 'other_eggs', value: string | number) {
    setDayState((prev) => {
      const base = normalizeDayState(selectedDate, prev || null)
      return {
        ...base,
        [field]: Math.max(0, numberOrZero(value)),
      }
    })
    setMiscState({ success: false, error: null, saving: false })
  }

  function stepDayMiscField(field: 'duck_eggs' | 'other_eggs', delta: number) {
    setDayState((prev) => {
      const base = normalizeDayState(selectedDate, prev || null)
      const current = field === 'duck_eggs' ? base.duck_eggs : base.other_eggs
      return {
        ...base,
        [field]: Math.max(0, current + delta),
      }
    })
    setMiscState({ success: false, error: null, saving: false })
  }

  function rowBreakdownTotal(row: DailyRow): number {
    return (
      row.sellable_standard +
      row.too_small +
      row.dirty +
      row.cracked +
      row.shell_defect +
      row.other_unsellable
    )
  }

  function rowRejectedTotal(row: DailyRow): number {
    return row.too_small + row.dirty + row.cracked + row.shell_defect + row.other_unsellable
  }

  function rowExpectedRejected(row: DailyRow): number {
    return Math.max(row.total_collected - row.sellable_standard, 0)
  }

  function rowRemainingRejected(row: DailyRow): number {
    return rowExpectedRejected(row) - rowRejectedTotal(row)
  }

  function rowIsValid(row: DailyRow): boolean {
    return rowBreakdownTotal(row) === row.total_collected
  }

  function autoFillOther(row: DailyRow) {
    const other =
      row.total_collected - row.sellable_standard - row.too_small - row.dirty - row.cracked - row.shell_defect

    setRows((prev) =>
      prev.map((item) =>
        item.breed_id === row.breed_id
          ? {
              ...item,
              other_unsellable: Math.max(0, other),
            }
          : item
      )
    )
    setRowState(row.breed_id, { success: false, error: null })
  }

  async function setDayStatus(status: 'open' | 'in_progress' | 'closed', reason?: string) {
    try {
      const response = await fetch('/api/admin/eggs/day-status', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: selectedDate,
          status,
          reason: reason || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to update day status')
      }

      const data = await response.json()
      setDayState(normalizeDayState(selectedDate, data.day_state || null))
      return true
    } catch (error: any) {
      const message = error?.message || 'Failed to update day status'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
      return false
    }
  }

  async function saveDayMisc() {
    const current = normalizeDayState(selectedDate, dayState || null)
    setMiscState({ saving: true, error: null, success: false })

    try {
      const response = await fetch('/api/admin/eggs/daily/misc', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: selectedDate,
          duck_eggs: current.duck_eggs,
          other_eggs: current.other_eggs,
          reason: rowReason || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || copy.failedSave)
      }

      const data = await response.json()
      setDayState(normalizeDayState(selectedDate, data.day_state || current))
      if (dayState?.status === 'open') {
        await setDayStatus('in_progress')
      }
      setMiscState({ saving: false, error: null, success: true })
      window.setTimeout(() => setMiscState({ saving: false, error: null, success: false }), 2500)
    } catch (error: any) {
      const message = error?.message || copy.failedSave
      setMiscState({ saving: false, error: message, success: false })
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    }
  }

  async function copyFromYesterday() {
    try {
      const response = await fetch('/api/admin/eggs/daily/prefill', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collection_date: selectedDate }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to copy yesterday')
      }
      await loadAll(selectedDate)
    } catch (error: any) {
      const message = error?.message || 'Failed to copy yesterday'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    }
  }

  function toggleBreedSelected(breedId: string) {
    setSelectedBreedIds((prev) =>
      prev.includes(breedId) ? prev.filter((item) => item !== breedId) : [...prev, breedId]
    )
  }

  async function applyBulkAction(action: 'reset_unsellable' | 'set_notes' | 'clear_notes') {
    if (selectedBreedIds.length === 0) return
    try {
      const response = await fetch('/api/admin/eggs/daily/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collection_date: selectedDate,
          breed_ids: selectedBreedIds,
          action,
          value: action === 'set_notes' ? bulkNote : null,
          reason: dayReason || rowReason || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to apply bulk action')
      }

      await Promise.all([loadAll(selectedDate), loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly(), loadAuditOnly(selectedDate)])
      setSelectedBreedIds([])
      setBulkMode(false)
    } catch (error: any) {
      const message = error?.message || 'Failed to apply bulk action'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    }
  }

  function downloadReportCsv() {
    const url = `/api/admin/eggs/daily/report?date=${encodeURIComponent(selectedDate)}&format=csv`
    window.open(url, '_blank')
  }

  function printReportPdf() {
    const url = `/api/admin/eggs/daily/report?date=${encodeURIComponent(selectedDate)}&format=pdf`
    window.open(url, '_blank')
  }

  async function updateAlert(alertId: string, action: 'acknowledge' | 'snooze' | 'resolve') {
    try {
      const response = await fetch(`/api/admin/eggs/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          snooze_minutes: action === 'snooze' ? 60 : undefined,
        }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to update alert')
      }
      await loadAlertsOnly()
    } catch (error: any) {
      const message = error?.message || 'Failed to update alert'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
    }
  }

  function writeFastFieldValue(field: keyof DailyRow, value: number) {
    if (!selectedRow) return
    updateRowField(selectedRow.breed_id, field, String(Math.max(0, value)))
  }

  function appendFastDigit(digit: string) {
    if (!selectedRow || !activeFastField) return
    const current = numberOrZero(selectedRow[activeFastField])
    const next = Number.parseInt(`${current}${digit}`, 10)
    writeFastFieldValue(activeFastField, Number.isFinite(next) ? next : current)
  }

  function backspaceFastDigit() {
    if (!selectedRow || !activeFastField) return
    const current = String(numberOrZero(selectedRow[activeFastField]))
    const next = current.length <= 1 ? 0 : Number.parseInt(current.slice(0, -1), 10)
    writeFastFieldValue(activeFastField, Number.isFinite(next) ? next : 0)
  }

  function moveFastField(offset: 1 | -1) {
    if (!activeFastField) return
    const order: Array<keyof DailyRow> = [
      'total_collected',
      'sellable_standard',
      'too_small',
      'dirty',
      'cracked',
      'shell_defect',
      'other_unsellable',
    ]
    const index = order.indexOf(activeFastField)
    if (index < 0) return
    const nextIndex = Math.min(order.length - 1, Math.max(0, index + offset))
    setActiveFastField(order[nextIndex])
  }

  async function saveRow(row: DailyRow) {
    if (!rowIsValid(row)) {
      setRowState(row.breed_id, { error: `${copy.mismatchTitle}. ${copy.mismatchBody}`, success: false })
      return
    }

    setRowState(row.breed_id, { saving: true, error: null, success: false })

    try {
      const payload = {
        collection_date: selectedDate,
        breed_id: row.breed_id,
        total_collected: row.total_collected,
        sellable_standard: row.sellable_standard,
        too_small: row.too_small,
        dirty: row.dirty,
        cracked: row.cracked,
        shell_defect: row.shell_defect,
        other_unsellable: row.other_unsellable,
        notes: row.notes || null,
        reason: rowReason || null,
      }

      const endpoint = row.id ? `/api/admin/eggs/daily/${row.id}` : '/api/admin/eggs/daily'
      const method = row.id ? 'PATCH' : 'POST'

      let response: Response
      try {
        response = await fetch(endpoint, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      } catch (networkError) {
        enqueueOffline({
          endpoint,
          method: method as 'POST' | 'PATCH',
          body: payload,
          breedId: row.breed_id,
        })
        setNonBlockingErrors((prev) => [`Saved offline for ${row.breed_name}`, ...prev].slice(0, 6))
        setRowState(row.breed_id, { saving: false, success: true, error: null })
        return
      }

      if (!response.ok) {
        const err = await response.json().catch(() => null)
        throw new Error(err?.error || copy.failedSave)
      }

      const data = await response.json()
      const saved = data?.row as Partial<DailyRow>

      setRows((prev) => {
        const nextRows = prev.map((item) => (item.breed_id === row.breed_id ? { ...item, ...saved } : item))
        setDaily((prevDaily) => {
          if (!prevDaily) return prevDaily
          const totalCollected = nextRows.reduce((sum, item) => sum + item.total_collected, 0)
          const totalSellable = nextRows.reduce((sum, item) => sum + item.sellable_standard, 0)
          return {
            ...prevDaily,
            rows: nextRows,
            kpi: {
              ...prevDaily.kpi,
              total_collected: totalCollected,
              total_sellable: totalSellable,
              sellable_rate: totalCollected > 0 ? Math.round((totalSellable / totalCollected) * 1000) / 10 : 0,
            },
          }
        })
        return nextRows
      })

      if (dayState?.status === 'open') {
        await setDayStatus('in_progress')
      }

      await Promise.all([loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly(), loadAuditOnly(selectedDate)])
      setRowState(row.breed_id, { saving: false, success: true })
      window.setTimeout(() => setRowState(row.breed_id, { success: false }), 2500)
    } catch (error: any) {
      const message = error?.message || copy.failedSave
      setRowState(row.breed_id, { saving: false, success: false, error: message })
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    }
  }

  async function loadForecastOnly() {
    const res = await fetch('/api/admin/eggs/forecast?weeks=4')
    if (!res.ok) {
      setNonBlockingErrors((prev) => [copy.failedForecast, ...prev].slice(0, 6))
      setAlertsOpen(true)
      return
    }
    const data = await res.json()
    setForecastRows(data.rows || [])
  }

  async function loadAlertsOnly() {
    const res = await fetch('/api/admin/eggs/alerts?limit=25')
    if (!res.ok) {
      setNonBlockingErrors((prev) => [copy.failedAlerts, ...prev].slice(0, 6))
      setAlertsOpen(true)
      return
    }
    const data = await res.json()
    setAlerts(data.rows || [])
  }

  async function loadDashboardOnly() {
    const res = await fetch('/api/admin/eggs/ops-dashboard?days=30')
    if (!res.ok) return
    const data: OpsDashboardResponse = await res.json()
    setDashboard(data)
  }

  async function loadAuditOnly(date: string) {
    const res = await fetch(`/api/admin/eggs/audit?date=${encodeURIComponent(date)}&limit=25`)
    if (!res.ok) return
    const data = await res.json()
    setAuditRows(data.rows || [])
  }

  async function recomputeAll() {
    setRecomputing(true)
    try {
      const response = await fetch('/api/admin/eggs/forecast/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: 4 }),
      })

      if (!response.ok) {
        throw new Error(copy.failedForecast)
      }

      await Promise.all([loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly()])
    } catch (error: any) {
      const message = error?.message || copy.failedForecast
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    } finally {
      setRecomputing(false)
    }
  }

  async function setInventoryOverride(row: ForecastRow, manualOverride: boolean) {
    if (!row.inventory_id) return
    setOverrideSaving((prev) => ({ ...prev, [row.inventory_id as string]: true }))

    try {
      const draftValue = overrideDraft[row.inventory_id] ?? ''
      const manualEggs = draftValue.length > 0 ? numberOrZero(draftValue) : row.forecast_eggs

      const response = await fetch(`/api/admin/eggs/inventory/${row.inventory_id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          manual_override: manualOverride,
          eggs_available: manualOverride ? manualEggs : undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed override update')
      }

      await Promise.all([loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly()])
    } catch (error: any) {
      const message = error?.message || 'Failed to update override'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    } finally {
      setOverrideSaving((prev) => ({ ...prev, [row.inventory_id as string]: false }))
    }
  }

  async function setInventoryStatus(row: ForecastRow, status: 'open' | 'locked') {
    if (!row.inventory_id) return
    setOverrideSaving((prev) => ({ ...prev, [row.inventory_id as string]: true }))
    try {
      const response = await fetch(`/api/admin/eggs/inventory/${row.inventory_id}/override`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || 'Failed to update status')
      }
      await Promise.all([loadForecastOnly(), loadAlertsOnly(), loadDashboardOnly()])
    } catch (error: any) {
      const message = error?.message || 'Failed to update status'
      setNonBlockingErrors((prev) => [message, ...prev].slice(0, 6))
      setAlertsOpen(true)
    } finally {
      setOverrideSaving((prev) => ({ ...prev, [row.inventory_id as string]: false }))
    }
  }

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-sm text-neutral-600">{copy.loading}</p>
      </Card>
    )
  }

  if (!daily && pageError) {
    return (
      <div className={cn('space-y-4', embedded ? '' : 'max-w-7xl mx-auto px-4 py-6')}>
        <Card className="border-red-200 bg-red-50 p-6">
          <p className="text-sm text-red-700">{pageError}</p>
        </Card>
      </div>
    )
  }

  const selectedState = selectedRow ? rowStates[selectedRow.breed_id] || DEFAULT_SAVE_STATE : DEFAULT_SAVE_STATE
  const selectedAccent = selectedRow?.accent_color || '#111111'
  const selectedAccentSoft = withAlpha(selectedAccent, '1A')
  const selectedAccentLine = withAlpha(selectedAccent, '80')
  const selectedQualityRate =
    selectedRow && selectedRow.total_collected > 0
      ? Math.round((selectedRow.sellable_standard / selectedRow.total_collected) * 1000) / 10
      : 0
  const trend7 = dashboard?.windows.d7.find((row) => row.breed_id === selectedBreedId) || null
  const trend14 = dashboard?.windows.d14.find((row) => row.breed_id === selectedBreedId) || null
  const trend30 = dashboard?.windows.d30.find((row) => row.breed_id === selectedBreedId) || null

  const heatmapDates = Array.from(
    new Set((dashboard?.heatmap || []).map((item) => item.date))
  )
    .sort()
    .slice(-14)

  const heatmapByBreedDate = new Map(
    (dashboard?.heatmap || []).map((item) => [`${item.breed_id}:${item.date}`, item])
  )

  function dayStatusClass(status: string | undefined) {
    if (status === 'closed') return 'bg-red-100 text-red-700 border-red-200'
    if (status === 'in_progress') return 'bg-amber-100 text-amber-800 border-amber-200'
    return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  }

  return (
    <div className={cn('relative space-y-6', embedded ? '' : 'max-w-7xl mx-auto px-4 py-6')}>
      <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
        <SheetTrigger asChild>
          <button
            type="button"
            className={cn(
              'fixed right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-amber-500 bg-amber-300 text-amber-900 shadow-lg transition hover:scale-105',
              embedded ? 'top-4' : 'top-20'
            )}
            aria-label={copy.openAlerts}
          >
            <AlertTriangle className="h-6 w-6" />
            {alertCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {alertCount}
              </span>
            )}
          </button>
        </SheetTrigger>

        <SheetContent side="right" className="w-[92vw] max-w-md overflow-y-auto">
          <SheetHeader className="mb-5">
            <SheetTitle>{copy.alertsTitle}</SheetTitle>
            <SheetDescription>{copy.openAlerts}</SheetDescription>
          </SheetHeader>

          <div className="space-y-5">
            {(pageError || nonBlockingErrors.length > 0) && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.systemErrors}</h4>
                {pageError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{pageError}</div>
                )}
                {nonBlockingErrors.map((error, idx) => (
                  <div key={`${error}-${idx}`} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{copy.flowAlerts}</h4>
              {alerts.length === 0 ? (
                <p className="text-sm text-neutral-500">{copy.noAlerts}</p>
              ) : (
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
                            alert.severity === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : alert.severity === 'info'
                                ? 'bg-sky-100 text-sky-700'
                                : 'bg-amber-100 text-amber-800'
                          )}
                        >
                          {alert.severity === 'critical'
                            ? copy.severityCritical
                            : alert.severity === 'info'
                              ? copy.severityInfo
                              : copy.severityWarning}
                        </span>
                        {alert.acknowledged_at && <span className="text-[11px] text-neutral-600">ACK</span>}
                      </div>
                      <p className="font-medium">{alert.message}</p>
                      <p className="mt-1 text-xs text-amber-800">
                        {new Date(alert.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'nb-NO')}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-xs" onClick={() => updateAlert(alert.id, 'acknowledge')}>
                          {copy.alertAck}
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-xs" onClick={() => updateAlert(alert.id, 'snooze')}>
                          {copy.alertSnooze}
                        </Button>
                        <Button size="sm" className="h-7 bg-neutral-900 px-2 text-xs text-white" onClick={() => updateAlert(alert.id, 'resolve')}>
                          {copy.alertResolve}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Card className="overflow-hidden border-neutral-200 p-0">
        <div className="bg-gradient-to-br from-amber-100 via-orange-50 to-sky-100 p-5 md:p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-neutral-900">{copy.title}</h2>
              <p className="mt-1 text-sm text-neutral-700">{copy.subtitle}</p>
            </div>
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.language}</label>
                <div className="inline-flex h-10 items-center rounded-lg border border-neutral-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setLang('no')}
                    className={cn(
                      'rounded px-3 py-1.5 text-xs font-semibold transition',
                      lang === 'no' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:text-neutral-900'
                    )}
                    aria-label="Switch language to Norwegian"
                  >
                    {copy.langNo}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLang('en')}
                    className={cn(
                      'rounded px-3 py-1.5 text-xs font-semibold transition',
                      lang === 'en' ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:text-neutral-900'
                    )}
                    aria-label="Switch language to English"
                  >
                    {copy.langEn}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.date}</label>
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-[170px] border-neutral-300 bg-white"
                />
              </div>
              <Button variant="outline" onClick={() => loadAll(selectedDate)} className="gap-2 border-neutral-300 bg-white">
                <RefreshCw className="h-4 w-4" />
                {copy.reload}
              </Button>
              <Button onClick={recomputeAll} disabled={recomputing} className="gap-2 bg-neutral-900 text-white hover:bg-neutral-800">
                <RefreshCw className={cn('h-4 w-4', recomputing && 'animate-spin')} />
                {copy.recalc}
              </Button>
              <Button
                variant={easyInputMode ? 'default' : 'outline'}
                onClick={() => setEasyInputMode((prev) => !prev)}
                className={cn(
                  'gap-2',
                  easyInputMode ? 'bg-amber-600 text-white hover:bg-amber-500' : 'border-neutral-300 bg-white'
                )}
              >
                {easyInputMode ? copy.detailedMode : copy.easyMode}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {easyInputMode ? (
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 via-orange-50 to-sky-50 p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', dayStatusClass(dayState?.status))}>
                  {dayState?.status === 'closed'
                    ? copy.dayClosed
                    : dayState?.status === 'in_progress'
                      ? copy.dayInProgress
                      : copy.dayOpen}
                </span>
                <p className="text-sm font-medium text-neutral-800">{copy.easyMode}</p>
              </div>
              <p className="mt-1 text-sm text-neutral-600">{copy.easyModeHint}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={copyFromYesterday}>
                {copy.copyYesterday}
              </Button>
              <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => setDayStatus('in_progress')}>
                {copy.setInProgress}
              </Button>
              <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => setDayStatus('closed')}>
                {copy.closeDay}
              </Button>
              <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => setDayStatus('open', dayReason)}>
                {copy.reopenDay}
              </Button>
            </div>
          </div>
          <Input
            placeholder={copy.reopenReason}
            value={dayReason}
            onChange={(event) => setDayReason(event.target.value)}
            className="mt-3 h-11 border-neutral-300 bg-white"
          />

          {(offlineQueue.length > 0 || syncingOffline) && (
            <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-100 px-3 py-2 text-sm text-amber-900">
              <span>
                {copy.offlineQueued}: {offlineQueue.length}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 border-amber-300 bg-white text-xs"
                onClick={flushOfflineQueue}
                disabled={syncingOffline}
              >
                {syncingOffline ? '...' : copy.syncNow}
              </Button>
            </div>
          )}

          <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <Card className="border-neutral-200 p-3 md:p-4">
              <div className="mb-2">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.pickBreed}</h3>
                <p className="mt-1 text-xs text-neutral-600">{copy.pickBreedHint}</p>
              </div>
              {rows.length === 0 ? (
                <p className="text-sm text-neutral-500">{copy.noBreed}</p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {rows.map((row) => {
                    const isSelected = row.breed_id === selectedBreedId
                    const borderColor = withAlpha(row.accent_color, '99') || '#404040'
                    const backgroundColor = isSelected
                      ? withAlpha(row.accent_color, '2A') || '#f5f5f5'
                      : withAlpha(row.accent_color, '0A') || '#ffffff'
                    return (
                      <button
                        key={row.breed_id}
                        type="button"
                        onClick={() => setSelectedBreedId(row.breed_id)}
                        className={cn(
                          'rounded-xl border px-3 py-4 text-left text-base font-semibold transition-all',
                          isSelected ? 'ring-2 ring-neutral-800 shadow-md' : 'hover:shadow-sm'
                        )}
                        style={{ borderColor, backgroundColor }}
                      >
                        <p className="truncate">{row.breed_name}</p>
                        <p className="mt-1 text-xs font-medium text-neutral-600">
                          {copy.keepEggs}: {row.sellable_standard}
                        </p>
                      </button>
                    )
                  })}
                </div>
              )}

              <Card className="mt-3 border-amber-200 bg-amber-50 p-3">
                <h4 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.miscEggs}</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  <HugeStepperField
                    label={copy.duckEggs}
                    value={dayState?.duck_eggs || 0}
                    onIncrement={() => stepDayMiscField('duck_eggs', 1)}
                    onDecrement={() => stepDayMiscField('duck_eggs', -1)}
                    onChange={(value) => setDayMiscField('duck_eggs', value)}
                    colorClass="from-amber-100 to-orange-50"
                  />
                  <HugeStepperField
                    label={copy.otherEggsExtra}
                    value={dayState?.other_eggs || 0}
                    onIncrement={() => stepDayMiscField('other_eggs', 1)}
                    onDecrement={() => stepDayMiscField('other_eggs', -1)}
                    onChange={(value) => setDayMiscField('other_eggs', value)}
                    colorClass="from-yellow-100 to-amber-50"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm">
                    {miscState.success ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
                        <CheckCircle2 className="h-4 w-4" />
                        {copy.saved}
                      </span>
                    ) : miscState.error ? (
                      <span className="font-medium text-red-700">{miscState.error}</span>
                    ) : (
                      <span className="text-neutral-600">{copy.saveMisc}</span>
                    )}
                  </div>
                  <Button
                    size="lg"
                    className="h-12 bg-amber-600 px-6 text-base font-semibold text-white hover:bg-amber-500"
                    onClick={saveDayMisc}
                    disabled={miscState.saving || dayState?.status === 'closed'}
                  >
                    {miscState.saving ? copy.saving : copy.saveMisc}
                  </Button>
                </div>
              </Card>
            </Card>

            <Card className="border-neutral-200 p-3 md:p-4">
              {!selectedRow ? (
                <p className="text-sm text-neutral-500">{copy.noBreedSelected}</p>
              ) : (
                <div className="space-y-3">
                  <div
                    className="rounded-xl border p-3"
                    style={{
                      backgroundColor: selectedAccentSoft || '#f5f5f5',
                      borderColor: selectedAccentLine || '#d4d4d4',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-xl font-semibold text-neutral-900">{selectedRow.breed_name}</h3>
                      <p className="text-sm font-medium text-neutral-700">
                        {copy.qualityRate}: {selectedQualityRate}%
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <LargeEggInput
                      label={copy.totalEggs}
                      value={selectedRow.total_collected}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'total_collected', value)}
                      colorClass="from-sky-100 to-cyan-50"
                    />
                    <LargeEggInput
                      label={copy.keepEggs}
                      value={selectedRow.sellable_standard}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'sellable_standard', value)}
                      colorClass="from-emerald-100 to-lime-50"
                    />
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    <HugeStepperField
                      label={copy.tooSmall}
                      value={selectedRow.too_small}
                      onIncrement={() => stepField(selectedRow.breed_id, 'too_small', 1)}
                      onDecrement={() => stepField(selectedRow.breed_id, 'too_small', -1)}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'too_small', value)}
                      colorClass="from-rose-100 to-red-50"
                    />
                    <HugeStepperField
                      label={copy.dirty}
                      value={selectedRow.dirty}
                      onIncrement={() => stepField(selectedRow.breed_id, 'dirty', 1)}
                      onDecrement={() => stepField(selectedRow.breed_id, 'dirty', -1)}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'dirty', value)}
                      colorClass="from-amber-100 to-orange-50"
                    />
                    <HugeStepperField
                      label={copy.cracked}
                      value={selectedRow.cracked}
                      onIncrement={() => stepField(selectedRow.breed_id, 'cracked', 1)}
                      onDecrement={() => stepField(selectedRow.breed_id, 'cracked', -1)}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'cracked', value)}
                      colorClass="from-violet-100 to-purple-50"
                    />
                    <HugeStepperField
                      label={copy.shellDefect}
                      value={selectedRow.shell_defect}
                      onIncrement={() => stepField(selectedRow.breed_id, 'shell_defect', 1)}
                      onDecrement={() => stepField(selectedRow.breed_id, 'shell_defect', -1)}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'shell_defect', value)}
                      colorClass="from-fuchsia-100 to-pink-50"
                    />
                    <HugeStepperField
                      label={copy.other}
                      value={selectedRow.other_unsellable}
                      onIncrement={() => stepField(selectedRow.breed_id, 'other_unsellable', 1)}
                      onDecrement={() => stepField(selectedRow.breed_id, 'other_unsellable', -1)}
                      onChange={(value) => updateRowField(selectedRow.breed_id, 'other_unsellable', value)}
                      colorClass="from-slate-100 to-neutral-50"
                    />
                  </div>

                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="text-neutral-600">{copy.classified}</span>
                      <span className="font-semibold text-neutral-900">{rowRejectedTotal(selectedRow)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2 text-sm">
                      <span className="text-neutral-600">{copy.remaining}</span>
                      <span
                        className={cn(
                          'font-semibold',
                          rowRemainingRejected(selectedRow) === 0
                            ? 'text-green-700'
                            : rowRemainingRejected(selectedRow) > 0
                              ? 'text-amber-700'
                              : 'text-red-700'
                        )}
                      >
                        {rowRemainingRejected(selectedRow)}
                      </span>
                    </div>
                    {rowRemainingRejected(selectedRow) !== 0 && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 border-neutral-300 bg-white"
                        onClick={() => autoFillOther(selectedRow)}
                      >
                        {copy.autoFillOther}
                      </Button>
                    )}
                  </div>

                  <Input
                    value={rowReason}
                    onChange={(event) => setRowReason(event.target.value)}
                    placeholder={copy.reasonPlaceholder}
                    className="h-12 border-neutral-300 bg-white text-base"
                  />

                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm">
                      {selectedState.success ? (
                        <span className="inline-flex items-center gap-1.5 font-medium text-green-700">
                          <CheckCircle2 className="h-4 w-4" />
                          {copy.saved}
                        </span>
                      ) : selectedState.error ? (
                        <span className="font-medium text-red-700">{selectedState.error}</span>
                      ) : rowIsValid(selectedRow) ? (
                        <span className="text-neutral-600">
                          {rowBreakdownTotal(selectedRow)} / {selectedRow.total_collected}
                        </span>
                      ) : (
                        <span className="font-medium text-red-700">
                          {copy.mismatchTitle}. {copy.mismatchBody}
                        </span>
                      )}
                    </div>
                    <Button
                      size="lg"
                      className="h-14 gap-2 bg-neutral-900 px-8 text-lg font-semibold text-white hover:bg-neutral-800"
                      onClick={() => saveRow(selectedRow)}
                      disabled={!rowIsValid(selectedRow) || selectedState.saving || dayState?.status === 'closed'}
                    >
                      <Save className="h-5 w-5" />
                      {selectedState.saving ? copy.saving : copy.save}
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </Card>
      ) : (
        <>
      <Card className="border-neutral-200 p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', dayStatusClass(dayState?.status))}>
              {dayState?.status === 'closed'
                ? copy.dayClosed
                : dayState?.status === 'in_progress'
                  ? copy.dayInProgress
                  : copy.dayOpen}
            </span>
            <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => setDayStatus('in_progress')}>
              {copy.setInProgress}
            </Button>
            <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => setDayStatus('closed')}>
              {copy.closeDay}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-neutral-300 bg-white"
              onClick={() => setDayStatus('open', dayReason)}
            >
              {copy.reopenDay}
            </Button>
            <Input
              placeholder={copy.reopenReason}
              value={dayReason}
              onChange={(event) => setDayReason(event.target.value)}
              className="h-9 w-[250px]"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={copyFromYesterday}>
              {copy.copyYesterday}
            </Button>
            <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={downloadReportCsv}>
              {copy.reportCsv}
            </Button>
            <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={printReportPdf}>
              {copy.reportPdf}
            </Button>
            <Button
              size="sm"
              variant={fastEntryMode ? 'default' : 'outline'}
              className={cn(fastEntryMode ? 'bg-neutral-900 text-white' : 'border-neutral-300 bg-white')}
              onClick={() => setFastEntryMode((prev) => !prev)}
            >
              {copy.fastEntry}
            </Button>
            <Button
              size="sm"
              variant={bulkMode ? 'default' : 'outline'}
              className={cn(bulkMode ? 'bg-neutral-900 text-white' : 'border-neutral-300 bg-white')}
              onClick={() => setBulkMode((prev) => !prev)}
            >
              {copy.bulkMode}
            </Button>
          </div>
        </div>

        {(offlineQueue.length > 0 || syncingOffline) && (
          <div className="mt-3 flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            <span>
              {copy.offlineQueued}: {offlineQueue.length}
            </span>
            <Button size="sm" variant="outline" className="h-7 border-amber-300 bg-white text-xs" onClick={flushOfflineQueue} disabled={syncingOffline}>
              {syncingOffline ? '...' : copy.syncNow}
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <KpiTile label={copy.kpiCollected} value={`${daily?.kpi.total_collected || 0}`} colorClass="border-sky-200 bg-sky-50" />
        <KpiTile label={copy.kpiSellable} value={`${daily?.kpi.total_sellable || 0}`} colorClass="border-emerald-200 bg-emerald-50" />
        <KpiTile label={copy.kpiRate} value={`${daily?.kpi.sellable_rate || 0}%`} colorClass="border-violet-200 bg-violet-50" />
        <KpiTile label={copy.kpiForecast} value={`${daily?.kpi.next_week_estimate || 0}`} colorClass="border-amber-200 bg-amber-50" />
        <KpiTile label={copy.kpiLow} value={`${daily?.kpi.low_stock_breeds || 0}`} colorClass="border-rose-200 bg-rose-50" />
      </div>

      <Card className="border-neutral-200 p-4 md:p-5">
        <div className="mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.pickBreed}</h3>
          <p className="mt-1 text-xs text-neutral-600">{copy.pickBreedHint}</p>
        </div>

        {bulkMode && rows.length > 0 && (
          <div className="mb-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-8 border-neutral-300 bg-white text-xs" onClick={() => setSelectedBreedIds(rows.map((row) => row.breed_id))}>
                {copy.selectAll}
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-neutral-300 bg-white text-xs" onClick={() => setSelectedBreedIds([])}>
                {copy.clearSelection}
              </Button>
              <span className="text-xs text-neutral-600">
                {selectedBreedIds.length} {copy.selectedRows}
              </span>
              <Input
                value={bulkNote}
                onChange={(event) => setBulkNote(event.target.value)}
                placeholder={copy.notes}
                className="h-8 w-[240px] bg-white text-xs"
              />
              <Button size="sm" variant="outline" className="h-8 border-neutral-300 bg-white text-xs" onClick={() => applyBulkAction('set_notes')}>
                {copy.bulkSetNotes}
              </Button>
              <Button size="sm" variant="outline" className="h-8 border-neutral-300 bg-white text-xs" onClick={() => applyBulkAction('clear_notes')}>
                {copy.bulkClearNotes}
              </Button>
              <Button size="sm" className="h-8 bg-neutral-900 px-3 text-xs text-white" onClick={() => applyBulkAction('reset_unsellable')}>
                {copy.bulkResetBad}
              </Button>
            </div>
          </div>
        )}

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noBreed}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const isSelected = row.breed_id === selectedBreedId
              const isBulkSelected = selectedBreedIds.includes(row.breed_id)
              const qualityRate =
                row.total_collected > 0
                  ? Math.round((row.sellable_standard / Math.max(1, row.total_collected)) * 1000) / 10
                  : 0
              const borderColor = withAlpha(row.accent_color, '99') || '#404040'
              const backgroundColor = isSelected
                ? withAlpha(row.accent_color, '1A') || '#f5f5f5'
                : withAlpha(row.accent_color, '0A') || '#ffffff'

              return (
                <button
                  key={row.breed_id}
                  type="button"
                  onClick={() => {
                    if (bulkMode) {
                      toggleBreedSelected(row.breed_id)
                      return
                    }
                    setSelectedBreedId(row.breed_id)
                  }}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    bulkMode
                      ? isBulkSelected
                        ? 'ring-2 ring-neutral-800 shadow-md'
                        : 'hover:shadow-sm'
                      : isSelected
                        ? 'ring-2 ring-neutral-400 shadow-md'
                        : 'hover:shadow-sm'
                  )}
                  style={{ borderColor, backgroundColor }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-base font-semibold text-neutral-900">{row.breed_name}</p>
                    {bulkMode ? (
                      <span className={cn('text-xs font-semibold', isBulkSelected ? 'text-neutral-900' : 'text-neutral-500')}>
                        {isBulkSelected ? '✓' : '○'}
                      </span>
                    ) : (
                      isSelected && <span className="text-xs font-semibold text-neutral-700">{copy.active}</span>
                    )}
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-neutral-500">{copy.totalEggs}</p>
                      <p className="font-semibold text-neutral-900">{row.total_collected}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">{copy.keepEggs}</p>
                      <p className="font-semibold text-neutral-900">{row.sellable_standard}</p>
                    </div>
                    <div>
                      <p className="text-neutral-500">{copy.qualityRate}</p>
                      <p className="font-semibold text-neutral-900">{qualityRate}%</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </Card>

      {selectedRow && (
        <Card className="border-neutral-200 p-4 md:p-5">
          <div
            className="mb-4 rounded-xl border p-4"
            style={{
              backgroundColor: selectedAccentSoft || '#f5f5f5',
              borderColor: selectedAccentLine || '#d4d4d4',
            }}
          >
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-neutral-900">{selectedRow.breed_name}</h3>
                <p className="mt-1 text-sm text-neutral-700">
                  {copy.qualityRate}: {selectedQualityRate}%
                </p>
              </div>
              <div className="text-sm text-neutral-700">
                {selectedState.success ? (
                  <span className="inline-flex items-center gap-1.5 text-green-700">
                    <CheckCircle2 className="h-4 w-4" />
                    {copy.saved}
                  </span>
                ) : selectedRow.updated_at ? (
                  <>
                    {copy.lastUpdated}:{' '}
                    {new Date(selectedRow.updated_at).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'nb-NO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                ) : (
                  <span className="text-neutral-500">-</span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <Card className="border-neutral-200 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-700">{copy.stepMain}</h4>
              <div className="grid gap-3 md:grid-cols-2">
                <LargeEggInput
                  label={copy.totalEggs}
                  value={selectedRow.total_collected}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'total_collected', value)}
                  colorClass="from-sky-100 to-cyan-50"
                  onFocus={() => fastEntryMode && setActiveFastField('total_collected')}
                />
                <LargeEggInput
                  label={copy.keepEggs}
                  value={selectedRow.sellable_standard}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'sellable_standard', value)}
                  colorClass="from-emerald-100 to-lime-50"
                  onFocus={() => fastEntryMode && setActiveFastField('sellable_standard')}
                />
              </div>
            </Card>

            <Card className="border-neutral-200 p-4">
              <h4 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-700">{copy.stepBad}</h4>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <StepperField
                  label={copy.tooSmall}
                  value={selectedRow.too_small}
                  onIncrement={() => stepField(selectedRow.breed_id, 'too_small', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'too_small', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'too_small', value)}
                  onFocus={() => fastEntryMode && setActiveFastField('too_small')}
                />
                <StepperField
                  label={copy.dirty}
                  value={selectedRow.dirty}
                  onIncrement={() => stepField(selectedRow.breed_id, 'dirty', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'dirty', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'dirty', value)}
                  onFocus={() => fastEntryMode && setActiveFastField('dirty')}
                />
                <StepperField
                  label={copy.cracked}
                  value={selectedRow.cracked}
                  onIncrement={() => stepField(selectedRow.breed_id, 'cracked', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'cracked', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'cracked', value)}
                  onFocus={() => fastEntryMode && setActiveFastField('cracked')}
                />
                <StepperField
                  label={copy.shellDefect}
                  value={selectedRow.shell_defect}
                  onIncrement={() => stepField(selectedRow.breed_id, 'shell_defect', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'shell_defect', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'shell_defect', value)}
                  onFocus={() => fastEntryMode && setActiveFastField('shell_defect')}
                />
                <StepperField
                  label={copy.other}
                  value={selectedRow.other_unsellable}
                  onIncrement={() => stepField(selectedRow.breed_id, 'other_unsellable', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'other_unsellable', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'other_unsellable', value)}
                  onFocus={() => fastEntryMode && setActiveFastField('other_unsellable')}
                />
              </div>

              <div className="mt-3 flex flex-col gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-600">{copy.classified}</span>
                  <span className="font-semibold text-neutral-900">{rowRejectedTotal(selectedRow)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-neutral-600">{copy.remaining}</span>
                  <span
                    className={cn(
                      'font-semibold',
                      rowRemainingRejected(selectedRow) === 0
                        ? 'text-green-700'
                        : rowRemainingRejected(selectedRow) > 0
                          ? 'text-amber-700'
                          : 'text-red-700'
                    )}
                  >
                    {rowRemainingRejected(selectedRow)}
                  </span>
                </div>

                {rowRemainingRejected(selectedRow) !== 0 && (
                  <div className="pt-1">
                    <Button size="sm" variant="outline" className="border-neutral-300 bg-white" onClick={() => autoFillOther(selectedRow)}>
                      {copy.autoFillOther}
                    </Button>
                  </div>
                )}
              </div>
            </Card>

            {fastEntryMode && (
              <Card className="border-neutral-200 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  {(
                    [
                      ['total_collected', copy.totalEggs],
                      ['sellable_standard', copy.keepEggs],
                      ['too_small', copy.tooSmall],
                      ['dirty', copy.dirty],
                      ['cracked', copy.cracked],
                      ['shell_defect', copy.shellDefect],
                      ['other_unsellable', copy.other],
                    ] as Array<[keyof DailyRow, string]>
                  ).map(([field, label]) => (
                    <Button
                      key={field}
                      size="sm"
                      variant={activeFastField === field ? 'default' : 'outline'}
                      className={cn(
                        'h-8 text-xs',
                        activeFastField === field ? 'bg-neutral-900 text-white' : 'border-neutral-300 bg-white'
                      )}
                      onClick={() => setActiveFastField(field)}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 sm:max-w-sm">
                  {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].map((digit) => (
                    <Button
                      key={digit}
                      type="button"
                      className="h-12 bg-neutral-900 text-lg text-white hover:bg-neutral-800"
                      onClick={() => appendFastDigit(digit)}
                      disabled={!activeFastField}
                    >
                      {digit}
                    </Button>
                  ))}
                  <Button type="button" variant="outline" className="h-12 border-neutral-300 bg-white" onClick={backspaceFastDigit} disabled={!activeFastField}>
                    ←
                  </Button>
                  <Button type="button" variant="outline" className="h-12 border-neutral-300 bg-white" onClick={() => moveFastField(-1)} disabled={!activeFastField}>
                    Prev
                  </Button>
                  <Button type="button" variant="outline" className="h-12 border-neutral-300 bg-white" onClick={() => moveFastField(1)} disabled={!activeFastField}>
                    Next
                  </Button>
                </div>
              </Card>
            )}

            <Card className="border-neutral-200 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.notes}</label>
              <Textarea
                value={selectedRow.notes || ''}
                onChange={(event) => updateRowField(selectedRow.breed_id, 'notes', event.target.value)}
                rows={3}
                className="text-sm"
              />

              <label className="mb-2 mt-3 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.reason}</label>
              <Input
                value={rowReason}
                onChange={(event) => setRowReason(event.target.value)}
                placeholder={copy.reasonPlaceholder}
                className="h-10"
              />

              <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  {rowIsValid(selectedRow) ? (
                    <p className="text-sm text-neutral-600">
                      {rowBreakdownTotal(selectedRow)} / {selectedRow.total_collected}
                    </p>
                  ) : (
                    <p className="text-sm text-red-700">
                      {copy.mismatchTitle}. {copy.mismatchBody}
                    </p>
                  )}
                  {dayState?.status === 'closed' && (
                    <p className="mt-1 text-sm text-red-700">Day is closed. Reopen day before saving.</p>
                  )}
                  {selectedState.error && <p className="mt-1 text-sm text-red-700">{selectedState.error}</p>}
                </div>

                <Button
                  size="lg"
                  className="gap-2 bg-neutral-900 px-6 text-white hover:bg-neutral-800"
                  onClick={() => saveRow(selectedRow)}
                  disabled={!rowIsValid(selectedRow) || selectedState.saving || dayState?.status === 'closed'}
                >
                  <Save className="h-4 w-4" />
                  {selectedState.saving ? copy.saving : copy.save}
                </Button>
              </div>
            </Card>
          </div>
        </Card>
      )}

      <Card className="border-neutral-200 p-4 md:p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.forecastTitle}</h3>
        {selectedForecastRows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.forecastEmpty}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {selectedForecastRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">
                      {copy.week} {row.week_number}/{row.year}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {copy.monday}:{' '}
                      {new Date(`${row.delivery_monday}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'nb-NO')}
                    </p>
                  </div>
                  <span
                    className={cn(
                      'rounded-full px-2 py-1 text-xs font-semibold',
                      row.deficit
                        ? 'bg-red-100 text-red-700'
                        : row.low_stock
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-700'
                    )}
                  >
                    {row.deficit ? copy.deficit : row.low_stock ? copy.lowStock : copy.ok}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-neutral-500">{copy.forecastEggs}</p>
                    <p className="text-2xl font-semibold text-neutral-900">{row.forecast_eggs}</p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">{copy.status}</p>
                    <p className="text-sm font-semibold text-neutral-900">{row.manual_override ? copy.manual : copy.auto}</p>
                  </div>
                </div>

                <div className="mt-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-700">
                  {copy.forecastVsReserved}: {row.forecast_eggs} / {row.eggs_allocated ?? 0}
                </div>

                {row.inventory_id && canManualOverride && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {row.forecast_eggs < (row.eggs_allocated ?? 0) ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-red-300 bg-white text-xs text-red-700"
                        onClick={() => setInventoryStatus(row, 'locked')}
                        disabled={Boolean(overrideSaving[row.inventory_id])}
                      >
                        {copy.suggestLock}
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 border-emerald-300 bg-white text-xs text-emerald-700"
                        onClick={() => setInventoryStatus(row, 'open')}
                        disabled={Boolean(overrideSaving[row.inventory_id])}
                      >
                        {copy.suggestOpen}
                      </Button>
                    )}
                  </div>
                )}

                {row.inventory_id && canManualOverride && (
                  <div className="mt-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
                    <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      {copy.manualEggs}
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        className="h-9"
                        value={overrideDraft[row.inventory_id] ?? String(row.eggs_available ?? row.forecast_eggs)}
                        onChange={(event) =>
                          setOverrideDraft((prev) => ({
                            ...prev,
                            [row.inventory_id as string]: event.target.value,
                          }))
                        }
                        inputMode="numeric"
                      />
                      {row.manual_override ? (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={Boolean(overrideSaving[row.inventory_id])}
                          onClick={() => setInventoryOverride(row, false)}
                        >
                          {copy.setAuto}
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={Boolean(overrideSaving[row.inventory_id])}
                          onClick={() => setInventoryOverride(row, true)}
                        >
                          {copy.setManual}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="border-neutral-200 p-4 md:p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.dashboardTitle}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">7d</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{trend7?.avg_sellable ?? 0}</p>
            <p className="text-xs text-neutral-600">{trend7?.sellable_rate ?? 0}%</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">14d</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{trend14?.avg_sellable ?? 0}</p>
            <p className="text-xs text-neutral-600">{trend14?.sellable_rate ?? 0}%</p>
          </div>
          <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
            <p className="text-xs uppercase tracking-wide text-neutral-500">30d</p>
            <p className="mt-1 text-lg font-semibold text-neutral-900">{trend30?.avg_sellable ?? 0}</p>
            <p className="text-xs text-neutral-600">{trend30?.sellable_rate ?? 0}%</p>
          </div>
        </div>

        <div className="mt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.heatmapTitle}</h4>
          <div className="overflow-x-auto">
            <div className="min-w-[760px] space-y-1">
              {(dashboard?.summary || []).map((breed) => (
                <div key={breed.breed_id} className="grid grid-cols-[180px_repeat(14,minmax(0,1fr))] items-center gap-1">
                  <div className="truncate text-xs font-medium text-neutral-700">{breed.breed_name}</div>
                  {heatmapDates.map((date) => {
                    const point = heatmapByBreedDate.get(`${breed.breed_id}:${date}`)
                    const rate = point?.sellable_rate ?? 0
                    const level =
                      rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-emerald-300' : rate >= 60 ? 'bg-amber-300' : 'bg-red-300'
                    return <div key={`${breed.breed_id}-${date}`} title={`${date}: ${rate}%`} className={cn('h-5 rounded', level)} />
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className="border-neutral-200 p-4 md:p-5">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-800">{copy.auditTitle}</h3>
        <div className="space-y-2">
          {auditRows.length === 0 ? (
            <p className="text-sm text-neutral-500">No audit rows.</p>
          ) : (
            auditRows.map((row) => {
              const relation = row.egg_daily_collections
              const breedRelation = relation?.egg_breeds
              const breedName = Array.isArray(breedRelation) ? breedRelation[0]?.name : breedRelation?.name
              return (
                <div key={row.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-xs text-neutral-700">
                  <p className="font-medium">
                    {breedName || 'Breed'} · {relation?.collection_date || '-'}
                  </p>
                  <p>
                    {row.change_reason || 'Updated'} · {row.changed_by || 'unknown'} ·{' '}
                    {new Date(row.changed_at).toLocaleString(lang === 'en' ? 'en-GB' : 'nb-NO')}
                  </p>
                </div>
              )
            })
          )}
        </div>
      </Card>
        </>
      )}
    </div>
  )
}

function KpiTile({
  label,
  value,
  colorClass,
}: {
  label: string
  value: string
  colorClass: string
}) {
  return (
    <Card className={cn('border p-3', colorClass)}>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-600">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-neutral-900">{value}</p>
    </Card>
  )
}

function LargeEggInput({
  label,
  value,
  onChange,
  colorClass,
  onFocus,
}: {
  label: string
  value: number
  onChange: (value: string) => void
  colorClass: string
  onFocus?: () => void
}) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-gradient-to-br p-4', colorClass)}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</label>
      <Input
        inputMode="numeric"
        value={inputDisplayValue(value)}
        onChange={(event) => onChange(event.target.value)}
        onFocus={(event) => {
          event.currentTarget.select()
          onFocus?.()
        }}
        placeholder="0"
        className="h-20 border-neutral-300 bg-white text-center text-4xl font-semibold tracking-tight md:text-5xl"
      />
    </div>
  )
}

function StepperField({
  label,
  value,
  onIncrement,
  onDecrement,
  onChange,
  onFocus,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (value: string) => void
  onFocus?: () => void
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-3">
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</label>
      <div className="flex items-center gap-2">
        <Button type="button" size="icon" variant="outline" onClick={onDecrement} className="h-10 w-10 border-neutral-300">
          <Minus className="h-4 w-4" />
        </Button>
        <Input
          inputMode="numeric"
          value={inputDisplayValue(value)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => {
            event.currentTarget.select()
            onFocus?.()
          }}
          placeholder="0"
          className="h-12 border-neutral-300 text-center text-2xl font-semibold"
        />
        <Button type="button" size="icon" variant="outline" onClick={onIncrement} className="h-10 w-10 border-neutral-300">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function HugeStepperField({
  label,
  value,
  onIncrement,
  onDecrement,
  onChange,
  colorClass,
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (value: string) => void
  colorClass: string
}) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-gradient-to-br p-3', colorClass)}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-700">{label}</label>
      <div className="grid grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onDecrement}
          className="h-14 w-14 border-neutral-300 bg-white"
        >
          <Minus className="h-5 w-5" />
        </Button>
        <Input
          inputMode="numeric"
          value={inputDisplayValue(value)}
          onChange={(event) => onChange(event.target.value)}
          onFocus={(event) => event.currentTarget.select()}
          placeholder="0"
          className="h-14 border-neutral-300 bg-white text-center text-3xl font-semibold"
        />
        <Button
          type="button"
          size="icon"
          variant="outline"
          onClick={onIncrement}
          className="h-14 w-14 border-neutral-300 bg-white"
        >
          <Plus className="h-5 w-5" />
        </Button>
      </div>
    </div>
  )
}
