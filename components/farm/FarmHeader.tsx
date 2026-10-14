'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, ArrowUpRight, ChevronDown, Menu, ShoppingBag, X } from 'lucide-react'
import { useLanguage } from '@/contexts/LanguageContext'
import { useAuth } from '@/contexts/AuthContext'

export function FarmHeader({ operational = false }: { operational?: boolean }) {
  const pathname = usePathname() || '/'
  const { lang, setLang } = useLanguage()
  const { user, isAuthenticated, logout } = useAuth()
  const [cartCount, setCartCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const menuRef = useRef<HTMLDetailsElement>(null)
  const accountRef = useRef<HTMLDetailsElement>(null)
  const no = lang === 'no'
  const text = (norwegian: string, english: string) => no ? norwegian : english
  const eggs = pathname.startsWith('/rugeegg')
  const chickens = pathname.startsWith('/kyllinger')
  const checkout = pathname.startsWith('/bestill')
  const focusedCheckout = checkout || pathname === '/rugeegg/handlekurv' || pathname.startsWith('/rugeegg/bestill/')
  const links = operational ? [
    { href: '/admin', label: 'Admin', active: pathname.startsWith('/admin') },
    { href: '/milk', label: text('Melk', 'Milk'), active: pathname.startsWith('/milk') },
    { href: '/egg', label: text('Egginnsamling', 'Egg collection'), active: pathname === '/egg' },
    { href: '/', label: text('Gårdsbutikken', 'Farm shop'), active: false },
  ] : [
    { href: '/', label: text('Ullgris', 'Mangalitsa'), active: pathname === '/' || checkout || pathname === '/produkt' || pathname === '/oppdelingsplan' },
    { href: '/rugeegg', label: text('Rugeegg', 'Hatching eggs'), active: eggs },
    { href: '/kyllinger', label: text('Kyllinger', 'Chickens'), active: chickens },
    { href: '/oppskrifter', label: text('Oppskrifter', 'Recipes'), active: pathname.startsWith('/oppskrifter') },
  ]
  const orderHref = eggs ? '/rugeegg' : chickens ? '/kyllinger' : '/#bokser'
  const orderLabel = eggs ? text('Velg rugeegg', 'Choose eggs') : chickens ? text('Velg kyllinger', 'Choose chicks') : checkout ? text('Se boksene', 'See the boxes') : text('Velg din boks', 'Choose your box')

  useEffect(() => {
    if (menuRef.current) menuRef.current.open = false
    if (accountRef.current) accountRef.current.open = false
  }, [pathname])

  useEffect(() => {
    const readCart = () => {
      try {
        const cart: unknown = JSON.parse(localStorage.getItem('tinglumgard_cart') || '[]')
        setCartCount(Array.isArray(cart) ? cart.reduce((total, item) => {
          const quantity = Number(item?.quantity)
          return Number.isFinite(quantity) && quantity > 0 ? total + quantity : total
        }, 0) : 0)
      } catch { setCartCount(0) }
    }
    readCart()
    window.addEventListener('tinglum_cart_updated', readCart)
    window.addEventListener('storage', readCart)
    return () => {
      window.removeEventListener('tinglum_cart_updated', readCart)
      window.removeEventListener('storage', readCart)
    }
  }, [])

  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return }
    const controller = new AbortController()
    async function readUnread() {
      try {
        const response = await fetch('/api/messages/unread-count', { signal: controller.signal })
        if (response.ok) { const data = await response.json(); setUnreadCount(data.unreadCount || 0) }
      } catch { /* The account link remains available if the count is unavailable. */ }
    }
    void readUnread()
    const timer = window.setInterval(readUnread, 30000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [isAuthenticated])

  useEffect(() => {
    const close = (event: PointerEvent | KeyboardEvent) => {
      for (const element of [menuRef.current, accountRef.current]) {
        if (!element?.open) continue
        if (event instanceof KeyboardEvent && event.key === 'Escape') {
          element.open = false
          element.querySelector('summary')?.focus()
        } else if (event instanceof PointerEvent && event.target instanceof Node && !element.contains(event.target)) element.open = false
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', close) }
  }, [])

  return <header className="farm-header" data-journey={focusedCheckout ? 'checkout' : 'browse'}>
    <a href="#farm-main" className="farm-skip">{text('Gå til innholdet', 'Skip to content')}</a>
    <Link href="/" className="farm-wordmark" aria-label="Tinglum Gård"><span>TINGLUM</span><span>GÅRD<span className="farm-dot">.</span></span></Link>
    {focusedCheckout && <span className="farm-checkout-brand-copy">{text('Bestilling direkte fra gården', 'Order directly from the farm')}</span>}
    <nav className="farm-desktop-nav" aria-label={text('Hovedmeny', 'Main navigation')}>{links.map(link => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined}>{link.label}</Link>)}</nav>
    <div className="farm-header-actions">
      {(eggs || cartCount > 0) && <Link href="/rugeegg/handlekurv" className="farm-cart-link" aria-label={text(`Handlekurv, ${cartCount} egg`, `Cart, ${cartCount} eggs`)}><ShoppingBag size={18} />{cartCount > 0 && <span>{cartCount}</span>}</Link>}
      <button className="farm-language" aria-label={text('Switch to English', 'Bytt til norsk')} onClick={() => setLang(no ? 'en' : 'no')}>{no ? 'EN' : 'NO'}</button>
      <details ref={accountRef} className="farm-account"><summary>{text('Min side', 'My account')}{unreadCount > 0 && <span className="farm-message-count">{unreadCount}</span>}<ChevronDown size={14} /></summary><div className="farm-account-panel">{user && <p>{user.name}</p>}<Link href="/min-side">{text('Bestillinger og meldinger', 'Orders and messages')}<ArrowUpRight size={15} /></Link>{!isAuthenticated && <a href="/api/auth/vipps/login?returnTo=%2Fmin-side">{text('Logg inn med Vipps', 'Log in with Vipps')}<ArrowUpRight size={15} /></a>}{user?.isAdmin && <><Link href="/admin">Admin<ArrowUpRight size={15} /></Link><Link href="/milk">{text('Melk og meieri', 'Milk and dairy')}<ArrowUpRight size={15} /></Link><Link href="/egg">{text('Egginnsamling', 'Egg collection')}<ArrowUpRight size={15} /></Link></>}{isAuthenticated && <button onClick={() => void logout()}>{text('Logg ut', 'Log out')}</button>}</div></details>
      {!operational && (focusedCheckout ? <a href="mailto:post@tinglum.com" className="farm-checkout-help">{text('Trenger du hjelp?', 'Need help?')}<ArrowUpRight size={15} /></a> : <Link href={orderHref} className="farm-nav-cta">{orderLabel}<ArrowRight size={16} /></Link>)}
      <details ref={menuRef} className="farm-mobile-menu"><summary aria-label={text('Meny', 'Menu')}><Menu className="farm-menu-open" size={21} /><X className="farm-menu-close" size={21} /></summary><nav aria-label={text('Mobilmeny', 'Mobile navigation')}>{links.map(link => <Link key={link.href} href={link.href} aria-current={link.active ? 'page' : undefined} onClick={() => { if (menuRef.current) menuRef.current.open = false }}>{link.label}<ArrowUpRight size={18} /></Link>)}<Link href="/min-side">{text('Min side', 'My account')}<ArrowUpRight size={18} /></Link><Link href="/oppdelingsplan">{text('Stykningsdelene', 'The cuts')}<ArrowUpRight size={18} /></Link><Link href="/rugeegg/rugetips">{text('Rugetips', 'Hatching tips')}<ArrowUpRight size={18} /></Link>{!isAuthenticated && <a href="/api/auth/vipps/login?returnTo=%2Fmin-side">{text('Logg inn med Vipps', 'Log in with Vipps')}<ArrowUpRight size={18} /></a>}</nav></details>
    </div>
  </header>
}
