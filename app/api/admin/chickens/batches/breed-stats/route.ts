import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .select(`
        breed_id,
        eggs_set_count,
        actual_hatched_count,
        hatch_date,
        incubation_batch_id,
        chicken_breeds(name, slug, accent_color)
      `)
      .not('incubation_batch_id', 'is', null)
      .not('actual_hatched_count', 'is', null)
      .order('hatch_date', { ascending: false })

    if (error) {
      logError('admin-breed-stats-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const breedMap = new Map<string, {
      breed_id: string
      name: string
      slug: string
      accent_color: string
      batches: { eggs: number; hatched: number; date: string }[]
      total_eggs: number
      total_hatched: number
    }>()

    for (const row of data || []) {
      const breed = row.chicken_breeds as any
      if (!breed) continue

      let entry = breedMap.get(row.breed_id)
      if (!entry) {
        entry = {
          breed_id: row.breed_id,
          name: breed.name,
          slug: breed.slug,
          accent_color: breed.accent_color,
          batches: [],
          total_eggs: 0,
          total_hatched: 0,
        }
        breedMap.set(row.breed_id, entry)
      }

      const eggs = row.eggs_set_count || 0
      const hatched = row.actual_hatched_count || 0
      entry.batches.push({ eggs, hatched, date: row.hatch_date })
      entry.total_eggs += eggs
      entry.total_hatched += hatched
    }

    const stats = Array.from(breedMap.values()).map(entry => ({
      ...entry,
      avg_hatch_rate: entry.total_eggs > 0
        ? Math.round((entry.total_hatched / entry.total_eggs) * 100)
        : null,
      batch_count: entry.batches.length,
    }))

    return NextResponse.json(stats)
  } catch (error) {
    logError('admin-breed-stats-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
