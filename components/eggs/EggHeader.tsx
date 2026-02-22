'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useLanguage } from '@/lib/eggs/language-context'
import { useCart } from '@/lib/eggs/cart-context'
import { Globe, ShoppingBag } from 'lucide-react'

export function Header() {
  const { language, setLanguage, t } = useLanguage()
  const { getTotalEggs } = useCart()
  const pathname = usePathname()
  const totalEggs = getTotalEggs()

  if (pathname.startsWith('/admin')) {
    return null
  }

  return (
    <header className="sticky top-0 z-20 glass-strong">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-screen-xl">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-neutral-900 to-neutral-700 flex items-center justify-center transition-transform duration-200 group-hover:scale-105">
                <span className="text-white text-lg font-display font-bold">T</span>
              </div>
            </div>
            <div>
              <div className="font-display text-lg font-semibold text-neutral-900 tracking-tight">
                Tinglumgård
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-widest -mt-0.5">
                Rugeegg
              </div>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link
              href="/rugeegg/raser"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              {t.nav.breeds}
            </Link>
            <Link
              href="/min-side"
              className="text-sm font-medium text-neutral-700 hover:text-neutral-900 transition-colors"
            >
              {t.nav.myOrders}
            </Link>
          </nav>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Cart indicator */}
            <Link
              href="/rugeegg/handlekurv"
              className="relative p-2 text-neutral-700 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-all focus-ring"
              aria-label={t.eggs.common.cartAria}
            >
              <ShoppingBag className="w-5 h-5" />
              {totalEggs > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-neutral-900 text-white text-xs font-semibold rounded-full flex items-center justify-center">
                  {totalEggs}
                </span>
              )}
            </Link>

            {/* Language toggle */}
            <button
              onClick={() => setLanguage(language === 'no' ? 'en' : 'no')}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-neutral-700 hover:text-neutral-900 rounded hover:bg-neutral-100 transition-all focus-ring"
              aria-label={t.eggs.common.toggleLanguageAria}
            >
              <Globe className="w-4 h-4" />
              <span className="uppercase text-xs tracking-wider">{language}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
