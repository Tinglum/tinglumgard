"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Plus, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useOppdelingsplanData } from '@/hooks/useOppdelingsplanData';

type PartKey = 'nakke' | 'svinebog' | 'kotelettkam' | 'ribbeside' | 'skinke' | 'knoke' | 'unknown';

interface PartCut {
  key: string;
  name: string;
  boxes: string[];
}

interface PartEntry {
  key: PartKey;
  name: string;
  description: string;
  cuts: PartCut[];
}

const PART_ORDER: Record<PartKey, number> = {
  nakke: 1,
  svinebog: 2,
  kotelettkam: 3,
  ribbeside: 4,
  skinke: 5,
  knoke: 6,
  unknown: 99,
};

export function MobileOppdelingsplan() {
  const { t, lang } = useLanguage();
  const [expandedPart, setExpandedPart] = useState<PartKey | null>(null);
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

  const partEntries = useMemo<PartEntry[]>(() => {
    const partMap = new Map<PartKey, PartEntry>();

    for (const preset of presets) {
      const presetName = lang === 'en' ? preset.name_en : preset.name_no;
      const contents = (preset.contents || []).slice().sort((a, b) => a.display_order - b.display_order);

      for (const content of contents) {
        const rawPartKey = (content.part_key || 'unknown') as PartKey;
        const partKey: PartKey = rawPartKey in PART_ORDER ? rawPartKey : 'unknown';

        if (!partMap.has(partKey)) {
          partMap.set(partKey, {
            key: partKey,
            name: partMeta[partKey].name,
            description: partMeta[partKey].description,
            cuts: [],
          });
        }

        const cutName = lang === 'en' ? content.content_name_en : content.content_name_no;
        if (!cutName) continue;

        const cutKey = content.cut_id || content.cut_slug || cutName;
        const boxLabel = content.target_weight_kg
          ? `${presetName} (${content.target_weight_kg} kg)`
          : presetName;

        const part = partMap.get(partKey)!;
        const existingCut = part.cuts.find((cut) => cut.key === cutKey);
        if (!existingCut) {
          part.cuts.push({
            key: cutKey,
            name: cutName,
            boxes: [boxLabel],
          });
          continue;
        }

        if (!existingCut.boxes.includes(boxLabel)) {
          existingCut.boxes.push(boxLabel);
        }
      }
    }

    return Array.from(partMap.values())
      .filter((part) => part.cuts.length > 0)
      .sort((a, b) => PART_ORDER[a.key] - PART_ORDER[b.key]);
  }, [lang, partMeta, presets]);

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
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{t.oppdelingsplan.title}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.oppdelingsplan.title}</h1>
        <p className="mt-2 text-sm text-[#5E5A50]">{t.oppdelingsplan.subtitle}</p>
      </header>

      <div className="rounded-[28px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#FBFAF7]">
          <Image
            src="/pig-diagram3.png"
            alt={lang === 'en' ? 'Butcher diagram' : 'Oppdelingsplan'}
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
        {partEntries.map((part, index) => {
          const isOpen = expandedPart === part.key;
          return (
            <div key={part.key} className="rounded-[24px] border border-[#E4DED5] bg-white">
              <button
                onClick={() => setExpandedPart(isOpen ? null : part.key)}
                className="flex w-full items-center justify-between px-4 py-4 text-left"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                    {lang === 'en' ? 'Part' : 'Del'} {index + 1}
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#1E1B16]">{part.name}</p>
                </div>
                <ChevronDown className={`h-5 w-5 text-[#6A6258] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </button>

              {isOpen && (
                <div className="px-4 pb-4 text-sm text-[#5E5A50]">
                  {part.description ? <p className="mb-3">{part.description}</p> : null}
                  <div className="grid gap-3">
                    <div className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">
                        {lang === 'en' ? 'Cuts from this part' : 'Kutt fra denne delen'}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {part.cuts.map((cut) => (
                          <span key={`mobile-cut-chip-${cut.key}`} className="text-xs rounded-lg border border-[#E4DED5] bg-white px-2 py-1">
                            {cut.name}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">{t.oppdelingsplan.inBox}</p>
                      <ul className="mt-2 space-y-2">
                        {part.cuts.map((cut) => (
                          <li key={`mobile-cut-boxes-${cut.key}`} className="rounded-lg border border-[#E4DED5] bg-white p-2">
                            <p className="text-sm text-[#1E1B16]">{cut.name}</p>
                            <p className="text-xs text-[#5E5A50]">{cut.boxes.join(' • ')}</p>
                          </li>
                        ))}
                      </ul>
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
