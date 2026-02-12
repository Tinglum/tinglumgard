"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

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
    id?: string;
    content_name_no: string;
    content_name_en: string;
    display_order?: number;
    is_hero?: boolean;
  }>;
}

interface MobileProductTilesProps {
  presets: MangalitsaPreset[];
}

export function MobileProductTiles({ presets }: MobileProductTilesProps) {
  const { t, lang } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';

  const sortedPresets = [...presets].sort((a, b) => (a.display_order || 0) - (b.display_order || 0));

  const mobileCopy = lang === 'no'
    ? {
        boxes: 'Mangalitsa-bokser',
        inBox: 'I boksen',
      }
    : {
        boxes: 'Mangalitsa boxes',
        inBox: 'In the box',
      };

  return (
    <section className="px-5 py-12 text-[#1E1B16]">
      <div className="mx-auto max-w-md font-[family:var(--font-manrope)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{mobileCopy.boxes}</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
              {t.mangalitsa.hero.title}
            </h2>
            <p className="mt-2 text-sm text-[#5E5A50]">{t.mangalitsa.hero.subtitle}</p>
          </div>
          <Link href="/produkt" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F6C6F]">
            {t.product.seeDetails}
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {sortedPresets.map((preset, idx) => {
            const name = lang === 'no' ? preset.name_no : preset.name_en;
            const pitch = lang === 'no' ? preset.short_pitch_no : preset.short_pitch_en;
            const scarcity = lang === 'no' ? preset.scarcity_message_no : preset.scarcity_message_en;
            const deposit = Math.floor(preset.price_nok * 0.5);
            const contents = [...(preset.contents || [])]
              .sort((a, b) => (a.display_order || 0) - (b.display_order || 0))
              .slice(0, 4)
              .map((item) => (lang === 'no' ? item.content_name_no : item.content_name_en));

            return (
              <div
                key={preset.id}
                className={`relative overflow-hidden rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)] ${
                  idx === 0 ? 'ring-2 ring-[#0F6C6F]' : ''
                }`}
              >
                {idx === 0 && (
                  <div className="absolute right-6 top-6 rounded-full bg-[#0F6C6F] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                    {t.product.mostPopular}
                  </div>
                )}

                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{name}</p>
                    <p className="mt-2 text-4xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
                      {preset.target_weight_kg}
                      <span className="ml-2 text-base font-semibold text-[#6A6258]">{t.common.kg}</span>
                    </p>
                    <p className="mt-2 text-sm text-[#5E5A50]">{pitch}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold text-[#1E1B16]">
                      {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                    </p>
                    <p className="text-xs text-[#5E5A50]">
                      {t.product.deposit50}: {deposit.toLocaleString(locale)} {t.common.currency}
                    </p>
                    <p className="text-xs text-[#5E5A50] mt-1">
                      {Math.round(preset.price_nok / preset.target_weight_kg)} {t.mangalitsa.perKg}
                    </p>
                  </div>
                </div>

                {contents.length > 0 && (
                  <div className="mt-5 rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">{mobileCopy.inBox}</p>
                    <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#4F4A42]">
                      {contents.map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B35A2A]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {scarcity && (
                  <div className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#6A6258]">
                    {scarcity}
                  </div>
                )}

                <Link
                  href={`/bestill?preset=${preset.slug}`}
                  className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#1E1B16] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
                >
                  {t.mangalitsa.reserveBox}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
