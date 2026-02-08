// Core data types from Step 1 data model

export interface Breed {
  id: string
  name: string
  slug: string
  description: string
  detailedDescription: string
  pricePerEgg: number // øre
  minOrderQuantity: number
  maxOrderQuantity: number
  accentColor: string

  // Characteristics
  eggColor: string
  sizeRange: string
  minEggWeightGrams?: number | null
  temperament: string
  annualProduction: string

  // Hatching info
  incubationDays: number
  temperature: string
  humidity: string

  isActive: boolean
}

export interface WeekInventory {
  id: string
  breedId: string
  breedName: string
  breedSlug: string
  breedAccentColor?: string
  year: number
  weekNumber: number
  deliveryMonday: Date
  orderCutoffDate: Date

  eggsCapacity: number
  eggsAllocated: number
  eggsAvailable: number

  isOpen: boolean
  isLocked: boolean
  e6PickupAvailable: boolean

  status: 'available' | 'low_stock' | 'sold_out' | 'closed' | 'locked'
}

export type DeliveryMethod = 'posten' | 'farm_pickup' | 'e6_pickup'

export type OrderStatus =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'forfeited'

export interface Order {
  id: string
  orderNumber: string
  userId: string

  breedId: string
  breedName: string
  year: number
  weekNumber: number
  deliveryMonday: Date

  quantity: number
  pricePerEgg: number
  subtotal: number
  deliveryFee: number
  totalAmount: number

  depositAmount: number
  remainderAmount: number
  remainderDueDate: Date | null

  deliveryMethod: DeliveryMethod
  status: OrderStatus

  policyVersion: string
  createdAt: Date
}

export interface OrderUpsell {
  id: string
  originalOrderId: string
  breedId: string
  weekInventoryId: string

  quantity: number
  pricePerEgg: number
  subtotal: number

  status: 'pending' | 'reserved' | 'confirmed' | 'expired' | 'cancelled'
  reservedUntil: Date | null
}

export type TransactionType = 'deposit' | 'remainder' | 'upsell' | 'refund' | 'credit'
export type TransactionStatus = 'pending' | 'completed' | 'failed' | 'refunded'

export interface PaymentTransaction {
  id: string
  orderId: string
  transactionType: TransactionType
  amount: number

  paymentProvider: string
  providerTransactionId: string | null
  providerStatus: string | null

  status: TransactionStatus
  isTest: boolean

  createdAt: Date
}

// Browse modes
export type BrowseMode = 'breed' | 'week'

// Language
export type Language = 'no' | 'en'

// Week availability for "Browse by Week" view
export interface WeekAvailability {
  weekNumber: number
  year: number
  deliveryMonday: Date
  breeds: Array<{
    breedId: string
    breedName: string
    breedSlug: string
    accentColor: string
    eggsAvailable: number
    status: 'available' | 'low_stock' | 'sold_out'
  }>
}
