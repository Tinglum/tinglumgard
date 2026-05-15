"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ShoppingBag, X, Menu } from "lucide-react";
import { logError } from "@/lib/logger";

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, getThemeClasses } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const themeClasses = getThemeClasses();
  const pathname = usePathname();
  const isEggRoute = pathname?.startsWith('/rugeegg');
  const isChickenRoute = pathname?.startsWith('/kyllinger');
  const currentSection: 'pigs' | 'eggs' | 'chickens' =
    isEggRoute ? 'eggs' : isChickenRoute ? 'chickens' : 'pigs';
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false); // Fix #1: mobile drawer state
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [eggCartCount, setEggCartCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/messages/unread-count');
      if (response.ok) {
        const data = await response.json();
        setUnreadMessageCount(data.unreadCount || 0);
      }
    } catch (error) {
      logError('Failed to fetch unread message count', error);
    }
  }

  // Fix #11: pointerdown fires reliably on iOS Safari; mousedown does not
  useEffect(() => {
    function handlePointerOutside(event: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) {
      document.addEventListener('pointerdown', handlePointerOutside);
      return () => document.removeEventListener('pointerdown', handlePointerOutside);
    }
  }, [showDropdown]);

  useEffect(() => {
    if (!isEggRoute) {
      setEggCartCount(0);
      return;
    }

    const readCartCount = () => {
      try {
        const stored = localStorage.getItem('tinglumgard_cart');
        if (!stored) { setEggCartCount(0); return; }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) throw new Error('Invalid cart payload');
        const total = parsed.reduce((sum, item) => {
          const quantity = Number(item?.quantity);
          const hasRequiredShape =
            item && typeof item === 'object' && item.breed &&
            item.week && item.week.deliveryMonday && item.week.orderCutoffDate;
          if (!hasRequiredShape || !Number.isFinite(quantity) || quantity < 0) throw new Error('Invalid cart item');
          return sum + quantity;
        }, 0);
        setEggCartCount(total);
      } catch {
        localStorage.removeItem('tinglumgard_cart');
        setEggCartCount(0);
      }
    };

    readCartCount();
    const handler = () => readCartCount();
    window.addEventListener('tinglum_cart_updated', handler);
    return () => window.removeEventListener('tinglum_cart_updated', handler);
  }, [isEggRoute, pathname]);

  const handleVippsLogin = () => {
    const returnTo = '/min-side';
    window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const getLastFourDigits = (phoneNumber?: string) => {
    if (!phoneNumber) return '****';
    return phoneNumber.slice(-4);
  };

  // Section switcher links — used in both desktop header and mobile drawer
  const sectionLinks = [
    { section: 'pigs' as const, href: '/', label: t.nav.goToPigs },
    { section: 'eggs' as const, href: '/rugeegg', label: t.nav.goToEggs },
    { section: 'chickens' as const, href: '/kyllinger', label: t.nav.goToChickens },
  ].filter((l) => l.section !== currentSection);

  // Page nav links — context-aware
  const navLinks = isEggRoute
    ? [
        { href: '/rugeegg/raser', label: t.nav.breeds },
        { href: '/rugeegg/rugetips', label: t.nav.hatchingTips },
      ]
    : [
        { href: '/', label: t.nav.products },
        { href: '/oppdelingsplan', label: t.nav.oppdelingsplan },
      ];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50">
        <div className="relative">
          <div
            className={cn(
              "absolute inset-0 transition-all duration-500",
              scrolled ? "backdrop-blur-2xl bg-white/95" : "backdrop-blur-xl bg-white/80"
            )}
            style={{
              borderBottom: scrolled ? '1px solid rgba(0,0,0,0.06)' : '1px solid rgba(0,0,0,0.04)',
              boxShadow: scrolled
                ? '0 20px 60px -15px rgba(0,0,0,0.15)'
                : '0 10px 30px -10px rgba(0,0,0,0.08)',
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {/* Fix #4: h-14 on mobile, h-20 on sm+ */}
            <div className="flex h-14 sm:h-20 items-center justify-between">

              {/* Brand */}
              <Link
                href="/"
                className="group flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center bg-neutral-900 text-white font-bold text-sm transition-all duration-300 group-hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]">
                  TG
                </div>
                <span className="text-base sm:text-lg font-light tracking-tight text-neutral-900 transition-colors">
                  Tinglum Gård
                </span>
              </Link>

              {/* Desktop nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  href="/min-side"
                  className="relative px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                >
                  {t.nav.myOrders}
                  {unreadMessageCount > 0 && (
                    // Fix #14: min 22px, text-xs (12px)
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-bold text-white rounded-full bg-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                      {unreadMessageCount}
                    </span>
                  )}
                </Link>
              </nav>

              {/* Right actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                {isEggRoute && eggCartCount > 0 && (
                  <Link
                    href="/rugeegg/handlekurv"
                    className="relative flex items-center justify-center w-10 h-10 rounded-lg text-neutral-700 bg-neutral-50 hover:bg-white border border-neutral-200 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-95"
                    aria-label={lang === "no" ? "Handlekurv" : "Shopping cart"}
                  >
                    <ShoppingBag className="w-5 h-5" />
                    {/* Fix #14: min 22px badge */}
                    <span className="absolute -top-1 -right-1 min-w-[22px] h-[22px] px-1 bg-neutral-900 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {eggCartCount}
                    </span>
                  </Link>
                )}

                {/* Desktop section switchers — Fix #10: hidden on mobile, handled by drawer */}
                <div className="hidden lg:flex items-center gap-2">
                  {sectionLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 border text-neutral-700 bg-white border-neutral-200 hover:text-neutral-900 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 active:scale-95"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>

                {/* Language toggle */}
                <button
                  onClick={() => setLang(lang === "no" ? "en" : "no")}
                  className="px-3 sm:px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-95"
                >
                  {lang === "no" ? "EN" : "NO"}
                </button>

                {/* User / login — desktop only */}
                {isAuthenticated && user ? (
                  <div className="relative hidden md:block" ref={dropdownRef}>
                    <button
                      onClick={() => setShowDropdown(!showDropdown)}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-95"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span className="text-sm font-light">***{getLastFourDigits(user?.phoneNumber)}</span>
                    </button>
                    {showDropdown && (
                      <div className="absolute right-0 mt-2 w-48 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.2)] z-50 overflow-hidden backdrop-blur-xl bg-white border border-neutral-200">
                        <div className="py-2">
                          <Link
                            href="/min-side"
                            onClick={() => setShowDropdown(false)}
                            className="relative flex items-center justify-between px-4 py-3 text-sm font-light transition-all duration-200 text-neutral-900 hover:bg-neutral-50"
                          >
                            <span>{t.nav.myOrders}</span>
                            {unreadMessageCount > 0 && (
                              <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-bold text-white rounded-full bg-neutral-900">
                                {unreadMessageCount}
                              </span>
                            )}
                          </Link>
                          <button
                            onClick={() => { setShowDropdown(false); logout(); }}
                            className="w-full text-left px-4 py-3 text-sm font-light transition-all duration-200 text-neutral-900 hover:bg-neutral-50"
                          >
                            {t.nav.logout}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={handleVippsLogin}
                    className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5 active:scale-95"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>{t.nav.login}</span>
                  </button>
                )}

                {/* Desktop CTA */}
                <Link
                  href={isEggRoute ? "/rugeegg/handlekurv" : "/bestill"}
                  className="hidden md:flex group items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-neutral-900 transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-1 active:scale-95"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  {t.product.orderNow}
                </Link>

                {/* Fix #1: hamburger — visible only on mobile */}
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-neutral-700 bg-neutral-50 border border-neutral-200 active:scale-95 transition-transform"
                  aria-label={menuOpen ? "Lukk meny" : "Åpne meny"}
                  aria-expanded={menuOpen}
                >
                  {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Fix #1: Mobile drawer — slides in from right, covers full height */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
          aria-hidden="true"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
        </div>
      )}
      <div
        className={cn(
          "fixed top-0 right-0 bottom-0 z-50 w-[min(320px,90vw)] bg-white shadow-[−20px_0_60px_rgba(0,0,0,0.15)] transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          menuOpen ? "translate-x-0" : "translate-x-full"
        )}
        style={{ paddingTop: 'calc(env(safe-area-inset-top) + 3.5rem)' }}
        aria-label="Navigasjon"
      >
        {/* Close button */}
        <button
          onClick={() => setMenuOpen(false)}
          className="absolute top-3 right-4 flex items-center justify-center w-10 h-10 rounded-lg text-neutral-600 hover:bg-neutral-100 active:scale-95 transition-transform"
          aria-label="Lukk meny"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-1">
          {/* Page-specific links */}
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center h-12 px-4 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/min-side"
            className="relative flex items-center h-12 px-4 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
          >
            {t.nav.myOrders}
            {unreadMessageCount > 0 && (
              <span className="ml-2 flex items-center justify-center min-w-[22px] h-[22px] px-1 text-xs font-bold text-white rounded-full bg-neutral-900">
                {unreadMessageCount}
              </span>
            )}
          </Link>

          {/* Fix #10: section switchers visible in mobile drawer */}
          {sectionLinks.length > 0 && (
            <>
              <div className="my-3 border-t border-neutral-100" />
              <p className="px-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-400 mb-1">
                {lang === 'no' ? 'Gå til' : 'Go to'}
              </p>
              {sectionLinks.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="flex items-center h-12 px-4 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors"
                >
                  {l.label}
                </Link>
              ))}
            </>
          )}

          {/* Auth */}
          <div className="my-3 border-t border-neutral-100" />
          {isAuthenticated && user ? (
            <>
              <div className="px-4 py-2 text-xs text-neutral-500">
                ***{getLastFourDigits(user?.phoneNumber)}
              </div>
              <button
                onClick={() => { setMenuOpen(false); logout(); }}
                className="flex items-center h-12 w-full px-4 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
              >
                {t.nav.logout}
              </button>
            </>
          ) : (
            <button
              onClick={() => { setMenuOpen(false); handleVippsLogin(); }}
              className="flex items-center h-12 w-full px-4 rounded-xl text-sm font-normal text-neutral-700 hover:bg-neutral-50 active:bg-neutral-100 transition-colors text-left"
            >
              {t.nav.login}
            </button>
          )}
        </div>

        {/* CTA pinned to bottom of drawer */}
        <div className="px-5 py-4 border-t border-neutral-100"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <Link
            href={isEggRoute ? "/rugeegg/handlekurv" : "/bestill"}
            onClick={() => setMenuOpen(false)}
            className="flex items-center justify-center gap-2 w-full rounded-2xl bg-neutral-900 px-6 py-4 font-bold text-sm uppercase tracking-wider text-white active:scale-[0.98] transition-transform"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {t.product.orderNow}
          </Link>
        </div>
      </div>
    </>
  );
}
