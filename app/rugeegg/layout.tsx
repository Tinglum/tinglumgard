'use client'

import type { ReactNode } from 'react'
import { CartProvider } from '@/contexts/eggs/EggCartContext'
import { OrderProvider } from '@/contexts/eggs/EggOrderContext'

export default function RugeggLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <OrderProvider>{children}</OrderProvider>
    </CartProvider>
  )
}
