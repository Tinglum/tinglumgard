'use client'

import { useCallback, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { Loader2, TrendingUp, Beaker, Star } from 'lucide-react'

interface DailyTrend { date: string; total_liters: number; morning: number; evening: number }
interface YieldRow { product_type: string; batch_count: number; avg_yield_pct: number; total_milk_used: number; total_yield_kg: number }
interface RecipeRow { recipe_id: string; recipe_name: string; product_type: string; batches_made: number; avg_quality: number | null; avg_yield_pct: number | null }

const TYPE_EMOJI: Record<string, string> = {
  cheese: '🧀', yoghurt: '🥛', butter: '🧈', cream: '🍦', kefir: '🥤', skyr: '🥣', other: '🍶',
}

interface Props { lang: string }

export function MilkAnalytics({ lang }: Props) {
  const [trends, setTrends] = useState<DailyTrend[]>([])
  const [yields, setYields] = useState<YieldRow[]>([])
  const [recipes, setRecipes] = useState<RecipeRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    const [tRes, yRes] = await Promise.all([
      fetch('/api/milk/analytics/trends?days=30'),
      fetch('/api/milk/analytics/yield'),
    ])
    if (tRes.ok) { const d = await tRes.json(); setTrends(d.trends || []); setRecipes(d.recipes || []) }
    if (yRes.ok) { const d = await yRes.json(); setYields(d.analysis || []) }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-neutral-400" /></div>

  const maxLiters = Math.max(...trends.map((t) => t.total_liters), 1)

  // Weekly summary
  const totalLast7 = trends.slice(-7).reduce((s, t) => s + t.total_liters, 0)
  const totalLast30 = trends.reduce((s, t) => s + t.total_liters, 0)
  const avgDaily = trends.length > 0 ? totalLast30 / trends.length : 0

  return (
    <div className="space-y-6 mt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-neutral-900 text-white px-3 py-3 text-center">
          <div className="text-lg font-semibold tabular-nums">{totalLast30.toFixed(1)} L</div>
          <div className="text-[11px] text-neutral-400">30 {lang === 'no' ? 'dager' : 'days'}</div>
        </div>
        <div className="rounded-xl bg-white border border-neutral-200 px-3 py-3 text-center">
          <div className="text-lg font-semibold tabular-nums">{totalLast7.toFixed(1)} L</div>
          <div className="text-[11px] text-neutral-500">7 {lang === 'no' ? 'dager' : 'days'}</div>
        </div>
        <div className="rounded-xl bg-white border border-neutral-200 px-3 py-3 text-center">
          <div className="text-lg font-semibold tabular-nums">{avgDaily.toFixed(1)} L</div>
          <div className="text-[11px] text-neutral-500">{lang === 'no' ? 'snitt/dag' : 'avg/day'}</div>
        </div>
      </div>

      {/* 30-day bar chart */}
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-4 h-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-neutral-900">
            {lang === 'no' ? 'Daglig produksjon (30 dager)' : 'Daily production (30 days)'}
          </h3>
        </div>
        {trends.length === 0 ? (
          <p className="text-sm text-neutral-400 text-center py-4">{lang === 'no' ? 'Ingen data ennå' : 'No data yet'}</p>
        ) : (
          <div className="flex items-end gap-[2px] h-32">
            {trends.map((day) => {
              const morningPct = (day.morning / maxLiters) * 100
              const eveningPct = (day.evening / maxLiters) * 100
              const totalPct = (day.total_liters / maxLiters) * 100
              return (
                <div key={day.date} className="flex-1 flex flex-col justify-end h-full group relative" title={`${day.date}: ${day.total_liters} L`}>
                  <div className="flex flex-col justify-end h-full">
                    <div className="bg-amber-300 rounded-t-sm" style={{ height: `${eveningPct}%` }} />
                    <div className="bg-amber-500 rounded-b-sm" style={{ height: `${morningPct}%` }} />
                  </div>
                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-neutral-900 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap">
                      {day.total_liters.toFixed(1)} L
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <div className="flex items-center gap-4 mt-2 text-[10px] text-neutral-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-500" />{lang === 'no' ? 'Morgen' : 'Morning'}</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-amber-300" />{lang === 'no' ? 'Kveld' : 'Evening'}</span>
        </div>
      </div>

      {/* Yield analysis */}
      {yields.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Beaker className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-medium text-neutral-900">
              {lang === 'no' ? 'Utbytteanalyse' : 'Yield analysis'}
            </h3>
          </div>
          <div className="space-y-2">
            {yields.map((row) => (
              <div key={row.product_type} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{TYPE_EMOJI[row.product_type] || '🍶'}</span>
                  <span className="text-sm text-neutral-900 capitalize">{row.product_type}</span>
                  <span className="text-[11px] text-neutral-400">({row.batch_count}x)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <span className="text-neutral-500">{row.total_milk_used} L →</span>
                  <span className="font-medium">{row.total_yield_kg} kg</span>
                  <span className="text-emerald-600 font-medium">{row.avg_yield_pct}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe success rates */}
      {recipes.length > 0 && (
        <div className="rounded-xl border border-neutral-200 bg-white p-4">
          <div className="flex items-center gap-2 mb-3">
            <Star className="w-4 h-4 text-neutral-400" />
            <h3 className="text-sm font-medium text-neutral-900">
              {lang === 'no' ? 'Oppskrift-resultater' : 'Recipe results'}
            </h3>
          </div>
          <div className="space-y-2">
            {recipes.map((row) => (
              <div key={row.recipe_id} className="flex items-center justify-between py-1.5 border-b border-neutral-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span>{TYPE_EMOJI[row.product_type] || '🍶'}</span>
                  <span className="text-sm text-neutral-900">{row.recipe_name}</span>
                  <span className="text-[11px] text-neutral-400">({row.batches_made}x)</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  {row.avg_quality && <span className="text-amber-600">★ {row.avg_quality}</span>}
                  {row.avg_yield_pct && <span className="text-emerald-600">{row.avg_yield_pct}%</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
