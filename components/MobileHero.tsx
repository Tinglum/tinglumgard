"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileHeroProps {
  isSoldOut: boolean;
  minPrice?: number | null;
  minDeposit?: number | null;
}

export function MobileHero({ isSoldOut, minPrice, minDeposit }: MobileHeroProps) {
  const { t } = useLanguage();
  const subtitle = t.hero.subtitle || t.hero.description;

  return (
    <section className="relative overflow-hidden px-5 pt-10 pb-12 bg-[#F7F1EA] text-[#1F1A14]">
      <div className="absolute inset-0">
        <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full bg-[#F1D6C0]/70 blur-3xl" />
        <div className="absolute bottom-0 -left-10 h-56 w-56 rounded-full bg-[#DDE6CF]/70 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto max-w-md">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-full border border-[#E6D8C8] bg-[#FFF9F2] px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#6C5A4A]"
        >
          <span className="h-2 w-2 rounded-full bg-[#2F5D3A]" />
          {t.hero.season}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05 }}
          className="mt-6 text-4xl font-bold leading-[1.05]"
        >
          {t.hero.porkFrom}
          <span className="mt-2 block text-[#C05621]">{t.hero.farmName}</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mt-4 text-sm font-medium text-[#5A4A3D]"
        >
          {subtitle}
        </motion.p>

        {(minPrice || minDeposit) && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="mt-5 flex flex-wrap items-center gap-2 text-xs font-semibold text-[#6C5A4A]"
          >
            {minPrice && (
              <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1">
                Fra {minPrice.toLocaleString('nb-NO')} {t.common.currency}
              </span>
            )}
            {minDeposit && (
              <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1">
                Forskudd fra {minDeposit.toLocaleString('nb-NO')} {t.common.currency}
              </span>
            )}
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-8 flex flex-wrap items-center gap-3"
        >
          {!isSoldOut ? (
            <Link
              href="/bestill"
              className="inline-flex items-center justify-center rounded-xl bg-[#1F1A14] px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
            >
              {t.hero.reserveNow}
            </Link>
          ) : (
            <div className="inline-flex items-center justify-center rounded-xl bg-[#CFC2B3] px-6 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#6C5A4A]">
              {t.availability.soldOut}
            </div>
          )}
          <Link
            href="/produkt"
            className="text-sm font-semibold text-[#6C5A4A] underline underline-offset-4"
          >
            {t.hero.learnMore}
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-8 flex flex-wrap gap-2 text-xs font-semibold"
        >
          <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1 text-[#6C5A4A]">
            {t.hero.localRaised}
          </span>
          <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1 text-[#6C5A4A]">
            Levering uke 46–48
          </span>
          <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1 text-[#6C5A4A]">
            Betal med Vipps
          </span>
        </motion.div>
      </div>
    </section>
  );
}
