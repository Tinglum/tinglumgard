'use client';

import { Card } from '@/components/ui/card';
import { ShoppingCart, TrendingUp, Package, AlertCircle, Star } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface EggMetricsProps {
  metrics: {
    totalOrders: number;
    totalRevenue: number;
    eggsSold: number;
    pendingDeposits: number;
    topBreed: string;
  } | null;
}

export function EggMetrics({ metrics }: EggMetricsProps) {
  const { t, lang } = useLanguage();
  const copy = t.eggMetrics;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  if (!metrics) {
    return (
      <Card className="p-6 border border-gray-200">
        <p className="text-center text-gray-600">{copy.noData}</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">{copy.badge}</span>
        <h3 className="text-xl font-semibold text-gray-900">{copy.title}</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{copy.totalOrdersLabel}</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalOrders}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{copy.revenueLabel}</p>
              <p className="text-3xl font-bold text-gray-900">
                {metrics.totalRevenue.toLocaleString(locale)}
                <span className="text-lg text-gray-600 ml-1">{currency}</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{copy.eggsSoldLabel}</p>
              <p className="text-3xl font-bold text-gray-900">{metrics.eggsSold}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-yellow-50 flex items-center justify-center">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </Card>

        <Card className="p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">{copy.topBreedLabel}</p>
              <p className="text-lg font-bold text-gray-900">{metrics.topBreed}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
              <Star className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {metrics.pendingDeposits > 0 && (
        <Card className="p-4 bg-yellow-50 border border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-yellow-900">
                {copy.pendingDepositsTitle
                  .replace('{count}', String(metrics.pendingDeposits))
                  .replace('{suffix}', metrics.pendingDeposits > 1 ? copy.pluralSuffix : copy.singularSuffix)}
              </p>
              <p className="text-sm text-yellow-700 mt-1">{copy.pendingDepositsSubtitle}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
