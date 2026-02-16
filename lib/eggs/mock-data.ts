import { Breed, WeekInventory, Order, WeekAvailability } from './types'
import { getMondayOfWeek } from './utils'

// 4 breeds with complete data
export const breeds: Breed[] = [
  {
    id: '1',
    name: 'Ayam Cemani',
    slug: 'ayam-cemani',
    description: 'Eksotisk indonesisk rase med helt svart fjærdrakt, hud og kjøtt. Høyt verdsatt av samlere.',
    detailedDescription:
      'Ayam Cemani er en av de mest unike hønserasene, kjent for sitt helt sorte utseende - fra fjær til kjøtt og til og med bein. Denne fascinerende rasen er høyt verdsatt av samlere og hønseentusiaster, og er utrolig koselige dyr å ha med å gjøre. Våre høner kommer fra en frisk og nøye sammensatt flokk med fem ulike blodslinjer, for å gi best mulig utgangspunkt for sterke og sunne kyllinger. Viktig å vite: Ayam Cemani kan være krevende å klekke, og de er ekstra følsomme for endringer i temperatur og fuktighet under ruging.',
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
    description: 'Amerikas største hønerase med rolig gemytt og store brune egg.',
    detailedDescription:
      'Jersey Giant er kjent for sin imponerende størrelse, rolige gemytt og gode produksjonsevne. Denne amerikanske hønserasen legger store, brune egg og trives godt i det norske klimaet. På grunn av sin størrelse trenger de litt mer plass enn gjennomsnittshøna, men til gjengjeld får du en robust og hardfør flokk som gir store egg. Eggene veier minimum 60 gram og regnes som store. Våre høner er ikke perfekte, men vi streber etter å hver sesong bli enda nærmere standarden.',
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
    description: 'Svensk autosex-rase med vakre grønne egg. Kommer i fargene splash, blå og svart.',
    detailedDescription:
      "Våre Silverudd's Blå høner, som kommer i fargene splash, blå, og svart, produserer rugeegg i en rekke vakre grønntoner. Denne svenske hønserasen er kjent for sin robusthet, for å være gode eggleggere og ikke minst for sine kule grønne egg. De er meget gode egghøner som legger ca 250 egg årlig, med en eggstørrelse på minimum 55g (gjennomsnittet ligger på 59-60 gram). Våre høner er ikke perfekte, men vi streber etter å hver sesong bli enda nærmere standarden. Genetikk og standard er kompliserte elementer.",
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
    description: 'Britisk autosex-rase med fantastiske turkise/blå egg. Lette å kjønnsbestemme ved klekking.',
    detailedDescription:
      'Cream Legbar høner er kjent for sine fantastiske turkise/blå egg og er en fryd for ethvert hønsehold. Denne spennende rasen er nysgjerrige, gode eggleggere av store turkise/lyseblå egg og kule å ha med å gjøre. Det som er spesielt med Cream Legbar er at de er lette å kjønnsbestemme ved klekking, i motsetning til de fleste andre raser. De er imponerende produsenter som legger omkring 200 egg årlig, med en ideell størrelse på ca 60+ gram. Cream Legbar er ikke en godkjent rase i Norge. Vi har fokusert på eggstørrelse, farge på eggene og kjønnsvisende kyllinger.',
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
    description: 'Fransk rase med vakker kobberhalset fjærdrakt og dype sjokoladebrune egg.',
    detailedDescription:
      'Våre kobberhalset Maran-høner er verdsatt for sin vakre fjærdrakt, rolige lynne og ikke minst de dype sjokoladebrune eggene. Dette er en fransk hønserase kjent for sin hardførhet og store egg, en veldig populær rase! En voksen kobberhalset Maran-høne legger i snitt 180-220 egg i året, ofte med en vekt på rundt 70 gram (minstevekt 65). Eggfargen er karakteristisk mørkebrun til rødlig. Våre høner er ikke perfekte, men vi streber etter å hver sesong bli enda nærmere standarden. Genetikk og standard er kompliserte elementer.',
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

