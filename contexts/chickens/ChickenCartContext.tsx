'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface ChickenCartItem {
  breedId: string
  breedName: string
  breedSlug: string
  accentColor: string
  hatchId: string
  pickupWeek: number
  pickupYear: number
  ageWeeks: number
  pricePerHen: number
  pricePerRooster: number
  quantityHens: number
  quantityRoosters: number
}

export type ChickenDeliveryMethod = 'farm_pickup' | 'delivery_namsos_trondheim'

interface ChickenCartContextType {
  item: ChickenCartItem | null
  setItem: (item: ChickenCartItem) => void
  clearCart: () => void
  getSubtotal: () => number
  getDeliveryFee: (method: ChickenDeliveryMethod) => number
  getTotal: (method: ChickenDeliveryMethod) => number
  getDeposit: (method: ChickenDeliveryMethod) => number
  getRemainder: (method: ChickenDeliveryMethod) => number
}

const ChickenCartContext = createContext<ChickenCartContextType | null>(null)

const STORAGE_KEY = 'tinglumgard_chicken_cart'

export function ChickenCartProvider({ children }: { children: ReactNode }) {
  const [item, setItemState] = useState<ChickenCartItem | null>(null)

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setItemState(JSON.parse(stored))
      }
    } catch {}
  }, [])

  // Save to localStorage on change
  useEffect(() => {
    try {
      if (item) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(item))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {}
  }, [item])

  const setItem = (newItem: ChickenCartItem) => {
    setItemState(newItem)
  }

  const clearCart = () => {
    setItemState(null)
  }

  const getSubtotal = () => {
    if (!item) return 0
    return (item.quantityHens * item.pricePerHen) + (item.quantityRoosters * item.pricePerRooster)
  }

  const getDeliveryFee = (method: ChickenDeliveryMethod) => {
    return method === 'delivery_namsos_trondheim' ? 300 : 0
  }

  const getTotal = (method: ChickenDeliveryMethod) => {
    return getSubtotal() + getDeliveryFee(method)
  }

  const getDeposit = (method: ChickenDeliveryMethod) => {
    return Math.round(getTotal(method) * 0.3)
  }

  const getRemainder = (method: ChickenDeliveryMethod) => {
    return getTotal(method) - getDeposit(method)
  }

  return (
    <ChickenCartContext.Provider value={{
      item, setItem, clearCart, getSubtotal, getDeliveryFee, getTotal, getDeposit, getRemainder,
    }}>
      {children}
    </ChickenCartContext.Provider>
  )
}

export function useChickenCart() {
  const context = useContext(ChickenCartContext)
  if (!context) {
    throw new Error('useChickenCart must be used within a ChickenCartProvider')
  }
  return context
}
