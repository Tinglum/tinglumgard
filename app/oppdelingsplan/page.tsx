"use client";

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { MobileOppdelingsplan } from '@/components/MobileOppdelingsplan';
import { Extra, BoxContents, ExtrasResponse, ConfigResponse } from '@/lib/types';
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';

interface CutInfo {
  id: number;
  name: string;
  description: string;
  inBox: string[];
  extraOrder: string[];
}

export default function OppdelingsplanPage() {
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const [selectedCut, setSelectedCut] = useState<number | null>(null);
  const [hoveredCut, setHoveredCut] = useState<number | null>(null);
  const { extras, boxContents, isLoading } = useOppdelingsplanData();

  const cuts: CutInfo[] = [
    {
      id: 3,
      name: t.oppdelingsplan.nakke,
      description: t.oppdelingsplan.nakkeDesc,
      inBox: ["Nakkekoteletter ca. 1.0 kg (12 kg kasse) / ca. 0.75 kg (8 kg kasse)"],
      extraOrder: ["Ekstra nakkekoteletter", "Nakkestek/gryte"]
    },
    {
      id: 4,
      name: t.oppdelingsplan.indrefilet,
      description: t.oppdelingsplan.indrefiletDesc,
      inBox: [],
      extraOrder: ["Indrefilet"]
    },
    {
      id: 5,
      name: t.oppdelingsplan.kotelettkam,
      description: t.oppdelingsplan.kotelettkamDesc,
      inBox: ["Inkludert i Familieribbe-valget"],
      extraOrder: ["Svinekoteletter"]
    },
    {
      id: 7,
      name: t.oppdelingsplan.ribbeside,
      description: t.oppdelingsplan.ribbesideDesc,
      inBox: ["ca. 3.0 kg ribbe (12 kg kasse) / ca. 2.0 kg ribbe (8 kg kasse) - velg type ved bestilling"],
      extraOrder: ["Ekstra ribbe", "Bacon", "Sideflesk"]
    },
    {
      id: 8,
      name: t.oppdelingsplan.svinebog,
      description: t.oppdelingsplan.svinebogDesc,
      inBox: ["Inkludert i Slakterens valg"],
      extraOrder: ["Bogsteik/gryte", "Steik til pulled-pork"]
    },
    {
      id: 9,
      name: t.oppdelingsplan.skinke,
      description: t.oppdelingsplan.skinkeDesc,
      inBox: ["Svinesteik ca. 1.0 kg", "Også inkludert i Slakterens valg"],
      extraOrder: ["Ekstra skinkesteik", "Spekeskinke"]
    },
    {
      id: 10,
      name: t.oppdelingsplan.knoke,
      description: t.oppdelingsplan.knokeDesc,
      inBox: ["1 stk knoke (ca. 0.5-1.0 kg)"],
      extraOrder: ["Ekstra knoker"]
    },
    {
      id: 11,
      name: t.oppdelingsplan.labb,
      description: t.oppdelingsplan.labbDesc,
      inBox: [],
      extraOrder: ["Svinelabb"]
    },
    {
      id: 12,
      name: t.oppdelingsplan.polserFarse,
      description: t.oppdelingsplan.polserFarseDesc,
      inBox: ["Medisterfarse: ca. 1.5 kg (12 kg kasse) / ca. 1.0 kg (8 kg kasse)", "Julepølse: ca. 1.0 kg (12 kg kasse) / ca. 0.5 kg (8 kg kasse)"],
      extraOrder: ["Ekstra medisterfarse", "Ekstra julepølse"]
    }
  ];

  // Derived lists from admin/config - empty by default, populated on fetch
  const inBoxSummary: string[] = boxContents?.inBox ?? [];
  const canOrderSummary: string[] = extras.length > 0 ? extras.map(e => e.name_no) : [];

  const selectedCutInfo = cuts.find(c => c.id === selectedCut);
  const hoveredCutInfo = cuts.find(c => c.id === hoveredCut);

  // Mobile version
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>
        <div className="mx-auto max-w-md px-5 pb-24 pt-6 font-[family:var(--font-manrope)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>

          <MobileOppdelingsplan />
        </div>
      </div>
    );
  }

  // Desktop version - Nordic Minimal Design with Movement
  return (
    <div className="min-h-screen bg-white">
      {/* Subtle parallax background layer */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/3 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.12 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-20">

        <Link href="/" className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-12">
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          {t.nav.backToHome}
        </Link>

        <div className="text-center mb-16">
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-4">{t.oppdelingsplan.title}</h1>
          <p className="text-base font-light text-neutral-600 max-w-3xl mx-auto">
            {t.oppdelingsplan.subtitle}
          </p>
        </div>

        {/* Product Summary */}
        <div className="bg-white border border-neutral-200 rounded-xl p-10 mb-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light text-neutral-900 mb-10 text-center">{t.oppdelingsplan.ourProducts}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            {/* In Box Products */}
            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                {t.oppdelingsplan.inBox}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.inBoxDesc}:</p>
              <div className="space-y-3">
                {inBoxSummary.map((product) => (
                  <div key={product} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                    <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="font-light text-neutral-900">{product}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Extra Order Products */}
            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t.oppdelingsplan.canOrder}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.canOrderDesc}:</p>
              <div className="space-y-3">
                {canOrderSummary.map((product) => (
                  <div key={product} className="flex items-center gap-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                    <svg className="w-5 h-5 text-neutral-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="font-light text-neutral-900">{product}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Image-based diagram */}
        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <div className="relative px-8 py-6 bg-neutral-900">

            {/* Pig butcher diagram */}
            <div className="relative w-full aspect-[16/9] max-w-5xl mx-auto">
              <Image
                src="/pig-diagram3.png"
                alt="Pig butcher diagram"
                fill
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-contain"
                priority
              />

              {/* Clickable overlays using precise polygon coordinates */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100" preserveAspectRatio="none">
                {PIG_CUT_POLYGONS.map((polygon) => (
                  <polygon
                    key={`${polygon.id}-${polygon.points}`}
                    points={polygon.points}
                    fill="transparent"
                    stroke="transparent"
                    strokeWidth="0.5"
                    className="pointer-events-auto cursor-pointer hover:fill-white/20 hover:stroke-white/50 transition-all duration-200"
                    onClick={() => setSelectedCut(polygon.id)}
                    onMouseEnter={() => setHoveredCut(polygon.id)}
                    onMouseLeave={() => setHoveredCut(null)}
                    aria-label={polygon.ariaLabel}
                  />
                ))}
              </svg>

              {/* Hover tooltip */}
              {hoveredCut && hoveredCutInfo && !selectedCut && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-xl shadow-[0_15px_40px_-12px_rgba(0,0,0,0.3)] px-6 py-3 pointer-events-none z-10 bg-white border border-neutral-200">
                  <p className="text-sm font-light text-neutral-900">{hoveredCutInfo.name}</p>
                </div>
              )}
            </div>

          </div>

          {selectedCutInfo ? (
            <div className="border-t-2 border-neutral-200 p-10 animate-fade-in bg-white">
              <div className="max-w-4xl mx-auto">
                <div className="flex-1">
                  <h2 className="text-4xl font-light mb-4 text-neutral-900">{selectedCutInfo.name}</h2>
                  <p className="text-base font-light text-neutral-600 mb-8">{selectedCutInfo.description}</p>

                  <div className="flex flex-col md:flex-row gap-8 mb-8">

                    {/* In Box Products */}
                    <div className="flex-1">
                      <h3 className="text-xs font-light uppercase tracking-wider mb-4 flex items-center gap-2 text-neutral-600">
                        <svg className="w-5 h-5 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                        </svg>
                        {t.oppdelingsplan.inBox}
                      </h3>
                      {selectedCutInfo.inBox.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedCutInfo.inBox.map((product, idx) => (
                            <span key={idx} className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-light text-neutral-900 hover:border-neutral-300 hover:shadow-[0_5px_15px_-5px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-light italic text-neutral-500">{t.oppdelingsplan.noProductsInBox}</p>
                      )}
                    </div>

                    {/* Extra Order Products */}
                    <div className="flex-1 md:max-h-[400px] overflow-y-auto">
                      <h3 className="text-xs font-light uppercase tracking-wider mb-4 flex items-center gap-2 text-neutral-600">
                        <svg className="w-5 h-5 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        {t.oppdelingsplan.canOrder}
                      </h3>
                      {selectedCutInfo.extraOrder.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedCutInfo.extraOrder.map((product, idx) => (
                            <span key={idx} className="px-4 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-sm font-light text-neutral-900 hover:border-neutral-300 hover:shadow-[0_5px_15px_-5px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300">
                              {product}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm font-light italic text-neutral-500">{t.oppdelingsplan.noExtraProducts}</p>
                      )}
                    </div>
                  </div>

                  {/* Show ribbe choices when Ribbeside is selected */}
                  {selectedCutInfo.id === 7 && (
                    <div className="mt-8 pt-8 border-t border-neutral-200">
                      <div className="text-center mb-6">
                        <h3 className="text-2xl font-light mb-2 text-neutral-900">{t.oppdelingsplan.chooseRibbeType}</h3>
                        <p className="text-sm font-light text-neutral-500">Alle tre varianter bruker forskjellige deler av ribbeside og mage</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        {/* Tynnribbe */}
                        <div className="rounded-xl p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-neutral-200 bg-white">
                          <h4 className="font-normal mb-1 text-neutral-900">Tynnribbe</h4>
                          <p className="text-xs mb-2 font-light text-neutral-500">Klassisk ribbe med ribbein</p>
                          <ul className="space-y-1 text-xs font-light text-neutral-600">
                            <li>• Kun ribbein-området</li>
                            <li>• Perfekt sprøstekt svor</li>
                            <li>• God balanse kjøtt/fett</li>
                          </ul>
                        </div>

                        {/* Familieribbe */}
                        <div className="rounded-xl p-4 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] border-2 border-neutral-900 bg-white">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-normal text-neutral-900">Familieribbe</h4>
                            <span className="text-xs px-2 py-0.5 rounded bg-neutral-900 text-white">Premium</span>
                          </div>
                          <p className="text-xs mb-2 font-light text-neutral-500">Inkluderer kotelettkam</p>
                          <ul className="space-y-1 text-xs font-light text-neutral-600">
                            <li>• Ribbe + kotelettkam</li>
                            <li>• Mer magert kjøtt</li>
                            <li>• Best for store familier</li>
                          </ul>
                        </div>

                        {/* Porchetta */}
                        <div className="rounded-xl p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] border border-neutral-200 bg-white">
                          <h4 className="font-normal mb-1 text-neutral-900">Porchetta</h4>
                          <p className="text-xs mb-2 font-light text-neutral-500">Beinfri nedre mage</p>
                          <ul className="space-y-1 text-xs font-light text-neutral-600">
                            <li>• 100% beinfri</li>
                            <li>• Enkel å skjære</li>
                            <li>• Saftig og smakfull</li>
                          </ul>
                        </div>
                      </div>

                      <div className="rounded-xl p-4 text-sm font-light bg-neutral-50 text-neutral-600 border border-neutral-200">
                        {t.oppdelingsplan.butchersChoiceFull}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t-2 border-neutral-200 p-16 text-center bg-white">
              <svg className="w-20 h-20 mx-auto mb-6 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
              <p className="text-lg font-light text-neutral-600">{t.oppdelingsplan.clickForInfo}</p>
            </div>
          )}
        </div>

        {/* All Cuts Overview */}
        <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light text-neutral-900 mb-10 text-center">Alle kutt - Oversikt</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cuts.map((cut) => (
              <button
                key={cut.id}
                onClick={() => setSelectedCut(cut.id)}
                className={cn(
                  "p-6 rounded-xl border-2 text-left transition-all duration-300",
                  selectedCut === cut.id
                    ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                    : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                )}
              >
                <h3 className="text-xl font-normal text-neutral-900 mb-3">{cut.name}</h3>
                <p className="text-sm font-light text-neutral-600 mb-4">{cut.description}</p>
                <div className="space-y-3">
                  {cut.inBox.length > 0 && (
                    <div>
                      <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">I kassen:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cut.inBox.map((p, i) => (
                          <span key={i} className="text-xs bg-neutral-50 text-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 font-light">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {cut.extraOrder.length > 0 && (
                    <div>
                      <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">Ekstra:</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cut.extraOrder.map((p, i) => (
                          <span key={i} className="text-xs bg-neutral-50 text-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 font-light">{p}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.4s ease-out;
        }
      `}</style>
    </div>
  );
}
