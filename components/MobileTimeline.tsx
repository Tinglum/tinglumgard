"use client";

import { useLanguage } from '@/contexts/LanguageContext';

export function MobileTimeline() {
  const { t } = useLanguage();

  const steps = [
    {
      title: t.timeline.step1Title,
      time: t.timeline.step1Time,
      desc: t.timeline.step1Desc,
    },
    {
      title: t.timeline.step2Title,
      time: t.timeline.step2Time,
      desc: t.timeline.step2Desc,
    },
    {
      title: t.timeline.step3Title,
      time: t.timeline.step3Time,
      desc: t.timeline.step3Desc,
    },
  ];

  return (
    <section className="bg-[#F7F1EA] px-5 py-12">
      <div className="rounded-2xl border border-[#E6D8C8] bg-white/80 p-6 shadow-[0_12px_30px_rgba(50,36,24,0.08)]">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6C5A4A]">{t.timeline.howItWorks}</p>
          <h2 className="mt-2 text-2xl font-bold text-[#1F1A14]">{t.timeline.fromOrderToDelivery}</h2>
          <p className="mt-2 text-sm text-[#6C5A4A]">{t.timeline.subtitle}</p>
        </div>

        <div className="space-y-4">
          {steps.map((step, index) => (
            <div key={step.title} className="flex gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#1F1A14] text-sm font-bold text-[#F7F1EA]">
                {index + 1}
              </div>
              <div className="flex-1 rounded-xl border border-[#EFE2D4] bg-[#FFF9F2] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#1F1A14]">{step.title}</h3>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C05621]">
                    {step.time}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#6C5A4A]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-xl border border-[#E6D8C8] bg-[#1F1A14] px-4 py-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#F7F1EA]">
          {t.hero.seasonOnce}
        </div>
      </div>
    </section>
  );
}
