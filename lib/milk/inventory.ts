import { supabaseAdmin } from '@/lib/supabase/server'
import type { DairyProductionBatch } from './types'

export async function getAgingInventory(): Promise<(DairyProductionBatch & { days_aging: number; recipe_name?: string })[]> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('*, dairy_recipes(name)')
    .eq('status', 'aging')
    .order('aging_start', { ascending: true })

  if (error) return []

  const today = new Date()
  return (data || []).map((item: any) => {
    const agingStart = item.aging_start ? new Date(item.aging_start) : new Date(item.started_at)
    const daysAging = Math.floor((today.getTime() - agingStart.getTime()) / (1000 * 60 * 60 * 24))
    return {
      ...item,
      days_aging: Math.max(0, daysAging),
      recipe_name: item.dairy_recipes?.name || undefined,
      dairy_recipes: undefined,
    }
  })
}

export async function getReadyInventory(): Promise<(DairyProductionBatch & { recipe_name?: string })[]> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('*, dairy_recipes(name)')
    .eq('status', 'ready')
    .order('completed_at', { ascending: false })

  if (error) return []
  return (data || []).map((item: any) => ({
    ...item,
    recipe_name: item.dairy_recipes?.name || undefined,
    dairy_recipes: undefined,
  }))
}

export async function getInventoryHistory(limit = 50): Promise<(DairyProductionBatch & { recipe_name?: string })[]> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('*, dairy_recipes(name)')
    .in('status', ['consumed', 'sold', 'discarded'])
    .order('updated_at', { ascending: false })
    .limit(limit)

  if (error) return []
  return (data || []).map((item: any) => ({
    ...item,
    recipe_name: item.dairy_recipes?.name || undefined,
    dairy_recipes: undefined,
  }))
}
