"use client";

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { Check, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { PIG_CUT_POLYGONS } from '@/lib/constants/pig-diagram';
import type { CutOverview, PartKey } from '@/lib/oppdelingsplan/types';

type ExtraSummary = {
  slug: string;
  name: string;
  sizeFromKg?: number | null;
  sizeToKg?: number | null;
};

interface MobileOppdelingsplanProps {
  inBoxSummary: string[];
  canOrderSummary: ExtraSummary[];
  cuts: CutOverview[];
  onAddCut: (cut: CutOverview) => void;
  onAddExtra: (extraSlug: string, extraName: string) => void;
}

const PART_BY_POLYGON_ID: Record<number, PartKey> = {
  3: 'nakke',
  5: 'kotelettkam',
  7: 'ribbeside',
  8: 'svinebog',
  9: 'skinke',
  10: 'knoke',
};

const POLYGON_ID_BY_PART: Record<Exclude<PartKey, 'unknown'>, number> = {
  nakke: 3,
  svinebog: 8,
  kotelettkam: 5,
  ribbeside: 7,
  skinke: 9,
  knoke: 10,
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

function formatSizeRange(
  fromKg: number | null | undefined,
  toKg: number | null | undefined,
  lang: 'no' | 'en',
  approxLabel: string
) {
  if (fromKg == null || toKg == null) return null;
  const fromValue = Number(fromKg);
  const toValue = Number(toKg);
  if (!Number.isFinite(fromValue) || !Number.isFinite(toValue)) return null;
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  const from = fromValue.toLocaleString(locale, { maximumFractionDigits: 2 });
  const to = toValue.toLocaleString(locale, { maximumFractionDigits: 2 });
  return `${approxLabel} ${from}-${to} kg`;
}

export function MobileOppdelingsplan({
  inBoxSummary,
  canOrderSummary,
  cuts,
  onAddCut,
  onAddExtra,
}: MobileOppdelingsplanProps) {
  const { t, lang } = useLanguage();
  const [selectedPolygonId, setSelectedPolygonId] = useState<number | null>(null);
  const [hoveredPolygonId, setHoveredPolygonId] = useState<number | null>(null);

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
        name: t.oppdelingsplan.unknownPartName,
        description: '',
      },
    }),
    [t]
  );

  const selectedPartKey: PartKey | null = selectedPolygonId ? PART_BY_POLYGON_ID[selectedPolygonId] || null : null;
  const selectedPartName = selectedPartKey ? partMeta[selectedPartKey].name : '';
  const selectedPartDescription = selectedPartKey ? partMeta[selectedPartKey].description : '';

  const filteredCuts = useMemo(() => {
    const base = selectedPartKey ? cuts.filter((cut) => cut.partKey === selectedPartKey) : cuts;

    return base
      .slice()
      .sort((a, b) => {
        const partDelta = PART_ORDER[a.partKey] - PART_ORDER[b.partKey];
        if (partDelta !== 0) return partDelta;
        return a.name.localeCompare(b.name);
      });
  }, [cuts, selectedPartKey]);

  const hoveredPartName = hoveredPolygonId ? partMeta[PART_BY_POLYGON_ID[hoveredPolygonId] || 'unknown'].name : null;

  return (
    <div className="space-y-6 pb-24 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <header className="rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <h1 className="text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.oppdelingsplan.title}</h1>
        <p className="mt-2 text-sm text-[#5E5A50]">{t.oppdelingsplan.subtitle}</p>
      </header>

      <div className="rounded-[28px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl bg-[#FBFAF7]">
          <Image
            src="/pig-diagram3.png"
            alt={t.oppdelingsplan.diagramAlt}
            fill
            sizes="100vw"
            className="object-contain"
            priority
          />
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {PIG_CUT_POLYGONS.map((polygon) => {
              const isSelected = selectedPolygonId === polygon.id;
              const isHovered = hoveredPolygonId === polygon.id;
              const isActive = isSelected || isHovered;

              return (
                <polygon
                  key={`${polygon.id}-${polygon.points}`}
                  points={polygon.points}
                  fill={isSelected ? 'rgba(30,27,22,0.18)' : isHovered ? 'rgba(30,27,22,0.10)' : 'transparent'}
                  stroke={isActive ? 'rgba(30,27,22,0.55)' : 'transparent'}
                  strokeWidth="0.6"
                  className="cursor-pointer transition-all duration-200"
                  onClick={() => setSelectedPolygonId((previous) => (previous === polygon.id ? null : polygon.id))}
                  onMouseEnter={() => setHoveredPolygonId(polygon.id)}
                  onMouseLeave={() => setHoveredPolygonId(null)}
                  aria-label={polygon.ariaLabel}
                />
              );
            })}
          </svg>

          {hoveredPartName && !selectedPartKey && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-xl border border-[#E4DED5] bg-white px-4 py-2 shadow-[0_10px_30px_rgba(30,27,22,0.18)]">
              <p className="text-xs text-[#1E1B16]">{hoveredPartName}</p>
            </div>
          )}
        </div>
        <p className="mt-3 text-xs text-[#5E5A50]">{t.oppdelingsplan.clickForInfo}</p>
      </div>

      {selectedPartKey ? (
        <div className="rounded-[28px] border border-[#E4DED5] bg-white p-5 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
                {t.oppdelingsplan.filteredBy.replace('{part}', selectedPartName)}
              </p>
              <h2 className="mt-2 text-xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{selectedPartName}</h2>
              {selectedPartDescription ? <p className="mt-1 text-sm text-[#5E5A50]">{selectedPartDescription}</p> : null}
            </div>
            <button
              type="button"
              onClick={() => setSelectedPolygonId(null)}
              className="shrink-0 rounded-xl border border-[#E4DED5] bg-white px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]"
            >
              {t.oppdelingsplan.clearFilter}
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4">
        <div className="rounded-2xl border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.10)]">
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

        <div className="rounded-2xl border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.10)]">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E1B16]">
            <Plus className="h-4 w-4 text-[#B35A2A]" />
            {t.oppdelingsplan.canOrder}
          </div>
          <ul className="mt-3 space-y-2 text-sm text-[#5E5A50]">
            {canOrderSummary.map((extra) => (
              <li
                key={extra.slug}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#E4DED5] bg-[#FBFAF7] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate">{extra.name}</p>
                  {formatSizeRange(extra.sizeFromKg, extra.sizeToKg, lang, t.common.approx) && (
                    <p className="text-[11px] text-[#6A6258]">
                      {formatSizeRange(extra.sizeFromKg, extra.sizeToKg, lang, t.common.approx)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onAddExtra(extra.slug, extra.name)}
                  className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#1E1B16] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white"
                >
                  <Plus className="h-4 w-4" />
                  {t.oppdelingsplan.orderAsExtra}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.oppdelingsplan.allCuts}</h2>
        <div className="space-y-3">
          {filteredCuts.length === 0 ? (
            <p className="text-sm text-[#5E5A50]">{t.oppdelingsplan.noCutsLoaded}</p>
          ) : (
            filteredCuts.map((cut) => {
              const polygonId = cut.partKey !== 'unknown' ? POLYGON_ID_BY_PART[cut.partKey] : null;
              const boxLabels = cut.boxOptions.map((option) => option.label);

              return (
                <div
                  key={`mobile-cut-card-${cut.key}`}
                  className="rounded-[24px] border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.08)]"
                  onClick={() => {
                    if (polygonId) setSelectedPolygonId(polygonId);
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-[#1E1B16]">{cut.name}</p>
                      {cut.description ? <p className="mt-1 text-sm text-[#5E5A50]">{cut.description}</p> : null}
                      <p className="mt-2 text-xs text-[#6A6258]">
                        {t.oppdelingsplan.fromPigPartLabel} {cut.partName}
                      </p>
                      {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx) && (
                        <p className="mt-1 text-xs text-[#6A6258]">
                          {formatSizeRange(cut.sizeFromKg, cut.sizeToKg, lang, t.common.approx)}
                        </p>
                      )}
                      {boxLabels.length > 0 ? (
                        <p className="mt-2 text-xs text-[#6A6258]">
                          {t.oppdelingsplan.inBoxShort} {boxLabels.join(' • ')}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onAddCut(cut);
                      }}
                      className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-[#1E1B16] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white"
                    >
                      <Plus className="h-4 w-4" />
                      {t.oppdelingsplan.addToOrder}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}

