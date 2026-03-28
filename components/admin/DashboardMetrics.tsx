'use client';

import { Card } from '@/components/ui/card';

interface PigMetricsSummary {
  total_orders?: number;
  total_revenue?: number;
  avg_order_value?: number;
  outstanding_deposits_value?: number;
  outstanding_remainders_value?: number;
}

interface DashboardMetricsProps {
  metrics: {
    pig?: { summary?: PigMetricsSummary };
    egg?: {
      total_orders?: number;
      revenue?: number;
      unpaid_deposits?: number;
      unpaid_remainders?: number;
    };
    keyMetrics?: {
      totalOrders?: number;
      totalRevenue?: number;
      avgOrderValue?: number;
    };
    actionItems?: Array<{ type: string; label: string; count?: number }>;
    newOrders?: Array<{ order_number: string; customer_name: string; product_type: string; amount: number }>;
  } | null;
}

function StatCard({ label, value, sub }: { label: string; value: React.ReactNode; sub?: string }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
      <p className="text-sm font-light text-neutral-500 mb-1">{label}</p>
      <p className="text-3xl font-light text-neutral-900 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-neutral-400 mt-1">{sub}</p>}
    </div>
  );
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
  if (!metrics) return null;

  const km = metrics.keyMetrics;
  const pig = metrics.pig?.summary;
  const egg = metrics.egg;

  const totalOrders = km?.totalOrders ?? (pig?.total_orders ?? 0) + (egg?.total_orders ?? 0);
  const totalRevenue = km?.totalRevenue ?? (pig?.total_revenue ?? 0);
  const avgValue = km?.avgOrderValue ?? pig?.avg_order_value ?? 0;
  const outstandingDeposits = pig?.outstanding_deposits_value ?? 0;
  const outstandingRemainders = pig?.outstanding_remainders_value ?? 0;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-light text-neutral-700">Oversikt</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Totale bestillinger" value={totalOrders} />
        <StatCard
          label="Total omsetning"
          value={`kr ${Number(totalRevenue).toLocaleString('nb-NO')}`}
        />
        <StatCard
          label="Snitt per ordre"
          value={`kr ${Number(avgValue).toLocaleString('nb-NO')}`}
        />
        <StatCard
          label="Utestående krav"
          value={`kr ${(outstandingDeposits + outstandingRemainders).toLocaleString('nb-NO')}`}
          sub="forskudd + rest"
        />
      </div>

      {metrics.actionItems && metrics.actionItems.length > 0 && (
        <div>
          <h4 className="text-sm font-light text-neutral-500 mb-3">Handlingspunkter</h4>
          <div className="space-y-2">
            {metrics.actionItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl"
              >
                <span className="text-sm text-amber-900">{item.label}</span>
                {item.count != null && (
                  <span className="text-sm font-medium text-amber-900">{item.count}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {metrics.newOrders && metrics.newOrders.length > 0 && (
        <Card className="overflow-hidden">
          <div className="px-6 py-4 border-b border-neutral-100">
            <h4 className="text-sm font-light text-neutral-600">Nye bestillinger</h4>
          </div>
          <div className="divide-y divide-neutral-100">
            {metrics.newOrders.slice(0, 8).map((o, i) => (
              <div key={i} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium text-neutral-900">{o.order_number}</p>
                  <p className="text-xs text-neutral-500">{o.customer_name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-neutral-900">kr {Number(o.amount).toLocaleString('nb-NO')}</p>
                  <p className="text-xs text-neutral-400">{o.product_type}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
