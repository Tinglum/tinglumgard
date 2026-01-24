"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import Link from 'next/link';
import { Package } from 'lucide-react';

export default function ProductPage() {
  const { t } = useLanguage();

  const contents = [
    { category: t.productDetail.categories.ribbe, items: ['2-3 kg ribbe, vakuumpakket'] },
    { category: t.productDetail.categories.sausages, items: ['1 kg pølser, frosset'] },
    { category: t.productDetail.categories.bacon, items: ['500g bacon, skiver'] },
    { category: t.productDetail.categories.chops, items: ['1.5 kg nakkekoteletter'] },
    { category: t.productDetail.categories.stew, items: ['1-2 kg kokkekutt'] },
  ];

  const addons = [
    { id: 'trondheim', label: t.productDetail.addons.delivery, price: 150 },
    { id: 'e6', label: t.productDetail.addons.highway, price: 0 },
    { id: 'fresh', label: t.productDetail.addons.fresh, price: 200 },
  ];

  return (
    <div className="min-h-screen py-16 sm:py-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <Link
            href="/"
            className="text-sm text-neutral-600 hover:text-neutral-900 transition-colors"
          >
            ← {t.nav.products}
          </Link>
        </div>

        <div className="space-y-16">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8" strokeWidth={1.5} />
              <h1 className="text-4xl sm:text-5xl font-semibold">{t.productDetail.title}</h1>
            </div>
            <p className="text-lg text-neutral-600 max-w-2xl">{t.productDetail.variation}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {contents.map((item, index) => (
              <Card key={index} className="p-6 border-neutral-200">
                <h3 className="font-semibold text-lg mb-3">{item.category}</h3>
                <ul className="space-y-2">
                  {item.items.map((detail, i) => (
                    <li key={i} className="text-sm text-neutral-600 flex items-start gap-2">
                      <span className="text-neutral-400 mt-1">•</span>
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="border-t border-neutral-200 pt-16">
            <h2 className="text-3xl font-semibold mb-8">{t.productDetail.addons.title}</h2>
            <p className="text-sm text-neutral-500 mb-6">{t.productDetail.addons.disabled}</p>

            <div className="space-y-4">
              {addons.map((addon) => (
                <div
                  key={addon.id}
                  className="flex items-center justify-between p-4 border border-neutral-200 bg-neutral-50"
                >
                  <div className="flex items-center gap-3">
                    <Checkbox disabled />
                    <label className="text-sm text-neutral-400">{addon.label}</label>
                  </div>
                  <span className="text-sm text-neutral-400">
                    {addon.price > 0 ? `kr ${addon.price}` : 'Gratis'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <Button asChild size="lg" className="min-w-[200px]">
              <Link href="/bestill">{t.product.orderNow}</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
