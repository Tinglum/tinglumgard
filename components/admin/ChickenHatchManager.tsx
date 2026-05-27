'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import {
  Plus, Save, X, Pencil, Power, Copy, Egg, Thermometer,
  ChevronDown, ChevronUp, Clock, BarChart3, Droplets,
} from 'lucide-react'
import { getAgeWeeks, getHenPrice } from '@/lib/chickens/pricing'
import { useLanguage } from '@/contexts/LanguageContext'

// ─── Types ───────────────────────────────────────────────────────

interface IncubationBatch {
  id: string
  batch_code: string
  eggs_set_date: string
  lock_down_date: string
  hatch_due_date: string
  total_eggs_set: number
  notes: string
  active: boolean
  target_temperature: number | null
  target_humidity: number | null
}

interface Hatch {
  id: string
  incubation_batch_id: string | null
  breed_id: string
  hatch_date: string
  initial_count: number
  eggs_set_count: number
  expected_hatch_count: number
  actual_hatched_count: number | null
  estimated_hens: number
  estimated_roosters: number
  available_hens: number
  available_roosters: number
  mortality_override: number | null
  notes: string
  active: boolean
  candling_date: string | null
  candling_fertile_count: number | null
  candling_removed_count: number | null
  ordered_hens?: number
  ordered_roosters?: number
  ordered_total?: number
  remaining_hens?: number
  remaining_roosters?: number
  remaining_total?: number
  on_farm_now_hens?: number
  on_farm_now_roosters?: number
  on_farm_now_total?: number
  order_allocations?: HatchOrderAllocation[]
  chicken_breeds?: {
    name: string
    slug: string
    accent_color: string
    start_price_nok: number
    weekly_increase_nok: number
    adult_price_nok: number
  }
  chicken_incubation_batches?: IncubationBatch | null
}

interface HatchOrderAllocation {
  order_id: string
  order_number: string
  customer_name: string
  status: string
  pickup_date: string | null
  pickup_time: string | null
  pickup_monday: string | null
  base_hens: number
  base_roosters: number
  addition_hens: number
  addition_roosters: number
  total_hens: number
  total_roosters: number
  total_birds: number
  addition_line_count: number
}

interface Breed {
  id: string
  name: string
  slug: string
  active: boolean
}

interface BatchEvent {
  id: string
  batch_id: string
  event_type: string
  description: string
  metadata: Record<string, any>
  created_at: string
}

interface ClimateLog {
  id: string
  batch_id: string
  logged_at: string
  temperature: number | null
  humidity: number | null
  notes: string
  created_at: string
}

interface BreedStat {
  breed_id: string
  name: string
  slug: string
  accent_color: string
  avg_hatch_rate: number | null
  batch_count: number
  total_eggs: number
  total_hatched: number
}

interface HatchLineDraft {
  eggs_set_count: string
  actual_hatched_count: string
}

interface NewBatchForm {
  eggs_set_date: string
  notes: string
  target_temperature: string
  target_humidity: string
  lines: Record<string, HatchLineDraft>
}

interface BatchEditForm {
  eggs_set_date: string
  notes: string
  target_temperature: string
  target_humidity: string
  rows: Record<string, {
    eggs_set_count: string
    actual_hatched_count: string
    available_hens: string
    available_roosters: string
    active: boolean
  }>
}

type BatchGroup = {
  key: string
  batch: IncubationBatch | null
  rows: Hatch[]
}

type ModalType = 'none' | 'hatch' | 'candling' | 'climate' | 'timeline' | 'duplicate' | 'orders'

type ChickenHatchManagerProps = {
  onNavigateToOrder?: (orderId: string) => void
}

// ─── Helpers ─────────────────────────────────────────────────────

function toNonNegativeInt(value: unknown, fallback: number = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

function parseOptionalInt(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  return toNonNegativeInt(trimmed)
}

function formatDate(isoDate?: string | null): string {
  if (!isoDate) return '-'
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString('nb-NO')
}

function formatDateTime(isoDate?: string | null): string {
  if (!isoDate) return '-'
  return new Date(isoDate).toLocaleString('nb-NO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function lineStatusBadgeClass(isActive: boolean): string {
  return isActive
    ? 'bg-emerald-100 text-emerald-700'
    : 'bg-red-100 text-red-700'
}

function batchStage(batch: IncubationBatch | null, rows: Hatch[]): { labelKey: string; className: string } {
  if (!batch) return { labelKey: 'badgeLegacy', className: 'bg-neutral-100 text-neutral-700' }
  if (!batch.active) return { labelKey: 'badgeInactive', className: 'bg-red-100 text-red-700' }

  const todayIso = new Date().toISOString().split('T')[0]
  const allActualKnown = rows.length > 0 && rows.every((row) => row.actual_hatched_count !== null)

  if (allActualKnown) return { labelKey: 'badgeHatched', className: 'bg-emerald-100 text-emerald-700' }
  if (todayIso >= batch.hatch_due_date) return { labelKey: 'badgeHatching', className: 'bg-orange-100 text-orange-700' }
  if (todayIso >= batch.lock_down_date) return { labelKey: 'badgeLockdown', className: 'bg-amber-100 text-amber-700' }
  return { labelKey: 'badgeIncubating', className: 'bg-blue-100 text-blue-700' }
}

function sortGroupsDesc(a: BatchGroup, b: BatchGroup): number {
  const aDate = a.batch?.eggs_set_date || a.rows[0]?.hatch_date || ''
  const bDate = b.batch?.eggs_set_date || b.rows[0]?.hatch_date || ''
  return aDate < bDate ? 1 : aDate > bDate ? -1 : 0
}

const EVENT_ICONS: Record<string, string> = {
  created: '🥚', candled: '🔦', hatched: '🐣', edited: '✏️',
  activated: '✅', deactivated: '⛔', climate: '🌡️',
}

// ─── Component ───────────────────────────────────────────────────

export function ChickenHatchManager({ onNavigateToOrder }: ChickenHatchManagerProps = {}) {
  const { toast } = useToast()
  const { t, lang } = useLanguage()
  const no = lang === 'no'
  const ch = (t as any).admin.chickenHatches

  // Core state
  const [hatches, setHatches] = useState<Hatch[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [breedStats, setBreedStats] = useState<BreedStat[]>([])
  const [showBreedStats, setShowBreedStats] = useState(false)

  // Create form
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBatch, setNewBatch] = useState<NewBatchForm>({
    eggs_set_date: '', notes: '', target_temperature: '37.5', target_humidity: '55', lines: {},
  })

  // Batch edit
  const [editingBatchId, setEditingBatchId] = useState<string | null>(null)
  const [batchEditForm, setBatchEditForm] = useState<BatchEditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [togglingBatchId, setTogglingBatchId] = useState<string | null>(null)

  // Modal state
  const [modalType, setModalType] = useState<ModalType>('none')
  const [modalBatchId, setModalBatchId] = useState<string | null>(null)
  const [modalHatchId, setModalHatchId] = useState<string | null>(null)
  const [modalData, setModalData] = useState<Record<string, string>>({})

  // Expandable sections per batch
  const [expandedTimeline, setExpandedTimeline] = useState<string | null>(null)
  const [expandedClimate, setExpandedClimate] = useState<string | null>(null)
  const [timelineEvents, setTimelineEvents] = useState<BatchEvent[]>([])
  const [climateLogs, setClimateLogs] = useState<ClimateLog[]>([])

  // Climate add form
  const [climateForm, setClimateForm] = useState({ temperature: '', humidity: '', notes: '' })

  // ─── Data fetching ─────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [hatchRes, breedRes] = await Promise.all([
        fetch('/api/admin/chickens/hatches'),
        fetch('/api/admin/chickens/breeds'),
      ])

      if (hatchRes.ok) {
        const payload = await hatchRes.json()
        setHatches(Array.isArray(payload) ? payload : Array.isArray(payload?.hatches) ? payload.hatches : [])
      } else {
        const errBody = await hatchRes.json().catch(() => ({}))
        setFetchError(`${hatchRes.status}: ${errBody?.error || 'Unknown error'}`)
      }
      if (breedRes.ok) setBreeds(await breedRes.json())
    } catch {
      setFetchError('Network error')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchBreedStats = async () => {
    try {
      const res = await fetch('/api/admin/chickens/batches/breed-stats')
      if (res.ok) setBreedStats(await res.json())
    } catch { /* ignore */ }
  }

  const fetchTimeline = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/batches/${batchId}/events`)
      if (res.ok) setTimelineEvents(await res.json())
    } catch { /* ignore */ }
  }

  const fetchClimateLogs = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/batches/${batchId}/climate`)
      if (res.ok) setClimateLogs(await res.json())
    } catch { /* ignore */ }
  }

  useEffect(() => { fetchData() }, [fetchData])

  // ─── Derived data ──────────────────────────────────────────────

  const activeBreeds = useMemo(() => breeds.filter((b) => b.active !== false), [breeds])

  const groupedBatches = useMemo(() => {
    const map = new Map<string, BatchGroup>()
    for (const hatch of hatches) {
      const batch = hatch.chicken_incubation_batches || null
      const key = batch?.id || `legacy-${hatch.id}`
      const existing = map.get(key)
      if (existing) { existing.rows.push(hatch); continue }
      map.set(key, { key, batch, rows: [hatch] })
    }
    return Array.from(map.values())
      .map((g) => ({ ...g, rows: [...g.rows].sort((a, b) => (a.chicken_breeds?.name || '').localeCompare(b.chicken_breeds?.name || '', 'nb')) }))
      .sort(sortGroupsDesc)
  }, [hatches])

  const modalOrderHatch = useMemo(
    () => (modalHatchId ? hatches.find((hatch) => hatch.id === modalHatchId) || null : null),
    [hatches, modalHatchId]
  )

  const stockMetricLabel = useCallback((hens: number, roosters: number) => (
    no
      ? `${hens} kyllinger / ${roosters} haner`
      : `${hens} hens / ${roosters} roosters`
  ), [no])

  const statusLabel = useCallback((status: string) => {
    const normalized = String(status || '').trim()
    if (normalized === 'pending') return no ? 'Venter' : 'Pending'
    if (normalized === 'deposit_paid') return no ? 'Forskudd betalt' : 'Deposit paid'
    if (normalized === 'fully_paid') return no ? 'Fullt betalt' : 'Fully paid'
    if (normalized === 'ready_for_pickup') return no ? 'Klar for henting' : 'Ready for pickup'
    if (normalized === 'picked_up') return no ? 'Hentet' : 'Picked up'
    if (normalized === 'cancelled') return no ? 'Kansellert' : 'Cancelled'
    return normalized || '-'
  }, [no])

  const statusBadgeClass = useCallback((status: string) => {
    const normalized = String(status || '').trim()
    if (normalized === 'pending') return 'bg-amber-100 text-amber-800'
    if (normalized === 'deposit_paid') return 'bg-blue-100 text-blue-800'
    if (normalized === 'fully_paid') return 'bg-emerald-100 text-emerald-800'
    if (normalized === 'ready_for_pickup') return 'bg-purple-100 text-purple-800'
    if (normalized === 'picked_up') return 'bg-neutral-200 text-neutral-700'
    if (normalized === 'cancelled') return 'bg-red-100 text-red-700'
    return 'bg-neutral-100 text-neutral-700'
  }, [])

  const createTotals = useMemo(() => {
    const totalEggsSet = activeBreeds.reduce((s, b) => s + toNonNegativeInt(newBatch.lines[b.id]?.eggs_set_count), 0)
    const totalExpected = activeBreeds.reduce((s, b) => s + Math.round(toNonNegativeInt(newBatch.lines[b.id]?.eggs_set_count) * 0.5), 0)
    return { totalEggsSet, totalExpected }
  }, [activeBreeds, newBatch.lines])

  const breedStatsMap = useMemo(() => {
    const map = new Map<string, BreedStat>()
    for (const stat of breedStats) map.set(stat.breed_id, stat)
    return map
  }, [breedStats])

  // ─── Create form handlers ─────────────────────────────────────

  const updateDraftLine = (breedId: string, patch: Partial<HatchLineDraft>) => {
    setNewBatch((prev) => ({
      ...prev,
      lines: {
        ...prev.lines,
        [breedId]: { eggs_set_count: prev.lines[breedId]?.eggs_set_count || '', actual_hatched_count: prev.lines[breedId]?.actual_hatched_count || '', ...patch },
      },
    }))
  }

  const handleCreate = async () => {
    if (!newBatch.eggs_set_date) {
      toast({ title: ch.errorMissingDate, description: ch.errorMissingDateDescription, variant: 'destructive' }); return
    }

    const lines = activeBreeds
      .map((breed) => {
        const draft = newBatch.lines[breed.id]
        const eggsSetCount = toNonNegativeInt(draft?.eggs_set_count)
        if (eggsSetCount <= 0) return null
        const payload: Record<string, any> = { breed_id: breed.id, eggs_set_count: eggsSetCount }
        const actual = parseOptionalInt(draft?.actual_hatched_count || '')
        if (actual !== null) payload.actual_hatched_count = actual
        return payload
      })
      .filter(Boolean)

    if (lines.length === 0) {
      toast({ title: ch.errorNoBreeds, description: ch.errorNoBreedsDescription, variant: 'destructive' }); return
    }

    try {
      const res = await fetch('/api/admin/chickens/hatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eggs_set_date: newBatch.eggs_set_date,
          notes: newBatch.notes,
          target_temperature: parseFloat(newBatch.target_temperature) || null,
          target_humidity: parseFloat(newBatch.target_humidity) || null,
          lines,
        }),
      })

      if (!res.ok) { const p = await res.json().catch(() => ({})); throw new Error(p?.error || 'Failed') }
      toast({ title: ch.createToastTitle, description: ch.createToastDescription })
      setShowAddForm(false)
      setNewBatch({ eggs_set_date: '', notes: '', target_temperature: '37.5', target_humidity: '55', lines: {} })
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorCreateTitle, description: error?.message || ch.errorCreateDescription, variant: 'destructive' })
    }
  }

  // ─── Batch edit handlers ───────────────────────────────────────

  const handleStartBatchEdit = (group: BatchGroup) => {
    if (!group.batch) return
    setEditingBatchId(group.batch.id)
    const rows: BatchEditForm['rows'] = {}
    for (const row of group.rows) {
      rows[row.id] = {
        eggs_set_count: String(row.eggs_set_count ?? ''),
        actual_hatched_count: row.actual_hatched_count == null ? '' : String(row.actual_hatched_count),
        available_hens: String(row.available_hens ?? ''),
        available_roosters: String(row.available_roosters ?? ''),
        active: row.active !== false,
      }
    }
    setBatchEditForm({
      eggs_set_date: group.batch.eggs_set_date,
      notes: group.batch.notes || '',
      target_temperature: group.batch.target_temperature != null ? String(group.batch.target_temperature) : '',
      target_humidity: group.batch.target_humidity != null ? String(group.batch.target_humidity) : '',
      rows,
    })
  }

  const handleCancelBatchEdit = () => { setEditingBatchId(null); setBatchEditForm(null) }

  const updateEditRow = (rowId: string, field: string, value: string) => {
    setBatchEditForm((prev) => prev ? { ...prev, rows: { ...prev.rows, [rowId]: { ...prev.rows[rowId], [field]: value } } } : prev)
  }

  const handleSaveBatchEdit = async () => {
    if (!editingBatchId || !batchEditForm) return
    setSaving(true)
    try {
      const rows = Object.entries(batchEditForm.rows).map(([id, v]) => ({
        id,
        eggs_set_count: toNonNegativeInt(v.eggs_set_count),
        actual_hatched_count: v.actual_hatched_count.trim() === '' ? null : toNonNegativeInt(v.actual_hatched_count),
        available_hens: toNonNegativeInt(v.available_hens),
        available_roosters: toNonNegativeInt(v.available_roosters),
        active: v.active,
      }))

      const res = await fetch(`/api/admin/chickens/batches/${editingBatchId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eggs_set_date: batchEditForm.eggs_set_date,
          notes: batchEditForm.notes,
          target_temperature: batchEditForm.target_temperature ? parseFloat(batchEditForm.target_temperature) : null,
          target_humidity: batchEditForm.target_humidity ? parseFloat(batchEditForm.target_humidity) : null,
          rows,
        }),
      })

      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || 'Failed') }
      toast({ title: ch.updateToastTitle, description: ch.batchUpdateDescription })
      handleCancelBatchEdit()
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorUpdateTitle, description: error?.message || ch.errorUpdateDescription, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleToggleActive = async (batchId: string) => {
    setTogglingBatchId(batchId)
    try {
      const res = await fetch(`/api/admin/chickens/batches/${batchId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_active' }),
      })
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b?.error || 'Failed') }
      const result = await res.json()
      toast({ title: result.active ? ch.activateToastTitle : ch.deactivateToastTitle, description: result.active ? ch.activateToastDescription : ch.deactivateToastDescription })
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorDeactivateTitle, description: error?.message || ch.errorDeactivateDescription, variant: 'destructive' })
    } finally { setTogglingBatchId(null) }
  }

  // ─── Modal actions ─────────────────────────────────────────────

  const openModal = (type: ModalType, batchId: string, rows: Hatch[]) => {
    setModalType(type)
    setModalBatchId(batchId)
    setModalHatchId(null)
    const data: Record<string, string> = {}
    if (type === 'hatch') {
      for (const r of rows) data[`hatch_${r.id}`] = r.actual_hatched_count != null ? String(r.actual_hatched_count) : ''
    }
    if (type === 'candling') {
      for (const r of rows) {
        data[`fertile_${r.id}`] = r.candling_fertile_count != null ? String(r.candling_fertile_count) : String(r.eggs_set_count)
        data[`removed_${r.id}`] = r.candling_removed_count != null ? String(r.candling_removed_count) : '0'
      }
      data.candling_date = new Date().toISOString().split('T')[0]
    }
    if (type === 'duplicate') {
      data.eggs_set_date = new Date().toISOString().split('T')[0]
    }
    setModalData(data)
  }

  const openOrdersModal = (hatchId: string) => {
    setModalType('orders')
    setModalBatchId(null)
    setModalHatchId(hatchId)
    setModalData({})
  }

  const closeModal = () => {
    setModalType('none')
    setModalBatchId(null)
    setModalHatchId(null)
    setModalData({})
  }

  const handleQuickHatch = async (rows: Hatch[]) => {
    if (!modalBatchId) return
    setSaving(true)
    try {
      const results = rows.map(r => ({
        id: r.id,
        actual_hatched_count: toNonNegativeInt(modalData[`hatch_${r.id}`]),
      }))
      const res = await fetch(`/api/admin/chickens/batches/${modalBatchId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_hatch', results }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: ch.hatchRegisteredTitle, description: ch.hatchRegisteredDescription })
      closeModal()
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorUpdateTitle, description: error?.message || ch.errorUpdateDescription, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleCandling = async (rows: Hatch[]) => {
    if (!modalBatchId) return
    setSaving(true)
    try {
      const results = rows.map(r => ({
        id: r.id,
        candling_fertile_count: toNonNegativeInt(modalData[`fertile_${r.id}`]),
        candling_removed_count: toNonNegativeInt(modalData[`removed_${r.id}`]),
      }))
      const res = await fetch(`/api/admin/chickens/batches/${modalBatchId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'register_candling', candling_date: modalData.candling_date, results }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: ch.candlingRegisteredTitle, description: ch.candlingRegisteredDescription })
      closeModal()
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorUpdateTitle, description: error?.message || ch.errorUpdateDescription, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleDuplicate = async () => {
    if (!modalBatchId) return
    setSaving(true)
    try {
      const res = await fetch(`/api/admin/chickens/batches/${modalBatchId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'duplicate', eggs_set_date: modalData.eggs_set_date }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: ch.duplicateToastTitle, description: ch.duplicateToastDescription })
      closeModal()
      await fetchData()
    } catch (error: any) {
      toast({ title: ch.errorCreateTitle, description: error?.message || ch.errorCreateDescription, variant: 'destructive' })
    } finally { setSaving(false) }
  }

  const handleAddClimateLog = async (batchId: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/batches/${batchId}/climate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          temperature: climateForm.temperature ? parseFloat(climateForm.temperature) : null,
          humidity: climateForm.humidity ? parseFloat(climateForm.humidity) : null,
          notes: climateForm.notes,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: ch.climateLoggedTitle, description: ch.climateLoggedDescription })
      setClimateForm({ temperature: '', humidity: '', notes: '' })
      await fetchClimateLogs(batchId)
    } catch (error: any) {
      toast({ title: ch.errorUpdateTitle, description: error?.message, variant: 'destructive' })
    }
  }

  // ─── Toggle expandable sections ────────────────────────────────

  const toggleTimeline = async (batchId: string) => {
    if (expandedTimeline === batchId) { setExpandedTimeline(null); return }
    setExpandedTimeline(batchId)
    await fetchTimeline(batchId)
  }

  const toggleClimate = async (batchId: string) => {
    if (expandedClimate === batchId) { setExpandedClimate(null); return }
    setExpandedClimate(batchId)
    await fetchClimateLogs(batchId)
  }

  // ─── Render ────────────────────────────────────────────────────

  if (loading) return <div className="py-8 text-center text-gray-500">{ch.loading}</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{ch.title} ({groupedBatches.length})</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => { setShowBreedStats(p => !p); if (!showBreedStats) fetchBreedStats() }}
          >
            <BarChart3 className="w-4 h-4 mr-1" /> {ch.buttonBreedStats}
          </Button>
          <Button size="sm" onClick={() => setShowAddForm((prev) => !prev)}>
            <Plus className="w-4 h-4 mr-1" /> {ch.buttonNewHatch}
          </Button>
        </div>
      </div>

      {/* Breed hatch rate stats */}
      {showBreedStats && breedStats.length > 0 && (
        <Card className="p-4 space-y-3">
          <h4 className="text-sm font-semibold text-neutral-700">{ch.breedStatsTitle}</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {breedStats.map((stat) => (
              <div key={stat.breed_id} className="border rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: stat.accent_color || '#888' }} />
                  <span className="font-medium text-sm">{stat.name}</span>
                </div>
                <div className="flex gap-3 text-xs text-neutral-500">
                  <span>{ch.statAvgRate}: <span className="font-semibold text-neutral-700">{stat.avg_hatch_rate ?? '-'}%</span></span>
                  <span>{ch.statBatches}: <span className="font-semibold text-neutral-700">{stat.batch_count}</span></span>
                </div>
                <div className="w-full h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{ width: `${stat.avg_hatch_rate ?? 0}%`, backgroundColor: stat.accent_color || '#888' }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create form */}
      {showAddForm && (
        <Card className="p-4 space-y-4 border-blue-200 bg-blue-50/30">
          <h4 className="font-medium">{ch.formTitle}</h4>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <Label className="text-xs">{ch.labelEggSetDate}</Label>
              <Input type="date" value={newBatch.eggs_set_date} onChange={(e) => setNewBatch(p => ({ ...p, eggs_set_date: e.target.value }))} />
            </div>
            <div>
              <Label className="text-xs">{ch.labelTargetTemp}</Label>
              <Input type="number" step="0.1" value={newBatch.target_temperature} onChange={(e) => setNewBatch(p => ({ ...p, target_temperature: e.target.value }))} placeholder="37.5" />
            </div>
            <div>
              <Label className="text-xs">{ch.labelTargetHumidity}</Label>
              <Input type="number" step="0.1" value={newBatch.target_humidity} onChange={(e) => setNewBatch(p => ({ ...p, target_humidity: e.target.value }))} placeholder="55" />
            </div>
            <div>
              <Label className="text-xs">{ch.labelBatchNote}</Label>
              <Input value={newBatch.notes} onChange={(e) => setNewBatch(p => ({ ...p, notes: e.target.value }))} placeholder={ch.placeholderBatchNote} />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b text-left text-neutral-600">
                  <th className="p-2">{ch.tableHeaderBreed}</th>
                  <th className="p-2">{ch.tableHeaderEggsIn}</th>
                  <th className="p-2">{ch.tableHeaderEstimatedHatch}</th>
                  <th className="p-2">{ch.tableHeaderActualHatched}</th>
                </tr>
              </thead>
              <tbody>
                {activeBreeds.map((breed) => {
                  const draft = newBatch.lines[breed.id]
                  const eggsSetCount = toNonNegativeInt(draft?.eggs_set_count)
                  return (
                    <tr key={breed.id} className="border-b last:border-0">
                      <td className="p-2 font-medium">{breed.name}</td>
                      <td className="p-2 w-28"><Input type="number" min={0} value={draft?.eggs_set_count || ''} onChange={(e) => updateDraftLine(breed.id, { eggs_set_count: e.target.value })} placeholder="0" /></td>
                      <td className="p-2 text-neutral-500">{Math.round(eggsSetCount * 0.5)}</td>
                      <td className="p-2 w-28"><Input type="number" min={0} value={draft?.actual_hatched_count || ''} onChange={(e) => updateDraftLine(breed.id, { actual_hatched_count: e.target.value })} placeholder={ch.placeholderActualOptional} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-neutral-600">
            {ch.summaryTotalEggsIn.split('{total}')[0]}<span className="font-semibold">{createTotals.totalEggsSet}</span>
            {' | '}{ch.summaryEstimatedHatch.split('{total}')[0]}<span className="font-semibold">{createTotals.totalExpected}</span>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}><Save className="w-3 h-3 mr-1" /> {ch.buttonCreateHatch}</Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); setNewBatch({ eggs_set_date: '', notes: '', target_temperature: '37.5', target_humidity: '55', lines: {} }) }}><X className="w-3 h-3 mr-1" /> {t.common.cancel}</Button>
          </div>
        </Card>
      )}

      {fetchError && (
        <Card className="p-4 border-red-200 bg-red-50">
          <p className="text-sm text-red-700 font-medium">Feil ved henting av data: {fetchError}</p>
          <Button size="sm" variant="outline" className="mt-2" onClick={fetchData}>Prøv igjen</Button>
        </Card>
      )}

      {!fetchError && groupedBatches.length === 0 && !loading && <Card className="p-6 text-center text-neutral-500">{ch.emptyState}</Card>}

      {/* ─── Modal overlay ──────────────────────────────────── */}
      {modalType !== 'none' && (modalBatchId || modalHatchId) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <Card
            className={`p-5 w-full mx-4 space-y-4 max-h-[80vh] overflow-y-auto ${modalType === 'orders' ? 'max-w-2xl' : 'max-w-lg'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Quick hatch modal */}
            {modalType === 'hatch' && (() => {
              const group = groupedBatches.find(g => g.batch?.id === modalBatchId)
              if (!group) return null
              return (
                <>
                  <h4 className="font-semibold flex items-center gap-2"><Egg className="w-4 h-4" /> {ch.modalHatchTitle}</h4>
                  <div className="space-y-2">
                    {group.rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-32 truncate">{r.chicken_breeds?.name}</span>
                        <span className="text-xs text-neutral-500 w-20">{ch.labelEggsSet}: {r.eggs_set_count}</span>
                        <Input
                          type="number" min={0} className="w-24 h-8 text-sm"
                          value={modalData[`hatch_${r.id}`] || ''}
                          onChange={(e) => setModalData(p => ({ ...p, [`hatch_${r.id}`]: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleQuickHatch(group.rows)} disabled={saving}><Save className="w-3 h-3 mr-1" /> {saving ? ch.saving : ch.buttonRegisterHatch}</Button>
                    <Button size="sm" variant="outline" onClick={closeModal}><X className="w-3 h-3 mr-1" /> {t.common.cancel}</Button>
                  </div>
                </>
              )
            })()}

            {/* Candling modal */}
            {modalType === 'candling' && (() => {
              const group = groupedBatches.find(g => g.batch?.id === modalBatchId)
              if (!group) return null
              return (
                <>
                  <h4 className="font-semibold flex items-center gap-2">🔦 {ch.modalCandlingTitle}</h4>
                  <div>
                    <Label className="text-xs">{ch.labelCandlingDate}</Label>
                    <Input type="date" value={modalData.candling_date || ''} onChange={(e) => setModalData(p => ({ ...p, candling_date: e.target.value }))} className="w-40" />
                  </div>
                  <div className="space-y-2">
                    {group.rows.map(r => (
                      <div key={r.id} className="flex items-center gap-3">
                        <span className="text-sm font-medium w-28 truncate">{r.chicken_breeds?.name}</span>
                        <span className="text-xs text-neutral-500 w-16">{r.eggs_set_count} {ch.labelEggsShort}</span>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} className="w-20 h-8 text-sm"
                            value={modalData[`fertile_${r.id}`] || ''}
                            onChange={(e) => setModalData(p => ({ ...p, [`fertile_${r.id}`]: e.target.value }))}
                            placeholder="0"
                          />
                          <span className="text-xs text-neutral-500">{ch.labelFertile}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Input
                            type="number" min={0} className="w-20 h-8 text-sm"
                            value={modalData[`removed_${r.id}`] || ''}
                            onChange={(e) => setModalData(p => ({ ...p, [`removed_${r.id}`]: e.target.value }))}
                            placeholder="0"
                          />
                          <span className="text-xs text-neutral-500">{ch.labelRemoved}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button size="sm" onClick={() => handleCandling(group.rows)} disabled={saving}><Save className="w-3 h-3 mr-1" /> {saving ? ch.saving : ch.buttonRegisterCandling}</Button>
                    <Button size="sm" variant="outline" onClick={closeModal}><X className="w-3 h-3 mr-1" /> {t.common.cancel}</Button>
                  </div>
                </>
              )
            })()}

            {/* Duplicate modal */}
            {modalType === 'duplicate' && (
              <>
                <h4 className="font-semibold flex items-center gap-2"><Copy className="w-4 h-4" /> {ch.modalDuplicateTitle}</h4>
                <p className="text-sm text-neutral-600">{ch.modalDuplicateDescription}</p>
                <div>
                  <Label className="text-xs">{ch.labelNewEggDate}</Label>
                  <Input type="date" value={modalData.eggs_set_date || ''} onChange={(e) => setModalData(p => ({ ...p, eggs_set_date: e.target.value }))} className="w-48" />
                </div>
                <div className="flex gap-2 pt-2">
                  <Button size="sm" onClick={handleDuplicate} disabled={saving}><Copy className="w-3 h-3 mr-1" /> {saving ? ch.saving : ch.buttonDuplicate}</Button>
                  <Button size="sm" variant="outline" onClick={closeModal}><X className="w-3 h-3 mr-1" /> {t.common.cancel}</Button>
                </div>
              </>
            )}

            {modalType === 'orders' && modalOrderHatch && (
              <>
                <div className="space-y-1">
                  <h4 className="font-semibold">
                    {no ? 'Bestilte fugler fra dette kullet' : 'Ordered birds from this hatch'}
                  </h4>
                  <p className="text-sm text-neutral-600">
                    {(modalOrderHatch.chicken_breeds?.name || ch.labelUnknownBreed)} · {formatDate(modalOrderHatch.hatch_date)}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-neutral-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-neutral-500">{no ? 'På gården nå' : 'On farm now'}</div>
                    <div className="text-lg font-semibold text-neutral-900">{modalOrderHatch.on_farm_now_total ?? 0}</div>
                    <div className="text-xs text-neutral-500">{stockMetricLabel(modalOrderHatch.on_farm_now_hens ?? 0, modalOrderHatch.on_farm_now_roosters ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border bg-neutral-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-neutral-500">{no ? 'Bestilt' : 'Ordered'}</div>
                    <div className="text-lg font-semibold text-neutral-900">{modalOrderHatch.ordered_total ?? 0}</div>
                    <div className="text-xs text-neutral-500">{stockMetricLabel(modalOrderHatch.ordered_hens ?? 0, modalOrderHatch.ordered_roosters ?? 0)}</div>
                  </div>
                  <div className="rounded-lg border bg-neutral-50 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-neutral-500">{no ? 'Igjen' : 'Remaining'}</div>
                    <div className="text-lg font-semibold text-neutral-900">{modalOrderHatch.remaining_total ?? 0}</div>
                    <div className="text-xs text-neutral-500">{stockMetricLabel(modalOrderHatch.remaining_hens ?? 0, modalOrderHatch.remaining_roosters ?? 0)}</div>
                  </div>
                </div>

                {(modalOrderHatch.order_allocations || []).length === 0 ? (
                  <p className="text-sm text-neutral-500">
                    {no ? 'Ingen åpne ordre er koblet til dette kullet akkurat nå.' : 'No open orders are linked to this hatch right now.'}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(modalOrderHatch.order_allocations || []).map((allocation) => (
                      <div key={allocation.order_id} className="rounded-lg border p-3 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="font-medium text-sm">{allocation.customer_name || (no ? 'Ukjent kunde' : 'Unknown customer')}</div>
                            <div className="text-xs text-neutral-500">{allocation.order_number}</div>
                          </div>
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusBadgeClass(allocation.status)}`}>
                            {statusLabel(allocation.status)}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                          <div className="space-y-1">
                            <div className="text-neutral-900 font-medium">
                              {allocation.total_birds} {no ? 'fugler' : 'birds'}
                            </div>
                            <div className="text-neutral-500">
                              {stockMetricLabel(allocation.total_hens, allocation.total_roosters)}
                            </div>
                            <div className="text-xs text-neutral-500">
                              {no ? 'Grunnordre' : 'Base order'}: {stockMetricLabel(allocation.base_hens, allocation.base_roosters)}
                            </div>
                            {allocation.addition_line_count > 0 && (
                              <div className="text-xs text-neutral-500">
                                {no ? 'Tillegg' : 'Additions'}: {stockMetricLabel(allocation.addition_hens, allocation.addition_roosters)}
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-neutral-500">
                            <div>
                              {no ? 'Henting' : 'Pickup'}:{' '}
                              <span className="text-neutral-900">
                                {allocation.pickup_date ? formatDate(allocation.pickup_date) : (allocation.pickup_monday ? formatDate(allocation.pickup_monday) : '-')}
                                {allocation.pickup_time ? ` ${allocation.pickup_time}` : ''}
                              </span>
                            </div>
                            <div>
                              {no ? 'Inneholder tillegg fra dette kullet' : 'Includes additions from this hatch'}:{' '}
                              <span className="text-neutral-900">{allocation.addition_line_count > 0 ? (no ? 'Ja' : 'Yes') : (no ? 'Nei' : 'No')}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onNavigateToOrder?.(allocation.order_number)
                              closeModal()
                            }}
                          >
                            {no ? 'Åpne ordre' : 'Open order'}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end pt-1">
                  <Button size="sm" variant="outline" onClick={closeModal}>
                    <X className="w-3 h-3 mr-1" /> {t.common.cancel}
                  </Button>
                </div>
              </>
            )}
          </Card>
        </div>
      )}

      {/* ─── Batch cards ────────────────────────────────────── */}
      {groupedBatches.map((group) => {
        const stage = batchStage(group.batch, group.rows)
        const isEditing = editingBatchId === group.batch?.id
        const isToggling = togglingBatchId === group.batch?.id
        const batchActive = group.batch?.active !== false
        const batchId = group.batch?.id

        const totalEggsSet = group.rows.reduce((s, r) => s + toNonNegativeInt(r.eggs_set_count), 0)
        const totalExpected = group.rows.reduce((s, r) => s + toNonNegativeInt(r.expected_hatch_count), 0)
        const knownActualRows = group.rows.filter((r) => r.actual_hatched_count !== null)
        const totalActual = knownActualRows.reduce((s, r) => s + toNonNegativeInt(r.actual_hatched_count), 0)
        const hatchRate = totalEggsSet > 0 && knownActualRows.length > 0 ? Math.round((totalActual / totalEggsSet) * 100) : null
        const totalOnFarmNow = group.rows.reduce((s, r) => s + toNonNegativeInt(r.on_farm_now_total), 0)
        const totalOrdered = group.rows.reduce((s, r) => s + toNonNegativeInt(r.ordered_total), 0)
        const totalRemaining = group.rows.reduce((s, r) => s + toNonNegativeInt(r.remaining_total ?? r.available_hens + r.available_roosters), 0)

        const hasCandling = group.rows.some(r => r.candling_date)
        const isTimelineOpen = expandedTimeline === batchId
        const isClimateOpen = expandedClimate === batchId

        return (
          <Card key={group.key} className={`p-4 space-y-4 transition-colors ${!batchActive ? 'opacity-60 border-red-200 bg-red-50/20' : ''}`}>
            {/* Header */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-semibold text-base">{group.batch ? group.batch.batch_code : ch.cardTitleLegacy}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${stage.className}`}>{ch[stage.labelKey]}</span>
                  {group.batch?.target_temperature && (
                    <span className="text-xs text-neutral-500 flex items-center gap-0.5">
                      <Thermometer className="w-3 h-3" /> {group.batch.target_temperature}°C
                    </span>
                  )}
                  {group.batch?.target_humidity && (
                    <span className="text-xs text-neutral-500 flex items-center gap-0.5">
                      <Droplets className="w-3 h-3" /> {group.batch.target_humidity}%
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-500 mt-0.5">
                  {group.batch ? ch.cardSubtitleEggDate.replace('{date}', formatDate(group.batch.eggs_set_date)) : ch.cardSubtitleHatchDate.replace('{date}', formatDate(group.rows[0]?.hatch_date))}
                </p>
              </div>

              {group.batch && !isEditing && (
                <div className="flex gap-1 flex-wrap">
                  {/* Quick hatch button (only if not all hatched) */}
                  {batchActive && knownActualRows.length < group.rows.length && (
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1" onClick={() => openModal('hatch', group.batch!.id, group.rows)}>
                      <Egg className="w-3.5 h-3.5" /> {ch.buttonQuickHatch}
                    </Button>
                  )}
                  {/* Candling button */}
                  {batchActive && !hasCandling && (
                    <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1" onClick={() => openModal('candling', group.batch!.id, group.rows)}>
                      🔦 {ch.buttonCandling}
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1" onClick={() => handleStartBatchEdit(group)}>
                    <Pencil className="w-3.5 h-3.5" /> {ch.buttonEdit}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2.5 text-xs gap-1" onClick={() => openModal('duplicate', group.batch!.id, group.rows)}>
                    <Copy className="w-3.5 h-3.5" /> {ch.buttonDuplicateShort}
                  </Button>
                  <Button
                    size="sm" variant="outline"
                    className={`h-8 px-2.5 text-xs gap-1 ${batchActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                    onClick={() => handleToggleActive(group.batch!.id)} disabled={isToggling}
                  >
                    <Power className="w-3.5 h-3.5" /> {batchActive ? ch.buttonDeactivate : ch.buttonActivate}
                  </Button>
                </div>
              )}
            </div>

            {/* Timeline row */}
            {group.batch && !isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                <div className="rounded-lg border bg-neutral-50/50 px-3 py-2">
                  <span className="text-neutral-500 text-xs">{ch.labelDay0}</span>
                  <div className="font-medium">{formatDate(group.batch.eggs_set_date)}</div>
                </div>
                <div className="rounded-lg border bg-neutral-50/50 px-3 py-2">
                  <span className="text-neutral-500 text-xs">{ch.labelDay18}</span>
                  <div className="font-medium">{formatDate(group.batch.lock_down_date)}</div>
                </div>
                <div className="rounded-lg border bg-neutral-50/50 px-3 py-2">
                  <span className="text-neutral-500 text-xs">{ch.labelDay21}</span>
                  <div className="font-medium">{formatDate(group.batch.hatch_due_date)}</div>
                </div>
              </div>
            )}

            {/* Edit mode: batch fields */}
            {isEditing && batchEditForm && (
              <div className="border rounded-lg p-3 bg-blue-50/40 border-blue-200 space-y-3">
                <div className="text-xs font-medium text-blue-700 uppercase tracking-wide">{ch.editBatchFields}</div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div>
                    <Label className="text-xs">{ch.labelEggSetDate}</Label>
                    <Input type="date" value={batchEditForm.eggs_set_date} onChange={(e) => setBatchEditForm(p => p ? { ...p, eggs_set_date: e.target.value } : p)} />
                  </div>
                  <div>
                    <Label className="text-xs">{ch.labelTargetTemp}</Label>
                    <Input type="number" step="0.1" value={batchEditForm.target_temperature} onChange={(e) => setBatchEditForm(p => p ? { ...p, target_temperature: e.target.value } : p)} placeholder="37.5" />
                  </div>
                  <div>
                    <Label className="text-xs">{ch.labelTargetHumidity}</Label>
                    <Input type="number" step="0.1" value={batchEditForm.target_humidity} onChange={(e) => setBatchEditForm(p => p ? { ...p, target_humidity: e.target.value } : p)} placeholder="55" />
                  </div>
                  <div>
                    <Label className="text-xs">{ch.labelBatchNote}</Label>
                    <Input value={batchEditForm.notes} onChange={(e) => setBatchEditForm(p => p ? { ...p, notes: e.target.value } : p)} placeholder={ch.placeholderBatchNote} />
                  </div>
                </div>
              </div>
            )}

            {/* Summary stats */}
            {!isEditing && (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
                <span>{ch.summaryEggsIn.split('{total}')[0]}<span className="font-semibold">{totalEggsSet}</span></span>
                <span>{ch.summaryEstClekk.split('{total}')[0]}<span className="font-semibold">{totalExpected}</span></span>
                <span>{ch.summaryActualHatched.split('{total}')[0]}<span className="font-semibold">{totalActual}</span></span>
                {hatchRate !== null && <span>{ch.summaryHatchRate.split('{rate}')[0]}<span className="font-semibold">{hatchRate}%</span></span>}
                <span>{no ? 'På gården nå: ' : 'On farm now: '}<span className="font-semibold">{totalOnFarmNow}</span></span>
                <span>{no ? 'Bestilt: ' : 'Ordered: '}<span className="font-semibold">{totalOrdered}</span></span>
                <span>{no ? 'Igjen: ' : 'Remaining: '}<span className="font-semibold">{totalRemaining}</span></span>
              </div>
            )}

            {/* Table */}
            <div className="overflow-x-auto">
              {!isEditing && (
                <p className="pb-3 text-xs text-neutral-500">
                  {no ? 'På gården nå = bestilt + igjen.' : 'On farm now = ordered + remaining.'}
                </p>
              )}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-neutral-500 border-b">
                    <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderRase}</th>
                    <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderEggInn}</th>
                    {hasCandling && <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderCandled}</th>}
                    <th className="hidden sm:table-cell pb-2 pr-3 text-xs font-medium">{ch.tableHeaderEstKlekk}</th>
                    <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderFactualHatched}</th>
                    <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderStatus}</th>
                    {isEditing ? (
                      <>
                        <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderAvailableHens}</th>
                        <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderAvailableRoosters}</th>
                        <th className="pb-2 pr-3 text-xs font-medium">{ch.tableHeaderActions}</th>
                      </>
                    ) : (
                      <>
                        <th className="pb-2 pr-3 text-xs font-medium">{no ? 'På gården nå' : 'On farm now'}</th>
                        <th className="pb-2 pr-3 text-xs font-medium">{no ? 'Bestilt' : 'Ordered'}</th>
                        <th className="pb-2 pr-3 text-xs font-medium">{no ? 'Igjen' : 'Remaining'}</th>
                        <th className="hidden md:table-cell pb-2 pr-3 text-xs font-medium">{ch.tableHeaderAgeNow}</th>
                        <th className="hidden md:table-cell pb-2 pr-3 text-xs font-medium">{ch.tableHeaderPriceNow}</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((hatch) => {
                    const breed = hatch.chicken_breeds
                    const ageWeeks = getAgeWeeks(hatch.hatch_date)
                    const price = breed ? getHenPrice(ageWeeks, Number(breed.start_price_nok), Number(breed.weekly_increase_nok), Number(breed.adult_price_nok)) : 0
                    const editRow = isEditing && batchEditForm ? batchEditForm.rows[hatch.id] : null
                    const expectedFromEdit = editRow ? Math.round(toNonNegativeInt(editRow.eggs_set_count) * 0.5) : hatch.expected_hatch_count
                    const stat = breedStatsMap.get(hatch.breed_id)
                    const lineIsActive = editRow ? editRow.active : hatch.active !== false
                    const orderedHens = toNonNegativeInt(hatch.ordered_hens)
                    const orderedRoosters = toNonNegativeInt(hatch.ordered_roosters)
                    const orderedTotal = toNonNegativeInt(hatch.ordered_total)
                    const remainingHens = toNonNegativeInt(hatch.remaining_hens ?? hatch.available_hens)
                    const remainingRoosters = toNonNegativeInt(hatch.remaining_roosters ?? hatch.available_roosters)
                    const remainingTotal = toNonNegativeInt(hatch.remaining_total ?? remainingHens + remainingRoosters)
                    const onFarmNowHens = toNonNegativeInt(hatch.on_farm_now_hens ?? remainingHens + orderedHens)
                    const onFarmNowRoosters = toNonNegativeInt(hatch.on_farm_now_roosters ?? remainingRoosters + orderedRoosters)
                    const onFarmNowTotal = toNonNegativeInt(hatch.on_farm_now_total ?? onFarmNowHens + onFarmNowRoosters)

                    return (
                      <tr key={hatch.id} className="border-b last:border-0">
                        <td className="py-2.5 pr-3">
                          <span className="text-sm font-medium">{breed?.name || ch.labelUnknownBreed}</span>
                          {stat && stat.avg_hatch_rate !== null && (
                            <span className="ml-1.5 text-[10px] text-neutral-400" title={ch.statHistoricRate}>({stat.avg_hatch_rate}%)</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          {editRow ? (
                            <Input type="number" min={0} className="w-24 h-8 text-sm" value={editRow.eggs_set_count} onChange={(e) => updateEditRow(hatch.id, 'eggs_set_count', e.target.value)} />
                          ) : <span className="text-sm">{hatch.eggs_set_count}</span>}
                        </td>
                        {hasCandling && (
                          <td className="py-2.5 pr-3 text-sm text-neutral-500">
                            {hatch.candling_fertile_count != null ? (
                              <span>{hatch.candling_fertile_count} <span className="text-neutral-400">(-{hatch.candling_removed_count ?? 0})</span></span>
                            ) : '-'}
                          </td>
                        )}
                        <td className="hidden sm:table-cell py-2.5 pr-3 text-sm text-neutral-500">{expectedFromEdit}</td>
                        <td className="py-2.5 pr-3">
                          {editRow ? (
                            <Input type="number" min={0} className="w-24 h-8 text-sm" value={editRow.actual_hatched_count} onChange={(e) => updateEditRow(hatch.id, 'actual_hatched_count', e.target.value)} placeholder="-" />
                          ) : <span className="text-sm">{hatch.actual_hatched_count ?? <span className="text-neutral-400">-</span>}</span>}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${lineStatusBadgeClass(lineIsActive)}`}>
                            {lineIsActive ? ch.badgeActive : ch.badgeInactive}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {editRow ? (
                            <Input type="number" min={0} className="w-24 h-8 text-sm" value={editRow.available_hens} onChange={(e) => updateEditRow(hatch.id, 'available_hens', e.target.value)} />
                          ) : (
                            <div className="space-y-0.5">
                              <div className="text-sm font-medium text-neutral-900">{onFarmNowTotal}</div>
                              <div className="text-[11px] text-neutral-500">{stockMetricLabel(onFarmNowHens, onFarmNowRoosters)}</div>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          {editRow ? (
                            <Input type="number" min={0} className="w-24 h-8 text-sm" value={editRow.available_roosters} onChange={(e) => updateEditRow(hatch.id, 'available_roosters', e.target.value)} />
                          ) : (
                            <button
                              type="button"
                              className={`text-left rounded-md px-2 py-1 transition-colors ${orderedTotal > 0 ? 'hover:bg-neutral-100' : ''}`}
                              onClick={() => orderedTotal > 0 && openOrdersModal(hatch.id)}
                              disabled={orderedTotal <= 0}
                            >
                              <div className={`text-sm font-medium ${orderedTotal > 0 ? 'text-blue-700' : 'text-neutral-900'}`}>{orderedTotal}</div>
                              <div className="text-[11px] text-neutral-500">{stockMetricLabel(orderedHens, orderedRoosters)}</div>
                              <div className="text-[11px] text-neutral-400">
                                {orderedTotal > 0
                                  ? `${(hatch.order_allocations || []).length} ${no ? ((hatch.order_allocations || []).length === 1 ? 'ordre' : 'ordre') : ((hatch.order_allocations || []).length === 1 ? 'order' : 'orders')}`
                                  : (no ? 'Ingen ordre' : 'No orders')}
                              </div>
                            </button>
                          )}
                        </td>
                        {isEditing ? (
                          <td className="py-2.5 pr-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className={`h-8 px-2.5 text-xs ${lineIsActive ? 'text-red-600 hover:text-red-700 hover:bg-red-50' : 'text-green-600 hover:text-green-700 hover:bg-green-50'}`}
                              onClick={() => {
                                if (!editRow) return
                                setBatchEditForm((prev) => prev ? {
                                  ...prev,
                                  rows: {
                                    ...prev.rows,
                                    [hatch.id]: {
                                      ...prev.rows[hatch.id],
                                      active: !prev.rows[hatch.id].active,
                                    },
                                  },
                                } : prev)
                              }}
                            >
                              {lineIsActive ? ch.buttonDeactivate : ch.buttonActivate}
                            </Button>
                          </td>
                        ) : (
                          <>
                            <td className="py-2.5 pr-3">
                              <div className="space-y-0.5">
                                <div className="text-sm font-medium text-neutral-900">{remainingTotal}</div>
                                <div className="text-[11px] text-neutral-500">{stockMetricLabel(remainingHens, remainingRoosters)}</div>
                              </div>
                            </td>
                            <td className="hidden md:table-cell py-2.5 pr-3 text-sm text-neutral-500">{ch.labelAgeWeeks.replace('{weeks}', String(ageWeeks))}</td>
                            <td className="hidden md:table-cell py-2.5 pr-3 text-sm text-neutral-500">{ch.labelPrice.replace('{price}', String(price))}</td>
                          </>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Edit mode: save/cancel */}
            {isEditing && (
              <div className="flex gap-2 pt-1">
                <Button size="sm" onClick={handleSaveBatchEdit} disabled={saving}><Save className="w-3.5 h-3.5 mr-1" /> {saving ? ch.saving : ch.buttonSaveBatch}</Button>
                <Button size="sm" variant="outline" onClick={handleCancelBatchEdit} disabled={saving}><X className="w-3.5 h-3.5 mr-1" /> {t.common.cancel}</Button>
              </div>
            )}

            {/* Expandable sections: Timeline + Climate */}
            {batchId && !isEditing && (
              <div className="flex gap-2 border-t pt-3">
                <Button
                  size="sm" variant="ghost" className="h-7 px-2.5 text-xs gap-1 text-neutral-500"
                  onClick={() => toggleTimeline(batchId)}
                >
                  <Clock className="w-3.5 h-3.5" /> {ch.buttonTimeline}
                  {isTimelineOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
                <Button
                  size="sm" variant="ghost" className="h-7 px-2.5 text-xs gap-1 text-neutral-500"
                  onClick={() => toggleClimate(batchId)}
                >
                  <Thermometer className="w-3.5 h-3.5" /> {ch.buttonClimateLog}
                  {isClimateOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </Button>
              </div>
            )}

            {/* Timeline panel */}
            {isTimelineOpen && batchId && (
              <div className="border-t pt-3 space-y-2">
                <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{ch.timelineTitle}</h5>
                {timelineEvents.length === 0 ? (
                  <p className="text-xs text-neutral-400">{ch.timelineEmpty}</p>
                ) : (
                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {timelineEvents.map(evt => (
                      <div key={evt.id} className="flex items-start gap-2 text-xs">
                        <span className="w-4 text-center">{EVENT_ICONS[evt.event_type] || '📋'}</span>
                        <span className="text-neutral-400 w-28 shrink-0">{formatDateTime(evt.created_at)}</span>
                        <span className="text-neutral-700">{evt.description}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Climate log panel */}
            {isClimateOpen && batchId && (
              <div className="border-t pt-3 space-y-3">
                <h5 className="text-xs font-semibold text-neutral-500 uppercase tracking-wide">{ch.climateTitle}</h5>

                {/* Add reading form */}
                <div className="flex gap-2 items-end flex-wrap">
                  <div>
                    <Label className="text-[10px]">{ch.labelTemp}</Label>
                    <Input type="number" step="0.1" className="w-20 h-8 text-sm" value={climateForm.temperature} onChange={e => setClimateForm(p => ({ ...p, temperature: e.target.value }))} placeholder="37.5" />
                  </div>
                  <div>
                    <Label className="text-[10px]">{ch.labelHumidity}</Label>
                    <Input type="number" step="0.1" className="w-20 h-8 text-sm" value={climateForm.humidity} onChange={e => setClimateForm(p => ({ ...p, humidity: e.target.value }))} placeholder="55" />
                  </div>
                  <div>
                    <Label className="text-[10px]">{ch.labelNote}</Label>
                    <Input className="w-36 h-8 text-sm" value={climateForm.notes} onChange={e => setClimateForm(p => ({ ...p, notes: e.target.value }))} placeholder={ch.placeholderClimateNote} />
                  </div>
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => handleAddClimateLog(batchId)}>
                    <Plus className="w-3 h-3 mr-1" /> {ch.buttonAddReading}
                  </Button>
                </div>

                {/* Log table */}
                {climateLogs.length === 0 ? (
                  <p className="text-xs text-neutral-400">{ch.climateEmpty}</p>
                ) : (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="text-left text-neutral-400 border-b">
                          <th className="pb-1 pr-3">{ch.climateHeaderTime}</th>
                          <th className="pb-1 pr-3">{ch.climateHeaderTemp}</th>
                          <th className="pb-1 pr-3">{ch.climateHeaderHumidity}</th>
                          <th className="pb-1">{ch.climateHeaderNote}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {climateLogs.map(log => (
                          <tr key={log.id} className="border-b last:border-0">
                            <td className="py-1.5 pr-3 text-neutral-500">{formatDateTime(log.logged_at)}</td>
                            <td className="py-1.5 pr-3">{log.temperature != null ? `${log.temperature}°C` : '-'}</td>
                            <td className="py-1.5 pr-3">{log.humidity != null ? `${log.humidity}%` : '-'}</td>
                            <td className="py-1.5 text-neutral-500">{log.notes || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </Card>
        )
      })}
    </div>
  )
}
