'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Save, X } from 'lucide-react'
import { getAgeWeeks, getHenPrice, getEstimatedSurvivors } from '@/lib/chickens/pricing'

interface Hatch {
  id: string
  breed_id: string
  hatch_date: string
  initial_count: number
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
    mortality_rate_early_pct: number
    mortality_rate_late_pct: number
  }
}

interface Breed {
  id: string
  name: string
  slug: string
}

export function ChickenHatchManager() {
  const { toast } = useToast()
  const [hatches, setHatches] = useState<Hatch[]>([])
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})
  const [newHatch, setNewHatch] = useState({
    breed_id: '', hatch_date: '', initial_count: 0,
    estimated_hens: 0, estimated_roosters: 0, notes: '',
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [hatchRes, breedRes] = await Promise.all([
        fetch('/api/admin/chickens/hatches'),
        fetch('/api/admin/chickens/breeds'),
      ])
      if (hatchRes.ok) setHatches(await hatchRes.json())
      if (breedRes.ok) setBreeds(await breedRes.json())
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke hente data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/admin/chickens/hatches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newHatch,
          available_hens: newHatch.estimated_hens,
          available_roosters: newHatch.estimated_roosters,
        }),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Opprettet', description: 'Nytt kull lagt til' })
      setShowAddForm(false)
      setNewHatch({ breed_id: '', hatch_date: '', initial_count: 0, estimated_hens: 0, estimated_roosters: 0, notes: '' })
      fetchData()
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke opprette kull', variant: 'destructive' })
    }
  }

  const handleInlineUpdate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/hatches/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editValues),
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Oppdatert' })
      setEditingId(null)
      setEditValues({})
      fetchData()
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke oppdatere', variant: 'destructive' })
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/hatches/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Deaktivert' })
      fetchData()
    } catch {
      toast({ title: 'Feil', variant: 'destructive' })
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Laster kull...</div>

  // Group hatches by breed
  const grouped = new Map<string, Hatch[]>()
  for (const hatch of hatches) {
    const key = hatch.chicken_breeds?.name || 'Ukjent'
    const list = grouped.get(key) || []
    list.push(hatch)
    grouped.set(key, list)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kyllingkull ({hatches.length})</h3>
        <Button size="sm" onClick={() => setShowAddForm(!showAddForm)}>
          <Plus className="w-4 h-4 mr-1" /> Nytt kull
        </Button>
      </div>

      {showAddForm && (
        <Card className="p-4">
          <h4 className="font-medium mb-3">Legg til nytt kull</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label>Rase</Label>
              <select className="w-full rounded-md border p-2 text-sm" value={newHatch.breed_id}
                onChange={(e) => setNewHatch({ ...newHatch, breed_id: e.target.value })}>
                <option value="">Velg rase...</option>
                {breeds.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <Label>Klekkedato</Label>
              <Input type="date" value={newHatch.hatch_date} onChange={(e) => setNewHatch({ ...newHatch, hatch_date: e.target.value })} />
            </div>
            <div>
              <Label>Antall</Label>
              <Input type="number" value={newHatch.initial_count || ''} onChange={(e) => {
                const count = Number(e.target.value)
                setNewHatch({ ...newHatch, initial_count: count, estimated_hens: Math.round(count * 0.5), estimated_roosters: Math.round(count * 0.5) })
              }} />
            </div>
            <div>
              <Label>Est. honer</Label>
              <Input type="number" value={newHatch.estimated_hens || ''} onChange={(e) => setNewHatch({ ...newHatch, estimated_hens: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Est. haner</Label>
              <Input type="number" value={newHatch.estimated_roosters || ''} onChange={(e) => setNewHatch({ ...newHatch, estimated_roosters: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Notater</Label>
              <Input value={newHatch.notes} onChange={(e) => setNewHatch({ ...newHatch, notes: e.target.value })} />
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={handleCreate}><Save className="w-3 h-3 mr-1" /> Opprett</Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)}><X className="w-3 h-3 mr-1" /> Avbryt</Button>
          </div>
        </Card>
      )}

      {Array.from(grouped.entries()).map(([breedName, breedHatches]) => (
        <Card key={breedName} className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: breedHatches[0]?.chicken_breeds?.accent_color || '#ccc' }} />
            <h4 className="font-medium">{breedName}</h4>
            <span className="text-xs text-gray-500">({breedHatches.length} kull)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2 pr-3">Klekkedato</th>
                  <th className="pb-2 pr-3">Antall</th>
                  <th className="pb-2 pr-3">Alder</th>
                  <th className="pb-2 pr-3">Pris naa</th>
                  <th className="pb-2 pr-3">Tilgj. honer</th>
                  <th className="pb-2 pr-3">Est. overlevende</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2">Handlinger</th>
                </tr>
              </thead>
              <tbody>
                {breedHatches.map((hatch) => {
                  const breed = hatch.chicken_breeds
                  const ageWeeks = getAgeWeeks(hatch.hatch_date)
                  const price = breed ? getHenPrice(ageWeeks, breed.start_price_nok, breed.weekly_increase_nok, breed.adult_price_nok) : 0
                  const survivors = breed ? getEstimatedSurvivors(hatch.initial_count, ageWeeks, breed.mortality_rate_early_pct, breed.mortality_rate_late_pct) : 0
                  const isEditing = editingId === hatch.id

                  return (
                    <tr key={hatch.id} className="border-b last:border-0">
                      <td className="py-2 pr-3">{hatch.hatch_date}</td>
                      <td className="py-2 pr-3">{hatch.initial_count}</td>
                      <td className="py-2 pr-3">{ageWeeks} uker</td>
                      <td className="py-2 pr-3">kr {price}</td>
                      <td className="py-2 pr-3">
                        {isEditing ? (
                          <Input type="number" className="w-20 h-7 text-sm" value={editValues.available_hens ?? hatch.available_hens}
                            onChange={(e) => setEditValues({ ...editValues, available_hens: Number(e.target.value) })} />
                        ) : (
                          <span className={hatch.available_hens === 0 ? 'text-red-600' : ''}>{hatch.available_hens}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-gray-500">{survivors}</td>
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
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => handleInlineUpdate(hatch.id)}>
                              <Save className="w-3 h-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditingId(null); setEditValues({}) }}>
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs"
                              onClick={() => { setEditingId(hatch.id); setEditValues({ available_hens: hatch.available_hens }) }}>
                              Rediger
                            </Button>
                            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-600"
                              onClick={() => handleDeactivate(hatch.id)}>
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
      ))}
    </div>
  )
}
