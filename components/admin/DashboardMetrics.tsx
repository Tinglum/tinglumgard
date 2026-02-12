'use client';

import { cn } from '@/lib/utils';
import { TrendingUp, DollarSign, ShoppingCart, Package, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DashboardMetricsProps {
  metrics: {
    summary: {
      total_orders: number;
      total_revenue: number;
      avg_order_value: number;
      outstanding_deposits_count: number;
      outstanding_remainders_count: number;
      outstanding_deposits_value: number;
      outstanding_remainders_value: number;
    };
    status_breakdown: Record<string, number>;
    product_breakdown: {
      box_8kg: number;
      box_12kg: number;
      total_kg: number;
    };
    completion_rates: {
      deposit: number;
      remainder: number;
    };
  };
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  const { t, lang } = useLanguage();
  const copy = t.dashboardMetrics;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const { summary, status_breakdown, product_breakdown, completion_rates } = metrics;

  const metricCards = [
    {
      title: copy.cards.totalOrders,
      value: summary.total_orders,
      icon: ShoppingCart,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      textColor: 'text-blue-900',
    },
    {
      title: copy.cards.totalRevenue,
      value: `${currency} ${summary.total_revenue.toLocaleString(locale)}`,
      icon: DollarSign,
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
      textColor: 'text-green-900',
    },
    {
      title: copy.cards.avgPerOrder,
      value: `${currency} ${summary.avg_order_value.toLocaleString(locale)}`,
      icon: TrendingUp,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      textColor: 'text-purple-900',
    },
    {
      title: copy.cards.totalKg,
      value: `${product_breakdown.total_kg} ${t.common.kg}`,
      icon: Package,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      textColor: 'text-amber-900',
    },
  ];

  const outstandingCards = [
    {
      title: copy.outstanding.pendingDeposits,
      count: summary.outstanding_deposits_count,
      value: summary.outstanding_deposits_value,
      icon: AlertCircle,
      color: 'red',
    },
    {
      title: copy.outstanding.pendingRemainders,
      count: summary.outstanding_remainders_count,
      value: summary.outstanding_remainders_value,
      icon: AlertCircle,
      color: 'amber',
    },
  ];

  const statusLabels: Record<string, string> = copy.statusLabels as Record<string, string>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => {
          const Icon = metric.icon;
          return (
            <div key={metric.title} className={cn('rounded-2xl p-6 border', metric.bgColor)}>
              <div className="flex items-center justify-between mb-4">
                <Icon className={cn('w-8 h-8', metric.iconColor)} />
              </div>
              <p className="text-sm text-gray-600 mb-1">{metric.title}</p>
              <p className={cn('text-3xl font-bold', metric.textColor)}>{metric.value}</p>
            </div>
          );
        })}
      </div>

      {(summary.outstanding_deposits_count > 0 || summary.outstanding_remainders_count > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {outstandingCards.map((card) => {
            const Icon = card.icon;
            if (card.count === 0) return null;

            return (
              <div
                key={card.title}
                className={cn(
                  'rounded-2xl p-6 border-2',
                  card.color === 'red' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <Icon className={cn('w-6 h-6', card.color === 'red' ? 'text-red-600' : 'text-amber-600')} />
                  <h3 className={cn('font-semibold text-lg', card.color === 'red' ? 'text-red-900' : 'text-amber-900')}>
                    {card.title}
                  </h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">{copy.outstanding.orderCountLabel}</span>
                    <span className="font-bold text-xl">{card.count}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-700">{copy.outstanding.totalAmountLabel}</span>
                    <span className="font-bold text-xl">
                      {currency} {card.value.toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl p-6 border bg-white">
          <h3 className="font-semibold text-lg mb-4">{copy.statusOverviewTitle}</h3>
          <div className="space-y-3">
            {Object.entries(status_breakdown).map(([status, count]) => {
              const percentage = (count / summary.total_orders) * 100;

              return (
                <div key={status}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{statusLabels[status] || status}</span>
                    <span className="font-semibold">
                      {count} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        status === 'completed'
                          ? 'bg-green-500'
                          : status === 'ready_for_pickup'
                            ? 'bg-blue-500'
                            : status === 'paid' || status === 'fully_paid'
                              ? 'bg-green-400'
                              : status === 'deposit_paid'
                                ? 'bg-amber-400'
                                : status === 'cancelled' || status === 'forfeited'
                                  ? 'bg-red-400'
                                  : 'bg-gray-400'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl p-6 border bg-white">
          <h3 className="font-semibold text-lg mb-4">{copy.productMixTitle}</h3>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-gray-600 mb-2">{copy.boxSizesTitle}</p>
              <div className="flex gap-4">
                <div className="flex-1 p-4 rounded-xl bg-blue-50">
                  <p className="text-sm text-blue-700">{copy.box8Label}</p>
                  <p className="text-2xl font-bold text-blue-900">{product_breakdown.box_8kg}</p>
                </div>
                <div className="flex-1 p-4 rounded-xl bg-purple-50">
                  <p className="text-sm text-purple-700">{copy.box12Label}</p>
                  <p className="text-2xl font-bold text-purple-900">{product_breakdown.box_12kg}</p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">{copy.completionTitle}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-3 rounded-xl bg-green-50">
                  <span className="text-sm text-gray-700">{copy.depositCompleteLabel}</span>
                  <span className="font-bold text-green-900">{completion_rates.deposit}%</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-blue-50">
                  <span className="text-sm text-gray-700">{copy.remainderCompleteLabel}</span>
                  <span className="font-bold text-blue-900">{completion_rates.remainder}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
