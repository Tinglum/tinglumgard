// Core data types for the Live Chickens (Kyllinger) feature

export interface ChickenBreed {
  id: string
  name: string
  slug: string
  accentColor: string
  descriptionNo: string
  descriptionEn: string
  imageUrl: string

  startPriceNok: number
  weeklyIncreaseNok: number
  adultPriceNok: number
  roosterPriceNok: number
  sellRoosters: boolean

  mortalityRateEarlyPct: number
  mortalityRateLatePct: number

  isActive: boolean
  displayOrder: number
}

export interface ChickenHatch {
  id: string
  breedId: string
  breedName?: string
  breedSlug?: string
  breedAccentColor?: string
  hatchDate: string // ISO date
  initialCount: number
  estimatedHens: number
  estimatedRoosters: number
  availableHens: number
  availableRoosters: number
  mortalityOverride: number | null
  notes: string
  isActive: boolean
}

export type ChickenDeliveryMethod = 'farm_pickup' | 'delivery_namsos_trondheim'

export type ChickenOrderStatus =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'ready_for_pickup'
  | 'picked_up'
  | 'cancelled'

export interface ChickenOrder {
  id: string
  orderNumber: string
  userId: string | null
  customerName: string
  customerEmail: string
  customerPhone: string | null

  hatchId: string
  breedId: string
  breedName?: string
  quantityHens: number
  quantityRoosters: number

  pickupYear: number
  pickupWeek: number
  pickupMonday: string
  ageWeeksAtPickup: number

  pricePerHenNok: number
  pricePerRoosterNok: number
  subtotalNok: number

  deliveryMethod: ChickenDeliveryMethod
  deliveryFeeNok: number
  totalAmountNok: number
  depositAmountNok: number
  remainderAmountNok: number
  remainderDueDate: string | null

  status: ChickenOrderStatus
  notes: string
  adminNotes: string

  createdAt: string
  payments?: ChickenPayment[]
  additions?: ChickenOrderAddition[]
}

export interface ChickenOrderAddition {
  id: string
  chickenOrderId: string
  hatchId: string
  breedId: string
  quantityHens: number
  quantityRoosters: number
  pricePerHenNok: number
  subtotalNok: number
}

export interface ChickenPayment {
  id: string
  chickenOrderId: string
  paymentType: 'deposit' | 'remainder'
  amountNok: number
  vippsOrderId: string | null
  status: 'pending' | 'completed' | 'failed'
  paidAt: string | null
}

/** Availability cell for the week×breed calendar grid */
export interface ChickenWeekAvailability {
  weekNumber: number
  year: number
  pickupMonday: string // ISO date string
  breeds: Array<{
    breedId: string
    breedName: string
    breedSlug: string
    accentColor: string
    hatches: Array<{
      hatchId: string
      ageWeeks: number
      pricePerHen: number
      availableHens: number
      estimatedSurvivors: number
    }>
    totalAvailable: number
    minPrice: number
    maxPrice: number
  }>
}
