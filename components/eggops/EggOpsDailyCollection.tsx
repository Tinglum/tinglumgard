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
  inventory_status: string | null
}

type AlertRow = {
  id: string
  alert_type: string
  message: string
  created_at: string
  year?: number
  week_number?: number
}

type DailyResponse = {
  date: string
  rows: DailyRow[]
  kpi: {
    total_collected: number
    total_sellable: number
    sellable_rate: number
    next_week_estimate: number
    low_stock_breeds: number
  }
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

function withAlpha(color: string | undefined, alphaHex: string): string | undefined {
  if (!color) return undefined
  if (!/^#[0-9a-fA-F]{6}$/.test(color)) return undefined
  return `${color}${alphaHex}`
}

interface EggOpsDailyCollectionProps {
  embedded?: boolean
}

export function EggOpsDailyCollection({ embedded = false }: EggOpsDailyCollectionProps) {
  const { lang } = useLanguage()

  const copy = useMemo(
    () =>
      lang === 'en'
        ? {
            title: 'EggOps Collection',
            subtitle: 'Tap a breed, enter totals, then classify eggs below standard.',
            date: 'Date',
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
          }
        : {
            title: 'EggOps innsamling',
            subtitle: 'Velg rase, legg inn total og beholdning, sorter deretter usalgbare.',
            date: 'Dato',
            reload: 'Last pa nytt',
            recalc: 'Reberegn prognoser',
            pickBreed: '1. Velg rase',
            pickBreedHint: 'Trykk pa rasen forst, fyll deretter inn i store kort.',
            noBreed: 'Ingen aktive raser funnet.',
            stepMain: '2. Registrer total og behold',
            stepBad: '3. Kategoriser under standard',
            totalEggs: 'Totalt innsamlede egg',
            keepEggs: 'Egg a beholde (salgbare)',
            notes: 'Notater',
            save: 'Lagre rad',
            saving: 'Lagrer...',
            saved: 'Lagret',
            lastUpdated: 'Sist oppdatert',
            mismatchTitle: 'Tall stemmer ikke',
            mismatchBody: 'Summen ma stemme med totalen for lagring.',
            classified: 'Kategorisert under standard',
            remaining: 'Gjenstar a kategorisere',
            autoFillOther: 'Autofyll Andre',
            tooSmall: 'For sma',
            dirty: 'Skitne',
            cracked: 'Sprukne',
            shellDefect: 'Skalldefekt',
            other: 'Andre',
            qualityRate: 'Salgbar rate',
            loading: 'Laster EggOps-data...',
            openAlerts: 'Aapne varsler og feil',
            noAlerts: 'Ingen aapne varsler eller feil.',
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
          },
    [lang]
  )

  const [selectedDate, setSelectedDate] = useState(todayDateOslo())
  const [daily, setDaily] = useState<DailyResponse | null>(null)
  const [rows, setRows] = useState<DailyRow[]>([])
  const [forecastRows, setForecastRows] = useState<ForecastRow[]>([])
  const [alerts, setAlerts] = useState<AlertRow[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)
  const [nonBlockingErrors, setNonBlockingErrors] = useState<string[]>([])
  const [rowStates, setRowStates] = useState<Record<string, RowSaveState>>({})
  const [recomputing, setRecomputing] = useState(false)
  const [canManualOverride, setCanManualOverride] = useState(false)
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({})
  const [overrideSaving, setOverrideSaving] = useState<Record<string, boolean>>({})
  const [selectedBreedId, setSelectedBreedId] = useState<string | null>(null)
  const [alertsOpen, setAlertsOpen] = useState(false)

  useEffect(() => {
    loadAll(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

  useEffect(() => {
    if (rows.length === 0) {
      setSelectedBreedId(null)
      return
    }
    if (!selectedBreedId || !rows.some((row) => row.breed_id === selectedBreedId)) {
      setSelectedBreedId(rows[0].breed_id)
    }
  }, [rows, selectedBreedId])

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

  async function loadAll(date: string) {
    setLoading(true)
    setPageError(null)
    setNonBlockingErrors([])

    try {
      const [dailyRes, forecastRes, alertsRes, sessionRes] = await Promise.all([
        fetch(`/api/admin/eggs/daily?date=${encodeURIComponent(date)}`),
        fetch('/api/admin/eggs/forecast?weeks=4'),
        fetch('/api/admin/eggs/alerts?limit=25'),
        fetch('/api/auth/session'),
      ])

      if (!dailyRes.ok) throw new Error(copy.failedDaily)
      const dailyData: DailyResponse = await dailyRes.json()
      setDaily(dailyData)
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
      }

      const response = row.id
        ? await fetch(`/api/admin/eggs/daily/${row.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/eggs/daily', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

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

      await Promise.all([loadForecastOnly(), loadAlertsOnly()])
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

      await Promise.all([loadForecastOnly(), loadAlertsOnly()])
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

      await Promise.all([loadForecastOnly(), loadAlertsOnly()])
    } catch (error: any) {
      const message = error?.message || 'Failed to update override'
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
                      <p className="font-medium">{alert.message}</p>
                      <p className="mt-1 text-xs text-amber-800">
                        {new Date(alert.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'nb-NO')}
                      </p>
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
            </div>
          </div>
        </div>
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

        {rows.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noBreed}</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((row) => {
              const isSelected = row.breed_id === selectedBreedId
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
                  onClick={() => setSelectedBreedId(row.breed_id)}
                  className={cn(
                    'rounded-xl border p-4 text-left transition-all',
                    isSelected ? 'ring-2 ring-neutral-400 shadow-md' : 'hover:shadow-sm'
                  )}
                  style={{ borderColor, backgroundColor }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-base font-semibold text-neutral-900">{row.breed_name}</p>
                    {isSelected && <span className="text-xs font-semibold text-neutral-700">{copy.active}</span>}
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
                />
                <LargeEggInput
                  label={copy.keepEggs}
                  value={selectedRow.sellable_standard}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'sellable_standard', value)}
                  colorClass="from-emerald-100 to-lime-50"
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
                />
                <StepperField
                  label={copy.dirty}
                  value={selectedRow.dirty}
                  onIncrement={() => stepField(selectedRow.breed_id, 'dirty', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'dirty', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'dirty', value)}
                />
                <StepperField
                  label={copy.cracked}
                  value={selectedRow.cracked}
                  onIncrement={() => stepField(selectedRow.breed_id, 'cracked', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'cracked', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'cracked', value)}
                />
                <StepperField
                  label={copy.shellDefect}
                  value={selectedRow.shell_defect}
                  onIncrement={() => stepField(selectedRow.breed_id, 'shell_defect', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'shell_defect', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'shell_defect', value)}
                />
                <StepperField
                  label={copy.other}
                  value={selectedRow.other_unsellable}
                  onIncrement={() => stepField(selectedRow.breed_id, 'other_unsellable', 1)}
                  onDecrement={() => stepField(selectedRow.breed_id, 'other_unsellable', -1)}
                  onChange={(value) => updateRowField(selectedRow.breed_id, 'other_unsellable', value)}
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

            <Card className="border-neutral-200 p-4">
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{copy.notes}</label>
              <Textarea
                value={selectedRow.notes || ''}
                onChange={(event) => updateRowField(selectedRow.breed_id, 'notes', event.target.value)}
                rows={3}
                className="text-sm"
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
                  {selectedState.error && <p className="mt-1 text-sm text-red-700">{selectedState.error}</p>}
                </div>

                <Button
                  size="lg"
                  className="gap-2 bg-neutral-900 px-6 text-white hover:bg-neutral-800"
                  onClick={() => saveRow(selectedRow)}
                  disabled={!rowIsValid(selectedRow) || selectedState.saving}
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
}: {
  label: string
  value: number
  onChange: (value: string) => void
  colorClass: string
}) {
  return (
    <div className={cn('rounded-xl border border-neutral-200 bg-gradient-to-br p-4', colorClass)}>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-600">{label}</label>
      <Input
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
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
}: {
  label: string
  value: number
  onIncrement: () => void
  onDecrement: () => void
  onChange: (value: string) => void
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
          value={String(value)}
          onChange={(event) => onChange(event.target.value)}
          className="h-12 border-neutral-300 text-center text-2xl font-semibold"
        />
        <Button type="button" size="icon" variant="outline" onClick={onIncrement} className="h-10 w-10 border-neutral-300">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
