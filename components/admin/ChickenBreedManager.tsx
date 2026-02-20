'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Save, X, Edit2, Trash2 } from 'lucide-react'

interface Breed {
  id: string
  name: string
  slug: string
  accent_color: string
  description_no: string
  description_en: string
  image_url: string
  start_price_nok: number
  weekly_increase_nok: number
  adult_price_nok: number
  rooster_price_nok: number
  sell_roosters: boolean
  mortality_rate_early_pct: number
  mortality_rate_late_pct: number
  active: boolean
  display_order: number
}

const emptyBreed: Partial<Breed> = {
  name: '', slug: '', accent_color: '#6B7280', description_no: '', description_en: '',
  image_url: '', start_price_nok: 0, weekly_increase_nok: 0, adult_price_nok: 0,
  rooster_price_nok: 250, sell_roosters: false, mortality_rate_early_pct: 5.0,
  mortality_rate_late_pct: 2.0, active: true, display_order: 0,
}

export function ChickenBreedManager() {
  const { toast } = useToast()
  const [breeds, setBreeds] = useState<Breed[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<Partial<Breed> | null>(null)
  const [isNew, setIsNew] = useState(false)

  const fetchBreeds = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/chickens/breeds')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setBreeds(data)
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke hente raser', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchBreeds() }, [])

  const handleSave = async () => {
    if (!editing) return
    try {
      const url = isNew ? '/api/admin/chickens/breeds' : `/api/admin/chickens/breeds/${editing.id}`
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      })
      if (!res.ok) throw new Error('Failed to save')
      toast({ title: 'Lagret', description: `${editing.name} ${isNew ? 'opprettet' : 'oppdatert'}` })
      setEditing(null)
      setIsNew(false)
      fetchBreeds()
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke lagre', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/breeds/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: 'Deaktivert', description: 'Rasen er deaktivert' })
      fetchBreeds()
    } catch {
      toast({ title: 'Feil', description: 'Kunne ikke deaktivere', variant: 'destructive' })
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-500">Laster raser...</div>

  if (editing) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">{isNew ? 'Ny rase' : `Rediger ${editing.name}`}</h3>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setIsNew(false) }}><X className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Navn</Label>
            <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label>Slug</Label>
            <Input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>
          <div>
            <Label>Farge</Label>
            <Input type="color" value={editing.accent_color || '#6B7280'} onChange={(e) => setEditing({ ...editing, accent_color: e.target.value })} />
          </div>
          <div>
            <Label>Bilde URL</Label>
            <Input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Beskrivelse (NO)</Label>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={2} value={editing.description_no || ''} onChange={(e) => setEditing({ ...editing, description_no: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>Description (EN)</Label>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={2} value={editing.description_en || ''} onChange={(e) => setEditing({ ...editing, description_en: e.target.value })} />
          </div>
          <div>
            <Label>Startpris (kr)</Label>
            <Input type="number" value={editing.start_price_nok || 0} onChange={(e) => setEditing({ ...editing, start_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Ukentlig okning (kr)</Label>
            <Input type="number" value={editing.weekly_increase_nok || 0} onChange={(e) => setEditing({ ...editing, weekly_increase_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Voksenpris (kr)</Label>
            <Input type="number" value={editing.adult_price_nok || 0} onChange={(e) => setEditing({ ...editing, adult_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Hanepris (kr)</Label>
            <Input type="number" value={editing.rooster_price_nok || 250} onChange={(e) => setEditing({ ...editing, rooster_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Dodelighet tidlig % (uke 0-4)</Label>
            <Input type="number" step="0.1" value={editing.mortality_rate_early_pct || 5} onChange={(e) => setEditing({ ...editing, mortality_rate_early_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Dodelighet sen % (uke 4+)</Label>
            <Input type="number" step="0.1" value={editing.mortality_rate_late_pct || 2} onChange={(e) => setEditing({ ...editing, mortality_rate_late_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>Rekkfolge</Label>
            <Input type="number" value={editing.display_order || 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editing.sell_roosters || false} onChange={(e) => setEditing({ ...editing, sell_roosters: e.target.checked })} />
              <span className="text-sm">Selg haner</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              <span className="text-sm">Aktiv</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> Lagre</Button>
          <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false) }}>Avbryt</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Kyllingraser ({breeds.length})</h3>
        <Button size="sm" onClick={() => { setEditing({ ...emptyBreed }); setIsNew(true) }}>
          <Plus className="w-4 h-4 mr-1" /> Ny rase
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds.map((breed) => (
          <Card key={breed.id} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: breed.accent_color }} />
              <span className="font-medium">{breed.name}</span>
              {!breed.active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Inaktiv</span>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>Kylling: kr {breed.start_price_nok} | Voksen: kr {breed.adult_price_nok}</p>
              <p>Okning: +{breed.weekly_increase_nok} kr/uke</p>
              <p>Dodelighet: {breed.mortality_rate_early_pct}% / {breed.mortality_rate_late_pct}%</p>
              {breed.sell_roosters && <p className="text-amber-600">Haner: kr {breed.rooster_price_nok}</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(breed); setIsNew(false) }}>
                <Edit2 className="w-3 h-3 mr-1" /> Rediger
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(breed.id)}>
                <Trash2 className="w-3 h-3 mr-1" /> Deaktiver
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
