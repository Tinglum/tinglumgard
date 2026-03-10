import { Breed, WeekInventory, Order, WeekAvailability } from './types'
import { getMondayOfWeek } from './utils'

// 4 breeds with complete data
export const breeds: Breed[] = [
  {
    id: '1',
    name: 'Ayam Cemani',
    slug: 'ayam-cemani',
    description: 'Sjelden indonesisk rase med helsvart uttrykk. Eggene er kremfargede til lysebrune (ikke svarte).',
    detailedDescription:
      'Ayam Cemani er verdsatt for sitt helsvarte uttrykk og er en rase mange entusiaster har venteliste på. Eggfargen er kremfarget til lys brun, ikke svart. Vi avler selektivt for stabil type, god eggstørrelse og sterke kyllinger som ligger nært rasestandarden. Rasen kan være mer krevende i ruging enn flere andre raser, så stabil temperatur og fuktighet er ekstra viktig.',
    pricePerEgg: 8000, // 80 kr
    minOrderQuantity: 6,
    maxOrderQuantity: 24,
    accentColor: '#1A1A1A',

    eggColor: 'Kremhvit (ikke svarte)',
    sizeRange: '2-2.5 kg',
    minEggWeightGrams: null,
    temperament: 'Rolig, koselig',
    annualProduction: '60-90 egg/år',

    incubationDays: 21,
    temperature: '37.5°C',
    humidity: '50-55% (dag 1-18), 65-70% (dag 19-21)',

    isActive: true,
  },
  {
    id: '2',
    name: 'Jersey Giant',
    slug: 'jersey-giant',
    description: 'Stor og rolig rase som legger store brune egg.',
    detailedDescription:
      'Jersey Giant er en robust rase med rolig temperament og god størrelse på eggene. Vi prioriterer avlsdyr som gir god eggstørrelse, jevn kvalitet og høner som ligger nært rasestandarden. Målet er sterke og funksjonelle kyllinger med et stabilt uttrykk over tid.',
    pricePerEgg: 4500, // 45 kr
    minOrderQuantity: 10,
    maxOrderQuantity: 24,
    accentColor: '#C8A26A',

    eggColor: 'Store brune egg',
    sizeRange: '4-5 kg',
    minEggWeightGrams: 60,
    temperament: 'Rolig, tålmodig',
    annualProduction: '180-220 egg/år',

    incubationDays: 21,
    temperature: '37.5°C',
    humidity: '50-55% (dag 1-18), 65-70% (dag 19-21)',

    isActive: true,
  },
  {
    id: '3',
    name: "Silverudd's Blå",
    slug: 'silverudds-bla',
    description: 'Svensk rase kjent for grønne til olivengrønne egg.',
    detailedDescription:
      "Silverudd's Blå er en aktiv og hardfør rase med karakteristiske grønn-toner i eggene. Vi avler for tydelig eggfarge, god eggstørrelse og høner som ligger nært standarden. Genetikken bak eggfarge er kompleks, så nyanse og intensitet kan variere noe mellom individer og sesonger.",
    pricePerEgg: 4500, // 45 kr
    minOrderQuantity: 10,
    maxOrderQuantity: 24,
    accentColor: '#6B7F3A',

    eggColor: 'Grønn til oliven',
    sizeRange: '2.5-3 kg',
    minEggWeightGrams: 55,
    temperament: 'Robust, produktiv',
    annualProduction: '250 egg/år',

    incubationDays: 21,
    temperature: '37.5°C',
    humidity: '50-55% (dag 1-18), 65-70% (dag 19-21)',

    isActive: true,
  },
  {
    id: '4',
    name: 'Cream Legbar',
    slug: 'cream-legbar',
    description: 'Autosexing-rase med lyseblå egg og tydelig kjønnsvisning ved klekking.',
    detailedDescription:
      'Cream Legbar er populær fordi kyllingene ofte kan kjønnsbestemmes tidlig (autosexing), samtidig som rasen legger lyseblå egg. I vårt avlsarbeid prioriterer vi tydelig kjønnsvisning, jevn eggfarge og god eggstørrelse. Rasen er ettertraktet blant hobbyavlere som vil bygge flokk med mest mulig forutsigbarhet.',
    pricePerEgg: 4000, // 40 kr
    minOrderQuantity: 10,
    maxOrderQuantity: 24,
    accentColor: '#8FD9D6',

    eggColor: 'Turkis/lyseblå',
    sizeRange: '2-2.5 kg',
    minEggWeightGrams: 60,
    temperament: 'Nysgjerrig, aktiv',
    annualProduction: '200 egg/år',

    incubationDays: 21,
    temperature: '37.5°C',
    humidity: '50-55% (dag 1-18), 65-70% (dag 19-21)',

    isActive: true,
  },
  {
    id: '5',
    name: 'Maran',
    slug: 'maran',
    description: 'Fransk rase kjent for mørkebrune egg og klassisk kobberhalset uttrykk.',
    detailedDescription:
      'Kobberhalset Maran er verdsatt for dype bruntoner i eggene og et elegant rasepreg. Vi avler for jevn eggfarge, god eggstørrelse og høner som ligger nært rasestandarden. Mørkhetsgrad i eggfargen kan variere mellom sesonger og enkeltindivider.',
    pricePerEgg: 4500, // 45 kr
    minOrderQuantity: 6,
    maxOrderQuantity: 24,
    accentColor: '#5A2A1D',

    eggColor: 'Mørkebrun til rødlig',
    sizeRange: '2.5-3 kg',
    minEggWeightGrams: 65,
    temperament: 'Rolig, vennlig',
    annualProduction: '180-220 egg/år',

    incubationDays: 21,
    temperature: '37.5°C',
    humidity: '50-55% (dag 1-18), 65-70% (dag 19-21)',

    isActive: true,
  },
]

/**
 * Generate mock inventory through Aug 1, 2026
 * Tuned to show urgency and realistic near-term availability
 */
export function generateMockInventory(): WeekInventory[] {
  const inventory: WeekInventory[] = []
  const currentDate = new Date()
  const currentYear = currentDate.getFullYear()
  const currentWeek = getWeekNumber(currentDate)
  const endDate = new Date('2026-08-01')
  const msPerWeek = 7 * 24 * 60 * 60 * 1000
  const weeksToGenerate = Math.max(0, Math.ceil((endDate.getTime() - currentDate.getTime()) / msPerWeek))

  for (let i = 1; i <= weeksToGenerate; i++) {
    const weekNumber = currentWeek + i
    const year = weekNumber > 52 ? currentYear + 1 : currentYear
    const adjustedWeek = weekNumber > 52 ? weekNumber - 52 : weekNumber

    breeds.forEach((breed, breedIndex) => {
      // Vary capacity by breed popularity
      let capacity: number
      switch (breed.id) {
        case '1': // Ayam Cemani (rare, lower capacity)
          capacity = 36
          break
        case '2': // Jersey Giant
          capacity = 48
          break
        case '3': // Silverudd's Blå
          capacity = 42
          break
        case '4': // Cream Legbar (popular)
          capacity = 60
          break
        case '5': // Maran
          capacity = 42
          break
        default:
          capacity = 48
      }

      // Availability targets by horizon:
      // - Weeks 1-6: ~15 eggs (+/- 4)
      // - Weeks 7-8: moderate availability
      // - Weeks 9+: low or no availability to show urgency
      let available: number
      if (i <= 6) {
        available = clamp(randomInt(11, 19), 0, capacity)
      } else if (i <= 8) {
        available = clamp(randomInt(6, 14), 0, capacity)
      } else {
        available = Math.random() < 0.6 ? 0 : clamp(randomInt(1, 6), 0, capacity)
      }

      // Create some sold-out weeks for the rare breed
      if (i === 2 && breedIndex === 0) {
        available = 0 // Ayam Cemani week 2 sold out
      }

      const allocated = capacity - available
      const deliveryMonday = getMondayOfWeek(year, adjustedWeek)
      const orderCutoffDate = new Date(deliveryMonday)
      orderCutoffDate.setDate(orderCutoffDate.getDate() - 6)

      // Determine status
      let status: WeekInventory['status']
      if (available === 0) {
        status = 'sold_out'
      } else if (available < breed.minOrderQuantity) {
        status = 'low_stock'
      } else if (available < 10) {
        status = 'low_stock'
      } else {
        status = 'available'
      }

      // E6 pickup availability (70% of weeks)
      const e6Available = Math.random() > 0.3

      inventory.push({
        id: `${breed.id}-${year}-${adjustedWeek}`,
        breedId: breed.id,
        breedName: breed.name,
        breedSlug: breed.slug,
        year,
        weekNumber: adjustedWeek,
        deliveryMonday,
        orderCutoffDate,
        eggsCapacity: capacity,
        eggsAllocated: allocated,
        eggsAvailable: available,
        isOpen: true,
        isLocked: false,
        e6PickupAvailable: e6Available,
        status,
      })
    })
  }

  return inventory
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

export const mockInventory = generateMockInventory()

/**
 * Generate week availability for "Browse by Week" view
 */
export function generateWeekAvailability(): WeekAvailability[] {
  const weeks: Map<string, WeekAvailability> = new Map()

  mockInventory.forEach((inv) => {
    const key = `${inv.year}-${inv.weekNumber}`

    if (!weeks.has(key)) {
      weeks.set(key, {
        weekNumber: inv.weekNumber,
        year: inv.year,
        deliveryMonday: inv.deliveryMonday,
        breeds: [],
      })
    }

    const week = weeks.get(key)!
    const breed = breeds.find((b) => b.id === inv.breedId)!

    week.breeds.push({
      inventoryId: inv.id,
      breedId: inv.breedId,
      breedName: inv.breedName,
      breedSlug: inv.breedSlug,
      accentColor: breed.accentColor,
      eggsAvailable: inv.eggsAvailable,
      status: inv.status === 'sold_out' ? 'sold_out' : inv.status === 'low_stock' ? 'low_stock' : 'available',
    })
  })

  return Array.from(weeks.values()).sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.weekNumber - b.weekNumber
  })
}

/**
 * Mock orders for testing
 */
export const mockOrders: Order[] = []

/**
 * Get inventory for specific breed
 */
export function getBreedInventory(breedId: string): WeekInventory[] {
  return mockInventory.filter((inv) => inv.breedId === breedId && inv.isOpen)
}

/**
 * Get specific week inventory
 */
export function getWeekInventory(id: string): WeekInventory | undefined {
  return mockInventory.find((inv) => inv.id === id)
}

/**
 * Get breed by slug
 */
export function getBreedBySlug(slug: string): Breed | undefined {
  return breeds.find((b) => b.slug === slug)
}

