"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ShoppingBag } from "lucide-react";

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, getThemeClasses } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const themeClasses = getThemeClasses();
  const pathname = usePathname();
  const isEggRoute = pathname?.startsWith('/rugeegg');
  const [showDropdown, setShowDropdown] = useState(false);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [eggCartCount, setEggCartCount] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Detect scroll for header transformation
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch unread message count when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnreadCount();
      // Poll every 30 seconds for new messages
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
      console.error('Failed to fetch unread message count:', error);
    }
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
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
        if (!stored) {
          setEggCartCount(0);
          return;
        }
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) {
          throw new Error('Invalid cart payload');
        }

        const total = parsed.reduce((sum, item) => {
          const quantity = Number(item?.quantity);
          const hasRequiredShape =
            item &&
            typeof item === 'object' &&
            item.breed &&
            item.week &&
            item.week.deliveryMonday &&
            item.week.orderCutoffDate;

          if (!hasRequiredShape || !Number.isFinite(quantity) || quantity < 0) {
            throw new Error('Invalid cart item');
          }

          return sum + quantity;
        }, 0);

        setEggCartCount(total);
      } catch (error) {
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
    const returnTo = isEggRoute ? '/rugeegg/mine-bestillinger' : '/min-side';
    window.location.href = `/api/auth/vipps/login?returnTo=${encodeURIComponent(returnTo)}`;
  };

  const getLastFourDigits = (phoneNumber?: string) => {
    if (!phoneNumber) return '****';
    return phoneNumber.slice(-4);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Minimalist glassmorphic background with dramatic shadow */}
        <div
          className={cn(
            "absolute inset-0 transition-all duration-500",
            scrolled ? "backdrop-blur-2xl bg-white/95" : "backdrop-blur-xl bg-white/80"
          )}
          style={{
            borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.06)' : '1px solid rgba(0, 0, 0, 0.04)',
            boxShadow: scrolled
              ? '0 20px 60px -15px rgba(0, 0, 0, 0.15)'
              : '0 10px 30px -10px rgba(0, 0, 0, 0.08)'
          }}
        />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-20 items-center justify-between">

            {/* Brand - Clean minimalist */}
            <Link
              href="/"
              className="group flex items-center gap-3 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center bg-neutral-900 text-white font-bold text-sm transition-all duration-300 group-hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]"
              >
                TG
              </div>
              <span className="text-lg font-light tracking-tight text-neutral-900 transition-colors">
                Tinglum Gård
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {isEggRoute ? (
                <>
                  <Link
                    href="/rugeegg/raser"
                    className="px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                  >
                    {t.nav.breeds}
                  </Link>
                  <Link
                    href="/rugeegg/rugetips"
                    className="px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                  >
                    {t.nav.hatchingTips}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/"
                    className="px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                  >
                    {t.nav.products}
                  </Link>
                  <Link
                    href="/oppdelingsplan"
                    className="px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
                  >
                    {t.nav.oppdelingsplan}
                  </Link>
                </>
              )}
              <Link
                href={isEggRoute ? "/rugeegg/mine-bestillinger" : "/min-side"}
                className="relative px-5 py-2.5 text-sm font-light rounded-xl transition-all duration-300 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 hover:-translate-y-0.5"
              >
                {t.nav.myOrders}
                {unreadMessageCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full bg-neutral-900 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                    {unreadMessageCount}
                  </span>
                )}
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              {isEggRoute && eggCartCount > 0 && (
                <Link
                  href="/rugeegg/handlekurv"
                  className="relative flex items-center justify-center w-10 h-10 rounded-lg text-neutral-700 bg-neutral-50 hover:bg-white border border-neutral-200 transition-all duration-300 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                  aria-label={lang === "no" ? "Handlekurv" : "Shopping cart"}
                >
                  <ShoppingBag className="w-5 h-5" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {eggCartCount}
                  </span>
                </Link>
              )}
              <Link
                href={isEggRoute ? "/" : "/rugeegg"}
                className="hidden md:inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 text-neutral-700 bg-white border border-neutral-200 hover:text-neutral-900 hover:shadow-[0_6px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
              >
                {isEggRoute ? t.nav.goToPigs : t.nav.goToEggs}
              </Link>
              {/* Language toggle - Minimalist */}
              <button
                onClick={() => setLang(lang === "no" ? "en" : "no")}
                className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all duration-300 text-neutral-600 hover:text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
              >
                {lang === "no" ? "EN" : "NO"}
              </button>

              {/* User Profile / Login - Minimalist */}
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-300 text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
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
                          href={isEggRoute ? "/rugeegg/mine-bestillinger" : "/min-side"}
                          onClick={() => setShowDropdown(false)}
                          className="relative flex items-center justify-between px-4 py-3 text-sm font-light transition-all duration-200 text-neutral-900 hover:bg-neutral-50"
                        >
                          <span>{t.nav.myOrders}</span>
                          {unreadMessageCount > 0 && (
                            <span className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-white rounded-full bg-neutral-900">
                              {unreadMessageCount}
                            </span>
                          )}
                        </Link>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            logout();
                          }}
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
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-light transition-all duration-300 text-neutral-900 bg-neutral-50 hover:bg-white border border-neutral-200 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] hover:-translate-y-0.5"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">{t.nav.login}</span>
                </button>
              )}

              {/* CTA - Minimalist with dramatic shadow */}
              <Link
                href={isEggRoute ? "/rugeegg/handlekurv" : "/bestill"}
                className="group flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm uppercase tracking-wider text-white bg-neutral-900 transition-all duration-300 hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:-translate-y-1"
              >
                <svg className="w-4 h-4 transition-transform group-hover:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="hidden sm:inline">{t.product.orderNow}</span>
                <span className="sm:hidden">{t.nav.order}</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
