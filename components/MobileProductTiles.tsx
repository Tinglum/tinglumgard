"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface MobileProductTilesProps {
  pricing: any;
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
      meals: '12–16 måltider',
      freezer: 'Lite fryserom',
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
      meals: '20–28 måltider',
      freezer: 'Mer fryserom',
      price: pricing ? pricing.box_12kg_price : null,
      deposit: pricing
        ? Math.floor(pricing.box_12kg_price * pricing.box_12kg_deposit_percentage / 100)
        : null,
    },
  ];

  return (
    <section className="px-5 py-12 text-[#1E1B16]">
      <div className="mx-auto max-w-md font-[family:var(--font-manrope)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">Kasser</p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
              {t.product.choosePackage}
            </h2>
            <p className="mt-2 text-sm text-[#5E5A50]">{t.product.sameQuality}</p>
          </div>
          <Link
            href="/produkt"
            className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F6C6F]"
          >
            {t.product.seeDetails}
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {packages.map((pkg) => (
            <div
              key={pkg.size}
              className={`relative overflow-hidden rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)] ${
                pkg.highlight ? 'ring-2 ring-[#0F6C6F]' : ''
              }`}
            >
              {pkg.highlight && (
                <div className="absolute right-6 top-6 rounded-full bg-[#0F6C6F] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                  {t.product.mostPopular}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{pkg.label}</p>
                  <p className="mt-2 text-4xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
                    {pkg.size}
                    <span className="ml-2 text-base font-semibold text-[#6A6258]">kg</span>
                  </p>
                  <p className="mt-2 text-sm text-[#5E5A50]">{pkg.people}</p>
                </div>
                <div className="text-right">
                  {pkg.price ? (
                    <>
                      <p className="text-xl font-semibold text-[#1E1B16]">
                        {pkg.price.toLocaleString('nb-NO')} {t.common.currency}
                      </p>
                      <p className="text-xs text-[#5E5A50]">
                        {t.product.deposit50}: {pkg.deposit?.toLocaleString('nb-NO')} {t.common.currency}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-[#5E5A50]">{t.common.loading}</p>
                  )}
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">I kassen</p>
                <ul className="mt-3 grid grid-cols-2 gap-2 text-sm text-[#4F4A42]">
                  {pkg.items.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B35A2A]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5 flex flex-wrap gap-2 text-xs font-semibold text-[#5E5A50]">
                <span className="rounded-full border border-[#E4DED5] bg-white px-3 py-1">
                  {pkg.meals}
                </span>
                <span className="rounded-full border border-[#E4DED5] bg-white px-3 py-1">
                  {pkg.freezer}
                </span>
              </div>

              <Link
                href={`/bestill?size=${pkg.size}`}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#1E1B16] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
              >
                {t.product.orderNow}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
