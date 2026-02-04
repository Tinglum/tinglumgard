"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileHeroProps {
  isSoldOut: boolean;
  minPrice?: number | null;
  minDeposit?: number | null;
}

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

export function MobileHero({ isSoldOut, minPrice, minDeposit }: MobileHeroProps) {
  const { t } = useLanguage();
  const subtitle = t.hero.subtitle || t.hero.description;

  return (
    <section className="relative overflow-hidden px-5 pt-12 pb-12 text-[#1E1B16]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute -top-28 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
        <div className="absolute top-24 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(246,244,239,0.9),rgba(246,244,239,0.98))]" />
      </div>

      <div className="relative z-10 mx-auto max-w-md font-[family:var(--font-manrope)]">
        <motion.div
          {...fadeUp}
          className="inline-flex items-center gap-2 rounded-full border border-[#DCD4C9] bg-white px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
        >
          <span className="h-2 w-2 rounded-full bg-[#0F6C6F]" />
          {t.hero.season}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 text-4xl font-semibold leading-[1.05] text-[#1E1B16] font-[family:var(--font-playfair)]"
        >
          {t.hero.porkFrom}
          <span className="mt-2 block text-[#0F6C6F]">{t.hero.farmName}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-4 text-sm text-[#5E5A50]"
        >
          {subtitle}
        </motion.p>

        {(minPrice || minDeposit) && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-6 rounded-2xl border border-[#E4DED5] bg-white p-4 shadow-[0_18px_40px_rgba(30,27,22,0.12)]"
          >
            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">
              <span>Fra pris</span>
              <span>Forskudd</span>
            </div>
            <div className="mt-3 flex items-end justify-between">
              <div className="text-2xl font-semibold text-[#1E1B16]">
                {minPrice ? `${minPrice.toLocaleString('nb-NO')} ${t.common.currency}` : '—'}
              </div>
              <div className="text-sm font-semibold text-[#5E5A50]">
                {minDeposit ? `${minDeposit.toLocaleString('nb-NO')} ${t.common.currency}` : '—'}
              </div>
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-6 grid gap-3"
        >
          {!isSoldOut ? (
            <Link
              href="/bestill"
              className="inline-flex items-center justify-center rounded-2xl bg-[#1E1B16] px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
            >
              {t.hero.reserveNow}
            </Link>
          ) : (
            <div className="inline-flex items-center justify-center rounded-2xl bg-[#D7CEC3] px-6 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#6A6258]">
              {t.availability.soldOut}
            </div>
          )}
          <Link
            href="/produkt"
            className="inline-flex items-center justify-center rounded-2xl border border-[#1E1B16] px-6 py-4 text-sm font-semibold uppercase tracking-[0.2em] text-[#1E1B16]"
          >
            {t.hero.learnMore}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 grid grid-cols-2 gap-3 text-xs font-semibold"
        >
          <div className="rounded-2xl border border-[#E4DED5] bg-white px-4 py-3 text-[#5E5A50]">
            {t.hero.localRaised}
          </div>
          <div className="rounded-2xl border border-[#E4DED5] bg-white px-4 py-3 text-[#5E5A50]">
            {t.hero.qualityGuarantee}
          </div>
          <div className="rounded-2xl border border-[#E4DED5] bg-white px-4 py-3 text-[#5E5A50]">
            {t.hero.seasonOnce}
          </div>
          <div className="rounded-2xl border border-[#E4DED5] bg-white px-4 py-3 text-[#5E5A50]">
            {t.checkout.securePayment}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
