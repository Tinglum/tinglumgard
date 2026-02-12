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
  const { extras, presets } = useOppdelingsplanData();

  const mobileCopy = oppdelingsplanContent[lang].mobile;
  const pageCopy = oppdelingsplanContent[lang].page;

  const cuts: CutInfo[] = [
    { id: 3, name: pageCopy.cutDetails.nakke.name, description: pageCopy.cutDetails.nakke.description, inBox: pageCopy.cutDetails.nakke.inBox, extraOrder: pageCopy.cutDetails.nakke.extraOrder },
    { id: 4, name: pageCopy.cutDetails.indrefilet.name, description: pageCopy.cutDetails.indrefilet.description, inBox: pageCopy.cutDetails.indrefilet.inBox, extraOrder: pageCopy.cutDetails.indrefilet.extraOrder },
    { id: 5, name: pageCopy.cutDetails.kotelettkam.name, description: pageCopy.cutDetails.kotelettkam.description, inBox: pageCopy.cutDetails.kotelettkam.inBox, extraOrder: pageCopy.cutDetails.kotelettkam.extraOrder },
    { id: 7, name: pageCopy.cutDetails.ribbeside.name, description: pageCopy.cutDetails.ribbeside.description, inBox: pageCopy.cutDetails.ribbeside.inBox, extraOrder: pageCopy.cutDetails.ribbeside.extraOrder },
    { id: 8, name: pageCopy.cutDetails.svinebog.name, description: pageCopy.cutDetails.svinebog.description, inBox: pageCopy.cutDetails.svinebog.inBox, extraOrder: pageCopy.cutDetails.svinebog.extraOrder },
    { id: 9, name: pageCopy.cutDetails.skinke.name, description: pageCopy.cutDetails.skinke.description, inBox: pageCopy.cutDetails.skinke.inBox, extraOrder: pageCopy.cutDetails.skinke.extraOrder },
    { id: 10, name: pageCopy.cutDetails.knoke.name, description: pageCopy.cutDetails.knoke.description, inBox: pageCopy.cutDetails.knoke.inBox, extraOrder: pageCopy.cutDetails.knoke.extraOrder },
    { id: 11, name: pageCopy.cutDetails.labb.name, description: pageCopy.cutDetails.labb.description, inBox: pageCopy.cutDetails.labb.inBox, extraOrder: pageCopy.cutDetails.labb.extraOrder },
    { id: 12, name: pageCopy.cutDetails.polserFarse.name, description: pageCopy.cutDetails.polserFarse.description, inBox: pageCopy.cutDetails.polserFarse.inBox, extraOrder: pageCopy.cutDetails.polserFarse.extraOrder },
  ];

  const inBoxSummary: string[] = Array.from(
    new Set(
      presets.flatMap((preset) =>
        (preset.contents || []).map((content: any) => {
          const presetName = lang === 'en' ? preset.name_en : preset.name_no;
          const contentName = lang === 'en' ? content.content_name_en : content.content_name_no;
          return `${presetName}: ${contentName}`;
        })
      )
    )
  );
  const canOrderSummary: string[] = extras.length > 0
    ? extras.map((extra) => (lang === 'en' && extra.name_en ? extra.name_en : extra.name_no))
    : [];

  return (
    <div className="space-y-6 pb-20 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <header className="rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{pageCopy.title}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{pageCopy.title}</h1>
        <p className="mt-2 text-sm text-[#5E5A50]">{pageCopy.subtitle}</p>
      </header>

      <div className="rounded-[28px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#FBFAF7]">
          <Image
            src="/pig-diagram3.png"
            alt={mobileCopy.diagramAlt}
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{mobileCopy.partLabel} {cut.id}</p>
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
