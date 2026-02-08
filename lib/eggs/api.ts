import type { Breed, WeekAvailability, WeekInventory } from './types'
import { getWeekNumber } from './utils'

type EggBreedRow = {
  id: string
  slug: string
  name: string
  description: string | null
  detailed_description: string | null
  price_per_egg: number
  min_order_quantity: number
  max_order_quantity: number
  accent_color: string
  egg_color: string
  size_range: string
  min_egg_weight_grams?: number | null
  temperament: string
  annual_production: string
  incubation_days: number
  temperature: string
  humidity: string
  active: boolean
}

type EggInventoryRow = {
  id: string
  breed_id: string
  year: number
  week_number: number
  delivery_monday: string
  eggs_available: number
  eggs_allocated: number
  eggs_remaining?: number | null
  status: 'open' | 'closed' | 'locked' | 'sold_out'
  egg_breeds?: EggBreedRow | null
}

export function mapBreed(row: EggBreedRow): Breed {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description || '',
    detailedDescription: row.detailed_description || '',
    pricePerEgg: row.price_per_egg,
    minOrderQuantity: row.min_order_quantity,
    maxOrderQuantity: row.max_order_quantity,
    accentColor: row.accent_color,
    eggColor: row.egg_color,
    sizeRange: row.size_range,
    minEggWeightGrams: row.min_egg_weight_grams ?? null,
    temperament: row.temperament,
    annualProduction: row.annual_production,
    incubationDays: row.incubation_days,
    temperature: row.temperature,
    humidity: row.humidity,
    isActive: row.active,
  }
}

function resolveInventoryStatus(
  status: EggInventoryRow['status'],
  eggsAvailable: number,
  minOrderQuantity: number
): WeekInventory['status'] {
  if (status === 'locked') return 'locked'
  if (status === 'closed') return 'closed'
  if (status === 'sold_out') return 'sold_out'

  if (eggsAvailable <= 0) return 'sold_out'
  if (eggsAvailable < Math.max(minOrderQuantity, 10)) return 'low_stock'
  return 'available'
}

export function mapInventory(row: EggInventoryRow, breed?: Breed): WeekInventory {
  const deliveryMonday = new Date(row.delivery_monday)
  const orderCutoffDate = new Date(deliveryMonday)
  orderCutoffDate.setDate(orderCutoffDate.getDate() - 6)

  const eggsRemaining =
    row.eggs_remaining !== undefined && row.eggs_remaining !== null
      ? row.eggs_remaining
      : row.eggs_available - row.eggs_allocated

  const minOrderQuantity = breed?.minOrderQuantity || 0

  return {
    id: row.id,
    breedId: row.breed_id,
    breedName: breed?.name || row.egg_breeds?.name || '',
    breedSlug: breed?.slug || row.egg_breeds?.slug || '',
    breedAccentColor: breed?.accentColor || row.egg_breeds?.accent_color || undefined,
    year: row.year,
    weekNumber: row.week_number || getWeekNumber(deliveryMonday),
    deliveryMonday,
    orderCutoffDate,
    eggsCapacity: row.eggs_available,
    eggsAllocated: row.eggs_allocated,
    eggsAvailable: eggsRemaining,
    isOpen: row.status === 'open',
    isLocked: row.status === 'locked',
    e6PickupAvailable: true,
    status: resolveInventoryStatus(row.status, eggsRemaining, minOrderQuantity),
  }
}

export async function fetchBreeds(): Promise<Breed[]> {
  const response = await fetch('/api/eggs/breeds', { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch breeds')
  }
  const data = (await response.json()) as EggBreedRow[]
  return data.map(mapBreed)
}

export async function fetchBreedBySlug(slug: string): Promise<Breed> {
  const response = await fetch(`/api/eggs/breeds/${slug}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch breed')
  }
  const data = (await response.json()) as EggBreedRow
  return mapBreed(data)
}

export async function fetchInventory(params?: { breedId?: string }): Promise<WeekInventory[]> {
  const query = params?.breedId ? `?breed_id=${encodeURIComponent(params.breedId)}` : ''
  const response = await fetch(`/api/eggs/inventory${query}`, { cache: 'no-store' })
  if (!response.ok) {
    throw new Error('Failed to fetch inventory')
  }
  const data = (await response.json()) as EggInventoryRow[]
  return data.map((row) => {
    const breed = row.egg_breeds ? mapBreed(row.egg_breeds) : undefined
    return mapInventory(row, breed)
  })
}

export function buildWeekAvailability(inventory: WeekInventory[]): WeekAvailability[] {
  const map = new Map<string, WeekAvailability>()

  inventory.forEach((inv) => {
    const key = `${inv.year}-${inv.weekNumber}`
    if (!map.has(key)) {
      map.set(key, {
        weekNumber: inv.weekNumber,
        year: inv.year,
        deliveryMonday: inv.deliveryMonday,
        breeds: [],
      })
    }

    const entry = map.get(key)!
    entry.breeds.push({
      breedId: inv.breedId,
      breedName: inv.breedName,
      breedSlug: inv.breedSlug,
      accentColor: inv.breedAccentColor || '#1F2937',
      eggsAvailable: inv.eggsAvailable,
      status: inv.status === 'sold_out' ? 'sold_out' : inv.status === 'low_stock' ? 'low_stock' : 'available',
    })
  })

  return Array.from(map.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.weekNumber - b.weekNumber
  })
}
