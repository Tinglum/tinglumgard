'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Breed, WeekInventory } from '@/lib/eggs/types'

export interface CartItem {
  breed: Breed
  week: WeekInventory
  quantity: number
}

interface CartContextType {
  items: CartItem[]
  addToCart: (breed: Breed, week: WeekInventory, quantity: number) => void
  removeFromCart: (breedId: string, weekId: string) => void
  updateQuantity: (breedId: string, weekId: string, quantity: number) => void
  clearCart: () => void
  getTotalEggs: () => number
  getTotalPrice: () => number
  canCheckout: () => { allowed: boolean; reason?: string }
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])

  // Load cart from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('tinglumgard_cart')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Convert date strings back to Date objects
        const cartItems = parsed.map((item: any) => ({
          ...item,
          week: {
            ...item.week,
            deliveryMonday: new Date(item.week.deliveryMonday),
            orderCutoffDate: new Date(item.week.orderCutoffDate),
          },
        }))
        setItems(cartItems)
      } catch (e) {
        console.error('Failed to load cart:', e)
      }
    }
  }, [])

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('tinglumgard_cart', JSON.stringify(items))
  }, [items])

  const addToCart = (breed: Breed, week: WeekInventory, quantity: number) => {
    setItems((current) => {
      // Check if item already exists
      const existingIndex = current.findIndex(
        (item) => item.breed.id === breed.id && item.week.id === week.id
      )

      if (existingIndex >= 0) {
        // Update existing item
        const updated = [...current]
        updated[existingIndex] = { breed, week, quantity }
        return updated
      } else {
        // Add new item
        return [...current, { breed, week, quantity }]
      }
    })
  }

  const removeFromCart = (breedId: string, weekId: string) => {
    setItems((current) => current.filter((item) => !(item.breed.id === breedId && item.week.id === weekId)))
  }

  const updateQuantity = (breedId: string, weekId: string, quantity: number) => {
    setItems((current) =>
      current.map((item) =>
        item.breed.id === breedId && item.week.id === weekId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
    localStorage.removeItem('tinglumgard_cart')
  }

  const getTotalEggs = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.quantity * item.breed.pricePerEgg, 0)
  }

  const canCheckout = (): { allowed: boolean; reason?: string } => {
    const totalEggs = getTotalEggs()

    // Empty cart
    if (items.length === 0) {
      return { allowed: false, reason: 'cart_empty' }
    }

    // Check if it's a pure Ayam Cemani order
    const isPureAyamCemani =
      items.length === 1 && items.every((item) => item.breed.slug === 'ayam-cemani')

    if (isPureAyamCemani) {
      // Ayam Cemani: minimum 6 eggs
      if (totalEggs < 6) {
        return { allowed: false, reason: 'ayam_cemani_min_6' }
      }
    } else {
      // Mixed or other orders: minimum 12 eggs total
      if (totalEggs < 12) {
        return { allowed: false, reason: 'mixed_min_12' }
      }
    }

    // Check individual breed minimums for each item
    for (const item of items) {
      if (item.quantity < item.breed.minOrderQuantity) {
        return { allowed: false, reason: 'breed_minimum_not_met' }
      }
    }

    return { allowed: true }
  }

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalEggs,
        getTotalPrice,
        canCheckout,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}
