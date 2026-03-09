'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { RefreshCw, Save, AlertTriangle, CheckCircle2 } from 'lucide-react'

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

interface EggOpsDailyCollectionProps {
  embedded?: boolean
}

export function EggOpsDailyCollection({ embedded = false }: EggOpsDailyCollectionProps) {
  const { lang } = useLanguage()

  const copy = useMemo(
    () =>
      lang === 'en'
        ? {
            title: 'Daily Egg Collection',
            subtitle: 'Register eggs per breed and prepare hatching eggs for sale forecasting.',
            date: 'Date',
            reload: 'Reload',
            recalc: 'Recompute all forecasts',
            kpiCollected: 'Collected today',
            kpiSellable: 'Sellable today',
            kpiRate: 'Sellable rate',
            kpiForecast: 'Next week estimate',
            kpiLow: 'Breeds low stock',
            save: 'Save row',
            notes: 'Notes',
            total: 'Total collected',
            sellable: 'Sellable standard',
            tooSmall: 'Too small',
            dirty: 'Dirty',
            cracked: 'Cracked',
            shellDefect: 'Shell defect',
            other: 'Other unsellable',
            breakdownMismatch: 'Breakdown must equal total.',
            loading: 'Loading EggOps data...',
            alerts: 'Open alerts',
            forecast: '4-week forecast',
            noAlerts: 'No open alerts',
            saved: 'Saved',
            failedDaily: 'Failed to fetch daily rows',
            failedForecast: 'Failed to fetch forecast',
            failedAlerts: 'Failed to fetch alerts',
            failedSave: 'Failed to save row',
            manual: 'Manual',
            auto: 'Auto',
            setManual: 'Set manual',
            setAuto: 'Set auto',
            manualEggs: 'Manual eggs',
          }
        : {
            title: 'Daglig egginnsamling',
            subtitle: 'Registrer egg per rase og klargjor rugeegg for salgsprognose.',
            date: 'Dato',
            reload: 'Last pa nytt',
            recalc: 'Reberegn alle prognoser',
            kpiCollected: 'Innsamlet i dag',
            kpiSellable: 'Salgbare i dag',
            kpiRate: 'Salgbar rate',
            kpiForecast: 'Estimat neste uke',
            kpiLow: 'Raser med lav beholdning',
            save: 'Lagre rad',
            notes: 'Notater',
            total: 'Totalt innsamlet',
            sellable: 'Salgbar standard',
            tooSmall: 'For sma',
            dirty: 'Skitne',
            cracked: 'Sprukne',
            shellDefect: 'Skalldefekt',
            other: 'Andre usalgbare',
            breakdownMismatch: 'Summen av kategorier ma vare lik totalen.',
            loading: 'Laster EggOps-data...',
            alerts: 'Aapne varsler',
            forecast: '4-ukers prognose',
            noAlerts: 'Ingen aapne varsler',
            saved: 'Lagret',
            failedDaily: 'Kunne ikke hente dagsrader',
            failedForecast: 'Kunne ikke hente prognose',
            failedAlerts: 'Kunne ikke hente varsler',
            failedSave: 'Kunne ikke lagre raden',
            manual: 'Manuell',
            auto: 'Auto',
            setManual: 'Sett manuell',
            setAuto: 'Sett auto',
            manualEggs: 'Manuelle egg',
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
  const [rowStates, setRowStates] = useState<Record<string, RowSaveState>>({})
  const [recomputing, setRecomputing] = useState(false)
  const [canManualOverride, setCanManualOverride] = useState(false)
  const [overrideDraft, setOverrideDraft] = useState<Record<string, string>>({})
  const [overrideSaving, setOverrideSaving] = useState<Record<string, boolean>>({})

  useEffect(() => {
    loadAll(selectedDate)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate])

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

      if (forecastRes.ok) {
        const forecastData = await forecastRes.json()
        setForecastRows(forecastData.rows || [])
      } else {
        setForecastRows([])
      }

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json()
        setAlerts(alertsData.rows || [])
      } else {
        setAlerts([])
      }

      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        const role = sessionData?.user?.role
        const isAdmin = Boolean(sessionData?.user?.isAdmin)
        setCanManualOverride(Boolean(sessionData?.authenticated && (isAdmin || role === 'admin')))
      } else {
        setCanManualOverride(false)
      }
    } catch (error: any) {
      setPageError(error?.message || 'Failed to load data')
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

  function rowIsValid(row: DailyRow): boolean {
    return rowBreakdownTotal(row) === row.total_collected
  }

  async function saveRow(row: DailyRow) {
    if (!rowIsValid(row)) {
      setRowState(row.breed_id, { error: copy.breakdownMismatch, success: false })
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
      const saved = data?.row as DailyRow

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
      setRowState(row.breed_id, { saving: false, success: false, error: error?.message || copy.failedSave })
    }
  }

  async function loadForecastOnly() {
    const res = await fetch('/api/admin/eggs/forecast?weeks=4')
    if (!res.ok) throw new Error(copy.failedForecast)
    const data = await res.json()
    setForecastRows(data.rows || [])
  }

  async function loadAlertsOnly() {
    const res = await fetch('/api/admin/eggs/alerts?limit=25')
    if (!res.ok) throw new Error(copy.failedAlerts)
    const data = await res.json()
    setAlerts(data.rows || [])
  }

  async function recomputeAll() {
    setRecomputing(true)
    try {
      await fetch('/api/admin/eggs/forecast/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weeks: 4 }),
      })
      await Promise.all([loadForecastOnly(), loadAlertsOnly()])
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
      setPageError(error?.message || 'Failed to update override')
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

  return (
    <div className={cn('space-y-6', embedded ? '' : 'max-w-7xl mx-auto px-4 py-6')}>
      <Card className="p-5 md:p-6 border-neutral-200">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-light tracking-tight text-neutral-900">{copy.title}</h2>
            <p className="text-sm text-neutral-600 mt-1">{copy.subtitle}</p>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label className="block text-xs font-medium text-neutral-500 mb-1">{copy.date}</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-[170px]"
              />
            </div>
            <Button variant="outline" onClick={() => loadAll(selectedDate)} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              {copy.reload}
            </Button>
            <Button onClick={recomputeAll} disabled={recomputing} className="gap-2">
              <RefreshCw className={cn('w-4 h-4', recomputing && 'animate-spin')} />
              {copy.recalc}
            </Button>
          </div>
        </div>
      </Card>

      {pageError && (
        <Card className="p-4 border-red-200 bg-red-50 text-red-700 text-sm">{pageError}</Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <MetricCard label={copy.kpiCollected} value={`${daily?.kpi.total_collected || 0}`} />
        <MetricCard label={copy.kpiSellable} value={`${daily?.kpi.total_sellable || 0}`} />
        <MetricCard label={copy.kpiRate} value={`${daily?.kpi.sellable_rate || 0}%`} />
        <MetricCard label={copy.kpiForecast} value={`${daily?.kpi.next_week_estimate || 0}`} />
        <MetricCard label={copy.kpiLow} value={`${daily?.kpi.low_stock_breeds || 0}`} />
      </div>

      <Card className="p-4 border-neutral-200">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase mb-3">{copy.alerts}</h3>
        {alerts.length === 0 ? (
          <p className="text-sm text-neutral-500">{copy.noAlerts}</p>
        ) : (
          <div className="space-y-2">
            {alerts.slice(0, 8).map((alert) => (
              <div key={alert.id} className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{alert.message}</p>
                    <p className="text-xs text-red-700 mt-0.5">
                      {new Date(alert.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'nb-NO')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-3">
        {rows.map((row) => {
          const state = rowStates[row.breed_id] || DEFAULT_SAVE_STATE
          const breakdown = rowBreakdownTotal(row)
          const valid = rowIsValid(row)

          return (
            <Card key={row.breed_id} className="p-4 md:p-5 border-neutral-200">
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: row.accent_color || '#111111' }}
                    />
                    <h3 className="text-lg font-medium text-neutral-900 truncate">{row.breed_name}</h3>
                  </div>
                  <div className="text-xs text-neutral-500">
                    {state.success ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        {copy.saved}
                      </span>
                    ) : row.updated_at ? (
                      new Date(row.updated_at).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    ) : null}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2">
                  <NumericField
                    label={copy.total}
                    value={row.total_collected}
                    onChange={(value) => updateRowField(row.breed_id, 'total_collected', value)}
                  />
                  <NumericField
                    label={copy.sellable}
                    value={row.sellable_standard}
                    onChange={(value) => updateRowField(row.breed_id, 'sellable_standard', value)}
                  />
                  <NumericField
                    label={copy.tooSmall}
                    value={row.too_small}
                    onChange={(value) => updateRowField(row.breed_id, 'too_small', value)}
                  />
                  <NumericField
                    label={copy.dirty}
                    value={row.dirty}
                    onChange={(value) => updateRowField(row.breed_id, 'dirty', value)}
                  />
                  <NumericField
                    label={copy.cracked}
                    value={row.cracked}
                    onChange={(value) => updateRowField(row.breed_id, 'cracked', value)}
                  />
                  <NumericField
                    label={copy.shellDefect}
                    value={row.shell_defect}
                    onChange={(value) => updateRowField(row.breed_id, 'shell_defect', value)}
                  />
                  <NumericField
                    label={copy.other}
                    value={row.other_unsellable}
                    onChange={(value) => updateRowField(row.breed_id, 'other_unsellable', value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-500 mb-1">{copy.notes}</label>
                  <Textarea
                    value={row.notes || ''}
                    onChange={(event) => updateRowField(row.breed_id, 'notes', event.target.value)}
                    rows={2}
                    className="text-sm"
                  />
                </div>

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className={cn('text-xs', valid ? 'text-neutral-500' : 'text-red-600')}>
                    {valid ? `${breakdown} / ${row.total_collected}` : copy.breakdownMismatch}
                  </div>
                  <div className="flex items-center gap-2">
                    {state.error && <span className="text-xs text-red-600">{state.error}</span>}
                    <Button
                      size="sm"
                      className="gap-1.5"
                      onClick={() => saveRow(row)}
                      disabled={!valid || state.saving}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {state.saving ? '...' : copy.save}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="p-4 md:p-5 border-neutral-200">
        <h3 className="text-sm font-semibold tracking-wide text-neutral-900 uppercase mb-3">{copy.forecast}</h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-neutral-500">
                <th className="py-2 font-medium">Rase</th>
                <th className="py-2 font-medium">Uke</th>
                <th className="py-2 font-medium">Mandag</th>
                <th className="py-2 font-medium">Forecast</th>
                <th className="py-2 font-medium">Status</th>
                <th className="py-2 font-medium">Override</th>
              </tr>
            </thead>
            <tbody>
              {forecastRows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-2">{row.breed_name}</td>
                  <td className="py-2 pr-2">
                    {row.week_number}/{row.year}
                  </td>
                  <td className="py-2 pr-2">{new Date(`${row.delivery_monday}T00:00:00`).toLocaleDateString(lang === 'en' ? 'en-GB' : 'nb-NO')}</td>
                  <td className="py-2 pr-2">{row.forecast_eggs}</td>
                  <td className="py-2 pr-2">
                    {row.deficit ? (
                      <span className="text-red-700">Deficit</span>
                    ) : row.low_stock ? (
                      <span className="text-amber-700">Low stock</span>
                    ) : (
                      <span className="text-green-700">OK</span>
                    )}
                  </td>
                  <td className="py-2 pr-2">
                    {!row.inventory_id ? (
                      <span className="text-neutral-400">-</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className={cn('text-xs', row.manual_override ? 'text-orange-700' : 'text-neutral-600')}>
                          {row.manual_override ? copy.manual : copy.auto}
                        </span>
                        {canManualOverride && (
                          <>
                            <Input
                              className="h-8 w-24 text-xs"
                              value={overrideDraft[row.inventory_id] ?? String(row.eggs_available ?? row.forecast_eggs)}
                              onChange={(event) =>
                                setOverrideDraft((prev) => ({
                                  ...prev,
                                  [row.inventory_id as string]: event.target.value,
                                }))
                              }
                              inputMode="numeric"
                              aria-label={copy.manualEggs}
                            />
                            {row.manual_override ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs"
                                disabled={Boolean(overrideSaving[row.inventory_id])}
                                onClick={() => setInventoryOverride(row, false)}
                              >
                                {copy.setAuto}
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                className="h-8 text-xs"
                                disabled={Boolean(overrideSaving[row.inventory_id])}
                                onClick={() => setInventoryOverride(row, true)}
                              >
                                {copy.setManual}
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function NumericField({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium uppercase tracking-wide text-neutral-500 mb-1">
        {label}
      </label>
      <Input
        inputMode="numeric"
        value={String(value)}
        onChange={(event) => onChange(event.target.value)}
        className="h-10"
      />
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="p-4 border-neutral-200">
      <p className="text-xs text-neutral-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-light text-neutral-900 mt-1">{value}</p>
    </Card>
  )
}
