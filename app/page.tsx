'use client';

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { InstagramFeed } from "@/components/InstagramFeed";
import { getHeroStyles, getBannerStyles, getInventoryStyles } from "@/lib/theme-utils";
import { useIsMobile } from "@/hooks/useMediaQuery";
import { MobileHero } from "@/components/MobileHero";
import { MobileProductTiles } from "@/components/MobileProductTiles";
import { MobileTimeline } from "@/components/MobileTimeline";

interface InventoryData {
  season: string;
  kgRemaining: number;
  boxesRemaining: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  active: boolean;
}

// Meta Label Component
function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
      {children}
    </div>
  );
}

// Parallax scroll layer - KEPT (subtle, high impact)
function ParallaxLayer({
  children,
  speed = 0.5,
  className = ""
}: {
  children?: React.ReactNode;
  speed?: number;
  className?: string;
}) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(window.scrollY * speed);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div className={className} style={{ transform: `translateY(${offset}px)`, transition: 'transform 0.05s linear' }}>
      {children}
    </div>
  );
}

// Product Card with refined animations - KEPT (scroll-triggered stagger)
function ProductCard({
  size,
  label,
  description,
  features,
  personCount,
  mealsCount,
  freezerNote,
  price,
  deposit,
  balance,
  ctaText,
  ctaHref,
  isFeatured = false,
  pricing,
  delay = 0
}: {
  size: string;
  label: string;
  description: string;
  features: string[];
  personCount: string;
  mealsCount: string;
  freezerNote: string;
  price?: number;
  deposit?: number;
  balance?: number;
  ctaText: string;
  ctaHref: string;
  isFeatured?: boolean;
  pricing: any;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={cardRef}
      className={`group relative transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
      }`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="bg-white border border-neutral-200 rounded-lg p-8 transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.2)] hover:-translate-y-3">

        {isFeatured && (
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="inline-block px-4 py-1.5 bg-neutral-900 text-white text-xs uppercase tracking-wider font-bold rounded-full shadow-lg">
              Mest populær
            </span>
          </div>
        )}

        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-3 pb-6 border-b border-neutral-200">
            <MetaLabel>{label}</MetaLabel>
            <h3 className="text-7xl font-light tracking-tight text-neutral-900 tabular-nums">
              {size} <span className="text-2xl text-neutral-500">kg</span>
            </h3>
            <p className="text-base text-neutral-600 leading-relaxed">{description}</p>
            <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
              <span>{personCount}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-400" />
              <span>{mealsCount}</span>
              <span className="w-1 h-1 rounded-full bg-neutral-400" />
              <span>{freezerNote}</span>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
              Innhold
            </h4>
            <ul className="space-y-2">
              {features.map((feature, i) => (
                <li key={i} className="text-sm leading-relaxed text-neutral-700 flex items-start gap-3">
                  <span className="w-1 h-1 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Pricing */}
          <div className="space-y-3 pt-6 border-t border-neutral-200">
            <div className="flex items-baseline justify-between">
              <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                Totalpris
              </span>
              <span className="text-4xl font-light tracking-tight text-neutral-900 tabular-nums">
                {price?.toLocaleString('nb-NO')} <span className="text-base text-neutral-500">kr</span>
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Forskudd (50%)</span>
              <span className="text-neutral-900 font-medium tabular-nums">
                {deposit?.toLocaleString('nb-NO')} kr
              </span>
            </div>
            <div className="flex items-baseline justify-between text-sm">
              <span className="text-neutral-600">Ved levering</span>
              <span className="text-neutral-900 font-medium tabular-nums">
                {balance?.toLocaleString('nb-NO')} kr
              </span>
            </div>
          </div>

          {/* CTA */}
          <Link
            href={ctaHref}
            className="block w-full text-center px-6 py-4 bg-neutral-900 text-white rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:-translate-y-1"
          >
            {ctaText}
          </Link>
        </div>
      </div>
    </div>
  );
}

// Timeline step with scroll animation - KEPT
function TimelineStep({
  date,
  title,
  description,
  time,
  isOptional = false,
  delay = 0
}: {
  date: string;
  title: string;
  description: string;
  time: string;
  isOptional?: boolean;
  delay?: number;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 }
    );

    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`flex gap-8 transition-all duration-700 ${
        isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'
      } ${isOptional ? 'opacity-60' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="flex-shrink-0 w-24 h-24 bg-white border border-neutral-200 rounded-lg flex flex-col items-center justify-center shadow-md transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
        <span className="text-xs uppercase tracking-wider text-neutral-500 font-semibold">{date.split(' ')[0]}</span>
        <span className="text-3xl font-light text-neutral-900">{date.split(' ')[1]}</span>
      </div>
      <div className="flex-1 pt-3">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="text-3xl font-medium text-neutral-900">{title}</h3>
          {isOptional && (
            <span className="px-3 py-1 bg-neutral-200 text-neutral-600 text-xs uppercase tracking-wider font-semibold rounded-full">
              Valgfritt
            </span>
          )}
        </div>
        <p className="text-base leading-relaxed text-neutral-600 mb-3">{description}</p>
        <p className="text-sm text-neutral-500">{time}</p>
      </div>
    </div>
  );
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
  const [pricing, setPricing] = useState<any>(null);
  const [scrollY, setScrollY] = useState(0);

  // Parallax scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    async function fetchPricing() {
      try {
        const res = await fetch('/api/config/pricing');
        if (res.ok) {
          const data = await res.json();
          setPricing(data);
        }
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    }
    fetchPricing();
  }, []);

  const boxesLeft = inventory?.boxesRemaining ?? 0;
  const isSoldOut = inventory?.isSoldOut ?? false;
  const isLowStock = inventory?.isLowStock ?? false;
  const isMobile = useIsMobile();
  const totalBoxes = 50;
  const availabilityRatio = totalBoxes > 0 ? Math.min(1, boxesLeft / totalBoxes) : 0;
  const availabilitySegments = 10;
  const availabilityFilled = loading ? 0 : Math.round(availabilityRatio * availabilitySegments);
  const availabilityPercent = loading ? 0 : Math.round(availabilityRatio * 100);
  const desktopFillClass = isSoldOut ? 'bg-neutral-300' : isLowStock ? 'bg-amber-500' : 'bg-neutral-900';
  const desktopEmptyClass = 'bg-neutral-200';
  const mobileFillColor = isSoldOut ? '#D7CEC3' : isLowStock ? '#B35A2A' : '#0F6C6F';
  const mobileEmptyColor = '#E9E1D6';
  const minPrice = pricing ? Math.min(pricing.box_8kg_price, pricing.box_12kg_price) : null;
  const minDeposit = pricing
    ? Math.floor(
        (pricing.box_8kg_price <= pricing.box_12kg_price
          ? pricing.box_8kg_price * pricing.box_8kg_deposit_percentage
          : pricing.box_12kg_price * pricing.box_12kg_deposit_percentage) / 100
      )
    : null;

  // Mobile version - keep existing design
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16] pb-28 font-[family:var(--font-manrope)]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>

        <MobileHero isSoldOut={isSoldOut} minPrice={minPrice} minDeposit={minDeposit} />

        <MobileProductTiles pricing={pricing} />

        <section className="px-5 py-10">
          <div className="mx-auto max-w-md rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)]">
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                {t.availability.title}
              </p>
              <div className="text-right">
                {isSoldOut && (
                  <span className="rounded-full bg-[#B35A2A] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                    {t.availability.soldOut}
                  </span>
                )}
                {!isSoldOut && isLowStock && (
                  <span className="rounded-full bg-[#1E1B16] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]">
                    {t.availability.fewLeft}
                  </span>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-[auto,1fr] items-end gap-5">
              <div>
                <p className="text-5xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
                  {loading ? "—" : boxesLeft}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">
                  {t.availability.boxesAvailable}
                </p>
              </div>

              <div className="space-y-3">
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: availabilitySegments }).map((_, index) => (
                    <span
                      key={index}
                      className="h-2 rounded-full"
                      style={{
                        backgroundColor: index < availabilityFilled ? mobileFillColor : mobileEmptyColor,
                      }}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between text-[11px] text-[#6A6258]">
                  <span>{loading ? "—" : `${availabilityPercent}%`}</span>
                  <span>Oppdatert i dag</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <MobileTimeline />

        <section className="px-5 py-12">
          <div className="mx-auto max-w-md rounded-[32px] border border-[#1E1B16] bg-[#1E1B16] px-6 py-8 text-[#F6F4EF] shadow-[0_24px_50px_rgba(30,27,22,0.3)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#F6F4EF]/70">
              {t.hero.limitedOffer}
            </p>
            <h2 className="mt-4 text-3xl font-semibold font-[family:var(--font-playfair)]">{t.hero.seasonOnce}</h2>
            <p className="mt-3 text-sm text-[#F6F4EF]/70">{t.hero.limitedProduction}</p>
            <Link
              href="/bestill"
              className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#F6F4EF] px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#1E1B16]"
            >
              {t.hero.reservePackageNow}
            </Link>
          </div>
        </section>

        <section className="px-5 py-10">
          <div className="mx-auto max-w-md rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)]">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.faq.title}</h2>
              <span className="rounded-full bg-[#E9E1D6] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-[#6A6258]">
                {t.faq.badge}
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {[
                { q: t.faq.q1, a: t.faq.a1 },
                { q: t.faq.q2, a: t.faq.a2 },
                { q: t.faq.q3, a: t.faq.a3 },
              ].map((faq) => (
                <details key={faq.q} className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] px-4 py-3">
                  <summary className="cursor-pointer list-none text-sm font-semibold text-[#1E1B16]">
                    {faq.q}
                  </summary>
                  <p className="mt-2 text-sm text-[#5E5A50]">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-10">
          <div className="mx-auto max-w-md rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">Instagram</p>
            <h3 className="mt-2 text-xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">Følg oss på Instagram</h3>
            <p className="mt-2 text-sm text-[#5E5A50]">
              Se hverdagen på gården og oppdateringer gjennom sesongen.
            </p>
            <a
              href="https://www.instagram.com/tinglum.farm"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center justify-center rounded-2xl border border-[#1E1B16] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#1E1B16]"
            >
              @tinglum.farm
            </a>
          </div>
        </section>

        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4DED5] bg-[#F6F4EF]/95 backdrop-blur">
          <div className="mx-auto flex max-w-md items-center justify-between gap-4 px-5 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">Reserver kasse</p>
              {minPrice && (
                <p className="text-sm font-semibold text-[#1E1B16]">
                  Fra {minPrice.toLocaleString('nb-NO')} {t.common.currency}
                </p>
              )}
            </div>
            <Link
              href="/bestill"
              className="rounded-2xl bg-[#1E1B16] px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
            >
              {t.hero.reserveNow}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version - REFINED with best animations only
  return (
    <div className="min-h-screen bg-white">

      {/* HERO SECTION - Subtle parallax */}
      <section className="relative min-h-screen flex items-center justify-center px-6 lg:px-8 py-20 overflow-hidden">

        {/* Single parallax background layer */}
        <ParallaxLayer speed={0.3} className="absolute inset-0 bg-gradient-to-b from-neutral-50 to-white -z-10" />

        <div className="w-full max-w-6xl mx-auto relative z-10">
          <ParallaxLayer speed={0.15}>
            <div className="max-w-4xl space-y-12">

              <div>
                <MetaLabel>{t.hero.season}</MetaLabel>
              </div>

              <div className="space-y-8">
                <h1 className="text-8xl font-light tracking-tight text-neutral-900 leading-[1.05]">
                  {t.hero.porkFrom}
                  <br />
                  <span className="text-neutral-600">{t.hero.farmName}</span>
                </h1>
                <p className="text-xl leading-relaxed text-neutral-600 max-w-2xl">
                  {t.hero.description}
                </p>
              </div>

              <div className="space-y-6 pt-8">
                {minPrice && minDeposit && (
                  <div className="flex items-center gap-4 text-base text-neutral-600">
                    <span className="font-medium tabular-nums">
                      Fra {minPrice.toLocaleString('nb-NO')} {t.common.currency}
                    </span>
                    <span className="w-1 h-1 rounded-full bg-neutral-400" />
                    <span>Forskudd fra {minDeposit.toLocaleString('nb-NO')} {t.common.currency}</span>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <Link
                    href={isSoldOut ? "#waitlist" : "/bestill"}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-neutral-800 transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] hover:-translate-y-1"
                  >
                    {isSoldOut ? t.hero.joinWaitlist : t.hero.reserveNow}
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    href="/produkt"
                    className="text-sm font-semibold text-neutral-900 underline underline-offset-4 hover:text-neutral-600 transition-colors"
                  >
                    {t.hero.learnMore}
                  </Link>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 text-base text-neutral-600 pt-4">
                <span className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-neutral-400" />
                  {t.hero.localRaised}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-neutral-400" />
                  {t.hero.qualityGuarantee}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-1 h-1 rounded-full bg-neutral-400" />
                  Levering uke 46–48
                </span>
              </div>

            </div>
          </ParallaxLayer>
        </div>
      </section>

      {/* PRODUCT SHOWCASE - Staggered reveal on scroll */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">

          <div className="max-w-2xl mb-16">
            <MetaLabel>{t.product.choosePackage}</MetaLabel>
            <h2 className="text-6xl font-light tracking-tight text-neutral-900 mt-3 mb-6">
              {t.product.twoSizes}
            </h2>
            <p className="text-lg leading-relaxed text-neutral-600">
              {t.product.sameQuality}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <ProductCard
              size="8"
              label={t.product.smallerPackage}
              description={t.product.perfectFor2to3}
              features={[
                t.boxContents.ribbe8kg,
                t.boxContents.nakkekoteletter8kg,
                t.boxContents.julepølse8kg,
                t.boxContents.svinesteik8kg,
                t.boxContents.medisterfarse8kg,
                t.boxContents.knoke,
                t.boxContents.butchersChoice8kg
              ]}
              personCount="2–3 pers"
              mealsCount="12–16 måltider"
              freezerNote="Lite fryserom"
              price={pricing?.box_8kg_price}
              deposit={pricing ? Math.floor(pricing.box_8kg_price * pricing.box_8kg_deposit_percentage / 100) : undefined}
              balance={pricing ? pricing.box_8kg_price - Math.floor(pricing.box_8kg_price * pricing.box_8kg_deposit_percentage / 100) : undefined}
              ctaText={t.product.reserve8kg}
              ctaHref="/bestill?size=8"
              pricing={pricing}
              delay={0}
            />

            <ProductCard
              size="12"
              label={t.product.largerPackage}
              description={t.product.idealFor4to6}
              features={[
                t.boxContents.ribbe12kg,
                t.boxContents.nakkekoteletter12kg,
                t.boxContents.julepølse12kg,
                t.boxContents.svinesteik12kg,
                t.boxContents.medisterfarse12kg,
                t.boxContents.knoke,
                t.boxContents.butchersChoice12kg
              ]}
              personCount="4–6 pers"
              mealsCount="20–28 måltider"
              freezerNote="Mer fryserom"
              price={pricing?.box_12kg_price}
              deposit={pricing ? Math.floor(pricing.box_12kg_price * pricing.box_12kg_deposit_percentage / 100) : undefined}
              balance={pricing ? pricing.box_12kg_price - Math.floor(pricing.box_12kg_price * pricing.box_12kg_deposit_percentage / 100) : undefined}
              ctaText={t.product.reserve12kg}
              ctaHref="/bestill?size=12"
              isFeatured={true}
              pricing={pricing}
              delay={150}
            />
          </div>

        </div>
      </section>

      {/* INVENTORY SECTION - Availability (no parallax) */}
      <section className="py-20 px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-4xl mx-auto bg-white border border-neutral-200 rounded-2xl p-10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.12)]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <MetaLabel>{t.availability.title}</MetaLabel>
              {isLowStock && !isSoldOut && (
                <span className="px-4 py-1.5 bg-neutral-900 text-white text-xs uppercase tracking-wider font-bold rounded-full">
                  {t.availability.fewLeft}
                </span>
              )}
              {isSoldOut && (
                <span className="px-4 py-1.5 bg-neutral-400 text-white text-xs uppercase tracking-wider font-bold rounded-full">
                  {t.availability.soldOut}
                </span>
              )}
            </div>

            <div className="mt-10 grid grid-cols-1 md:grid-cols-[auto,1fr] items-center gap-10">
              <div className="text-center md:text-left">
                <div className="text-7xl font-light tracking-tight text-neutral-900 tabular-nums">
                  {loading ? "—" : boxesLeft}
                </div>
                <p className="mt-2 text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  {t.availability.boxesAvailable}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-wider text-neutral-500 font-semibold">
                  <span>{t.availability.boxesAvailable}</span>
                  <span>{loading ? "—" : `${availabilityPercent}%`}</span>
                </div>
                <div className="grid grid-cols-10 gap-1">
                  {Array.from({ length: availabilitySegments }).map((_, index) => (
                    <span
                      key={index}
                      className={`h-2 rounded-full ${index < availabilityFilled ? desktopFillClass : desktopEmptyClass}`}
                    />
                  ))}
                </div>
                <p className="text-sm text-neutral-500">Oppdatert i dag</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIMELINE SECTION - Scroll cascade */}
      <section className="py-20 px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-5xl mx-auto">

          <div className="max-w-2xl mb-16">
            <MetaLabel>{t.timeline.howItWorks}</MetaLabel>
            <h2 className="text-6xl font-light tracking-tight text-neutral-900 mt-3 mb-6">
              {t.timeline.fromOrderToDelivery}
            </h2>
            <p className="text-lg leading-relaxed text-neutral-600">
              {t.timeline.subtitle}
            </p>
          </div>

          <div className="space-y-12">
            <TimelineStep
              date="Jan 26"
              title={t.timeline.step1Title}
              description={t.timeline.step1Desc}
              time={t.timeline.step1Time}
              delay={0}
            />
            <TimelineStep
              date="Uke 46"
              title={t.timeline.step2Title}
              description={t.timeline.step2Desc}
              time={t.timeline.step2Time}
              delay={100}
            />
            <TimelineStep
              date="Uke 48"
              title={t.timeline.step3Title}
              description={t.timeline.step3Desc}
              time={t.timeline.step3Time}
              delay={200}
            />
            <TimelineStep
              date="Uke 50/51"
              title={t.timeline.step4Title}
              description={t.timeline.step4Desc}
              time={t.timeline.step4Time}
              isOptional={true}
              delay={300}
            />
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="py-24 px-6 lg:px-8 bg-neutral-900 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-10">

          <div className="space-y-6">
            <MetaLabel>
              <span className="text-neutral-400">{t.hero.limitedOffer}</span>
            </MetaLabel>
            <h2 className="text-7xl font-light tracking-tight">
              {t.hero.seasonOnce}
            </h2>
            <p className="text-xl leading-relaxed text-neutral-300 max-w-2xl mx-auto">
              {t.hero.limitedProduction}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 pt-6">
            <Link
              href="/bestill"
              className="inline-flex items-center gap-3 px-10 py-5 bg-white text-neutral-900 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-neutral-100 transition-all duration-300 hover:shadow-[0_20px_50px_-15px_rgba(255,255,255,0.3)] hover:-translate-y-1"
            >
              {t.hero.reservePackageNow}
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="/produkt"
              className="text-base font-semibold text-white underline underline-offset-4 hover:text-neutral-300 transition-colors"
            >
              {t.hero.learnMore}
            </Link>
          </div>

        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">

          <div className="max-w-2xl mb-12">
            <MetaLabel>{t.faq.badge}</MetaLabel>
            <h2 className="text-6xl font-light tracking-tight text-neutral-900 mt-3">
              {t.faq.title}
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
                className="group bg-white border border-neutral-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.12)] hover:-translate-y-1"
              >
                <summary className="cursor-pointer py-6 px-8 flex items-center justify-between list-none font-semibold text-neutral-900">
                  <span className="text-lg">{faq.q}</span>
                  <svg
                    className="w-6 h-6 text-neutral-400 transform group-open:rotate-180 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <div className="px-8 pb-6 text-base leading-relaxed text-neutral-600">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* INSTAGRAM FEED */}
      <InstagramFeed />

    </div>
  );
}
