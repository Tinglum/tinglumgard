'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { InstagramFeed } from "@/components/InstagramFeed";
import { getHeroStyles, getBannerStyles, getInventoryStyles } from "@/lib/theme-utils";

interface InventoryData {
  season: string;
  kgRemaining: number;
  boxesRemaining: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  active: boolean;
}

export default function Page() {
  const { t } = useLanguage();
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const heroStyles = getHeroStyles(theme);
  const bannerStyles = getBannerStyles(theme);
  const inventoryStyles = getInventoryStyles(theme);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch('/api/inventory', { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          setInventory(data);
        }
      } catch (error) {
        console.error('Failed to fetch inventory:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const boxesLeft = inventory?.boxesRemaining ?? 0;
  const isSoldOut = inventory?.isSoldOut ?? false;
  const isLowStock = inventory?.isLowStock ?? false;

  return (
    <>
      {/* HERO - Floating glassmorphic card with parallax background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-x-hidden px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24">

        {/* Animated background gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div
            className={`absolute top-0 left-1/4 w-[800px] h-[800px] rounded-full bg-gradient-to-br ${theme.bgGradientOrbs[0]} via-transparent to-transparent blur-3xl`}
            style={{ transform: `translate(${Math.min(scrollY * 0.3, 0)}px, ${scrollY * 0.2}px)` }}
          />
          <div
            className={`absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full bg-gradient-to-tl ${theme.bgGradientOrbs[1]} via-transparent to-transparent blur-3xl`}
            style={{ transform: `translate(${Math.max(-scrollY * 0.2, 0)}px, -${scrollY * 0.15}px)` }}
          />
        </div>

        <div className="w-full max-w-6xl mx-auto">
          <div className="max-w-3xl">

            {/* Premium badge - animated */}
            <div className={`${heroStyles.badge} mb-10`}>
              <div className={heroStyles.badgeDot} />
              <span className={heroStyles.badgeText}>
                Sesong 2026
              </span>
            </div>

            {/* Headline */}
            <div className="space-y-6 mb-10">
              <h1 className={heroStyles.headline}>
                Ullgris fra
                <br />
                <span className={heroStyles.headlineGradient}>
                  Tinglum Gård2
                </span>
              </h1>

              <p className={heroStyles.description}>
                Gris fra Tinglum Gård i Namdalseid. Grisene vokser opp på gården gjennom 2026, slaktes lokalt i desember, og leveres fersk til døren din.
              </p>
            </div>

            {/* CTA Buttons - glassmorphic */}
            <div className="flex flex-wrap items-center gap-4 mb-10">
              <Link
                href={isSoldOut ? "#waitlist" : "/bestill"}
                className={heroStyles.buttonPrimary}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10 flex items-center gap-2">
                  {isSoldOut ? "Bli med på venteliste" : "Reserver nå"}
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </span>
              </Link>

              <Link
                href="/produkt"
                className={heroStyles.buttonSecondary}
              >
                Les mer om produktet
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 md:gap-8 pt-4">
              <div className="flex items-center gap-2">
                <svg className={`w-5 h-5 ${heroStyles.trustIcon}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
                  <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/>
                </svg>
                <span className={heroStyles.trustText}>Lokalt oppvokst</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className={`w-5 h-5 ${heroStyles.trustIcon}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className={heroStyles.trustText}>Kvalitetsgaranti</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* PRODUCT SHOWCASE - Card grid with hover effects */}
      <section className={`relative py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-b ${theme.bgPrimary} ${theme.bgSecondary}`}>

        {/* Section header */}
        <div className="max-w-6xl mx-auto mb-16 text-center">
          <span className={`inline-block px-4 py-2 ${theme.accentSecondary} rounded-full text-xs uppercase tracking-wider ${theme.textSecondary} font-semibold mb-4`}>
            Velg din pakke
          </span>
          <h2 className={`text-4xl md:text-5xl font-bold ${theme.textPrimary} mb-4`}>
            To størrelser å velge mellom
          </h2>
          <p className={`text-lg ${theme.textMuted} max-w-2xl mx-auto`}>
            Samme høye kvalitet uansett størrelse. Velg pakken som passer best for din husholdning.
          </p>
        </div>

        {/* Product cards */}
        <div className="max-w-6xl mx-auto grid sm:grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">

          {/* 8 KG Package */}
          <div className="group relative">
            {/* Glow effect behind card */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            <div className={`relative h-full glass-card rounded-3xl p-10 border-2 ${theme.borderPrimary}`}>

              <div className="relative z-10 space-y-8">

                {/* Package label */}
                <div className="space-y-2">
                  <span className={`inline-block px-3 py-1 ${theme.accentSecondary} rounded-full text-xs uppercase tracking-wider ${theme.textMuted} font-semibold`}>
                    Mindre pakke
                  </span>
                  <h3 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${theme.textPrimary}`}>
                    8 <span className={`text-2xl sm:text-2xl md:text-3xl ${theme.textMuted}`}>kg</span>
                  </h3>
                  <p className={`text-sm ${theme.textMuted}`}>
                    Perfekt for 2-3 personer eller mindre forbruk
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h4 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>I hver 8 kg kasse:</h4>
                  <ul className="space-y-2">
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary} font-medium`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 2.0 kg ribbe (velg type)</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 0.75 kg nakkekoteletter</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 0.5 kg julepølse</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.0 kg svinesteik</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.0 kg medisterfarse</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>1 knoke</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textMuted}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>+ Slakterens valg (ca. 2-3 kg)</span>
                    </li>
                  </ul>
                  {/* Spacer to match 12kg card height */}
                  <div className={`mt-4 pt-4 border-t ${theme.borderSecondary}`}>
                    <div className="flex items-center gap-2 text-sm text-transparent font-bold pointer-events-none select-none">
                      <svg className="w-5 h-5 flex-shrink-0 opacity-0" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Spacer
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className={`space-y-4 pt-6 border-t ${theme.borderSecondary}`}>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-sm uppercase tracking-wide ${theme.textMuted} font-bold`}>Totalpris</span>
                    <span className={`text-4xl font-bold ${theme.textPrimary}`}>3 500<span className={`text-xl ${theme.textMuted} ml-1`}>kr</span></span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className={`${theme.textMuted} font-medium`}>Forskudd (50%)</span>
                    <span className={`${theme.textPrimary} font-bold`}>1 750 kr</span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className={`${theme.textMuted} font-medium`}>Rest ved levering</span>
                    <span className={`${theme.textPrimary} font-bold`}>1 750 kr</span>
                  </div>
                </div>

                {/* CTA - glassmorphic */}
                <Link
                  href="/bestill?size=8"
                  className={`group block w-full text-center px-6 sm:px-8 py-3 sm:py-4 ${theme.buttonPrimary} ${theme.buttonPrimaryHover} backdrop-blur-xl text-white rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider hover:scale-105 transition-all duration-300 shadow-xl hover:shadow-2xl border border-white/20`}
                >
                  <span className="flex items-center justify-center gap-2">
                    Reserver 8 kg pakke
                    <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>

              </div>
            </div>
          </div>

          {/* 12 KG Package - Featured */}
          <div className="group relative">

            {/* Glow effect behind card - stronger */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-3xl blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />

            {/* "Most Popular" badge - enhanced */}
            <div className={`absolute -top-4 left-1/2 -translate-x-1/2 z-20 px-6 py-2.5 ${theme.accentBadge} text-white rounded-full text-xs uppercase tracking-[0.2em] font-bold shadow-xl group-hover:shadow-2xl transition-shadow`}>
              <span className="relative flex items-center gap-2">
                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                Mest populær
              </span>
            </div>

            <div className={`relative h-full glass-card-strong rounded-3xl p-10 border-2 ${theme.borderSecondary} ring-2 ring-current/5`}>

              <div className="relative z-10 space-y-8">

                {/* Package label */}
                <div className="space-y-2">
                  <span className={`inline-block px-3 py-1 ${theme.accentSecondary} rounded-full text-xs uppercase tracking-wider ${theme.textPrimary} font-bold`}>
                    Større pakke
                  </span>
                  <h3 className={`text-4xl sm:text-5xl md:text-6xl font-bold ${theme.textPrimary}`}>
                    12 <span className={`text-2xl sm:text-2xl md:text-3xl ${theme.textMuted}`}>kg</span>
                  </h3>
                  <p className={`text-sm ${theme.textMuted}`}>
                    Ideell for 4-6 personer eller større forbruk
                  </p>
                </div>

                {/* Features */}
                <div className="space-y-4">
                  <h4 className={`text-sm font-bold ${theme.textPrimary} uppercase tracking-wider`}>I hver 12 kg kasse:</h4>
                  <ul className="space-y-2">
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary} font-medium`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 3.0 kg ribbe (velg type)</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.0 kg nakkekoteletter</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.0 kg julepølse</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.0 kg svinesteik</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>ca. 1.5 kg medisterfarse</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textPrimary}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>1 knoke</span>
                    </li>
                    <li className={`flex items-start gap-2 text-sm ${theme.textMuted}`}>
                      <svg className={`w-4 h-4 ${theme.textPrimary} flex-shrink-0 mt-0.5`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                      </svg>
                      <span>+ Slakterens valg (ca. 3.5-4.5 kg)</span>
                    </li>
                  </ul>
                  <div className={`mt-4 pt-4 border-t ${theme.borderSecondary}`}>
                    <div className={`flex items-center gap-2 text-sm ${theme.textPrimary} font-bold`}>
                      <svg className={`w-5 h-5 ${theme.textPrimary} flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      Bedre pris per kg
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className={`space-y-4 pt-6 border-t ${theme.borderSecondary}`}>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-sm uppercase tracking-wide ${theme.textMuted} font-bold`}>Totalpris</span>
                    <span className={`text-4xl font-bold ${theme.textPrimary}`}>4 800<span className={`text-xl ${theme.textMuted} ml-1`}>kr</span></span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className={`${theme.textMuted} font-medium`}>Forskudd (50%)</span>
                    <span className={`${theme.textPrimary} font-bold`}>2 400 kr</span>
                  </div>
                  <div className="flex items-baseline justify-between text-sm">
                    <span className={`${theme.textMuted} font-medium`}>Rest ved levering</span>
                    <span className={`${theme.textPrimary} font-bold`}>2 400 kr</span>
                  </div>
                </div>

                {/* CTA - enhanced glassmorphic */}
                <Link
                  href="/bestill?size=12"
                  className={`group block w-full text-center px-6 sm:px-8 py-3 sm:py-4 ${theme.buttonPrimary} ${theme.buttonPrimaryHover} backdrop-blur-xl text-white rounded-2xl font-bold text-sm sm:text-base uppercase tracking-wider hover:scale-105 transition-all duration-300 shadow-2xl border border-white/20 relative overflow-hidden`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Reserver 12 kg pakke
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </span>
                </Link>

              </div>
            </div>
          </div>

        </div>
      </section>

      {/* CTA BANNER - Warm contrast solid background */}
      <section className={`relative py-24 px-6 overflow-hidden ${bannerStyles.background}`}>

        {/* Warm gradient overlay for depth */}
        <div className={bannerStyles.gradient} />
        <div className={`absolute inset-0 bg-gradient-to-t ${theme.bgDark}/60 via-transparent ${theme.bgDark}/30`} />

        {/* Animated background pattern - warm tones */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 animate-pulse" style={{
            backgroundImage: `radial-gradient(circle, ${theme.bannerPattern} 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Floating orbs - warm glows */}
        <div className={`absolute top-0 left-1/4 w-[500px] h-[500px] ${theme.bannerOrbs[0]} rounded-full blur-3xl animate-pulse`} />
        <div className={`absolute bottom-0 right-1/4 w-[400px] h-[400px] ${theme.bannerOrbs[1]} rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1.5s' }} />

        <div className="relative z-20 max-w-4xl mx-auto text-center space-y-10">

          <div className="space-y-6">
            <div className="inline-block px-6 py-2.5 bg-white/25 backdrop-blur-xl rounded-full border border-white/50 shadow-xl mb-4">
              <span className={`text-xs uppercase tracking-widest ${bannerStyles.text} font-bold drop-shadow-lg`}>Begrenset tilbud</span>
            </div>
            <h2 className={`text-4xl md:text-6xl font-bold ${bannerStyles.text} drop-shadow-2xl [text-shadow:_0_4px_12px_rgb(44_24_16_/_60%)]`}>
              Kun én sesong i året
            </h2>
            <p className={`text-xl md:text-2xl ${bannerStyles.text} max-w-2xl mx-auto leading-relaxed font-light drop-shadow-lg`}>
              Vi produserer kun det vi har kapasitet til. Når sesongens kasser er reservert, stenger vi bestillingen til 2027.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-4">
            <Link
              href="/bestill"
              className={`group ${bannerStyles.button}`}
            >
              <span className="flex items-center gap-3">
                Reserver din pakke nå
                <svg className="w-6 h-6 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </span>
            </Link>
            <Link
              href="/produkt"
              className={bannerStyles.buttonOutline}
            >
              Les mer
            </Link>
          </div>

        </div>
      </section>

      {/* INVENTORY COUNTER - Floating glassmorphic card */}
      <section className={`relative py-24 px-6 bg-gradient-to-b ${theme.bgPrimary} ${theme.bgSecondary}`}>
        <div className="max-w-2xl mx-auto">
          <div className="relative animate-in fade-in duration-1000">
            {/* Glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-3xl blur-2xl opacity-50`} />

            <div className={`relative glass-card-strong rounded-3xl p-10 border-2 ${theme.borderPrimary}`}>
              {/* Animated gradient overlay */}
              <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} via-transparent ${theme.bgGradientOrbs[1]} rounded-3xl pointer-events-none`} />

              {/* Shimmer effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-shimmer rounded-3xl pointer-events-none" />

              <div className="relative z-10 space-y-8">

                {/* Status badge */}
                <div className="flex items-center justify-between">
                  <span className={`text-xs uppercase tracking-wider ${theme.textMuted} font-bold`}>
                    Tilgjengelighet
                  </span>
                  {isLowStock && !isSoldOut && (
                    <span className={inventoryStyles.badge}>
                      Få igjen
                    </span>
                  )}
                  {isSoldOut && (
                    <span className={`px-4 py-1.5 ${theme.accentSecondary} backdrop-blur-sm ${theme.textSecondary} rounded-full text-xs font-bold border ${theme.borderSecondary}`}>
                      Utsolgt
                    </span>
                  )}
                </div>

                {/* Big number display */}
                <div className="text-center py-8 relative flex items-center justify-center">

                  {/* Box/Crate background with warm glow */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-56 h-56 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.accentSecondary} ${theme.bgGradientOrbs[1]} rounded-3xl blur-3xl animate-pulse`} />
                  </div>

                  {/* Simple card with number */}
                  <div className="relative">
                    <div className={`relative bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} backdrop-blur-sm rounded-2xl border-2 ${theme.borderSecondary} shadow-2xl p-8 min-w-[240px]`}>

                      {/* Top edge highlight */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/40 to-transparent rounded-t-2xl" />

                      {/* Number */}
                      <div className={inventoryStyles.number}>
                        {loading ? "—" : boxesLeft}
                      </div>

                      {/* Label */}
                      <div className={inventoryStyles.label}>
                        Kasser tilgjengelig
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                {!loading && (
                  <div className="space-y-3">
                    <div className={inventoryStyles.progressBg}>
                      <div
                        className={inventoryStyles.progressFill}
                        style={{ width: `${Math.min((boxesLeft / 50) * 100, 100)}%` }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse" />
                      </div>
                    </div>
                    <p className={`text-xs text-center ${theme.textMuted} font-semibold`}>
                      {isSoldOut ? "Sesongproduksjon fullført" : "Reserver før det er for sent"}
                    </p>
                  </div>
                )}

              </div>
            </div>

            {/* Floating accent elements */}
            <div className={`absolute -top-8 -right-8 w-40 h-40 bg-gradient-to-br ${theme.bgGradientOrbs[0]} to-transparent rounded-full blur-3xl animate-pulse`} />
            <div className={`absolute -bottom-8 -left-8 w-48 h-48 bg-gradient-to-tl ${theme.bgGradientOrbs[1]} to-transparent rounded-full blur-3xl animate-pulse`} style={{ animationDelay: '1s' }} />
          </div>
        </div>
      </section>

      {/* TIMELINE - Animated process with cards */}
      <section className={`relative py-24 px-6 ${theme.bgPrimary} overflow-hidden`}>

        {/* Background decoration */}
        <div className="absolute inset-0 opacity-30">
          <div className={`absolute top-1/4 left-0 w-96 h-96 ${theme.bgGradientOrbs[0]} rounded-full blur-3xl`} />
          <div className={`absolute bottom-1/4 right-0 w-96 h-96 ${theme.bgGradientOrbs[1]} rounded-full blur-3xl`} />
        </div>

        <div className="relative z-10 max-w-4xl mx-auto">

          {/* Section header */}
          <div className="text-center mb-20">
            <span className={`inline-block px-5 py-2 ${theme.bgCard} backdrop-blur-xl rounded-full text-xs uppercase tracking-wider ${theme.textPrimary} font-bold mb-4 border ${theme.borderSecondary} shadow-lg`}>
              Slik fungerer det
            </span>
            <h2 className={`text-4xl md:text-5xl font-bold ${theme.textPrimary} mb-4`}>
              Fra bestilling til levering
            </h2>
            <p className={`text-lg ${theme.textMuted}`}>
              Grisene vokser gjennom 2026 • Fersk levering i desember
            </p>
          </div>

          {/* Timeline steps */}
          <div className="space-y-8">

            {/* Step 1 - January 2026 */}
            <div className="group relative">
              <div className="flex gap-8 items-start">

                {/* Date badge - glassmorphic with glow */}
                <div className="flex-shrink-0 relative">
                  {/* Badge glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl glass-card border-2 ${theme.borderPrimary} flex flex-col items-center justify-center ${theme.textPrimary} font-bold group-hover:scale-110 transition-all duration-300`}>
                    <span className={`text-sm uppercase tracking-wider ${theme.textMuted} font-semibold`}>Jan</span>
                    <span className="text-3xl">26</span>
                  </div>
                  {/* Connecting line - glowing */}
                  <div className={`absolute top-24 left-1/2 -translate-x-1/2 w-1 h-24 bg-gradient-to-b ${theme.borderSecondary} via-transparent to-transparent rounded-full`} />
                </div>

                {/* Content card - enhanced glass */}
                <div className={`flex-1 glass-card rounded-2xl p-8 border-2 ${theme.borderPrimary}`}>
                  <h3 className={`text-2xl font-bold ${theme.textPrimary} mb-3`}>Reserver din pakke nå</h3>
                  <p className={`${theme.textMuted} leading-relaxed mb-4`}>
                    Bestill i dag og betal 50% forskudd. Grisene er nettopp født og vil vokse opp på gården gjennom hele 2026. Du får umiddelbar bekreftelse på e-post.
                  </p>
                  <div className={`flex items-center gap-2 text-sm ${theme.textMuted} font-semibold`}>
                    <svg className={`w-5 h-5 ${theme.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                    Januar 2026 • Bestilling åpner
                  </div>
                </div>
              </div>
            </div>

            {/* Step 2 - Week 46 November 2026 */}
            <div className="group relative">
              <div className="flex gap-8 items-start">

                {/* Week badge - glassmorphic */}
                <div className="flex-shrink-0 relative">
                  {/* Badge glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl glass-card border-2 ${theme.borderPrimary} flex flex-col items-center justify-center ${theme.textPrimary} font-bold group-hover:scale-110 transition-all duration-300`}>
                    <span className={`text-sm uppercase tracking-wider ${theme.textMuted} font-semibold`}>Uke</span>
                    <span className="text-3xl">46</span>
                  </div>
                  {/* Connecting line - glowing */}
                  <div className={`absolute top-24 left-1/2 -translate-x-1/2 w-1 h-24 bg-gradient-to-b ${theme.borderSecondary} via-transparent to-transparent rounded-full`} />
                </div>

                {/* Content card - enhanced glass */}
                <div className={`flex-1 glass-card rounded-2xl p-8 border-2 ${theme.borderPrimary}`}>
                  <h3 className={`text-2xl font-bold ${theme.textPrimary} mb-3`}>Restsum betales</h3>
                  <p className={`${theme.textMuted} leading-relaxed mb-4`}>
                    Innen uke 46 betaler du resterende 50% av totalbeløpet. Du får betalingsinformasjon på e-post.
                  </p>
                  <div className={`flex items-center gap-2 text-sm ${theme.textMuted} font-semibold`}>
                    <svg className={`w-5 h-5 ${theme.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd"/>
                    </svg>
                    Uke 46 (slutten av november) • Betaling
                  </div>
                </div>
              </div>
            </div>

            {/* Step 3 - Week 48 December 2026 */}
            <div className="group relative">
              <div className="flex gap-8 items-start">

                {/* Week badge - glassmorphic */}
                <div className="flex-shrink-0 relative">
                  {/* Badge glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl glass-card border-2 ${theme.borderPrimary} flex flex-col items-center justify-center ${theme.textPrimary} font-bold group-hover:scale-110 transition-all duration-300`}>
                    <span className={`text-sm uppercase tracking-wider ${theme.textMuted} font-semibold`}>Uke</span>
                    <span className="text-3xl">48</span>
                  </div>
                  {/* Connecting line - glowing */}
                  <div className={`absolute top-24 left-1/2 -translate-x-1/2 w-1 h-24 bg-gradient-to-b ${theme.borderSecondary} via-transparent to-transparent rounded-full`} />
                </div>

                {/* Content card - enhanced glass */}
                <div className={`flex-1 glass-card rounded-2xl p-8 border-2 ${theme.borderPrimary}`}>
                  <h3 className={`text-2xl font-bold ${theme.textPrimary} mb-3`}>Slakting og frossen levering</h3>
                  <p className={`${theme.textMuted} leading-relaxed mb-4`}>
                    Grisene slaktes i uke 48. Kjøttet parteres, vakuumpakkes og fryses. Du mottar kassen din frossen. Velg mellom hjemlevering eller henting på våre utleveringssteder.
                  </p>
                  <div className={`flex items-center gap-2 text-sm ${theme.textMuted} font-semibold`}>
                    <svg className={`w-5 h-5 ${theme.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                    </svg>
                    Uke 48 (begynnelsen av desember) • Frossen levering
                  </div>
                </div>
              </div>
            </div>

            {/* Step 4 - Week 50/51 December 2026 - Optional fresh */}
            <div className="group relative">
              <div className="flex gap-8 items-start">

                {/* Week badge - glassmorphic */}
                <div className="flex-shrink-0 relative">
                  {/* Badge glow */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${theme.bgGradientOrbs[0]} ${theme.bgGradientOrbs[1]} rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity`} />

                  <div className={`relative w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl glass-card border-2 ${theme.borderPrimary} flex flex-col items-center justify-center ${theme.textPrimary} font-bold group-hover:scale-110 transition-all duration-300`}>
                    <span className={`text-sm uppercase tracking-wider ${theme.textMuted} font-semibold`}>Uke</span>
                    <span className="text-2xl">50/51</span>
                  </div>
                </div>

                {/* Content card - enhanced glass */}
                <div className={`flex-1 glass-card rounded-2xl p-8 border-2 ${theme.borderPrimary}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <h3 className={`text-2xl font-bold ${theme.textPrimary}`}>Fersk levering (tilvalg)</h3>
                    <span className={`px-3 py-1 ${theme.accentSecondary} ${theme.accentPrimary} text-xs font-bold rounded-full`}>Ekstra</span>
                  </div>
                  <p className={`${theme.textMuted} leading-relaxed mb-4`}>
                    Ønsker du fersk levering i stedet? Velg fersk levering som tillegg ved bestilling, så mottar du kassen din fersk - ikke fryst - i uke 50/51. Perfekt tid før jul!
                  </p>
                  <div className={`flex items-center gap-2 text-sm ${theme.textMuted} font-semibold`}>
                    <svg className={`w-5 h-5 ${theme.iconColor}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z"/>
                      <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z"/>
                    </svg>
                    Uke 50/51 (midt-desember) • Fersk levering (valgfritt)
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* FAQ - Accordion style */}
      <section className={`py-24 px-6 bg-gradient-to-b ${theme.bgSecondary} ${theme.bgPrimary}`}>
        <div className="max-w-3xl mx-auto">

          <div className="text-center mb-16">
            <span className={`inline-block px-4 py-2 ${theme.accentSecondary} rounded-full text-xs uppercase tracking-wider ${theme.textSecondary} font-semibold mb-4`}>
              Spørsmål og svar
            </span>
            <h2 className={`text-4xl md:text-5xl font-bold ${theme.textPrimary}`}>
              Vanlige spørsmål
            </h2>
          </div>

          <div className="space-y-4">
            {[
              { q: t.faq.q1, a: t.faq.a1 },
              { q: t.faq.q2, a: t.faq.a2 },
              { q: t.faq.q3, a: t.faq.a3 },
              { q: t.faq.q4, a: t.faq.a4 },
            ].map((faq, i) => (
              <details
                key={i}
                className={`group ${theme.bgCard} backdrop-blur-sm rounded-2xl border ${theme.borderSecondary} overflow-hidden hover:shadow-lg transition-all duration-300`}
              >
                <summary className={`cursor-pointer py-6 px-8 flex items-center justify-between list-none font-semibold ${theme.textPrimary} hover:opacity-90 transition-colors`}>
                  <span className="text-lg">{faq.q}</span>
                  <svg className={`w-6 h-6 ${theme.textSecondary} transform group-open:rotate-180 transition-transform duration-300`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className={`px-8 pb-6 ${theme.textMuted} leading-relaxed`}>
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* INSTAGRAM FEED */}
      <InstagramFeed />

    </>
  );
}
