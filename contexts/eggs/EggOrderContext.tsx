'use client'

import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react'
import { Order, Breed, WeekInventory, DeliveryMethod } from '@/lib/eggs/types'
import { generateOrderNumber } from '@/lib/eggs/utils'

interface OrderItemDraft {
  breed: Breed
  week: WeekInventory
  quantity: number
}

interface ExistingEggOrderTarget {
  id: string
  orderNumber: string
  weekNumber: number
  year: number
  deliveryMonday: string
  customerName?: string | null
  deliveryMethod?: string | null
}

interface OrderDraft {
  items: OrderItemDraft[]
  deliveryWeek: WeekInventory
  deliveryMethod?: DeliveryMethod
  shippingAddress?: string
  shippingPostalCode?: string
  shippingCity?: string
  shippingCountry?: string
  subtotal: number
  deliveryFee: number
  totalAmount: number
  depositAmount: number
  remainderAmount: number
  isFullPayment: boolean
}

interface OrderContextType {
  currentDraft: OrderDraft | null
  completedOrders: Order[]
  existingOrderTarget: ExistingEggOrderTarget | null
  isHydrated: boolean
  startOrder: (items: OrderItemDraft[]) => void
  setDeliveryMethod: (method: DeliveryMethod) => void
  setShippingDetails: (details: {
    shippingAddress?: string
    shippingPostalCode?: string
    shippingCity?: string
    shippingCountry?: string
  }) => void
  setExistingOrderTarget: (target: ExistingEggOrderTarget | null) => void
  completeOrder: () => Order
  clearDraft: () => void
  clearExistingOrderTarget: () => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)
const CURRENT_DRAFT_STORAGE_KEY = 'tinglumgard_egg_order_draft'
const EXISTING_ORDER_TARGET_STORAGE_KEY = 'tinglumgard_existing_egg_order_target'

export function OrderProvider({ children }: { children: ReactNode }) {
  const [currentDraft, setCurrentDraft] = useState<OrderDraft | null>(null)
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])
  const [existingOrderTarget, setExistingOrderTargetState] = useState<ExistingEggOrderTarget | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  const serializeDraft = useCallback((draft: OrderDraft) => ({
    ...draft,
    deliveryWeek: {
      ...draft.deliveryWeek,
      deliveryMonday: draft.deliveryWeek.deliveryMonday.toISOString(),
      orderCutoffDate: draft.deliveryWeek.orderCutoffDate.toISOString(),
    },
    items: draft.items.map((item) => ({
      ...item,
      week: {
        ...item.week,
        deliveryMonday: item.week.deliveryMonday.toISOString(),
        orderCutoffDate: item.week.orderCutoffDate.toISOString(),
      },
    })),
  }), [])

  const deserializeDraft = useCallback((raw: any): OrderDraft | null => {
    if (!raw || typeof raw !== 'object' || !Array.isArray(raw.items) || !raw.deliveryWeek) {
      return null
    }

    try {
      const items: OrderItemDraft[] = raw.items.map((item: any) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        week: {
          ...item.week,
          deliveryMonday: new Date(item.week.deliveryMonday),
          orderCutoffDate: new Date(item.week.orderCutoffDate),
        },
      }))

      const draft: OrderDraft = {
        ...raw,
        items,
        deliveryWeek: {
          ...raw.deliveryWeek,
          deliveryMonday: new Date(raw.deliveryWeek.deliveryMonday),
          orderCutoffDate: new Date(raw.deliveryWeek.orderCutoffDate),
        },
        subtotal: Number(raw.subtotal || 0),
        deliveryFee: Number(raw.deliveryFee || 0),
        totalAmount: Number(raw.totalAmount || 0),
        depositAmount: Number(raw.depositAmount || 0),
        remainderAmount: Number(raw.remainderAmount || 0),
        isFullPayment: Boolean(raw.isFullPayment),
      }

      if (draft.items.length === 0) return null
      return draft
    } catch (error) {
      console.error('Failed to deserialize egg order draft:', error)
      return null
    }
  }, [])

  useEffect(() => {
    const stored = localStorage.getItem('tinglumgard_orders')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        const orders = parsed.map((order: any) => ({
          ...order,
          deliveryMonday: new Date(order.deliveryMonday),
          remainderDueDate: order.remainderDueDate ? new Date(order.remainderDueDate) : null,
          createdAt: new Date(order.createdAt),
        }))
        setCompletedOrders(orders)
      } catch (e) {
        console.error('Failed to load orders:', e)
      }
    }

    const storedDraft = localStorage.getItem(CURRENT_DRAFT_STORAGE_KEY)
    if (storedDraft) {
      try {
        const parsedDraft = JSON.parse(storedDraft)
        const restoredDraft = deserializeDraft(parsedDraft)
        if (restoredDraft) {
          setCurrentDraft(restoredDraft)
        } else {
          localStorage.removeItem(CURRENT_DRAFT_STORAGE_KEY)
        }
      } catch (e) {
        console.error('Failed to load egg order draft:', e)
        localStorage.removeItem(CURRENT_DRAFT_STORAGE_KEY)
      }
    }

    const storedExistingOrder = localStorage.getItem(EXISTING_ORDER_TARGET_STORAGE_KEY)
    if (storedExistingOrder) {
      try {
        const parsed = JSON.parse(storedExistingOrder)
        if (parsed?.id && parsed?.orderNumber) {
          setExistingOrderTargetState(parsed)
        } else {
          localStorage.removeItem(EXISTING_ORDER_TARGET_STORAGE_KEY)
        }
      } catch (e) {
        console.error('Failed to load existing egg order target:', e)
        localStorage.removeItem(EXISTING_ORDER_TARGET_STORAGE_KEY)
      }
    }

    setIsHydrated(true)
  }, [deserializeDraft])

  useEffect(() => {
    if (completedOrders.length > 0) {
      localStorage.setItem('tinglumgard_orders', JSON.stringify(completedOrders))
    }
  }, [completedOrders])

  useEffect(() => {
    if (!currentDraft) {
      localStorage.removeItem(CURRENT_DRAFT_STORAGE_KEY)
      return
    }

    localStorage.setItem(CURRENT_DRAFT_STORAGE_KEY, JSON.stringify(serializeDraft(currentDraft)))
  }, [currentDraft, serializeDraft])

  useEffect(() => {
    if (!existingOrderTarget) {
      localStorage.removeItem(EXISTING_ORDER_TARGET_STORAGE_KEY)
      return
    }

    localStorage.setItem(EXISTING_ORDER_TARGET_STORAGE_KEY, JSON.stringify(existingOrderTarget))
  }, [existingOrderTarget])

  const startOrder = (items: OrderItemDraft[]) => {
    if (!items.length) return

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.breed.pricePerEgg, 0)
    const deliveryFee = 0
    const totalAmount = subtotal + deliveryFee
    const deliveryMonday = items[0].week.deliveryMonday
    const today = new Date(new Date().toISOString().split('T')[0])
    const deliveryDate = new Date(new Date(deliveryMonday).toISOString().split('T')[0])
    const daysToDelivery = Math.round((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isFullPayment = daysToDelivery <= 11

    const depositAmount = isFullPayment ? totalAmount : Math.round(subtotal / 2)
    const remainderAmount = isFullPayment ? 0 : (subtotal - depositAmount) + deliveryFee

    setCurrentDraft({
      items,
      deliveryWeek: items[0].week,
      subtotal,
      deliveryFee,
      totalAmount,
      depositAmount,
      remainderAmount,
      shippingAddress: '',
      shippingPostalCode: '',
      shippingCity: '',
      shippingCountry: 'Norge',
      isFullPayment,
    })
  }

  const setExistingOrderTarget = (target: ExistingEggOrderTarget | null) => {
    setExistingOrderTargetState(target)
  }

  const setDeliveryMethod = (method: DeliveryMethod) => {
    if (!currentDraft) return

    let deliveryFee = 0
    if (method === 'posten') {
      deliveryFee = 30000
    } else if (method === 'e6_pickup') {
      deliveryFee = 20000
    }

    const totalAmount = currentDraft.subtotal + deliveryFee
    const deliveryDate = new Date(new Date(currentDraft.deliveryWeek.deliveryMonday).toISOString().split('T')[0])
    const today = new Date(new Date().toISOString().split('T')[0])
    const daysToDelivery = Math.round((deliveryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    const isFullPayment = daysToDelivery <= 11
    const depositAmount = isFullPayment ? totalAmount : Math.round(currentDraft.subtotal / 2)
    const remainderAmount = isFullPayment ? 0 : (currentDraft.subtotal - depositAmount) + deliveryFee

    setCurrentDraft({
      ...currentDraft,
      deliveryMethod: method,
      deliveryFee,
      totalAmount,
      depositAmount,
      remainderAmount,
      isFullPayment,
    })
  }

  const completeOrder = (): Order => {
    if (!currentDraft || !currentDraft.deliveryMethod) {
      throw new Error('Order draft is incomplete')
    }

    const orderNumber = generateOrderNumber(completedOrders.length)
    const remainderDueDate = new Date(currentDraft.deliveryWeek.deliveryMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 6)

    const primaryItem = currentDraft.items[0]
    const totalEggs = currentDraft.items.reduce((sum, item) => sum + item.quantity, 0)
    const primaryName =
      currentDraft.items.length === 1
        ? primaryItem.breed.name
        : 'Flere raser'

    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber,
      userId: 'demo-user',
      breedId: primaryItem.breed.id,
      breedName: primaryName,
      year: currentDraft.deliveryWeek.year,
      weekNumber: currentDraft.deliveryWeek.weekNumber,
      deliveryMonday: currentDraft.deliveryWeek.deliveryMonday,
      quantity: totalEggs,
      pricePerEgg: primaryItem.breed.pricePerEgg,
      subtotal: currentDraft.subtotal,
      deliveryFee: currentDraft.deliveryFee,
      totalAmount: currentDraft.totalAmount,
      depositAmount: currentDraft.depositAmount,
      remainderAmount: currentDraft.remainderAmount,
      remainderDueDate,
      deliveryMethod: currentDraft.deliveryMethod,
      status: 'pending',
      policyVersion: 'v1-2026',
      createdAt: new Date(),
    }

    setCompletedOrders([...completedOrders, order])
    setCurrentDraft(null)

    return order
  }

  const setShippingDetails = (details: {
    shippingAddress?: string
    shippingPostalCode?: string
    shippingCity?: string
    shippingCountry?: string
  }) => {
    setCurrentDraft((draft) => (draft ? { ...draft, ...details } : draft))
  }

  const clearDraft = () => {
    setCurrentDraft(null)
  }

  const clearExistingOrderTarget = () => {
    setExistingOrderTargetState(null)
  }

  return (
    <OrderContext.Provider
      value={{
        currentDraft,
        completedOrders,
        existingOrderTarget,
        isHydrated,
        startOrder,
        setDeliveryMethod,
        setShippingDetails,
        setExistingOrderTarget,
        completeOrder,
        clearDraft,
        clearExistingOrderTarget,
      }}
    >
      {children}
    </OrderContext.Provider>
  )
}

export function useOrder() {
  const context = useContext(OrderContext)
  if (context === undefined) {
    throw new Error('useOrder must be used within an OrderProvider')
  }
  return context
}
