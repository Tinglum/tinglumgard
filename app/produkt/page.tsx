"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/GlassCard";
import { MangalitsaBoxesSection } from "@/components/MangalitsaBoxesSection";
import { MangalitsaPremiumStory } from "@/components/MangalitsaPremiumStory";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface InventoryData {
  season: string;
  kgRemaining: number;
  boxesRemaining: number;
  isLowStock: boolean;
  isSoldOut: boolean;
  active: boolean;
}

function Section({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`py-16 sm:py-20 ${className}`}>
      {children}
    </section>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-500 font-semibold">
      {children}
    </div>
  );
}

function StickyCTABar({
  label,
  ctaLabel,
  ctaHref,
}: {
  label: string;
  ctaLabel: string;
  ctaHref: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur md:hidden">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-neutral-500">
          {label}
        </p>
        <Link
          href={ctaHref}
          className="rounded-full bg-neutral-900 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-white"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function ProductPage() {
  const { t } = useLanguage();
  const copy = t.productPage;
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loadingInventory, setLoadingInventory] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const res = await fetch("/api/inventory", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setInventory(data);
        }
      } catch (error) {
        console.error("Failed to fetch inventory:", error);
      } finally {
        setLoadingInventory(false);
      }
    }
    fetchInventory();
  }, []);

  const boxesLeft = inventory?.boxesRemaining ?? 0;
  const isSoldOut = inventory?.isSoldOut ?? false;
  const isLowStock = inventory?.isLowStock ?? false;

  const contents = useMemo(
    () => [
      copy.contents.ribbe,
      copy.contents.chops,
      copy.contents.bacon,
      copy.contents.sausages,
      copy.contents.stew,
      copy.contents.surprises,
    ],
    [copy]
  );

  return (
    <div className="min-h-screen bg-[#F7F5F2] text-[#1C1A16]">
      <div
        className={`sticky top-0 z-50 border-b border-transparent transition-all duration-300 ${
          isScrolled ? "bg-white/85 backdrop-blur border-neutral-200 shadow-[0_10px_30px_-20px_rgba(0,0,0,0.35)]" : "bg-transparent"
        }`}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500">
              {copy.stickyTitle}
            </p>
            <p className="text-sm text-neutral-600 hidden sm:block">{copy.stickyLead}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/oppdelingsplan"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              {copy.stickySecondary}
            </Link>
            <Link
              href="#mangalitsa-boxes"
              className="rounded-full bg-neutral-900 px-5 py-2 text-xs font-bold uppercase tracking-[0.25em] text-white"
            >
              {copy.stickyCta}
            </Link>
          </div>
        </div>
      </div>

      <section className="relative overflow-hidden bg-[#101012] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.08),_transparent_55%)]" />
        <div className="absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full bg-white/10 blur-[120px]" />
        <div className="absolute -bottom-40 left-8 h-[380px] w-[380px] rounded-full bg-white/5 blur-[140px]" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-[1.1fr,0.9fr] lg:items-start">
            <div className="space-y-6">
              <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1 text-[10px] font-semibold uppercase tracking-[0.4em] text-white/70">
                {copy.heroEyebrow}
              </span>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light tracking-tight font-[family:var(--font-playfair)] text-white drop-shadow-[0_8px_24px_rgba(0,0,0,0.65)]">
                {copy.heroTitle}
              </h1>
              <p className="text-lg text-white/75 leading-relaxed max-w-2xl">
                {copy.heroLead}
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Link
                  href="#mangalitsa-boxes"
                  className="inline-flex items-center justify-center rounded-xl bg-white px-7 py-4 text-xs font-bold uppercase tracking-[0.3em] text-[#101012] shadow-[0_18px_40px_-20px_rgba(0,0,0,0.5)]"
                >
                  {copy.heroCtaPrimary}
                </Link>
                <Link
                  href="#innhold"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 px-7 py-4 text-xs font-bold uppercase tracking-[0.3em] text-white"
                >
                  {copy.heroCtaSecondary}
                </Link>
              </div>

              <div className="flex flex-wrap gap-3 pt-6">
                {copy.quickFacts.map((fact: string) => (
                  <span
                    key={fact}
                    className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.25em] text-white/75"
                  >
                    {fact}
                  </span>
                ))}
              </div>
            </div>

            <GlassCard className="bg-white/10 border-white/20 backdrop-blur-xl text-white">
              <div className="space-y-6 p-8">
                <div>
                  <SectionLabel>{copy.availabilityTitle}</SectionLabel>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-4xl font-light tabular-nums">
                      {loadingInventory ? "--" : boxesLeft}
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
                    {!isSoldOut && !isLowStock && (
                      <span className="rounded-full bg-white/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70">
                        {copy.availabilityOpen}
                      </span>
                    )}
                  </div>
                  <p className="mt-3 text-sm text-white/65 leading-relaxed">
                    {copy.availabilityLead}
                  </p>
                </div>

                <div className="border-t border-white/15 pt-6 space-y-3">
                  <SectionLabel>{t.mangalitsa.pageTitle}</SectionLabel>
                  <p className="text-sm text-white/65">
                    {t.mangalitsa.hero.title}
                  </p>
                  <div className="space-y-2 text-sm text-white/80">
                    <div className="flex items-center justify-between">
                      <span>4 bokser per gris</span>
                      <span className="tabular-nums">15 600 NOK</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Fra 310 NOK/kg</span>
                      <span className="tabular-nums">Opp til 613 NOK/kg</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/15 pt-6 space-y-2">
                  <SectionLabel>{copy.scarcityTitle}</SectionLabel>
                  <p className="text-sm text-white/65 leading-relaxed">
                    {copy.scarcityBody}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      <Section className="bg-[#F7F5F2]">
        <div className="mx-auto max-w-6xl px-6">
          <div className="max-w-2xl space-y-3">
            <SectionLabel>{copy.valueTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.valueHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.valueLead}
            </p>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {copy.valueCards.map((card: { title: string; body: string }) => (
              <GlassCard
                key={card.title}
                className="bg-white/70 backdrop-blur border-white/40 motion-safe:transition-transform motion-safe:hover:-translate-y-1"
              >
                <div className="p-6 space-y-3">
                  <h3 className="text-lg font-semibold text-neutral-900">{card.title}</h3>
                  <p className="text-sm text-neutral-600 leading-relaxed">{card.body}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </Section>

      <Section id="innhold" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <SectionLabel>{copy.contentsTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.contentsHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.contentsLead}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {contents.map((item: { title: string; items: string[] }) => (
              <GlassCard
                key={item.title}
                className="bg-white/80 backdrop-blur border-white/50 motion-safe:transition-transform motion-safe:hover:-translate-y-1"
              >
                <div className="p-6">
                  <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                    {item.title}
                  </p>
                  <ul className="mt-5 space-y-3">
                    {item.items.map((detail) => (
                      <li key={detail} className="flex items-start gap-3 text-sm text-neutral-700">
                        <span className="mt-2 h-1.5 w-1.5 rounded-full bg-neutral-400" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </GlassCard>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">
            <p>{copy.contentsNote}</p>
            <p className="font-medium text-neutral-800">{copy.contentsGuarantee}</p>
            <Link
              href="/oppdelingsplan"
              className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-700 hover:text-neutral-900"
            >
              {copy.contentsLinkLabel}
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>
      </Section>

      {/* Mangalitsa Premium Boxes */}
      <MangalitsaBoxesSection />

      {/* Premium Storytelling */}
      <MangalitsaPremiumStory />

      <Section id="velg-kasse" className="bg-[#F7F5F2]">
        <div className="mx-auto max-w-5xl px-6">
          <GlassCard className="bg-white/85 backdrop-blur border-white/60">
            <div className="p-8 sm:p-10 space-y-6 text-center">
              <SectionLabel>{t.mangalitsa.pageTitle}</SectionLabel>
              <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
                {t.mangalitsa.hero.title}
              </h2>
              <p className="text-base text-neutral-600 leading-relaxed max-w-2xl mx-auto">
                {t.mangalitsa.hero.subtitle}
              </p>
              <Link
                href="/bestill"
                className="inline-flex items-center justify-center rounded-xl bg-neutral-900 px-8 py-4 text-xs font-bold uppercase tracking-[0.3em] text-white"
              >
                {t.mangalitsa.reserveBox}
              </Link>
            </div>
          </GlassCard>
        </div>
      </Section>

      <Section id="slik-fungerer" className="bg-white">
        <div className="mx-auto max-w-6xl px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <SectionLabel>{copy.timelineTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.timelineHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.timelineLead}
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-4">
            {copy.timelineSteps.map(
              (step: { week: string; title: string; body: string }) => (
                <GlassCard
                  key={step.week}
                  className="bg-white/80 backdrop-blur border-white/50 motion-safe:transition-transform motion-safe:hover:-translate-y-1"
                >
                  <div className="p-6 space-y-3">
                    <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                      {step.week}
                    </p>
                    <h3 className="text-lg font-semibold text-neutral-900">
                      {step.title}
                    </h3>
                    <p className="text-sm text-neutral-600 leading-relaxed">
                      {step.body}
                    </p>
                  </div>
                </GlassCard>
              )
            )}
          </div>

          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6 text-sm text-neutral-600">
            <p>{copy.timelineScarcity}</p>
          </div>
        </div>
      </Section>

      <Section className="bg-[#F7F5F2]">
        <div className="mx-auto max-w-6xl px-6 grid gap-10 lg:grid-cols-[1.1fr,0.9fr] lg:items-center">
          <div className="space-y-4">
            <SectionLabel>{copy.storyTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.storyHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.storyLead}
            </p>
          </div>
          <GlassCard className="bg-white/80 backdrop-blur border-white/50">
            <div className="p-6 space-y-4">
              <p className="text-sm text-neutral-600 leading-relaxed">{copy.storyBody}</p>
              <p className="text-sm font-semibold text-neutral-900">{copy.storyHighlight}</p>
            </div>
          </GlassCard>
        </div>
      </Section>

      <Section className="bg-white">
        <div className="mx-auto max-w-5xl px-6 space-y-10">
          <div className="space-y-3">
            <SectionLabel>{copy.faqTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.faqHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.faqLead}
            </p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {copy.faqItems.map(
              (item: { question: string; answer: string }) => (
                <AccordionItem
                  key={item.question}
                  value={item.question}
                  className="rounded-2xl border border-neutral-200 bg-neutral-50 px-6"
                >
                  <AccordionTrigger className="py-5 text-left text-neutral-900 font-semibold hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm text-neutral-600 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              )
            )}
          </Accordion>

          <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-600">
            <span>{copy.policyLead}</span>
            <Link
              href="/vilkar"
              className="text-sm font-semibold text-neutral-800 underline underline-offset-4"
            >
              {copy.policyTerms}
            </Link>
            <Link
              href="/personvern"
              className="text-sm font-semibold text-neutral-800 underline underline-offset-4"
            >
              {copy.policyPrivacy}
            </Link>
          </div>
        </div>
      </Section>

      <Section className="bg-neutral-950 text-white">
        <div className="mx-auto max-w-5xl px-6 text-center space-y-6">
          <SectionLabel>{copy.finalCtaEyebrow}</SectionLabel>
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)]">
            {copy.finalCtaHeading}
          </h2>
          <p className="text-base text-white/70 leading-relaxed">
            {copy.finalCtaBody}
          </p>
          <Link
            href="#mangalitsa-boxes"
            className="inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-900"
          >
            {copy.finalCtaButton}
          </Link>
        </div>
      </Section>

      <StickyCTABar
        label={copy.stickyTitle}
        ctaLabel={copy.stickyCta}
        ctaHref="#mangalitsa-boxes"
      />
    </div>
  );
}
