"use client";

import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

interface PricingData {
  box_8kg_price: number;
  box_12kg_price: number;
  box_8kg_deposit_percentage: number;
  box_12kg_deposit_percentage: number;
}

interface MobileProductTilesProps {
  pricing: PricingData | null;
}

interface TileConfig {
  size: "8" | "12";
  label: string;
  description: string;
  contents: string[];
  personCount: string;
  mealsCount: string;
  freezerNote: string;
  price: number | null;
  deposit: number | null;
  href: string;
  cta: string;
  featured?: boolean;
}

export function MobileProductTiles({ pricing }: MobileProductTilesProps) {
  const { t, lang } = useLanguage();
  const locale = lang === "no" ? "nb-NO" : "en-US";

  const tiles: TileConfig[] = [
    {
      size: "8",
      label: t.product.smallerPackage,
      description: t.product.perfectFor2to3,
      contents: [
        t.boxContents.ribbe8kg,
        t.boxContents.nakkekoteletter8kg,
        t.boxContents.julepolse8kg,
        t.boxContents.svinesteik8kg,
      ],
      personCount: lang === "no" ? "2-3 pers" : "2-3 people",
      mealsCount: lang === "no" ? "12-16 maltider" : "12-16 meals",
      freezerNote: lang === "no" ? "Lite fryserom" : "Less freezer space",
      price: pricing?.box_8kg_price ?? null,
      deposit: pricing
        ? Math.floor((pricing.box_8kg_price * pricing.box_8kg_deposit_percentage) / 100)
        : null,
      href: "/bestill?size=8",
      cta: t.product.reserve8kg,
    },
    {
      size: "12",
      label: t.product.largerPackage,
      description: t.product.idealFor4to6,
      contents: [
        t.boxContents.ribbe12kg,
        t.boxContents.nakkekoteletter12kg,
        t.boxContents.julepolse12kg,
        t.boxContents.svinesteik12kg,
      ],
      personCount: lang === "no" ? "4-6 pers" : "4-6 people",
      mealsCount: lang === "no" ? "20-28 maltider" : "20-28 meals",
      freezerNote: lang === "no" ? "Mer fryserom" : "More freezer space",
      price: pricing?.box_12kg_price ?? null,
      deposit: pricing
        ? Math.floor((pricing.box_12kg_price * pricing.box_12kg_deposit_percentage) / 100)
        : null,
      href: "/bestill?size=12",
      cta: t.product.reserve12kg,
      featured: true,
    },
  ];

  return (
    <section className="px-5 py-12 text-[#1E1B16]">
      <div className="mx-auto max-w-md font-[family:var(--font-manrope)]">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
              {t.product.choosePackage}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
              {t.product.twoSizes}
            </h2>
            <p className="mt-2 text-sm text-[#5E5A50]">{t.product.sameQuality}</p>
          </div>
          <Link href="/produkt" className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0F6C6F]">
            {t.product.seeDetails}
          </Link>
        </div>

        <div className="mt-8 space-y-6">
          {tiles.map((tile) => (
            <div
              key={tile.size}
              className={`relative overflow-hidden rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_20px_45px_rgba(30,27,22,0.12)] ${
                tile.featured ? "ring-2 ring-[#0F6C6F]" : ""
              }`}
            >
              {tile.featured && (
                <div className="absolute right-6 top-6 rounded-full bg-[#0F6C6F] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.25em] text-white">
                  {t.product.mostPopular}
                </div>
              )}

              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">
                    {tile.label}
                  </p>
                  <p className="mt-2 text-4xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
                    {tile.size} <span className="text-lg text-[#5E5A50]">{t.common.kg}</span>
                  </p>
                  <p className="mt-2 text-sm text-[#5E5A50]">{tile.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-[#1E1B16]">
                    {tile.price !== null ? `${tile.price.toLocaleString(locale)} ${t.common.currency}` : "-"}
                  </p>
                  <p className="text-[11px] text-[#5E5A50]">
                    {t.product.deposit50}:{" "}
                    {tile.deposit !== null ? `${tile.deposit.toLocaleString(locale)} ${t.common.currency}` : "-"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-medium text-[#6A6258]">
                <span>{tile.personCount}</span>
                <span className="h-1 w-1 rounded-full bg-[#B7AFA2]" />
                <span>{tile.mealsCount}</span>
                <span className="h-1 w-1 rounded-full bg-[#B7AFA2]" />
                <span>{tile.freezerNote}</span>
              </div>

              <div className="mt-5 rounded-2xl border border-[#E9E1D6] bg-[#FBFAF7] p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#6A6258]">
                  {t.checkout.inBox}
                </p>
                <ul className="mt-3 grid grid-cols-1 gap-2 text-sm text-[#4F4A42]">
                  {tile.contents.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#B35A2A]" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <Link
                href={tile.href}
                className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[#1E1B16] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
              >
                {tile.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
