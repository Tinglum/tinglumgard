'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, Timer, CheckCircle2, Archive, AlertTriangle } from 'lucide-react'

const TYPE_EMOJI: Record<string, string> = {
  cheese: '🧀', yoghurt: '🥛', butter: '🧈', cream: '🍦', kefir: '🥤', skyr: '🥣', other: '🍶',
}

interface AgingItem {
  id: string; batch_code: string; product_type: string; days_aging: number
  aging_target_date: string | null; aging_location: string | null
  yield_kg: number | null; quality_score: number | null; recipe_name?: string
}

interface ReadyItem {
  id: string; batch_code: string; product_type: string
  yield_kg: number | null; quality_score: number | null
  completed_at: string | null; recipe_name?: string
}

interface HistoryItem {
  id: string; batch_code: string; product_type: string; status: string
  yield_kg: number | null; quality_score: number | null; recipe_name?: string
  consumed_at?: string; sold_at?: string; sold_price_nok?: number; sold_to?: string
}

type Tab = 'aging' | 'ready' | 'history'

interface Props { lang: string }

export function InventoryAging({ lang }: Props) {
  const [tab, setTab] = useState<Tab>('aging')
  const [aging, setAging] = useState<AgingItem[]>([])
  const [ready, setReady] = useState<ReadyItem[]>([])
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    const [aRes, rRes, hRes] = await Promise.all([
      fetch('/api/milk/inventory/aging'),
      fetch('/api/milk/inventory/ready'),
      fetch('/api/milk/inventory/history'),
    ])
    if (aRes.ok) { const d = await aRes.json(); setAging(d.items || []) }
    if (rRes.ok) { const d = await rRes.json(); setReady(d.items || []) }
    if (hRes.ok) { const d = await hRes.json(); setHistory(d.items || []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  const tabs: { id: Tab; label: string; count: number; icon: typeof Timer }[] = [
    { id: 'aging', label: lang === 'no' ? 'Modner' : 'Aging', count: aging.length, icon: Timer },
    { id: 'ready', label: lang === 'no' ? 'Klar' : 'Ready', count: ready.length, icon: CheckCircle2 },
    { id: 'history', label: lang === 'no' ? 'Historikk' : 'History', count: history.length, icon: Archive },
  ]

  return (
    <div className="space-y-4 mt-4">
      {/* Sub-tabs */}
      <div className="flex gap-1">
        {tabs.map((t) => {
          const Icon = t.icon
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={cn('flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                tab === t.id ? 'bg-neutral-900 text-white' : 'text-neutral-600 hover:bg-neutral-200')}>
              <Icon className="w-3.5 h-3.5" /> {t.label} ({t.count})
            </button>
          )
        })}
      </div>

      {/* Aging */}
      {tab === 'aging' && (
        aging.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-8">{lang === 'no' ? 'Ingenting modner nå' : 'Nothing aging right now'}</p>
        ) : (
          <div className="space-y-2">
            {aging.map((item) => {
              const targetDate = item.aging_target_date ? new Date(item.aging_target_date) : null
              const daysLeft = targetDate ? Math.ceil((targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null
              const isNearTarget = daysLeft !== null && daysLeft <= 7
              const isPast = daysLeft !== null && daysLeft <= 0

              return (
                <div key={item.id} className={cn('rounded-xl border p-4',
                  isPast ? 'border-green-300 bg-green-50' : isNearTarget ? 'border-amber-300 bg-amber-50' : 'border-neutral-200 bg-white')}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{TYPE_EMOJI[item.product_type] || '🍶'}</span>
                      <div>
                        <div className="text-sm font-medium text-neutral-900">{item.batch_code}</div>
                        {item.recipe_name && <div className="text-[11px] text-neutral-400">{item.recipe_name}</div>}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={cn('text-lg font-bold tabular-nums', isPast ? 'text-green-600' : isNearTarget ? 'text-amber-600' : 'text-neutral-900')}>
                        {item.days_aging}d
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {lang === 'no' ? 'modning' : 'aging'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-500">
                    {item.aging_location && <span>📍 {item.aging_location}</span>}
                    {item.yield_kg && <span>⚖️ {item.yield_kg} kg</span>}
                    {daysLeft !== null && (
                      <span className={cn(isPast ? 'text-green-600 font-medium' : isNearTarget ? 'text-amber-600' : '')}>
                        {isPast
                          ? (lang === 'no' ? '✓ Klar!' : '✓ Ready!')
                          : `${daysLeft}d ${lang === 'no' ? 'igjen' : 'left'}`}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )
      )}

      {/* Ready */}
      {tab === 'ready' && (
        ready.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-8">{lang === 'no' ? 'Ingen klare produkter' : 'No ready items'}</p>
        ) : (
          <div className="space-y-2">
            {ready.map((item) => (
              <div key={item.id} className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{TYPE_EMOJI[item.product_type] || '🍶'}</span>
                  <div>
                    <div className="text-sm font-medium text-neutral-900">{item.batch_code}</div>
                    {item.recipe_name && <div className="text-[11px] text-neutral-400">{item.recipe_name}</div>}
                  </div>
                </div>
                <div className="text-right">
                  {item.yield_kg && <div className="text-sm font-semibold">{item.yield_kg} kg</div>}
                  {item.quality_score && <div className="text-xs text-amber-600">★ {item.quality_score}/10</div>}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* History */}
      {tab === 'history' && (
        history.length === 0 ? (
          <p className="text-center text-sm text-neutral-400 py-8">{lang === 'no' ? 'Ingen historikk' : 'No history'}</p>
        ) : (
          <div className="space-y-2">
            {history.map((item) => (
              <div key={item.id} className="rounded-lg border border-neutral-100 bg-neutral-50 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>{TYPE_EMOJI[item.product_type] || '🍶'}</span>
                  <div>
                    <span className="text-xs font-mono text-neutral-500">{item.batch_code}</span>
                    {item.recipe_name && <span className="text-[11px] text-neutral-400 ml-2">{item.recipe_name}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  {item.sold_price_nok && <span className="text-purple-600">{item.sold_price_nok / 100} kr</span>}
                  {item.quality_score && <span className="text-amber-600">★{item.quality_score}</span>}
                  <span className={cn('px-2 py-0.5 rounded-full font-medium',
                    item.status === 'consumed' ? 'bg-neutral-200 text-neutral-600' :
                    item.status === 'sold' ? 'bg-purple-100 text-purple-700' : 'bg-red-100 text-red-600')}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
