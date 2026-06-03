'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  Droplets, Flame, FlaskConical, Wine, Refrigerator, Trash2,
  Plus, ChevronRight, Loader2, AlertTriangle,
} from 'lucide-react'
import type { MilkBatch, PipelineStatus } from '@/lib/milk/types'
import { PIPELINE_ORDER } from '@/lib/milk/types'

const STATUS_CONFIG: Record<PipelineStatus, { icon: typeof Droplets; color: string; bg: string; labelNo: string; labelEn: string }> = {
  raw:          { icon: Droplets,     color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200',    labelNo: 'Rå melk',       labelEn: 'Raw milk' },
  pasteurizing: { icon: Flame,        color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200', labelNo: 'Pasteuriserer', labelEn: 'Pasteurizing' },
  pasteurized:  { icon: FlaskConical, color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200',  labelNo: 'Pasteurisert',  labelEn: 'Pasteurized' },
  bottling:     { icon: Wine,         color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200', labelNo: 'Tapper',        labelEn: 'Bottling' },
  bottled:      { icon: Wine,         color: 'text-indigo-600', bg: 'bg-indigo-50 border-indigo-200', labelNo: 'Tappet',        labelEn: 'Bottled' },
  fridged:      { icon: Refrigerator, color: 'text-cyan-600',   bg: 'bg-cyan-50 border-cyan-200',    labelNo: 'I kjøleskap',   labelEn: 'In fridge' },
  allocated:    { icon: ChevronRight, color: 'text-green-600',  bg: 'bg-green-50 border-green-200',  labelNo: 'Brukt',         labelEn: 'Allocated' },
  discarded:    { icon: Trash2,       color: 'text-red-600',    bg: 'bg-red-50 border-red-200',      labelNo: 'Kassert',       labelEn: 'Discarded' },
}

interface Props {
  lang: string
  date: string
}

export function MilkPipeline({ lang, date }: Props) {
  const [batches, setBatches] = useState<MilkBatch[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newLiters, setNewLiters] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchBatches = useCallback(async () => {
    setLoading(true)
    try {
      const active = PIPELINE_ORDER.join(',')
      const res = await fetch(`/api/milk/batches?status=${active}&limit=50`)
      if (res.ok) {
        const { batches: data } = await res.json()
        setBatches(data || [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchBatches() }, [fetchBatches])

  const handleCreate = async () => {
    const liters = parseFloat(newLiters)
    if (!liters || liters <= 0) return
    setCreating(true)
    try {
      const res = await fetch('/api/milk/batches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_date: date, liters_raw: liters }),
      })
      if (res.ok) {
        setNewLiters('')
        setShowCreate(false)
        await fetchBatches()
      }
    } finally {
      setCreating(false)
    }
  }

  const handleAdvance = async (batchId: string, extras?: Record<string, unknown>) => {
    const res = await fetch(`/api/milk/batches/${batchId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(extras || {}),
    })
    if (res.ok) await fetchBatches()
  }

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>
  }

  const grouped = PIPELINE_ORDER.map((status) => ({
    status,
    config: STATUS_CONFIG[status],
    items: batches.filter((b) => b.pipeline_status === status),
  }))

  return (
    <div className="space-y-4 mt-4">
      {/* Create batch button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800"
        >
          <Plus className="w-3.5 h-3.5" />
          {lang === 'no' ? 'Nytt parti' : 'New batch'}
        </button>
      </div>

      {showCreate && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4 space-y-3">
          <label className="text-xs text-neutral-500">{lang === 'no' ? 'Liter rå melk' : 'Liters raw milk'}</label>
          <input
            type="number" inputMode="decimal" step="0.1" min="0.1"
            value={newLiters} onChange={(e) => setNewLiters(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/20"
            placeholder="0.0" autoFocus
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="flex-1 py-2 rounded-lg border border-neutral-200 text-sm">
              {lang === 'no' ? 'Avbryt' : 'Cancel'}
            </button>
            <button onClick={handleCreate} disabled={creating || !newLiters}
              className="flex-1 py-2 rounded-lg bg-neutral-900 text-white text-sm font-medium disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : lang === 'no' ? 'Opprett' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Pipeline columns */}
      {grouped.map(({ status, config, items }) => {
        if (items.length === 0 && !['raw', 'pasteurized', 'bottled', 'fridged'].includes(status)) return null
        const Icon = config.icon
        return (
          <div key={status} className={cn('rounded-xl border p-4', config.bg)}>
            <div className="flex items-center gap-2 mb-3">
              <Icon className={cn('w-4 h-4', config.color)} />
              <span className={cn('text-sm font-medium', config.color)}>
                {lang === 'no' ? config.labelNo : config.labelEn}
              </span>
              <span className="text-xs text-neutral-400 ml-auto">{items.length}</span>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-neutral-400 italic">{lang === 'no' ? 'Ingen' : 'None'}</p>
            ) : (
              <div className="space-y-2">
                {items.map((batch) => (
                  <div key={batch.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-neutral-100">
                    <div>
                      <div className="text-xs font-mono text-neutral-500">{batch.batch_code}</div>
                      <div className="text-sm font-semibold tabular-nums">{Number(batch.liters_raw).toFixed(1)} L</div>
                      {batch.bottle_count && (
                        <div className="text-[11px] text-neutral-400">{batch.bottle_count} × {batch.bottle_size_ml || 1000}ml</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {status !== 'fridged' && (
                        <button
                          onClick={() => handleAdvance(batch.id)}
                          className="p-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 transition-colors"
                          title={lang === 'no' ? 'Neste steg' : 'Next step'}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleAdvance(batch.id, { discard_reason: 'Manually discarded' })}
                        className="p-1.5 rounded-lg hover:bg-red-100 transition-colors"
                        title={lang === 'no' ? 'Kasser' : 'Discard'}
                      >
                        <Trash2 className="w-3.5 h-3.5 text-red-400" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
