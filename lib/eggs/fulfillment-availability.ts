import { supabaseAdmin } from '@/lib/supabase/server'

export type FulfillmentStockSource = 'actual_collected' | 'inventory_fallback'

export interface FulfillmentAvailability {
  breedId: string
  inventoryId: string | null
  eggsAllocated: number
  inventoryRemaining: number
  actualCollected: number | null
  collectionDaysRecorded: number
  remaining: number
  source: FulfillmentStockSource
  collectionStart: string | null
  collectionEnd: string | null
}

function shiftIsoDate(dateString: string, dayDelta: number): string {
  const date = new Date(`${dateString}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + dayDelta)
  return date.toISOString().slice(0, 10)
}

function getCollectionWindow(deliveryMonday: string | null | undefined) {
  if (!deliveryMonday) return null
  return {
    start: shiftIsoDate(deliveryMonday, -7),
    end: shiftIsoDate(deliveryMonday, -1),
  }
}

export async function getFulfillmentAvailabilityByBreed(params: {
  breedIds: string[]
  year: number
  weekNumber: number
  deliveryMonday?: string | null
}): Promise<Map<string, FulfillmentAvailability>> {
  const uniqueBreedIds = Array.from(
    new Set(
      (params.breedIds || [])
        .map((breedId) => String(breedId || '').trim())
        .filter(Boolean)
    )
  )

  if (uniqueBreedIds.length === 0) {
    return new Map()
  }

  const { data: inventoryRows, error: inventoryError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, breed_id, eggs_available, eggs_allocated, eggs_remaining')
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)
    .in('breed_id', uniqueBreedIds)

  if (inventoryError) {
    throw inventoryError
  }

  const inventoryByBreed = new Map(
    (inventoryRows || []).map((row) => [String(row.breed_id), row])
  )

  const collectionWindow = getCollectionWindow(params.deliveryMonday)
  const collectedByBreed = new Map<string, { total: number; days: Set<string> }>()

  if (collectionWindow) {
    const { data: collectionRows, error: collectionError } = await supabaseAdmin
      .from('egg_daily_collections')
      .select('breed_id, collection_date, sellable_standard')
      .in('breed_id', uniqueBreedIds)
      .gte('collection_date', collectionWindow.start)
      .lte('collection_date', collectionWindow.end)

    if (collectionError) {
      throw collectionError
    }

    for (const row of collectionRows || []) {
      const breedId = String(row.breed_id || '')
      const existing = collectedByBreed.get(breedId) || { total: 0, days: new Set<string>() }
      existing.total += Number(row.sellable_standard || 0)
      if (row.collection_date) {
        existing.days.add(String(row.collection_date))
      }
      collectedByBreed.set(breedId, existing)
    }
  }

  const entries = uniqueBreedIds.map((breedId) => {
    const inventory = inventoryByBreed.get(breedId)
    const eggsAllocated = Number(inventory?.eggs_allocated || 0)
    const inventoryRemaining = Math.max(
      0,
      inventory?.eggs_remaining !== null && inventory?.eggs_remaining !== undefined
        ? Number(inventory.eggs_remaining || 0)
        : Number(inventory?.eggs_available || 0) - eggsAllocated
    )

    const collected = collectedByBreed.get(breedId)
    const actualCollected = collected ? collected.total : null
    const remaining =
      actualCollected !== null
        ? Math.max(0, actualCollected - eggsAllocated)
        : inventoryRemaining

    return [
      breedId,
      {
        breedId,
        inventoryId: inventory?.id || null,
        eggsAllocated,
        inventoryRemaining,
        actualCollected,
        collectionDaysRecorded: collected?.days.size || 0,
        remaining,
        source: actualCollected !== null ? 'actual_collected' : 'inventory_fallback',
        collectionStart: collectionWindow?.start || null,
        collectionEnd: collectionWindow?.end || null,
      } satisfies FulfillmentAvailability,
    ] as const
  })

  return new Map(entries)
}
