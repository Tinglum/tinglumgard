'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Plus, Save, X, Edit2, Trash2 } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'

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
  const { t } = useLanguage()
  const cb = (t as any).admin.chickenBreeds
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
      toast({ title: cb.errorFetchTitle, description: cb.errorFetchDescription, variant: 'destructive' })
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
      toast({ title: cb.saveToastTitle, description: `${editing.name} ${isNew ? cb.saveToastCreated : cb.saveToastUpdated}` })
      setEditing(null)
      setIsNew(false)
      fetchBreeds()
    } catch {
      toast({ title: cb.errorSaveTitle, description: cb.errorSaveDescription, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/chickens/breeds/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed')
      toast({ title: cb.deactivateToastTitle, description: cb.deactivateToastDescription })
      fetchBreeds()
    } catch {
      toast({ title: cb.errorDeactivateTitle, description: cb.errorDeactivateDescription, variant: 'destructive' })
    }
  }

  if (loading) return <div className="py-8 text-center text-gray-500">{cb.loading}</div>

  if (editing) {
    return (
      <Card className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold">{isNew ? cb.newBreed : cb.editBreed.replace('{name}', editing.name || '')}</h3>
          <Button variant="ghost" size="sm" onClick={() => { setEditing(null); setIsNew(false) }}><X className="w-4 h-4" /></Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>{cb.labelName}</Label>
            <Input value={editing.name || ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </div>
          <div>
            <Label>{cb.labelSlug}</Label>
            <Input value={editing.slug || ''} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
          </div>
          <div>
            <Label>{cb.labelColor}</Label>
            <Input type="color" value={editing.accent_color || '#6B7280'} onChange={(e) => setEditing({ ...editing, accent_color: e.target.value })} />
          </div>
          <div>
            <Label>{cb.labelImageUrl}</Label>
            <Input value={editing.image_url || ''} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>{cb.labelDescriptionNo}</Label>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={2} value={editing.description_no || ''} onChange={(e) => setEditing({ ...editing, description_no: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <Label>{cb.labelDescriptionEn}</Label>
            <textarea className="w-full rounded-md border p-2 text-sm" rows={2} value={editing.description_en || ''} onChange={(e) => setEditing({ ...editing, description_en: e.target.value })} />
          </div>
          <div>
            <Label>{cb.labelStartPrice}</Label>
            <Input type="number" value={editing.start_price_nok || 0} onChange={(e) => setEditing({ ...editing, start_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelWeeklyIncrease}</Label>
            <Input type="number" value={editing.weekly_increase_nok || 0} onChange={(e) => setEditing({ ...editing, weekly_increase_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelAdultPrice}</Label>
            <Input type="number" value={editing.adult_price_nok || 0} onChange={(e) => setEditing({ ...editing, adult_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelRoosterPrice}</Label>
            <Input type="number" value={editing.rooster_price_nok || 250} onChange={(e) => setEditing({ ...editing, rooster_price_nok: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelMortalityEarly}</Label>
            <Input type="number" step="0.1" value={editing.mortality_rate_early_pct || 5} onChange={(e) => setEditing({ ...editing, mortality_rate_early_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelMortalityLate}</Label>
            <Input type="number" step="0.1" value={editing.mortality_rate_late_pct || 2} onChange={(e) => setEditing({ ...editing, mortality_rate_late_pct: Number(e.target.value) })} />
          </div>
          <div>
            <Label>{cb.labelDisplayOrder}</Label>
            <Input type="number" value={editing.display_order || 0} onChange={(e) => setEditing({ ...editing, display_order: Number(e.target.value) })} />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editing.sell_roosters || false} onChange={(e) => setEditing({ ...editing, sell_roosters: e.target.checked })} />
              <span className="text-sm">{cb.checkboxSellRoosters}</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={editing.active !== false} onChange={(e) => setEditing({ ...editing, active: e.target.checked })} />
              <span className="text-sm">{cb.checkboxActive}</span>
            </label>
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <Button onClick={handleSave}><Save className="w-4 h-4 mr-1" /> {t.common.save}</Button>
          <Button variant="outline" onClick={() => { setEditing(null); setIsNew(false) }}>{t.common.cancel}</Button>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">{cb.title} ({breeds.length})</h3>
        <Button size="sm" onClick={() => { setEditing({ ...emptyBreed }); setIsNew(true) }}>
          <Plus className="w-4 h-4 mr-1" /> {cb.newBreed}
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {breeds.map((breed) => (
          <Card key={breed.id} className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: breed.accent_color }} />
              <span className="font-medium">{breed.name}</span>
              {!breed.active && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">{cb.badgeInactive}</span>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <p>{cb.labelStartPrice.replace(' (kr)', '')}: kr {breed.start_price_nok} | {cb.labelAdultPrice.replace(' (kr)', '')}: kr {breed.adult_price_nok}</p>
              <p>{cb.labelWeeklyIncrease.replace(' (kr)', '')}: +{breed.weekly_increase_nok} kr/{t.common.week}</p>
              <p>{cb.labelMortalityEarly.split(' %')[0]}: {breed.mortality_rate_early_pct}% / {breed.mortality_rate_late_pct}%</p>
              {breed.sell_roosters && <p className="text-amber-600">{cb.labelRoosterPrice.replace(' (kr)', '')}: kr {breed.rooster_price_nok}</p>}
            </div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(breed); setIsNew(false) }}>
                <Edit2 className="w-3 h-3 mr-1" /> {cb.buttonEdit}
              </Button>
              <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleDelete(breed.id)}>
                <Trash2 className="w-3 h-3 mr-1" /> {cb.buttonDeactivate}
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
