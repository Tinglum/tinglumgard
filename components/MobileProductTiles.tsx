'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileProductTilesProps {
  pricing?: any | null;
}

export function MobileProductTiles({ pricing }: MobileProductTilesProps) {
  const { t } = useLanguage();

  const packages = [
    {
      size: '8',
      label: t.product.box8,
      people: t.product.perfectFor2to3,
      highlight: false,
      items: [
        t.boxContents.ribbe8kg,
        t.boxContents.nakkekoteletter8kg,
        t.boxContents.julepølse8kg,
        t.boxContents.svinesteik8kg,
      ],
      price: pricing ? pricing.box_8kg_price : null,
      deposit: pricing
        ? Math.floor(pricing.box_8kg_price * pricing.box_8kg_deposit_percentage / 100)
        : null,
    },
    {
      size: '12',
      label: t.product.box12,
      people: t.product.idealFor4to6,
      highlight: true,
      items: [
        t.boxContents.ribbe12kg,
        t.boxContents.nakkekoteletter12kg,
        t.boxContents.julepølse12kg,
        t.boxContents.svinesteik12kg,
      ],
      price: pricing ? pricing.box_12kg_price : null,
      deposit: pricing
        ? Math.floor(pricing.box_12kg_price * pricing.box_12kg_deposit_percentage / 100)
        : null,
    },
  ];

  return (
    <section className="bg-[#F7F1EA] px-5 py-10">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-[#1F1A14]">{t.product.choosePackage}</h2>
          <p className="text-sm font-medium text-[#6C5A4A]">{t.product.sameQuality}</p>
        </div>
        <Link
          href="/produkt"
          className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C5A4A]"
        >
          {t.product.seeDetails}
        </Link>
      </div>

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2 snap-x snap-mandatory">
        {packages.map((pkg) => (
          <div
            key={pkg.size}
            className="snap-start min-w-[85%] rounded-2xl border border-[#E6D8C8] bg-[#FFF9F2] p-5 shadow-[0_10px_30px_rgba(50,36,24,0.08)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#6C5A4A]">{pkg.label}</p>
                <p className="mt-2 text-4xl font-bold text-[#1F1A14]">
                  {pkg.size}
                  <span className="ml-1 text-lg font-semibold text-[#6C5A4A]">kg</span>
                </p>
                <p className="mt-2 text-sm text-[#6C5A4A]">{pkg.people}</p>
              </div>
              {pkg.highlight && (
                <span className="rounded-full bg-[#C05621] px-3 py-1 text-xs font-bold uppercase tracking-[0.2em] text-white">
                  {t.product.mostPopular}
                </span>
              )}
            </div>

            <div className="mt-4 flex items-center justify-between">
              {pkg.price ? (
                <div>
                  <p className="text-xl font-bold text-[#1F1A14]">
                    {pkg.price.toLocaleString('nb-NO')} {t.common.currency}
                  </p>
                  <p className="text-xs text-[#6C5A4A]">
                    {t.product.deposit50}: {pkg.deposit?.toLocaleString('nb-NO')} {t.common.currency}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-[#6C5A4A]">{t.common.loading}</p>
              )}
            </div>

            <div className="mt-5 rounded-xl border border-[#E9DDCE] bg-white/70 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#6C5A4A]">I kassen</p>
              <ul className="mt-3 space-y-2 text-sm text-[#4A3B2E]">
                {pkg.items.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#C05621]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex items-center gap-2 text-xs font-semibold text-[#6C5A4A]">
              <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1">
                {pkg.size === '8' ? '12–16 måltider' : '20–28 måltider'}
              </span>
              <span className="rounded-full border border-[#E6D8C8] bg-white px-3 py-1">
                {pkg.size === '8' ? 'Lite fryserom' : 'Mer fryserom'}
              </span>
            </div>

            <Link
              href={`/bestill?size=${pkg.size}`}
              className="mt-6 block w-full rounded-xl bg-[#1F1A14] px-4 py-3 text-center text-sm font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
            >
              {t.product.orderNow}
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
