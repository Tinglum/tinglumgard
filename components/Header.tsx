"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme, type ThemeMode } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

export function Header() {
  const { t, lang, setLang } = useLanguage();
  const { theme, setTheme, getThemeClasses } = useTheme();
  const { user, isAuthenticated, logout } = useAuth();
  const themeClasses = getThemeClasses();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleVippsLogin = () => {
    window.location.href = '/api/auth/vipps/login?returnTo=/min-side';
  };

  const getLastFourDigits = (phoneNumber?: string) => {
    if (!phoneNumber) return '****';
    return phoneNumber.slice(-4);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      <div className="relative">
        {/* Premium glassmorphic background with enhanced depth */}
        <div className={cn("absolute inset-0 glass-card-strong border-b", themeClasses.borderSecondary)} />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 sm:h-20 md:h-24 items-center justify-between">

            {/* Brand */}
            <Link
              href="/"
              className={cn("group flex items-center gap-2 sm:gap-3 transition-colors", themeClasses.textPrimary, `hover:${themeClasses.textSecondary}`)}
            >
              <div className={cn("w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white font-bold text-xs sm:text-sm shadow-md group-hover:shadow-lg transition-all", themeClasses.buttonPrimary)}>
                TG
              </div>
              <span className="text-base sm:text-lg font-bold tracking-tight truncate">
                Tinglum Gård
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className={cn("px-5 py-2.5 text-sm font-semibold rounded-xl transition-all", themeClasses.textSecondary, themeClasses.buttonSecondaryHover)}
              >
                {t.nav.products}
              </Link>
              <Link
                href="/oppdelingsplan"
                className={cn("px-5 py-2.5 text-sm font-semibold rounded-xl transition-all", themeClasses.textSecondary, themeClasses.buttonSecondaryHover)}
              >
                {t.nav.oppdelingsplan}
              </Link>
              <Link
                href="/min-side"
                className={cn("px-5 py-2.5 text-sm font-semibold rounded-xl transition-all", themeClasses.textSecondary, themeClasses.buttonSecondaryHover)}
              >
                {t.nav.myOrders}
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Theme toggle */}
              <div className="hidden sm:flex items-center gap-1 px-2 py-1 bg-white/30 backdrop-blur-sm rounded-lg">
                <button
                  onClick={() => setTheme('warm')}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'warm' ? "bg-amber-100 text-amber-900" : "text-slate/60 hover:text-charcoal hover:bg-white/50"
                  )}
                  title="Warm Brown"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="5"/>
                  </svg>
                </button>
                <button
                  onClick={() => setTheme('monochrome')}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'monochrome' ? "bg-gray-200 text-black" : "text-slate/60 hover:text-charcoal hover:bg-white/50"
                  )}
                  title="Black & White"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18V4c4.41 0 8 3.59 8 8s-3.59 8-8 8z"/>
                  </svg>
                </button>
                <button
                  onClick={() => setTheme('nordic')}
                  className={cn(
                    "p-2 rounded-md transition-all",
                    theme === 'nordic' ? "bg-blue-100 text-blue-900" : "text-slate/60 hover:text-charcoal hover:bg-white/50"
                  )}
                  title="Nordic Arctic"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2L2 19.5h20L12 2zm0 3.5l7 12.5H5l7-12.5z"/>
                  </svg>
                </button>
              </div>

              {/* Language toggle */}
              <button
                onClick={() => setLang(lang === "no" ? "en" : "no")}
                className={cn("px-3 py-1.5 sm:px-4 sm:py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all", themeClasses.textMuted, themeClasses.buttonSecondaryHover)}
              >
                {lang === "no" ? "EN" : "NO"}
              </button>

              {/* User Profile / Login */}
              {isAuthenticated && user ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg transition-all",
                      themeClasses.buttonSecondaryHover,
                      themeClasses.textPrimary
                    )}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span className="text-sm font-semibold">***{getLastFourDigits(user?.phoneNumber)}</span>
                  </button>

                  {showDropdown && (
                    <div className={cn("absolute right-0 mt-2 w-48 rounded-xl shadow-lg border z-50", themeClasses.bgCard, themeClasses.glassBorder)}>
                      <div className="py-2">
                        <Link
                          href="/min-side"
                          onClick={() => setShowDropdown(false)}
                          className={cn("block px-4 py-2 text-sm transition-colors", themeClasses.textPrimary, themeClasses.buttonSecondaryHover)}
                        >
                          {t.nav.myOrders}
                        </Link>
                        <button
                          onClick={() => {
                            setShowDropdown(false);
                            logout();
                          }}
                          className={cn("w-full text-left px-4 py-2 text-sm transition-colors", themeClasses.textPrimary, themeClasses.buttonSecondaryHover)}
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
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold transition-all",
                    themeClasses.buttonSecondaryHover,
                    themeClasses.textPrimary
                  )}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  <span className="hidden sm:inline">{t.nav.login}</span>
                </button>
              )}

              {/* CTA - glassmorphic */}
              <Link
                href="/bestill"
                className={cn(
                  "flex items-center gap-2 group",
                  "px-4 py-2 sm:px-6 sm:py-3 rounded-xl font-bold text-xs sm:text-sm uppercase tracking-wider backdrop-blur-xl text-white border border-white/20",
                  themeClasses.buttonPrimary,
                  themeClasses.buttonPrimaryHover,
                  "hover:scale-105 hover:shadow-2xl transition-all duration-300"
                )}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span className="hidden xs:inline">{t.product.orderNow}</span>
                <span className="xs:hidden">{t.nav.order}</span>
              </Link>
            </div>

          </div>
        </div>
      </div>
    </header>
  );
}
