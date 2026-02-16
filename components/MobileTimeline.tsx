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
    <section className="px-5 py-12 text-[#1E1B16]">
      <div className="mx-auto max-w-md rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)] font-[family:var(--font-manrope)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
              {t.timeline.howItWorks}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
              {t.timeline.fromOrderToDelivery}
            </h2>
            <p className="mt-2 text-sm text-[#5E5A50]">{t.timeline.subtitle}</p>
          </div>
          <span className="rounded-full bg-[#0F6C6F] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
            1-3
          </span>
        </div>

        <div className="relative mt-6 space-y-5">
          <div className="absolute left-3 top-1 bottom-1 w-px bg-[#E4DED5]" />
          {steps.map((step, index) => (
            <div key={step.title} className="relative pl-10">
              <div className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full border border-[#0F6C6F] bg-white text-xs font-semibold text-[#0F6C6F]">
                {index + 1}
              </div>
              <div className="rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-4">
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-[#1E1B16]">{step.title}</h3>
                  <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#B35A2A]">
                    {step.time}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#5E5A50]">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-[#0F6C6F] bg-[#0F6C6F] px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-[0.25em] text-white">
          {t.hero.seasonOnce}
        </div>
      </div>
    </section>
  );
}

