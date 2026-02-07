'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Order, Breed, WeekInventory, DeliveryMethod } from './types'
import { generateOrderNumber } from './utils'

interface OrderDraft {
  breed: Breed
  week: WeekInventory
  quantity: number
  deliveryMethod?: DeliveryMethod
  subtotal: number
  deliveryFee: number
  totalAmount: number
  depositAmount: number
  remainderAmount: number
}

interface OrderContextType {
  currentDraft: OrderDraft | null
  completedOrders: Order[]
  startOrder: (breed: Breed, week: WeekInventory, quantity: number) => void
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

  const startOrder = (breed: Breed, week: WeekInventory, quantity: number) => {
    const subtotal = quantity * breed.pricePerEgg
    const deliveryFee = 0 // Will be set when delivery method is chosen
    const totalAmount = subtotal + deliveryFee
    const depositAmount = Math.round(totalAmount / 2)
    const remainderAmount = totalAmount - depositAmount

    setCurrentDraft({
      breed,
      week,
      quantity,
      subtotal,
      deliveryFee,
      totalAmount,
      depositAmount,
      remainderAmount,
    })
  }

  const setDeliveryMethod = (method: DeliveryMethod) => {
    if (!currentDraft) return

    let deliveryFee = 0
    if (method === 'posten' || method === 'e6_pickup') {
      deliveryFee = 30000 // 300 kr in øre
    }

    const totalAmount = currentDraft.subtotal + deliveryFee
    const depositAmount = Math.round(totalAmount / 2)
    const remainderAmount = totalAmount - depositAmount

    setCurrentDraft({
      ...currentDraft,
      deliveryMethod: method,
      deliveryFee,
      totalAmount,
      depositAmount,
      remainderAmount,
    })
  }

  const completeOrder = (): Order => {
    if (!currentDraft || !currentDraft.deliveryMethod) {
      throw new Error('Order draft is incomplete')
    }

    const orderNumber = generateOrderNumber(completedOrders.length)

    // Calculate remainder due date (6 days before delivery)
    const remainderDueDate = new Date(currentDraft.week.deliveryMonday)
    remainderDueDate.setDate(remainderDueDate.getDate() - 6)

    const order: Order = {
      id: `order-${Date.now()}`,
      orderNumber,
      userId: 'demo-user',
      breedId: currentDraft.breed.id,
      breedName: currentDraft.breed.name,
      year: currentDraft.week.year,
      weekNumber: currentDraft.week.weekNumber,
      deliveryMonday: currentDraft.week.deliveryMonday,
      quantity: currentDraft.quantity,
      pricePerEgg: currentDraft.breed.pricePerEgg,
      subtotal: currentDraft.subtotal,
      deliveryFee: currentDraft.deliveryFee,
      totalAmount: currentDraft.totalAmount,
      depositAmount: currentDraft.depositAmount,
      remainderAmount: currentDraft.remainderAmount,
      remainderDueDate,
      deliveryMethod: currentDraft.deliveryMethod,
      status: 'deposit_paid',
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
