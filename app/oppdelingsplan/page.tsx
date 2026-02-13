"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { MobileOppdelingsplan } from '@/components/MobileOppdelingsplan';
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';

type PartKey = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke' | 'unknown';

interface CutOverview {
  key: string;
  name: string;
  description: string;
  partKey: PartKey;
  partName: string;
  boxes: string[];
}

const PART_BY_POLYGON_ID: Record<number, PartKey> = {
  3: 'nakke',
  5: 'kotelettkam',
  7: 'ribbeside',
  8: 'svinebog',
  9: 'skinke',
  10: 'knoke',
};

const PART_ORDER: Record<PartKey, number> = {
  nakke: 1,
  svinebog: 2,
  kotelettkam: 3,
  ribbeside: 4,
  skinke: 5,
  knoke: 6,
  unknown: 99,
};

export default function OppdelingsplanPage() {
  const { t, lang } = useLanguage();
  const isMobile = useIsMobile();
  const [selectedCut, setSelectedCut] = useState<number | null>(null);
  const [hoveredCut, setHoveredCut] = useState<number | null>(null);
  const { extras, presets } = useOppdelingsplanData();

  const partMeta = useMemo(
    () => ({
      nakke: {
        name: t.oppdelingsplan.nakke,
        description: t.oppdelingsplan.nakkeDesc,
      },
      svinebog: {
        name: t.oppdelingsplan.svinebog,
        description: t.oppdelingsplan.svinebogDesc,
      },
      kotelettkam: {
        name: t.oppdelingsplan.kotelettkam,
        description: t.oppdelingsplan.kotelettkamDesc,
      },
      ribbeside: {
        name: t.oppdelingsplan.ribbeside,
        description: t.oppdelingsplan.ribbesideDesc,
      },
      skinke: {
        name: t.oppdelingsplan.skinke,
        description: t.oppdelingsplan.skinkeDesc,
      },
      knoke: {
        name: t.oppdelingsplan.knoke,
        description: t.oppdelingsplan.knokeDesc,
      },
      unknown: {
        name: lang === 'en' ? 'Unknown part' : 'Ukjent del',
        description: '',
      },
    }),
    [lang, t]
  );

  const allCutsOverview = useMemo<CutOverview[]>(() => {
    const map = new Map<string, CutOverview>();

    for (const preset of presets) {
      const presetName = lang === 'en' ? preset.name_en : preset.name_no;
      const contents = (preset.contents || []).slice().sort((a, b) => a.display_order - b.display_order);

      for (const content of contents) {
        const cutName = lang === 'en' ? content.content_name_en : content.content_name_no;
        if (!cutName) continue;

        const key = content.cut_id || content.cut_slug || cutName;
        const rawPartKey = (content.part_key || 'unknown') as PartKey;
        const partKey: PartKey = rawPartKey in PART_ORDER ? rawPartKey : 'unknown';
        const partName = lang === 'en'
          ? content.part_name_en || content.part_name_no || partMeta[partKey].name
          : content.part_name_no || partMeta[partKey].name;
        const cutDescription = lang === 'en'
          ? content.cut_description_en || ''
          : content.cut_description_no || '';

        const boxLabel = content.target_weight_kg
          ? `${presetName} (${content.target_weight_kg} kg)`
          : presetName;

        if (!map.has(key)) {
          map.set(key, {
            key,
            name: cutName,
            description: cutDescription,
            partKey,
            partName,
            boxes: [boxLabel],
          });
          continue;
        }

        const existing = map.get(key)!;
        if (!existing.boxes.includes(boxLabel)) {
          existing.boxes.push(boxLabel);
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      const partDelta = PART_ORDER[a.partKey] - PART_ORDER[b.partKey];
      if (partDelta !== 0) return partDelta;
      return a.name.localeCompare(b.name);
    });
  }, [lang, partMeta, presets]);

  const selectedPartKey = selectedCut ? PART_BY_POLYGON_ID[selectedCut] || null : null;
  const selectedPartCuts = useMemo(
    () => (selectedPartKey ? allCutsOverview.filter((cut) => cut.partKey === selectedPartKey) : []),
    [allCutsOverview, selectedPartKey]
  );
  const selectedPartName = selectedPartKey ? (selectedPartCuts[0]?.partName || partMeta[selectedPartKey].name) : '';
  const selectedPartDescription = selectedPartKey ? partMeta[selectedPartKey].description : '';
  const hoveredPartName = hoveredCut ? partMeta[PART_BY_POLYGON_ID[hoveredCut] || 'unknown'].name : null;

  const inBoxSummary: string[] = Array.from(
    new Set(
      presets
        .flatMap((preset) =>
          (preset.contents || []).map((content) => {
            const presetName = lang === 'en' ? preset.name_en : preset.name_no;
            const contentName = lang === 'en' ? content.content_name_en : content.content_name_no;
            return `${presetName}: ${contentName}`;
          })
        )
    )
  );

  const canOrderSummary: string[] = extras.length > 0
    ? extras.map((extra) => {
        const englishName = (extra as any).name_en;
        return lang === 'en' && englishName ? englishName : extra.name_no;
      })
    : [];

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

  return (
    <div className="min-h-screen bg-white">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/3 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.12 : 0}px)`,
            transition: 'transform 0.05s linear',
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
          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-4 font-[family:var(--font-playfair)]">
            {t.oppdelingsplan.title}
          </h1>
          <p className="text-base font-light text-neutral-600 max-w-3xl mx-auto">
            {t.oppdelingsplan.subtitle}
          </p>
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl overflow-hidden mb-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <div className="relative px-8 py-6 bg-neutral-900">
            <div className="relative w-full aspect-[16/9] max-w-5xl mx-auto">
              <Image
                src="/pig-diagram3.png"
                alt={lang === 'en' ? 'Butcher diagram' : 'Oppdelingsplan'}
                fill
                sizes="(min-width: 1024px) 800px, 100vw"
                className="object-contain"
                priority
              />

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

              {hoveredCut && hoveredPartName && !selectedCut && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 rounded-xl shadow-[0_15px_40px_-12px_rgba(0,0,0,0.3)] px-6 py-3 pointer-events-none z-10 bg-white border border-neutral-200">
                  <p className="text-sm font-light text-neutral-900">{hoveredPartName}</p>
                </div>
              )}
            </div>
          </div>

          {selectedPartKey ? (
            <div className="border-t-2 border-neutral-200 p-10 animate-fade-in bg-white">
              <div className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] max-w-4xl mx-auto">
                <div className="mb-6">
                  <h3 className="text-3xl font-normal text-neutral-900 mb-3 font-[family:var(--font-playfair)]">
                    {selectedPartName}
                  </h3>
                  {selectedPartDescription && (
                    <p className="text-base font-light text-neutral-600 leading-relaxed">
                      {selectedPartDescription}
                    </p>
                  )}
                </div>

                {selectedPartCuts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-3">
                        {lang === 'en' ? 'Cuts from this part' : 'Kutt fra denne delen'}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedPartCuts.map((cut) => (
                          <span
                            key={`selected-cut-chip-${cut.key}`}
                            className="text-xs bg-neutral-50 text-neutral-800 px-3 py-1 rounded-lg border border-neutral-200 font-light"
                          >
                            {cut.name}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-3">
                        {t.oppdelingsplan.inBox}
                      </p>
                      <ul className="space-y-3">
                        {selectedPartCuts.map((cut) => (
                          <li key={`selected-cut-boxes-${cut.key}`} className="rounded-xl border border-neutral-200 bg-neutral-50 p-3">
                            <p className="text-sm font-normal text-neutral-900 mb-1">{cut.name}</p>
                            <p className="text-sm font-light text-neutral-600">
                              {cut.boxes.join(' • ')}
                            </p>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm font-light text-neutral-600">{t.oppdelingsplan.noProductsInBox}</p>
                )}
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

        <div className="bg-white border border-neutral-200 rounded-xl p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light text-neutral-900 mb-10 text-center">{t.oppdelingsplan.allCuts}</h2>
          {allCutsOverview.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {allCutsOverview.map((cut) => (
                <div
                  key={cut.key}
                  className={cn(
                    'p-6 rounded-xl border-2 text-left transition-all duration-300',
                    'border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1'
                  )}
                >
                  <h3 className="text-xl font-normal text-neutral-900 mb-3">{cut.name}</h3>
                  <p className="text-sm font-light text-neutral-600 mb-4">
                    {lang === 'en' ? 'From pig part:' : 'Fra del av gris:'} {cut.partName}
                  </p>
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs font-light uppercase tracking-wider text-neutral-600 mb-2">{t.oppdelingsplan.inBoxShort}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {cut.boxes.map((box, index) => (
                          <span key={`${cut.key}-${index}`} className="text-xs bg-neutral-50 text-neutral-800 px-2 py-1 rounded-lg border border-neutral-200 font-light">
                            {box}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-neutral-500 text-center">{lang === 'en' ? 'No cuts loaded yet.' : 'Ingen kutt lastet inn ennå.'}</p>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-10 mt-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-3xl font-light text-neutral-900 mb-10 text-center">{t.oppdelingsplan.ourProducts}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t.oppdelingsplan.inBox}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.inBoxDesc}</p>
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

            <div>
              <h3 className="text-xl font-normal mb-6 flex items-center gap-3 text-neutral-900">
                <svg className="w-6 h-6 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                {t.oppdelingsplan.canOrder}
              </h3>
              <p className="text-sm font-light text-neutral-600 mb-6">{t.oppdelingsplan.canOrderDesc}</p>
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
