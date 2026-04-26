import { getFulfillmentAvailabilityByBreed } from '@/lib/eggs/fulfillment-availability'
import { supabaseAdmin } from '@/lib/supabase/server'

export type AdminEggAvailabilitySource =
  | 'actual_collected'
  | 'inventory_fallback'
  | 'manual_override'

export interface AdminEggInventoryRow {
  id: string
  breed_id: string
  year: number
  week_number: number
  delivery_monday?: string | null
  eggs_available: number | null
  eggs_allocated: number | null
  eggs_remaining?: number | null
  status?: string | null
  manual_override?: boolean | null
  manual_adjustment?: number | null
  auto_forecast_eggs?: number | null
  egg_breeds?:
    | { id?: string | null; name?: string | null; price_per_egg?: number | null }
    | Array<{ id?: string | null; name?: string | null; price_per_egg?: number | null }>
    | null
}

export interface AdminEggAvailabilityRow {
  inventoryId: string
  breedId: string
  breedName: string
  remaining: number
  source: AdminEggAvailabilitySource
  actualCollected: number | null
  eggsAvailable: number
  eggsAllocated: number
  inventoryRemaining: number
  collectionDaysRecorded: number
  manualOverride: boolean
}

export interface EggOrderLikeForAdjustments {
  inventory_id?: string | null
  quantity?: number | null
  egg_order_additions?: Array<{
    inventory_id?: string | null
    quantity?: number | null
  }> | null
}

export interface EggOrderLineComponent {
  inventoryId: string
  breedId: string
  quantity: number
  pricePerEgg: number
  source: 'base' | 'addition'
  additionId?: string | null
}

export function getBreedNameFromRelation(
  value: AdminEggInventoryRow['egg_breeds'] | { name?: string | null } | Array<{ name?: string | null }> | null | undefined
): string {
  if (Array.isArray(value)) {
    return String(value[0]?.name || 'Rugeegg').trim() || 'Rugeegg'
  }
  return String((value as { name?: string | null } | null | undefined)?.name || 'Rugeegg').trim() || 'Rugeegg'
}

export async function fetchAdminEggWeekInventory(params: {
  year: number
  weekNumber: number
}): Promise<AdminEggInventoryRow[]> {
  const { data, error } = await supabaseAdmin
    .from('egg_inventory')
    .select(
      'id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, eggs_remaining, status, manual_override, manual_adjustment, auto_forecast_eggs, egg_breeds(id, name, price_per_egg)'
    )
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)

  if (error) {
    throw error
  }

  return (data || []) as AdminEggInventoryRow[]
}

export async function getAdminEggAvailabilityForInventoryRows(params: {
  inventoryRows: AdminEggInventoryRow[]
  year: number
  weekNumber: number
  deliveryMonday?: string | null
}): Promise<Map<string, AdminEggAvailabilityRow>> {
  const inventoryRows = (params.inventoryRows || []).filter((row) => row?.id && row?.breed_id)
  if (inventoryRows.length === 0) {
    return new Map()
  }

  const breedIds = Array.from(new Set(inventoryRows.map((row) => String(row.breed_id))))
  const fulfillmentAvailability = await getFulfillmentAvailabilityByBreed({
    breedIds,
    year: params.year,
    weekNumber: params.weekNumber,
    deliveryMonday: params.deliveryMonday,
  })

  return new Map(
    inventoryRows.map((row) => {
      const breedId = String(row.breed_id)
      const breedAvailability = fulfillmentAvailability.get(breedId)
      const eggsAllocated = Math.max(0, Number(row.eggs_allocated || 0))
      const eggsAvailable = Math.max(0, Number(row.eggs_available || 0))
      const inventoryRemaining = Math.max(
        0,
        row.eggs_remaining !== null && row.eggs_remaining !== undefined
          ? Number(row.eggs_remaining || 0)
          : eggsAvailable - eggsAllocated
      )
      const manualOverride = Boolean(row.manual_override)
      const remaining = manualOverride
        ? Math.max(0, eggsAvailable - eggsAllocated)
        : breedAvailability
          ? Math.max(0, Number(breedAvailability.remaining || 0))
          : inventoryRemaining
      const source: AdminEggAvailabilitySource = manualOverride
        ? 'manual_override'
        : breedAvailability
          ? breedAvailability.source
          : 'inventory_fallback'

      return [
        String(row.id),
        {
          inventoryId: String(row.id),
          breedId,
          breedName: getBreedNameFromRelation(row.egg_breeds),
          remaining,
          source,
          actualCollected: breedAvailability?.actualCollected ?? null,
          eggsAvailable,
          eggsAllocated,
          inventoryRemaining,
          collectionDaysRecorded: breedAvailability?.collectionDaysRecorded || 0,
          manualOverride,
        } satisfies AdminEggAvailabilityRow,
      ] as const
    })
  )
}

export function getEggOrderCurrentQuantitiesByInventory(order: EggOrderLikeForAdjustments): Map<string, number> {
  const quantities = new Map<string, number>()

  const baseInventoryId = String(order?.inventory_id || '').trim()
  const baseQuantity = Math.max(0, Number(order?.quantity || 0))
  if (baseInventoryId && baseQuantity > 0) {
    quantities.set(baseInventoryId, baseQuantity)
  }

  for (const addition of order?.egg_order_additions || []) {
    const inventoryId = String(addition?.inventory_id || '').trim()
    const quantity = Math.max(0, Number(addition?.quantity || 0))
    if (!inventoryId || quantity <= 0) continue
    quantities.set(inventoryId, (quantities.get(inventoryId) || 0) + quantity)
  }

  return quantities
}

export function buildEggOrderLineComponents(order: {
  inventory_id?: string | null
  breed_id?: string | null
  quantity?: number | null
  price_per_egg?: number | null
  egg_order_additions?: Array<{
    id?: string | null
    inventory_id?: string | null
    breed_id?: string | null
    quantity?: number | null
    price_per_egg?: number | null
  }> | null
}): EggOrderLineComponent[] {
  const components: EggOrderLineComponent[] = []

  const baseInventoryId = String(order?.inventory_id || '').trim()
  const baseBreedId = String(order?.breed_id || '').trim()
  const baseQuantity = Math.max(0, Number(order?.quantity || 0))
  const basePrice = Math.max(0, Number(order?.price_per_egg || 0))
  if (baseInventoryId && baseBreedId && baseQuantity > 0) {
    components.push({
      inventoryId: baseInventoryId,
      breedId: baseBreedId,
      quantity: baseQuantity,
      pricePerEgg: basePrice,
      source: 'base',
    })
  }

  for (const addition of order?.egg_order_additions || []) {
    const inventoryId = String(addition?.inventory_id || '').trim()
    const breedId = String(addition?.breed_id || '').trim()
    const quantity = Math.max(0, Number(addition?.quantity || 0))
    if (!inventoryId || !breedId || quantity <= 0) continue
    components.push({
      inventoryId,
      breedId,
      quantity,
      pricePerEgg: Math.max(0, Number(addition?.price_per_egg || 0)),
      source: 'addition',
      additionId: addition?.id || null,
    })
  }

  return components
}
