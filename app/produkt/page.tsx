"use client";

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
      {children}
    </div>
  );
}

function ContentCard({
  category,
  items,
}: {
  category: string;
  items: string[];
}) {
  return (
    <div className="group bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1">
      <MetaLabel>{category}</MetaLabel>
      <ul className="mt-6 space-y-4">
        {items.map((detail, index) => (
          <li key={index} className="text-base font-light leading-relaxed text-neutral-700 flex items-start gap-3">
            <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2.5 flex-shrink-0" />
            <span>{detail}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DisabledAddonRow({
  label,
  price,
}: {
  label: string;
  price: number;
}) {
  const { t, lang } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';

  return (
    <div className="flex items-center justify-between py-5 border-b border-neutral-100 last:border-b-0">
      <span className="text-sm font-light text-neutral-400 leading-relaxed">{label}</span>
      <span className="text-sm font-light text-neutral-400 tabular-nums">
        {price > 0 ? `${price.toLocaleString(locale)} ${t.common.currency}` : t.common.free}
      </span>
    </div>
  );
}

export default function ProductPage() {
  const { t } = useLanguage();
  const copy = t.productPage;

  const contents = [
    { category: t.productDetail.categories.ribbe, items: [copy.ribbeItem] },
    { category: t.productDetail.categories.sausages, items: [copy.sausageItem] },
    { category: t.productDetail.categories.bacon, items: [copy.baconItem] },
    { category: t.productDetail.categories.chops, items: [copy.chopsItem] },
    { category: t.productDetail.categories.stew, items: [copy.stewItem] },
  ];

  const addons = [
    { id: 'trondheim', label: t.productDetail.addons.delivery, price: 150 },
    { id: 'e6', label: t.productDetail.addons.highway, price: 0 },
    { id: 'fresh', label: t.productDetail.addons.fresh, price: 200 },
  ];

  return (
    <div className="min-h-screen bg-white py-20">
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/3 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear',
          }}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 lg:px-8">
        <div className="mb-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.products}
          </Link>
        </div>

        <div className="space-y-16">
          <header className="space-y-4 border-b border-neutral-200 pb-12">
            <MetaLabel>{copy.productLabel}</MetaLabel>
            <h1 className="text-5xl font-light tracking-tight text-neutral-900">
              {t.productDetail.title}
            </h1>
            <p className="text-base font-light leading-relaxed text-neutral-600 max-w-2xl">
              {t.productDetail.variation}
            </p>
          </header>

          <section className="space-y-8">
            <h2 className="text-3xl font-light text-neutral-900">
              {copy.packageContents}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contents.map((item, index) => (
                <ContentCard
                  key={index}
                  category={item.category}
                  items={item.items}
                />
              ))}
            </div>
          </section>

          <section className="space-y-8 border-t border-neutral-200 pt-16">
            <div className="space-y-3">
              <h2 className="text-3xl font-light text-neutral-900">
                {t.productDetail.addons.title}
              </h2>
              <p className="text-sm font-light text-neutral-500 leading-relaxed">
                {t.productDetail.addons.disabled}
              </p>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-8 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
              <div className="divide-y divide-neutral-100">
                {addons.map((addon) => (
                  <DisabledAddonRow
                    key={addon.id}
                    label={addon.label}
                    price={addon.price}
                  />
                ))}
              </div>
            </div>
          </section>

          <div className="flex justify-center pt-16 border-t border-neutral-200">
            <Link
              href="/bestill"
              className="px-12 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
            >
              {t.product.orderNow}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
