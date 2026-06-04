'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Plus, Loader2, ChefHat, Star, Clock, Beaker, ChevronDown, ChevronUp } from 'lucide-react'
import type { DairyProductionBatch, ProductType, DairyRecipe, ProductionStatus } from '@/lib/milk/types'
import { PRODUCT_TYPES, PRODUCTION_TRANSITIONS, getProductTypeConfig } from '@/lib/milk/types'

const STATUS_COLORS: Record<string, string> = {
  in_progress: 'bg-blue-100 text-blue-700',
  aging: 'bg-amber-100 text-amber-700',
  ready: 'bg-green-100 text-green-700',
  consumed: 'bg-neutral-100 text-neutral-600',
  sold: 'bg-purple-100 text-purple-700',
  discarded: 'bg-red-100 text-red-600',
}

const STATUS_LABELS_NO: Record<string, string> = {
  in_progress: 'Pågår',
  aging: 'Modner',
  ready: 'Klar',
  consumed: 'Brukt',
  sold: 'Solgt',
  discarded: 'Kassert',
}

const STATUS_LABELS_EN: Record<string, string> = {
  in_progress: 'In progress',
  aging: 'Aging',
  ready: 'Ready',
  consumed: 'Consumed',
  sold: 'Sold',
  discarded: 'Discarded',
}

interface Props { lang: string }

export function DairyProduction({ lang }: Props) {
  const [batches, setBatches] = useState<DairyProductionBatch[]>([])
  const [recipes, setRecipes] = useState<DairyRecipe[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)

  // Create form
  const [formType, setFormType] = useState<ProductType>('fresh_cheese')
  const [formRecipe, setFormRecipe] = useState('')
  const [formLiters, setFormLiters] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [bRes, rRes] = await Promise.all([
      fetch('/api/milk/production?limit=50'),
      fetch('/api/milk/recipes'),
    ])
    if (bRes.ok) { const d = await bRes.json(); setBatches(d.batches || []) }
    if (rRes.ok) { const d = await rRes.json(); setRecipes(d.recipes || []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleCreate = async () => {
    const liters = parseFloat(formLiters)
    if (!liters || liters <= 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/milk/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_type: formType,
          recipe_id: formRecipe || undefined,
          milk_liters_used: liters,
        }),
      })
      if (res.ok) { setShowCreate(false); setFormLiters(''); await fetchData() }
    } finally { setCreating(false) }
  }

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/milk/production/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    await fetchData()
  }

  const handleLogEntry = async (id: string, step: string, notes: string) => {
    await fetch(`/api/milk/production/${id}/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step, notes }),
    })
    await fetchData()
  }

  const handleYield = async (id: string, yieldKg: number) => {
    await fetch(`/api/milk/production/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ yield_kg: yieldKg }),
    })
    await fetchData()
  }

  const handleTaste = async (id: string, score: number, notes: string) => {
    await fetch(`/api/milk/production/${id}/taste`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quality_score: score, tasting_notes: notes }),
    })
    await fetchData()
  }

  const getTypeLabel = (type: ProductType) => {
    const cfg = getProductTypeConfig(type)
    return lang === 'no' ? cfg.labelNo : cfg.labelEn
  }

  const getTypeEmoji = (type: ProductType) => {
    return getProductTypeConfig(type).emoji
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  const active = batches.filter((b) => ['in_progress', 'aging', 'ready'].includes(b.status))
  const done = batches.filter((b) => ['consumed', 'sold', 'discarded'].includes(b.status))

  return (
    <div className="space-y-4 mt-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-medium text-neutral-900">
          {lang === 'no' ? 'Aktive produksjoner' : 'Active productions'} ({active.length})
        </h2>
        <button onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800">
          <Plus className="w-3.5 h-3.5" />
          {lang === 'no' ? 'Ny produksjon' : 'New production'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Type' : 'Type'}</label>
              <select value={formType} onChange={(e) => setFormType(e.target.value as ProductType)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                {PRODUCT_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>{t.emoji} {lang === 'no' ? t.labelNo : t.labelEn}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-500">{lang === 'no' ? 'Oppskrift' : 'Recipe'}</label>
              <select value={formRecipe} onChange={(e) => setFormRecipe(e.target.value)}
                className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm">
                <option value="">{lang === 'no' ? 'Ingen' : 'None'}</option>
                {recipes.filter((r) => r.product_type === formType).map((r) => (
                  <option key={r.id} value={r.id}>{r.name} (v{r.version})</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-neutral-500">{lang === 'no' ? 'Liter melk brukt' : 'Liters milk used'}</label>
            <input type="number" inputMode="decimal" step="0.1" value={formLiters}
              onChange={(e) => setFormLiters(e.target.value)}
              className="mt-1 w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm" placeholder="0.0" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-neutral-200 text-sm">
              {lang === 'no' ? 'Avbryt' : 'Cancel'}
            </button>
            <button onClick={handleCreate} disabled={creating || !formLiters}
              className="flex-1 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : lang === 'no' ? 'Start' : 'Start'}
            </button>
          </div>
        </div>
      )}

      {/* Active batches */}
      {active.length === 0 ? (
        <p className="text-center text-sm text-neutral-400 py-8">{lang === 'no' ? 'Ingen aktive produksjoner' : 'No active productions'}</p>
      ) : (
        <div className="space-y-2">
          {active.map((batch) => {
            const isExpanded = expanded === batch.id
            const typeCfg = getProductTypeConfig(batch.product_type as ProductType)
            const transitions = PRODUCTION_TRANSITIONS[batch.status as ProductionStatus] || []
            // If the product type cannot age, filter out the 'aging' transition
            const filteredTransitions = typeCfg.canAge ? transitions : transitions.filter((t) => t !== 'aging')

            return (
              <div key={batch.id} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
                <button onClick={() => setExpanded(isExpanded ? null : batch.id)}
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-neutral-50">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{getTypeEmoji(batch.product_type as ProductType)}</span>
                    <div className="text-left">
                      <div className="text-sm font-medium text-neutral-900">{batch.batch_code}</div>
                      <div className="text-[11px] text-neutral-400">{batch.milk_liters_used} L — {getTypeLabel(batch.product_type as ProductType)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[batch.status])}>
                      {lang === 'no' ? STATUS_LABELS_NO[batch.status] : STATUS_LABELS_EN[batch.status]}
                    </span>
                    {batch.yield_percentage && (
                      <span className="text-xs text-neutral-500">{batch.yield_percentage}%</span>
                    )}
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-neutral-400" /> : <ChevronDown className="w-4 h-4 text-neutral-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-neutral-100 px-4 py-3 space-y-3">
                    {/* Status transition buttons (forward + revert) */}
                    <div className="flex flex-wrap gap-2">
                      {filteredTransitions.map((targetStatus) => {
                        const isRevert =
                          (batch.status === 'ready' && targetStatus === 'aging') ||
                          (batch.status === 'aging' && targetStatus === 'in_progress') ||
                          (batch.status === 'consumed' && targetStatus === 'ready') ||
                          (batch.status === 'sold' && targetStatus === 'ready') ||
                          (batch.status === 'discarded' && targetStatus === 'in_progress')
                        const label = lang === 'no' ? STATUS_LABELS_NO[targetStatus] : STATUS_LABELS_EN[targetStatus]
                        return (
                          <button
                            key={targetStatus}
                            onClick={() => handleStatusChange(batch.id, targetStatus)}
                            className={cn(
                              'text-xs px-3 py-1.5 rounded-lg transition-colors',
                              isRevert
                                ? 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 border border-neutral-200'
                                : cn(STATUS_COLORS[targetStatus], 'hover:opacity-80')
                            )}
                          >
                            {isRevert ? `← ${label}` : `→ ${label}`}
                          </button>
                        )
                      })}
                    </div>

                    {/* Yield input */}
                    <div className="flex items-center gap-2">
                      <Beaker className="w-4 h-4 text-neutral-400" />
                      <input type="number" inputMode="decimal" step="0.01" placeholder={lang === 'no' ? 'Utbytte (kg)' : 'Yield (kg)'}
                        defaultValue={batch.yield_kg || ''}
                        onBlur={(e) => { const v = parseFloat(e.target.value); if (v > 0) handleYield(batch.id, v) }}
                        className="flex-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-sm" />
                      {batch.yield_percentage && (
                        <span className="text-xs font-medium text-emerald-600">{batch.yield_percentage}%</span>
                      )}
                    </div>

                    {/* Quality + tasting */}
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4 text-neutral-400" />
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map((n) => (
                          <button key={n} onClick={() => handleTaste(batch.id, n, batch.tasting_notes || '')}
                            className={cn('w-6 h-6 rounded text-[10px] font-medium transition-colors',
                              n <= (batch.quality_score || 0) ? 'bg-amber-400 text-white' : 'bg-neutral-100 text-neutral-400 hover:bg-neutral-200')}>
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Process log */}
                    {batch.process_log && batch.process_log.length > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-xs text-neutral-500">
                          <Clock className="w-3 h-3" />
                          {lang === 'no' ? 'Prosesslogg' : 'Process log'}
                        </div>
                        {(batch.process_log as any[]).slice(-3).map((entry, i) => (
                          <div key={i} className="text-[11px] text-neutral-500 pl-4">
                            <span className="font-mono">{new Date(entry.timestamp).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}</span>
                            {' '}{entry.step}{entry.notes ? ` — ${entry.notes}` : ''}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Completed */}
      {done.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-xs text-neutral-500 uppercase tracking-wide">
            {lang === 'no' ? 'Avsluttet' : 'Completed'} ({done.length})
          </h3>
          {done.slice(0, 10).map((batch) => (
            <div key={batch.id} className="flex items-center justify-between rounded-lg border border-neutral-100 bg-neutral-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span>{getTypeEmoji(batch.product_type as ProductType)}</span>
                <span className="text-xs font-mono text-neutral-500">{batch.batch_code}</span>
                <span className="text-[11px] text-neutral-400">{getTypeLabel(batch.product_type as ProductType)}</span>
              </div>
              <div className="flex items-center gap-2">
                {batch.quality_score && <span className="text-xs text-amber-600">★{batch.quality_score}</span>}
                <span className={cn('text-[11px] px-2 py-0.5 rounded-full font-medium', STATUS_COLORS[batch.status])}>
                  {lang === 'no' ? STATUS_LABELS_NO[batch.status] : STATUS_LABELS_EN[batch.status]}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
