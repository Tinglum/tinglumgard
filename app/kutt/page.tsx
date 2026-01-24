"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { CutDiagram } from "@/components/CutDiagram";
import { GlassCard } from "@/components/GlassCard";

export default function CutsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-bg text-textPrimary">
      <div className="max-w-7xl mx-auto px-6 pt-10 pb-20 sm:pt-16">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm text-textSecondary hover:text-textPrimary transition"
          >
            ← {t.nav.products}
          </Link>

          <div className="text-xs text-textSecondary">
            {t.cuts.hover}
          </div>
        </div>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
          <GlassCard className="p-6 sm:p-8">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-xl sm:text-2xl font-medium tracking-tight">
                  {t.cuts.title}
                </h1>
                <p className="mt-2 text-sm text-textSecondary max-w-2xl">
                  Se hvor kuttene sitter, og hva som normalt ligger i kassen versus hva som kan bestilles ekstra.
                </p>
              </div>

              <div className="hidden sm:flex gap-2 text-xs text-textSecondary">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{t.cuts.inBox}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{t.cuts.extraOrder}</span>
              </div>
            </div>

            <div className="mt-8">
              <CutDiagram />
            </div>
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6 sm:p-8">
              <div className="text-sm font-medium">Hvordan bruke dette</div>
              <ul className="mt-3 space-y-2 text-sm text-textSecondary leading-relaxed">
                <li>Trykk på et område for å se navn og bruksområde.</li>
                <li>Bytt mellom “I kassen” og “Ekstra” i diagrammet dersom støttet av komponenten.</li>
                <li>Se produkt-siden for innhold og struktur.</li>
              </ul>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/produkt"
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium bg-white text-black hover:bg-white/90 transition"
                >
                  {t.product.seeDetails}
                </Link>
                <Link
                  href="/bestill"
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium bg-white/5 border border-white/10 backdrop-blur-xl hover:bg-white/8 transition"
                >
                  {t.product.orderNow}
                </Link>
              </div>
            </GlassCard>

            <GlassCard className="p-6 sm:p-8">
              <div className="text-sm font-medium">Terminologi</div>
              <div className="mt-2 text-sm text-textSecondary leading-relaxed">
                {t.cuts.shoulder}, {t.cuts.loin}, {t.cuts.belly}, {t.cuts.leg}
              </div>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
}
