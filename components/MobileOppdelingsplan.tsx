"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';
import { oppdelingsplanContent } from '@/content/oppdelingsplan-content';

interface CutInfo {
  id: number;
  name: string;
  description: string;
  inBox: readonly string[];
  extraOrder: readonly string[];
}

export function MobileOppdelingsplan() {
  const { t, lang } = useLanguage();
  const [expandedCut, setExpandedCut] = useState<number | null>(null);
  const { extras, boxContents } = useOppdelingsplanData();

  const copy = oppdelingsplanContent[lang].mobile;

  const cuts: CutInfo[] = [
    { id: 3, name: t.oppdelingsplan.nakke, description: t.oppdelingsplan.nakkeDesc, inBox: copy.cutDetails.nakke.inBox, extraOrder: copy.cutDetails.nakke.extraOrder },
    { id: 4, name: t.oppdelingsplan.indrefilet, description: t.oppdelingsplan.indrefiletDesc, inBox: copy.cutDetails.indrefilet.inBox, extraOrder: copy.cutDetails.indrefilet.extraOrder },
    { id: 5, name: t.oppdelingsplan.kotelettkam, description: t.oppdelingsplan.kotelettkamDesc, inBox: copy.cutDetails.kotelettkam.inBox, extraOrder: copy.cutDetails.kotelettkam.extraOrder },
    { id: 7, name: t.oppdelingsplan.ribbeside, description: t.oppdelingsplan.ribbesideDesc, inBox: copy.cutDetails.ribbeside.inBox, extraOrder: copy.cutDetails.ribbeside.extraOrder },
    { id: 8, name: t.oppdelingsplan.svinebog, description: t.oppdelingsplan.svinebogDesc, inBox: copy.cutDetails.svinebog.inBox, extraOrder: copy.cutDetails.svinebog.extraOrder },
    { id: 9, name: t.oppdelingsplan.skinke, description: t.oppdelingsplan.skinkeDesc, inBox: copy.cutDetails.skinke.inBox, extraOrder: copy.cutDetails.skinke.extraOrder },
    { id: 10, name: t.oppdelingsplan.knoke, description: t.oppdelingsplan.knokeDesc, inBox: copy.cutDetails.knoke.inBox, extraOrder: copy.cutDetails.knoke.extraOrder },
    { id: 11, name: t.oppdelingsplan.labb, description: t.oppdelingsplan.labbDesc, inBox: copy.cutDetails.labb.inBox, extraOrder: copy.cutDetails.labb.extraOrder },
    { id: 12, name: t.oppdelingsplan.polserFarse, description: t.oppdelingsplan.polserFarseDesc, inBox: copy.cutDetails.polserFarse.inBox, extraOrder: copy.cutDetails.polserFarse.extraOrder },
  ];

  const inBoxSummary: string[] = boxContents?.inBox ?? [];
  const canOrderSummary: string[] = extras.length > 0
    ? extras.map((extra) => (lang === 'en' && extra.name_en ? extra.name_en : extra.name_no))
    : [];

  return (
    <div className="space-y-6 pb-20 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <header className="rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{t.oppdelingsplan.title}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.oppdelingsplan.title}</h1>
        <p className="mt-2 text-sm text-[#5E5A50]">{t.oppdelingsplan.subtitle}</p>
      </header>

      <div className="rounded-[28px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#FBFAF7]">
          <Image
            src="/pig-diagram3.png"
            alt={copy.diagramAlt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
        </div>
        <p className="mt-3 text-xs text-[#5E5A50]">{t.oppdelingsplan.clickForInfo}</p>
      </div>

      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#E4DED5] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E1B16]">
            <Check className="h-4 w-4 text-[#0F6C6F]" />
            {t.oppdelingsplan.inBox}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[#5E5A50]">
            {inBoxSummary.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F6C6F]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#E4DED5] bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E1B16]">
            <Plus className="h-4 w-4 text-[#B35A2A]" />
            {t.oppdelingsplan.canOrder}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[#5E5A50]">
            {canOrderSummary.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B35A2A]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {cuts.map((cut) => {
          const isOpen = expandedCut === cut.id;
          return (
            <div key={cut.id} className="rounded-[24px] border border-[#E4DED5] bg-white">
              <button
                onClick={() => setExpandedCut(isOpen ? null : cut.id)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{copy.partLabel} {cut.id}</p>
                  <p className="mt-1 text-lg font-semibold text-[#1E1B16]">{cut.name}</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-[#6A6258] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 text-sm text-[#5E5A50]">
                  <p className="mb-3">{cut.description}</p>
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">{t.oppdelingsplan.inBox}</p>
                      {cut.inBox.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {cut.inBox.map((product, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#0F6C6F]" />
                              <span>{product}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs italic">{t.oppdelingsplan.noProductsInBox}</p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">{t.oppdelingsplan.canOrder}</p>
                      {cut.extraOrder.length > 0 ? (
                        <ul className="mt-2 space-y-1">
                          {cut.extraOrder.map((product, index) => (
                            <li key={index} className="flex items-start gap-2">
                              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B35A2A]" />
                              <span>{product}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="mt-2 text-xs italic">{t.oppdelingsplan.noExtraProducts}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
