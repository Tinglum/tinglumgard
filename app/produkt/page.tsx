"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { GlassCard } from "@/components/GlassCard";
import { fixMojibake } from "@/lib/utils/text";
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

interface MangalitsaPreset {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  short_pitch_no: string;
  short_pitch_en: string;
  target_weight_kg: number;
  price_nok: number;
  display_order?: number;
  scarcity_message_no?: string | null;
  scarcity_message_en?: string | null;
  contents?: Array<{
    content_name_no: string;
    content_name_en: string;
    display_order?: number;
    is_hero?: boolean;
  }>;
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
  hidden,
}: {
  label: string;
  ctaLabel: string;
  ctaHref: string;
  hidden: boolean;
}) {
  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white/90 backdrop-blur md:hidden transition-transform duration-300 ${
        hidden ? "translate-y-full" : "translate-y-0"
      }`}
    >
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

// Builds a minimal .ics file for a timeline step and triggers a client-side download.
function downloadCalendarEvent(title: string, description: string, date: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = (d: Date) =>
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(
      d.getUTCHours()
    )}${pad(d.getUTCMinutes())}00Z`;
  const end = new Date(date.getTime() + 60 * 60 * 1000);
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Tinglum Gard//Ullgris//NO",
    "BEGIN:VEVENT",
    `UID:${date.getTime()}@tinglumgard.no`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(date)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${title.toLowerCase().replace(/\s+/g, "-")}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ISO week -> approximate date for the current season year. Weeks are Mon-based.
function dateFromIsoWeek(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dayOfWeek = simple.getUTCDay() || 7;
  simple.setUTCDate(simple.getUTCDate() + (1 - dayOfWeek));
  return simple;
}

function extractWeekNumber(week: string): number | null {
  const match = week.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : null;
}

export default function ProductPage() {
  const { t, lang } = useLanguage();
  const copy = t.productPage;
  const locale = lang === "no" ? "nb-NO" : "en-US";
  const [presets, setPresets] = useState<MangalitsaPreset[]>([]);
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
    async function fetchPresets() {
      try {
        const res = await fetch("/api/mangalitsa/presets");
        if (res.ok) {
          const data = await res.json();
          setPresets(data.presets || []);
        }
      } catch (error) {
        console.error("Failed to fetch presets:", error);
      }
    }
    fetchPresets();
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

  const sortedPresets = useMemo(
    () => [...presets].sort((a, b) => (a.display_order || 0) - (b.display_order || 0)),
    [presets]
  );

  const [pastBoxGrid, setPastBoxGrid] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const grid = document.getElementById("velg-kasse");
      if (!grid) return;
      const rect = grid.getBoundingClientRect();
      // Hide the sticky bar once the box grid (with its own per-card CTA) has scrolled past.
      setPastBoxGrid(rect.bottom < window.innerHeight * 0.35);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const seasonYear = new Date().getFullYear();

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
              href="#velg-kasse"
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
                  href="#velg-kasse"
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

              <p className="pt-2 text-xs uppercase tracking-[0.3em] text-white/50">
                {copy.farmTrustLine}
              </p>
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
                  <SectionLabel>{copy.sizesTitle}</SectionLabel>
                  <p className="text-sm text-white/65">{copy.sizesLead}</p>
                  <div className="space-y-2 text-sm text-white/80">
                    {sortedPresets.length === 0 && (
                      <span className="text-white/60">{t.common.loading}</span>
                    )}
                    {sortedPresets.map((preset) => (
                      <div key={preset.id} className="flex items-center justify-between">
                        <span>{fixMojibake(lang === "no" ? preset.name_no : preset.name_en)}</span>
                        <span className="tabular-nums">
                          {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                        </span>
                      </div>
                    ))}
                  </div>
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
        <div className="mx-auto max-w-6xl px-6 space-y-6">
          <div className="max-w-2xl space-y-3">
            <SectionLabel>{copy.contentsTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.contentsHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.contentsLead}
            </p>
          </div>
          <Link
            href="#velg-kasse"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-neutral-700 hover:text-neutral-900"
          >
            {copy.sizesTitle}
            <span aria-hidden>↓</span>
          </Link>
        </div>
      </Section>

      <Section id="velg-kasse" className="bg-[#F7F5F2] pb-28 md:pb-20">
        <div className="mx-auto max-w-6xl px-6 space-y-10">
          <div className="max-w-2xl space-y-3">
            <SectionLabel>{copy.sizesTitle}</SectionLabel>
            <h2 className="text-3xl sm:text-4xl font-light tracking-tight font-[family:var(--font-playfair)] text-neutral-900">
              {copy.sizesHeading}
            </h2>
            <p className="text-base text-neutral-600 leading-relaxed">
              {copy.sizesLead}
            </p>
            <p className="text-sm text-neutral-500 leading-relaxed">
              {copy.sizesFoundationNote}
            </p>
          </div>

          {sortedPresets.length > 0 && (
            <GlassCard className="bg-white/80 backdrop-blur border-white/50">
              <div className="p-6">
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold mb-4">
                  {copy.compareTitle}
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-neutral-500 border-b border-neutral-200">
                        <th className="py-2 pr-4 font-medium">{copy.compareName}</th>
                        <th className="py-2 pr-4 font-medium">{copy.compareWeight}</th>
                        <th className="py-2 font-medium text-right">{copy.comparePrice}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedPresets.map((preset) => (
                        <tr key={preset.id} className="border-b border-neutral-100 last:border-0">
                          <td className="py-3 pr-4 text-neutral-900 font-medium">
                            {fixMojibake(lang === "no" ? preset.name_no : preset.name_en)}
                          </td>
                          <td className="py-3 pr-4 text-neutral-600 tabular-nums">
                            {preset.target_weight_kg} {t.common.kg}
                          </td>
                          <td className="py-3 text-right text-neutral-900 tabular-nums font-medium">
                            {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </GlassCard>
          )}

          <GlassCard className="bg-white/80 backdrop-blur border-white/50">
            <div className="flex flex-wrap items-center justify-between gap-4 p-6">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-neutral-500 font-semibold">
                  {copy.availabilityTitle}
                </p>
                <p className="mt-2 text-3xl font-light tabular-nums text-neutral-900">
                  {loadingInventory ? "--" : boxesLeft}
                </p>
                <p className="text-sm text-neutral-500">{copy.availabilityLead}</p>
              </div>
              <div className="flex items-center gap-3">
                {isSoldOut && (
                  <span className="rounded-full bg-neutral-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700">
                    {t.availability.soldOut}
                  </span>
                )}
                {!isSoldOut && isLowStock && (
                  <span className="rounded-full bg-neutral-900 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-white">
                    {t.availability.fewLeft}
                  </span>
                )}
                {!isSoldOut && !isLowStock && (
                  <span className="rounded-full bg-neutral-200 px-4 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-700">
                    {copy.availabilityOpen}
                  </span>
                )}
              </div>
            </div>
          </GlassCard>

          {sortedPresets.length === 0 && (
            <GlassCard className="bg-white/80 backdrop-blur border-white/50">
              <p className="p-8 text-sm text-neutral-500">{t.mangalitsa.noPresets}</p>
            </GlassCard>
          )}

          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            {sortedPresets.map((preset) => {
              const name = fixMojibake(lang === "no" ? preset.name_no : preset.name_en);
              const pitch = fixMojibake(lang === "no" ? preset.short_pitch_no : preset.short_pitch_en);
              const scarcity = fixMojibake(
                (lang === "no" ? preset.scarcity_message_no : preset.scarcity_message_en) ?? ""
              );
              const deposit = Math.floor(preset.price_nok * 0.5);
              const balance = preset.price_nok - deposit;
              const sortedContents = [...(preset.contents || [])].sort(
                (a, b) => (a.display_order || 0) - (b.display_order || 0)
              );
              const foundationItems = sortedContents
                .filter((item) => !item.is_hero)
                .map((item) => fixMojibake(lang === "no" ? item.content_name_no : item.content_name_en));
              const specialItems = sortedContents
                .filter((item) => item.is_hero)
                .map((item) => fixMojibake(lang === "no" ? item.content_name_no : item.content_name_en));

              return (
                <GlassCard
                  key={preset.id}
                  className="bg-white/90 backdrop-blur border-white/60 motion-safe:transition-transform motion-safe:hover:-translate-y-1"
                >
                  <div className="p-8 space-y-6">
                    <div className="space-y-3">
                      <p className="text-xs uppercase tracking-[0.3em] font-semibold text-neutral-500">
                        {name}
                      </p>
                      <p className="text-4xl font-light tracking-tight text-neutral-900">
                        {preset.target_weight_kg}{" "}
                        <span className="text-lg text-neutral-500">{t.common.kg}</span>
                      </p>
                      <p className="text-sm text-neutral-600">{pitch}</p>
                    </div>

                    {foundationItems.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] font-semibold text-neutral-500">
                          {copy.boxContentsLabel}
                        </p>
                        <ul className="space-y-1.5 text-sm text-neutral-700">
                          {foundationItems.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-neutral-400" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {specialItems.length > 0 && (
                      <div className="rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-4 space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] font-semibold text-neutral-500">
                          {copy.boxSpecialLabel}
                        </p>
                        <ul className="space-y-1.5 text-sm font-medium text-neutral-900">
                          {specialItems.map((item) => (
                            <li key={item} className="flex items-start gap-2">
                              <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-neutral-900" />
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
                      <p className="text-xs uppercase tracking-[0.3em] font-semibold text-neutral-500">
                        {t.product.totalPrice}
                      </p>
                      <p className="mt-2 text-3xl font-light tabular-nums text-neutral-900">
                        {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                      </p>
                    </div>

                    <details className="rounded-2xl border border-neutral-200 bg-white/70 p-4">
                      <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-[0.25em] text-neutral-600">
                        {copy.paymentSummary}
                      </summary>
                      <div className="mt-3 space-y-2 text-sm text-neutral-600">
                        <div className="flex items-center justify-between">
                          <span>{copy.paymentDepositLabel}</span>
                          <span className="tabular-nums">
                            {deposit.toLocaleString(locale)} {t.common.currency}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span>{copy.paymentRemainderLabel}</span>
                          <span className="tabular-nums">
                            {balance.toLocaleString(locale)} {t.common.currency}
                          </span>
                        </div>
                        {scarcity && <p className="text-xs text-neutral-500">{scarcity}</p>}
                      </div>
                    </details>

                    <div className="space-y-3">
                      <Link
                        href={`/bestill?preset=${preset.slug}`}
                        className="inline-flex w-full items-center justify-center rounded-xl bg-neutral-900 px-6 py-4 text-xs font-bold uppercase tracking-[0.3em] text-white"
                      >
                        {t.mangalitsa.reserveBox}
                      </Link>
                      <Link
                        href="/oppskrifter"
                        className="inline-flex w-full items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.25em] text-neutral-600 hover:text-neutral-900"
                      >
                        {copy.boxRecipesLink}
                        <span aria-hidden>→</span>
                      </Link>
                    </div>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <p className="text-sm text-neutral-500">{copy.sizesNote}</p>
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
              (step: { week: string; title: string; body: string }) => {
                const weekNumber = extractWeekNumber(step.week);
                const eventDate = weekNumber ? dateFromIsoWeek(seasonYear, weekNumber) : null;
                return (
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
                      {eventDate && (
                        <button
                          type="button"
                          onClick={() => downloadCalendarEvent(step.title, step.body, eventDate)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900 transition-colors"
                        >
                          <span aria-hidden>+</span>
                          {copy.addToCalendar}
                        </button>
                      )}
                    </div>
                  </GlassCard>
                );
              }
            )}
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
            href="#velg-kasse"
            className="inline-flex items-center justify-center rounded-xl bg-white px-10 py-4 text-xs font-bold uppercase tracking-[0.3em] text-neutral-900"
          >
            {copy.finalCtaButton}
          </Link>
        </div>
      </Section>

      <StickyCTABar
        label={copy.stickyTitle}
        ctaLabel={copy.stickyCta}
        ctaHref="#velg-kasse"
        hidden={pastBoxGrid}
      />
    </div>
  );
}
