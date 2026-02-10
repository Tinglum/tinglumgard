"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { CutDiagram } from "@/components/CutDiagram";

export default function CutsPage() {
  const { t } = useLanguage();
  const copy = t.cutsPage;

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 left-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear',
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 mb-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.products}
          </Link>

          <div className="text-xs font-light text-neutral-500 uppercase tracking-wide">
            {t.cuts.hover}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
          <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
            <div className="flex items-end justify-between gap-6">
              <div>
                <h1 className="text-3xl font-light tracking-tight text-neutral-900">
                  {t.cuts.title}
                </h1>
                <p className="mt-3 text-base font-light leading-relaxed text-neutral-600 max-w-2xl">
                  {copy.diagramLead}
                </p>
              </div>

              <div className="hidden sm:flex gap-2 text-xs font-light">
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1.5 text-neutral-600">{t.cuts.inBox}</span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-4 py-1.5 text-neutral-600">{t.cuts.extraOrder}</span>
              </div>
            </div>

            <div className="mt-10">
              <CutDiagram />
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1">
              <div className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-4">{copy.howToUse}</div>
              <ul className="space-y-3 text-sm font-light text-neutral-600 leading-relaxed">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                  <span>{copy.howToUse1}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                  <span>{copy.howToUse2}</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                  <span>{copy.howToUse3}</span>
                </li>
              </ul>

              <div className="mt-6 flex flex-col gap-3">
                <Link
                  href="/produkt"
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-light uppercase tracking-wide bg-neutral-50 text-neutral-900 border border-neutral-200 hover:bg-neutral-100 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300"
                >
                  {t.product.seeDetails}
                </Link>
                <Link
                  href="/bestill"
                  className="inline-flex items-center justify-center rounded-xl px-6 py-3 text-sm font-light uppercase tracking-wide bg-neutral-900 text-white hover:bg-neutral-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
                >
                  {t.product.orderNow}
                </Link>
              </div>
            </div>

            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1">
              <div className="text-xs uppercase tracking-wide text-neutral-500 font-medium mb-3">{copy.terminology}</div>
              <div className="text-sm font-light text-neutral-600 leading-relaxed">
                {t.cuts.shoulder}, {t.cuts.loin}, {t.cuts.belly}, {t.cuts.leg}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
