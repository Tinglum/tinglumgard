'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { GlassCard } from '@/components/GlassCard';
import { mangalitsaStory } from '@/content/mangalitsa-story';

export function MangalitsaPremiumStory() {
  const { lang } = useLanguage();
  const story = mangalitsaStory[lang];

  return (
    <section className="py-20 bg-[#F7F5F2]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Why expensive */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-light tracking-tight text-neutral-900 font-[family:var(--font-playfair)]">
            {story.whyExpensive.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {story.whyExpensive.reasons.map((reason: { title: string; body: string }, idx: number) => (
            <GlassCard
              key={idx}
              className="bg-white/70 backdrop-blur border-white/40 motion-safe:transition-transform motion-safe:hover:-translate-y-1"
            >
              <div className="p-8">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-500 mb-3">
                  {reason.title}
                </p>
                <p className="text-sm font-light text-neutral-600 leading-relaxed">
                  {reason.body}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Contrast */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-2xl border border-neutral-200 bg-white/50">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-neutral-400 mb-3">
              {story.labels.standard}
            </p>
            <p className="text-lg font-light text-neutral-500 italic">
              {story.contrast.standard}
            </p>
          </div>
          <div className="p-8 rounded-2xl border border-neutral-900 bg-neutral-900 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/60 mb-3">{story.labels.mangalitsa}</p>
            <p className="text-lg font-light italic">
              {story.contrast.mangalitsa}
            </p>
          </div>
        </div>

        {/* Three rules */}
        <div className="text-center">
          <div className="inline-flex flex-col sm:flex-row gap-6 sm:gap-10">
            {story.threeRules.map((rule: string, idx: number) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-2xl font-light text-neutral-300">{idx + 1}</span>
                <span className="text-sm font-light text-neutral-700">{rule}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
