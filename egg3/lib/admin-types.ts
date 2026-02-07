export type AdminMode = 'eggs' | 'pigs' | 'combined'

export type AdminProductType = 'eggs' | 'pig_box'

export type AdminStatus = 'open' | 'closed' | 'locked' | 'sold_out'

export interface AdminAlert {
  id: string
  productType: AdminProductType
  level: 'warning' | 'critical' | 'info'
  message: string
  href: string
}

export interface AdminScheduleEntry {
  id: string
  productType: AdminProductType
  productName: string
  unitLabel: string
  capacity: number
  allocated: number
  status: AdminStatus
  accentColor?: string
}

export interface AdminScheduleWindow {
  id: string
  year: number
  weekNumber: number
  startDate: Date
  entries: AdminScheduleEntry[]
}

export type AdminOrderStatus =
  | 'pending'
  | 'deposit_paid'
  | 'fully_paid'
  | 'preparing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'

export interface AdminOrder {
  id: string
  orderNumber: string
  productType: AdminProductType
  productName: string
  windowLabel: string
  windowDate: Date
  quantity: number
  unitLabel: string
  deliveryMethod: string
  status: AdminOrderStatus
  depositStatus: 'pending' | 'paid'
  remainderDueDate: Date | null
  remainderDueInDays: number | null
  deliveryDate: Date
  customerName: string
  customerEmail: string
}

export interface AdminProduct {
  id: string
  productType: AdminProductType
  name: string
  status: 'active' | 'inactive'
  pricePerUnit: number
  unitLabel: string
  minOrder: number
  maxOrder: number
  accentColor?: string
  seasonStartWeek?: number
  seasonEndWeek?: number
  notes?: string
}

export interface AdminInventoryItem {
  id: string
  productType: AdminProductType
  productName: string
  windowLabel: string
  windowDate: Date
  capacity: number
  allocated: number
  remaining: number
  status: AdminStatus
}

export interface AdminPayment {
  id: string
  orderNumber: string
  productType: AdminProductType
  paymentType: 'deposit' | 'remainder' | 'full' | 'refund'
  amount: number
  status: 'pending' | 'captured' | 'failed' | 'refunded'
  provider: string
  createdAt: Date
  isTest: boolean
  payloadPreview: string
}

export interface AdminCustomer {
  id: string
  name: string
  email: string
  phone: string
  ordersCount: number
  lastOrderDate: Date
  status: 'active' | 'inactive'
}

export interface AdminActivity {
  id: string
  productType: AdminProductType
  timestamp: Date
  adminName: string
  action: string
  entity: string
  summary: string
  changes: string
  reason: string
}
