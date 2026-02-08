'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Order, Breed, WeekInventory, DeliveryMethod } from '@/lib/eggs/types'
import { generateOrderNumber } from '@/lib/eggs/utils'

interface OrderItemDraft {
  breed: Breed
  week: WeekInventory
  quantity: number
}

interface OrderDraft {
  items: OrderItemDraft[]
  deliveryWeek: WeekInventory
  deliveryMethod?: DeliveryMethod
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
  startOrder: (items: OrderItemDraft[]) => void
  setDeliveryMethod: (method: DeliveryMethod) => void
  completeOrder: () => Order
  clearDraft: () => void
}

const OrderContext = createContext<OrderContextType | undefined>(undefined)

export function OrderProvider({ children }: { children: ReactNode }) {
  const [currentDraft, setCurrentDraft] = useState<OrderDraft | null>(null)
  const [completedOrders, setCompletedOrders] = useState<Order[]>([])

  // Load orders from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tinglumgard_orders')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
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
  }, [])

  // Save orders to localStorage whenever they change
  useEffect(() => {
    if (completedOrders.length > 0) {
      localStorage.setItem('tinglumgard_orders', JSON.stringify(completedOrders))
    }
  }, [completedOrders])

  const startOrder = (items: OrderItemDraft[]) => {
    if (!items.length) return

    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.breed.pricePerEgg, 0)
    const deliveryFee = 0 // Will be set when delivery method is chosen
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
      isFullPayment,
    })
  }

  const setDeliveryMethod = (method: DeliveryMethod) => {
    if (!currentDraft) return

    let deliveryFee = 0
    if (method === 'posten') {
      deliveryFee = 30000 // 300 kr in øre
    } else if (method === 'e6_pickup') {
      deliveryFee = 20000 // 200 kr in øre
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

    // Calculate remainder due date (6 days before delivery)
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

  const clearDraft = () => {
    setCurrentDraft(null)
  }

  return (
    <OrderContext.Provider
      value={{
        currentDraft,
        completedOrders,
        startOrder,
        setDeliveryMethod,
        completeOrder,
        clearDraft,
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
