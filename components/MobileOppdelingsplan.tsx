"use client";

import { useState } from 'react';
import Image from 'next/image';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';

interface CutInfo {
  id: number;
  name: string;
  description: string;
  inBox: string[];
  extraOrder: string[];
}

export function MobileOppdelingsplan() {
  const { t } = useLanguage();
  const [expandedCut, setExpandedCut] = useState<number | null>(null);
  const { extras, boxContents } = useOppdelingsplanData();

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
      inBox: [
        "Medisterfarse: ca. 1.5 kg (12 kg kasse) / ca. 1.0 kg (8 kg kasse)",
        "Julepølse: ca. 1.0 kg (12 kg kasse) / ca. 0.5 kg (8 kg kasse)"
      ],
      extraOrder: ["Ekstra medisterfarse", "Ekstra julepølse"]
    }
  ];

  const inBoxSummary: string[] = boxContents?.inBox ?? [];
  const canOrderSummary: string[] = extras.length > 0 ? extras.map(e => e.name_no) : [];

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
            alt="Oppdelingsplan gris"
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
            {inBoxSummary.map(item => (
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
            {canOrderSummary.map(item => (
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
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">Del {cut.id}</p>
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
                          {cut.inBox.map((product, i) => (
                            <li key={i} className="flex items-start gap-2">
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
                          {cut.extraOrder.map((product, i) => (
                            <li key={i} className="flex items-start gap-2">
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
