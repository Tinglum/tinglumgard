'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { useState, useEffect } from 'react';

export function MangalitsaBoxesSection() {
  const { lang, t } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPresets() {
      try {
        const res = await fetch('/api/mangalitsa/presets');
        const data = await res.json();
        setPresets(data.presets || []);
      } catch (error) {
        console.error('Failed to load presets:', error);
      } finally {
        setLoading(false);
      }
    }
    loadPresets();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center text-neutral-500">
        {t.mangalitsa.loading}
      </div>
    );
  }

  return (
    <section id="mangalitsa-boxes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-16">
          <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-neutral-900 mb-4 font-[family:var(--font-playfair)]">
            {t.mangalitsa.hero.title}
          </h2>
          <p className="text-xl font-light text-neutral-600 mb-2">
            {t.mangalitsa.hero.subtitle}
          </p>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-neutral-900">
            {t.mangalitsa.hero.scarcity}
          </p>
        </div>

        {/* Box grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {presets.map((preset: any) => {
            const name = lang === 'no' ? preset.name_no : preset.name_en;
            const pitch = lang === 'no' ? preset.short_pitch_no : preset.short_pitch_en;
            const scarcity = lang === 'no' ? preset.scarcity_message_no : preset.scarcity_message_en;

            return (
              <div
                key={preset.id}
                className="bg-white border border-neutral-200 rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-500"
              >
                {/* Header */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-2xl font-normal text-neutral-900">{name}</h3>
                    <span className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full uppercase tracking-wide">
                      {preset.target_weight_kg} {t.common.kg}
                    </span>
                  </div>
                  <p className="text-sm font-light text-neutral-500 italic">{pitch}</p>
                </div>

                {/* Contents */}
                <div className="mb-6 space-y-2">
                  {preset.contents
                    ?.map((content: any, idx: number) => {
                      const contentName = lang === 'no' ? content.content_name_no : content.content_name_en;
                      return (
                        <div
                          key={idx}
                          className={`text-sm font-light ${content.is_hero ? 'text-neutral-900 font-normal' : 'text-neutral-600'}`}
                        >
                          <span className="mr-2 text-neutral-400">&bull;</span>
                          {contentName}
                          {content.target_weight_kg && (
                            <span className="text-neutral-500 ml-1">
                              ({content.target_weight_kg} {t.common.kg})
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>

                {/* Price & CTA */}
                <div className="border-t border-neutral-200 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-3xl font-light text-neutral-900">
                        {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                      </p>
                      <p className="text-xs font-light text-neutral-500">
                        {Math.round(preset.price_nok / preset.target_weight_kg)} {t.mangalitsa.perKg}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-light text-neutral-500 uppercase tracking-wide">
                        {scarcity}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => window.location.href = `/bestill?preset=${preset.slug}`}
                    className="w-full py-4 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold uppercase tracking-[0.3em] shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300"
                  >
                    {t.mangalitsa.reserveBox}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Premium proof section */}
        <div className="mt-16 text-center">
          <div className="inline-flex flex-wrap gap-6 justify-center">
            {t.mangalitsa.premiumProof.map((proof: string, idx: number) => (
              <div key={idx} className="flex items-center gap-2 text-sm font-light text-neutral-600">
                <span className="w-1.5 h-1.5 bg-neutral-900 rounded-full" />
                {proof}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
