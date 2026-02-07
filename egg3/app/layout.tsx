import type { Metadata } from 'next'
import { Inter, Space_Grotesk } from 'next/font/google'
import './globals.css'
import { LanguageProvider } from '@/lib/language-context'
import { OrderProvider } from '@/lib/order-context'
import { CartProvider } from '@/lib/cart-context'
import { Header } from '@/components/Header'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Tinglumgård Rugeegg | Klekkegg fra utvalgte raser',
  description: 'Befruktede klekkegg fra robuste høns. Ukentlige batcher. Levering over hele Norge.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="no" className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="font-sans antialiased bg-neutral-50 text-neutral-900">
        <LanguageProvider>
          <CartProvider>
            <OrderProvider>
              {/* Atmospheric gradient background */}
            <div className="fixed inset-0 -z-10 bg-gradient-to-br from-neutral-50 via-neutral-100 to-neutral-200" />

            {/* Subtle noise texture overlay */}
            <div
              className="fixed inset-0 -z-10 opacity-[0.015]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='3' numOctaves='4' /%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' /%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative min-h-screen">
              <Header />
              <main>{children}</main>
            </div>
            </OrderProvider>
          </CartProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
