'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Save, X } from 'lucide-react'
import { getAgeWeeks, getHenPrice } from '@/lib/chickens/pricing'

interface IncubationBatch {
  id: string
  batch_code: string
  eggs_set_date: string
  lock_down_date: string
  hatch_due_date: string
  total_eggs_set: number
  notes: string
  active: boolean
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

interface Breed {
  id: string
  name: string
  slug: string
  active: boolean
}

interface HatchLineDraft {
  eggs_set_count: string
  actual_hatched_count: string
}

interface NewBatchForm {
  eggs_set_date: string
  notes: string
  lines: Record<string, HatchLineDraft>
}

type BatchGroup = {
  key: string
  batch: IncubationBatch | null
  rows: Hatch[]
}

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

function batchStage(batch: IncubationBatch | null, rows: Hatch[]): { label: string; className: string } {
  if (!batch) {
    return {
      label: 'Legacy',
      className: 'bg-neutral-100 text-neutral-700',
    }
  }

  const todayIso = new Date().toISOString().split('T')[0]
  const allActualKnown = rows.length > 0 && rows.every((row) => row.actual_hatched_count !== null)

  if (allActualKnown) {
    return {
      label: 'Klekket',
      className: 'bg-emerald-100 text-emerald-700',
    }
  }

  if (todayIso >= batch.hatch_due_date) {
    return {
      label: 'Klekking',
      className: 'bg-orange-100 text-orange-700',
    }
  }

  if (todayIso >= batch.lock_down_date) {
    return {
      label: 'Dag 18 lockdown',
      className: 'bg-amber-100 text-amber-700',
    }
  }

  return {
    label: 'Inkubering',
    className: 'bg-blue-100 text-blue-700',
  }
}

function sortGroupsDesc(a: BatchGroup, b: BatchGroup): number {
  const aDate = a.batch?.eggs_set_date || a.rows[0]?.hatch_date || ''
  const bDate = b.batch?.eggs_set_date || b.rows[0]?.hatch_date || ''
  return aDate < bDate ? 1 : aDate > bDate ? -1 : 0
}

export function ChickenHatchManager() {
  const { toast } = useToast()
  const [hatches, setHatches] = useState<Hatch[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [newBatch, setNewBatch] = useState<NewBatchForm>({
    eggs_set_date: '',
    notes: '',
    lines: {},
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [hatchRes, breedRes] = await Promise.all([
        fetch('/api/admin/chickens/hatches'),
        fetch('/api/admin/chickens/breeds'),
      ])

      if (hatchRes.ok) {
        const payload = await hatchRes.json()
        if (Array.isArray(payload)) {
          setHatches(payload)
        } else if (Array.isArray(payload?.hatches)) {
          setHatches(payload.hatches)
        } else {
          setHatches([])
        }
      }

      if (breedRes.ok) {
        setBreeds(await breedRes.json())
      }
    } catch {
      toast({
        title: 'Feil',
        description: 'Kunne ikke hente data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const activeBreeds = useMemo(
    () => breeds.filter((breed) => breed.active !== false),
    [breeds]
  )

  const groupedBatches = useMemo(() => {
    const map = new Map<string, BatchGroup>()

    for (const hatch of hatches) {
      const batch = hatch.chicken_incubation_batches || null
      const key = batch?.id || `legacy-${hatch.id}`

      const existing = map.get(key)
      if (existing) {
        existing.rows.push(hatch)
        continue
      }

      map.set(key, {
        key,
        batch,
        rows: [hatch],
      })
    }

    const groups = Array.from(map.values())
      .map((group) => ({
        ...group,
        rows: [...group.rows].sort((a, b) => {
          const aName = a.chicken_breeds?.name || ''
          const bName = b.chicken_breeds?.name || ''
          return aName.localeCompare(bName, 'nb')
        }),
      }))
      .sort(sortGroupsDesc)

    return groups
  }, [hatches])

  const createTotals = useMemo(() => {
    const totalEggsSet = activeBreeds.reduce((sum, breed) => {
      const eggs = toNonNegativeInt(newBatch.lines[breed.id]?.eggs_set_count)
      return sum + eggs
    }, 0)

    const totalExpected = activeBreeds.reduce((sum, breed) => {
      const eggs = toNonNegativeInt(newBatch.lines[breed.id]?.eggs_set_count)
      return sum + Math.round(eggs * 0.5)
    }, 0)

    return { totalEggsSet, totalExpected }
  }, [activeBreeds, newBatch.lines])

  const updateDraftLine = (breedId: string, patch: Partial<HatchLineDraft>) => {
    setNewBatch((prev) => ({
      ...prev,
      lines: {
        ...prev.lines,
        [breedId]: {
          eggs_set_count: prev.lines[breedId]?.eggs_set_count || '',
          actual_hatched_count: prev.lines[breedId]?.actual_hatched_count || '',
          ...patch,
        },
      },
    }))
  }

  const resetNewBatchForm = () => {
    setNewBatch({
      eggs_set_date: '',
      notes: '',
      lines: {},
    })
  }

  const handleCreate = async () => {
    if (!newBatch.eggs_set_date) {
      toast({
        title: 'Mangler dato',
        description: 'Velg dato for egg inn i maskinen.',
        variant: 'destructive',
      })
      return
    }

    const lines = activeBreeds
      .map((breed) => {
        const draft = newBatch.lines[breed.id]
        const eggsSetCount = toNonNegativeInt(draft?.eggs_set_count)
        if (eggsSetCount <= 0) return null

        const payload: Record<string, any> = {
          breed_id: breed.id,
          eggs_set_count: eggsSetCount,
        }

        const actual = parseOptionalInt(draft?.actual_hatched_count || '')
        if (actual !== null) {
          payload.actual_hatched_count = actual
        }

        return payload
      })
      .filter(Boolean)

    if (lines.length === 0) {
      toast({
        title: 'Ingen raser lagt inn',
        description: 'Legg inn antall egg for minst en rase.',
        variant: 'destructive',
      })
      return
    }

    try {
      const res = await fetch('/api/admin/chickens/hatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eggs_set_date: newBatch.eggs_set_date,
          notes: newBatch.notes,
          lines,
        }),
      })

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to create hatch batch')
      }

      toast({
        title: 'Opprettet',
        description: 'Nytt kull med flere raser er lagret.',
      })

      setShowAddForm(false)
      resetNewBatchForm()
      await fetchData()
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke opprette kull',
        variant: 'destructive',
      })
    }
  }

  const handleStartEdit = (hatch: Hatch) => {
    setEditingId(hatch.id)
    setEditValues({
      eggs_set_count: String(hatch.eggs_set_count ?? ''),
      expected_hatch_count: String(hatch.expected_hatch_count ?? hatch.initial_count ?? ''),
      actual_hatched_count: hatch.actual_hatched_count == null ? '' : String(hatch.actual_hatched_count),
      available_hens: String(hatch.available_hens ?? ''),
      available_roosters: String(hatch.available_roosters ?? ''),
      notes: hatch.notes || '',
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditValues({})
  }

  const handleInlineUpdate = async (id: string) => {
    try {
      const payload = {
        eggs_set_count: toNonNegativeInt(editValues.eggs_set_count),
        expected_hatch_count: toNonNegativeInt(editValues.expected_hatch_count),
        actual_hatched_count: parseOptionalInt(editValues.actual_hatched_count || ''),
        available_hens: toNonNegativeInt(editValues.available_hens),
        available_roosters: toNonNegativeInt(editValues.available_roosters),
        notes: editValues.notes || '',
      }

      const res = await fetch(`/api/admin/chickens/hatches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to update hatch')
      }

      toast({
        title: 'Oppdatert',
        description: 'Kull-raden ble oppdatert.',
      })

      handleCancelEdit()
      await fetchData()
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke oppdatere',
        variant: 'destructive',
      })
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/hatches/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error || 'Failed to deactivate hatch')
      }

      toast({
        title: 'Deaktivert',
        description: 'Raden er satt inaktiv.',
      })
      await fetchData()
    } catch (error: any) {
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke deaktivere',
        variant: 'destructive',
      })
    }
  }

  if (loading) {
    return <div className="py-8 text-center text-gray-500">Laster kull...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kyllingkull ({groupedBatches.length})</h3>
        <Button size="sm" onClick={() => setShowAddForm((prev) => !prev)}>
          <Plus className="w-4 h-4 mr-1" /> Nytt kull
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4 space-y-4">
          <h4 className="font-medium">Legg til nytt kull (flere raser samtidig)</h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Egg inn dato</Label>
              <Input
                type="date"
                value={newBatch.eggs_set_date}
                onChange={(e) => setNewBatch((prev) => ({ ...prev, eggs_set_date: e.target.value }))}
              />
            </div>

            <div className="md:col-span-2">
              <Label>Batch-notat</Label>
              <Input
                value={newBatch.notes}
                onChange={(e) => setNewBatch((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Valgfri notat for hele kullet"
              />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-neutral-50 border-b text-left text-neutral-600">
                  <th className="p-2">Rase</th>
                  <th className="p-2">Egg inn</th>
                  <th className="p-2">Est. klekk (50%)</th>
                  <th className="p-2">Faktisk klekket</th>
                </tr>
              </thead>
              <tbody>
                {activeBreeds.map((breed) => {
                  const draft = newBatch.lines[breed.id]
                  const eggsSetCount = toNonNegativeInt(draft?.eggs_set_count)
                  const expectedHatch = Math.round(eggsSetCount * 0.5)

                  return (
                    <tr key={breed.id} className="border-b last:border-0">
                      <td className="p-2">{breed.name}</td>
                      <td className="p-2 w-40">
                        <Input
                          type="number"
                          min={0}
                          value={draft?.eggs_set_count || ''}
                          onChange={(e) => updateDraftLine(breed.id, { eggs_set_count: e.target.value })}
                          placeholder="0"
                        />
                      </td>
                      <td className="p-2">
                        <span className="font-medium">{expectedHatch}</span>
                      </td>
                      <td className="p-2 w-44">
                        <Input
                          type="number"
                          min={0}
                          value={draft?.actual_hatched_count || ''}
                          onChange={(e) => updateDraftLine(breed.id, { actual_hatched_count: e.target.value })}
                          placeholder="Valgfritt"
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="text-sm text-neutral-600">
            Totalt egg inn: <span className="font-semibold">{createTotals.totalEggsSet}</span> | Estimert klekk: <span className="font-semibold">{createTotals.totalExpected}</span>
          </div>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleCreate}>
              <Save className="w-3 h-3 mr-1" /> Opprett kull
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setShowAddForm(false); resetNewBatchForm() }}>
              <X className="w-3 h-3 mr-1" /> Avbryt
            </Button>
          </div>
        </Card>
      )}

      {groupedBatches.length === 0 && (
        <Card className="p-6 text-center text-neutral-500">
          Ingen kyllingkull enda.
        </Card>
      )}

      {groupedBatches.map((group) => {
        const stage = batchStage(group.batch, group.rows)
        const totalEggsSet = group.rows.reduce((sum, row) => sum + toNonNegativeInt(row.eggs_set_count), 0)
        const totalExpected = group.rows.reduce((sum, row) => sum + toNonNegativeInt(row.expected_hatch_count), 0)
        const knownActualRows = group.rows.filter((row) => row.actual_hatched_count !== null)
        const totalActual = knownActualRows.reduce((sum, row) => sum + toNonNegativeInt(row.actual_hatched_count), 0)
        const hatchRate = totalEggsSet > 0 && knownActualRows.length > 0
          ? Math.round((totalActual / totalEggsSet) * 100)
          : null

        return (
          <Card key={group.key} className="p-4 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold">
                  {group.batch ? `Kull ${group.batch.batch_code}` : 'Legacy kull'}
                </h4>
                <p className="text-sm text-neutral-500">
                  {group.batch
                    ? `Egg inn ${formatDate(group.batch.eggs_set_date)}`
                    : `Klekkedato ${formatDate(group.rows[0]?.hatch_date)}`}
                </p>
              </div>
              <span className={`text-xs px-2 py-1 rounded ${stage.className}`}>
                {stage.label}
              </span>
            </div>

            {group.batch && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                <div className="rounded border p-2">
                  Dag 0: <span className="font-medium">{formatDate(group.batch.eggs_set_date)}</span>
                </div>
                <div className="rounded border p-2">
                  Dag 18 lockdown: <span className="font-medium">{formatDate(group.batch.lock_down_date)}</span>
                </div>
                <div className="rounded border p-2">
                  Dag 21 klekk: <span className="font-medium">{formatDate(group.batch.hatch_due_date)}</span>
                </div>
              </div>
            )}

            <div className="text-sm text-neutral-600">
              Egg inn: <span className="font-semibold">{totalEggsSet}</span> | Est. klekk: <span className="font-semibold">{totalExpected}</span> | Faktisk klekket: <span className="font-semibold">{totalActual}</span>
              {hatchRate !== null && <> | Klekkerate: <span className="font-semibold">{hatchRate}%</span></>}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="pb-2 pr-3">Rase</th>
                    <th className="pb-2 pr-3">Egg inn</th>
                    <th className="pb-2 pr-3">Est. klekk</th>
                    <th className="pb-2 pr-3">Faktisk klekket</th>
                    <th className="pb-2 pr-3">Tilgj. høner</th>
                    <th className="pb-2 pr-3">Tilgj. haner</th>
                    <th className="pb-2 pr-3">Alder nå</th>
                    <th className="pb-2 pr-3">Pris nå</th>
                    <th className="pb-2 pr-3">Status</th>
                    <th className="pb-2">Handlinger</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((hatch) => {
                    const breed = hatch.chicken_breeds
                    const ageWeeks = getAgeWeeks(hatch.hatch_date)
                    const price = breed
                      ? getHenPrice(
                          ageWeeks,
                          Number(breed.start_price_nok),
                          Number(breed.weekly_increase_nok),
                          Number(breed.adult_price_nok)
                        )
                      : 0
                    const isEditing = editingId === hatch.id

                    return (
                      <tr key={hatch.id} className="border-b last:border-0">
                        <td className="py-2 pr-3">{breed?.name || 'Ukjent'}</td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={editValues.eggs_set_count || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, eggs_set_count: e.target.value }))}
                            />
                          ) : (
                            hatch.eggs_set_count
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={editValues.expected_hatch_count || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, expected_hatch_count: e.target.value }))}
                            />
                          ) : (
                            hatch.expected_hatch_count
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={editValues.actual_hatched_count || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, actual_hatched_count: e.target.value }))}
                              placeholder="-"
                            />
                          ) : (
                            hatch.actual_hatched_count ?? '-'
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={editValues.available_hens || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, available_hens: e.target.value }))}
                            />
                          ) : (
                            hatch.available_hens
                          )}
                        </td>
                        <td className="py-2 pr-3">
                          {isEditing ? (
                            <Input
                              type="number"
                              className="w-24 h-8 text-sm"
                              value={editValues.available_roosters || ''}
                              onChange={(e) => setEditValues((prev) => ({ ...prev, available_roosters: e.target.value }))}
                            />
                          ) : (
                            hatch.available_roosters
                          )}
                        </td>
                        <td className="py-2 pr-3">{ageWeeks} uker</td>
                        <td className="py-2 pr-3">kr {price}</td>
                        <td className="py-2 pr-3">
                          {hatch.active ? (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Aktiv</span>
                          ) : (
                            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inaktiv</span>
                          )}
                        </td>
                        <td className="py-2">
                          {isEditing ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={() => handleInlineUpdate(hatch.id)}
                              >
                                <Save className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2"
                                onClick={handleCancelEdit}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs"
                                onClick={() => handleStartEdit(hatch)}
                              >
                                Rediger
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs text-red-600"
                                onClick={() => handleDeactivate(hatch.id)}
                              >
                                Deaktiver
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}
