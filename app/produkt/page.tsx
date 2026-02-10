"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface InventoryData {
  season: string;
  kgRemaining: number;
  boxesRemaining: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  active: boolean;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
      {children}
    </div>
  );
}

export default function ProductPage() {
  const { t, lang } = useLanguage();
  const copy = t.productPage;
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  const [pricing, setPricing] = useState<any>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(true);

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
        setLoadingInventory(false);
      }
    }
    fetchInventory();
  }, []);

  const contents = [
    { category: t.productDetail.categories.ribbe, items: [copy.ribbeItem] },
    { category: t.productDetail.categories.sausages, items: [copy.sausageItem] },
    { category: t.productDetail.categories.bacon, items: [copy.baconItem] },
    { category: t.productDetail.categories.chops, items: [copy.chopsItem] },
    { category: t.productDetail.categories.stew, items: [copy.stewItem] },
  ];

  const boxesLeft = inventory?.boxesRemaining ?? 0;
  const isSoldOut = inventory?.isSoldOut ?? false;
  const isLowStock = inventory?.isLowStock ?? false;

  const box8Price = pricing?.box_8kg_price;
  const box12Price = pricing?.box_12kg_price;
  const box8Deposit = pricing
    ? Math.floor(pricing.box_8kg_price * pricing.box_8kg_deposit_percentage / 100)
    : null;
  const box12Deposit = pricing
    ? Math.floor(pricing.box_12kg_price * pricing.box_12kg_deposit_percentage / 100)
    : null;
  const box8Balance = pricing && box8Deposit !== null ? pricing.box_8kg_price - box8Deposit : null;
  const box12Balance = pricing && box12Deposit !== null ? pricing.box_12kg_price - box12Deposit : null;

  return (
    <div className="min-h-screen bg-white">
      <section className="relative overflow-hidden bg-[#0B0B0C] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
        <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-white/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-20 h-[420px] w-[420px] rounded-full bg-white/5 blur-[140px]" />

        <div className="relative z-10 max-w-6xl mx-auto px-6 lg:px-8 py-20">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/70 hover:text-white transition-colors"
          >
            <span className="text-white/40">←</span>
            {t.nav.products}
          </Link>

          <div className="mt-10 grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/70">
                {copy.productLabel}
              </span>
              <h1 className="text-5xl lg:text-6xl font-light tracking-tight font-[family:var(--font-playfair)]">
                {copy.heroTitle}
              </h1>
              <p className="text-lg text-white/70 leading-relaxed max-w-2xl">
                {copy.heroLead}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="/bestill"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-4 text-xs font-bold uppercase tracking-[0.3em] text-[#0B0B0C] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)]"
                >
                  {copy.heroCtaPrimary}
                </Link>
                <Link
                  href="#contents"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-7 py-4 text-xs font-bold uppercase tracking-[0.3em] text-white"
                >
                  {copy.heroCtaSecondary}
                </Link>
              </div>

              <div className="grid gap-6 sm:grid-cols-3 pt-8">
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
                    {copy.highlightOneTitle}
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {copy.highlightOneBody}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
                    {copy.highlightTwoTitle}
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {copy.highlightTwoBody}
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-white/70">
                    {copy.highlightThreeTitle}
                  </p>
                  <p className="text-sm text-white/60 leading-relaxed">
                    {copy.highlightThreeBody}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-6 rounded-2xl border border-white/15 bg-white/5 p-8">
              <div className="space-y-3">
                <SectionLabel>{copy.availabilityTitle}</SectionLabel>
                <div className="flex items-center justify-between">
                  <span className="text-4xl font-light tabular-nums">
                    {loadingInventory ? '--' : boxesLeft}
                  </span>
                  {isSoldOut && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                      {t.availability.soldOut}
                    </span>
                  )}
                  {!isSoldOut && isLowStock && (
                    <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                      {t.availability.fewLeft}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60">{copy.availabilityNote}</p>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-3">
                <SectionLabel>{copy.sizesTitle}</SectionLabel>
                <p className="text-sm text-white/60">{copy.sizesLead}</p>
                <div className="space-y-2 text-sm text-white/70">
                  <div className="flex items-center justify-between">
                    <span>{t.product.box8}</span>
                    <span className="tabular-nums">
                      {box8Price ? `${box8Price.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t.product.box12}</span>
                    <span className="tabular-nums">
                      {box12Price ? `${box12Price.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                    </span>
                  </div>
                </div>
              </div>

              <div className="border-t border-white/10 pt-6 space-y-2">
                <SectionLabel>{copy.scarcityTitle}</SectionLabel>
                <p className="text-sm text-white/60 leading-relaxed">
                  {copy.scarcityBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[1fr,1fr]">
          <div className="space-y-6">
            <SectionLabel>{copy.storyTitle}</SectionLabel>
            <h2 className="text-4xl font-light tracking-tight text-neutral-900 font-[family:var(--font-playfair)]">
              {copy.storyHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.storyBody}
            </p>
          </div>
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-8 space-y-4">
            <SectionLabel>{copy.storySupportTitle}</SectionLabel>
            <p className="text-sm text-neutral-600 leading-relaxed">
              {copy.storySupportBody}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 font-semibold">
                  {copy.storyPointOneTitle}
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  {copy.storyPointOneBody}
                </p>
              </div>
              <div className="rounded-xl border border-neutral-200 bg-white p-5">
                <p className="text-xs uppercase tracking-[0.25em] text-neutral-500 font-semibold">
                  {copy.storyPointTwoTitle}
                </p>
                <p className="mt-2 text-sm text-neutral-600">
                  {copy.storyPointTwoBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="contents" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="space-y-3 max-w-2xl">
            <SectionLabel>{copy.contentsTitle}</SectionLabel>
            <h2 className="text-4xl font-light tracking-tight text-neutral-900 font-[family:var(--font-playfair)]">
              {copy.contentsHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.contentsLead}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {contents.map((item, index) => (
              <div key={index} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                  {item.category}
                </p>
                <ul className="mt-5 space-y-3">
                  {item.items.map((detail, detailIndex) => (
                    <li key={detailIndex} className="flex items-start gap-3 text-sm text-neutral-700">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-400" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="sizes" className="py-20 px-6 lg:px-8 bg-neutral-50">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="space-y-3 max-w-2xl">
            <SectionLabel>{copy.sizesTitle}</SectionLabel>
            <h2 className="text-4xl font-light tracking-tight text-neutral-900 font-[family:var(--font-playfair)]">
              {copy.sizesHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.sizesLead}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-neutral-200 bg-white p-8 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.2)]">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                  {t.product.box8}
                </p>
                <p className="text-5xl font-light tracking-tight text-neutral-900">
                  8 <span className="text-lg text-neutral-500">{t.common.kg}</span>
                </p>
                <p className="text-sm text-neutral-600">{t.product.perfectFor2to3}</p>
              </div>
              <div className="mt-6 space-y-2 text-sm text-neutral-700">
                <div className="flex items-center justify-between">
                  <span>{t.product.totalPrice}</span>
                  <span className="tabular-nums">
                    {box8Price ? `${box8Price.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.product.deposit50}</span>
                  <span className="tabular-nums">
                    {box8Deposit !== null ? `${box8Deposit.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.product.balanceOnDelivery}</span>
                  <span className="tabular-nums">
                    {box8Balance !== null ? `${box8Balance.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
              </div>
              <Link
                href="/bestill?size=8"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-6 py-4 text-xs font-bold uppercase tracking-[0.3em] text-white"
              >
                {t.product.reserve8kg}
              </Link>
            </div>

            <div className="rounded-2xl border border-neutral-900 bg-neutral-900 p-8 text-white shadow-[0_28px_70px_-25px_rgba(0,0,0,0.6)]">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.3em] text-white/70 font-semibold">
                  {t.product.box12}
                </p>
                <p className="text-5xl font-light tracking-tight">
                  12 <span className="text-lg text-white/70">{t.common.kg}</span>
                </p>
                <p className="text-sm text-white/70">{t.product.idealFor4to6}</p>
              </div>
              <div className="mt-6 space-y-2 text-sm text-white/80">
                <div className="flex items-center justify-between">
                  <span>{t.product.totalPrice}</span>
                  <span className="tabular-nums">
                    {box12Price ? `${box12Price.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.product.deposit50}</span>
                  <span className="tabular-nums">
                    {box12Deposit !== null ? `${box12Deposit.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>{t.product.balanceOnDelivery}</span>
                  <span className="tabular-nums">
                    {box12Balance !== null ? `${box12Balance.toLocaleString(locale)} ${t.common.currency}` : t.common.loading}
                  </span>
                </div>
              </div>
              <Link
                href="/bestill?size=12"
                className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-white px-6 py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-900"
              >
                {t.product.reserve12kg}
              </Link>
            </div>
          </div>
          <p className="text-sm text-neutral-500">{copy.priceNote}</p>
        </div>
      </section>

      <section id="timeline" className="py-20 px-6 lg:px-8 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="space-y-3 max-w-2xl">
            <SectionLabel>{copy.timelineTitle}</SectionLabel>
            <h2 className="text-4xl font-light tracking-tight text-neutral-900 font-[family:var(--font-playfair)]">
              {copy.timelineHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.timelineLead}
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-2">
            {[
              {
                title: t.timeline.step1Title,
                desc: t.timeline.step1Desc,
                time: t.timeline.step1Time,
              },
              {
                title: t.timeline.step2Title,
                desc: t.timeline.step2Desc,
                time: t.timeline.step2Time,
              },
              {
                title: t.timeline.step3Title,
                desc: t.timeline.step3Desc,
                time: t.timeline.step3Time,
              },
              {
                title: t.timeline.step4Title,
                desc: t.timeline.step4Desc,
                time: t.timeline.step4Time,
              },
            ].map((step) => (
              <div key={step.title} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                  {step.time}
                </p>
                <h3 className="mt-3 text-xl font-semibold text-neutral-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 lg:px-8 bg-neutral-950 text-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <SectionLabel>{t.hero.limitedOffer}</SectionLabel>
          <h2 className="text-4xl md:text-5xl font-light tracking-tight font-[family:var(--font-playfair)]">
            {copy.reserveHeading}
          </h2>
          <p className="text-base text-white/70 leading-relaxed">
            {copy.reserveBody}
          </p>
          <Link
            href="/bestill"
            className="inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-900"
          >
            {copy.reserveCta}
          </Link>
        </div>
      </section>
    </div>
  );
}
