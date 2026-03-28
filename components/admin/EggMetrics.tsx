'use client';

interface EggMetricsData {
  total_orders?: number;
  revenue?: number;
  fully_paid?: number;
  unpaid_deposits?: number;
  unpaid_remainders?: number;
  shipping_missing?: number;
  ready_to_ship?: number;
}

interface EggMetricsProps {
  metrics: EggMetricsData | null | undefined;
}

function Stat({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`bg-white border rounded-xl p-6 shadow-sm ${highlight ? 'border-amber-300 bg-amber-50' : 'border-neutral-200'}`}>
      <p className="text-sm font-light text-neutral-500 mb-1">{label}</p>
      <p className={`text-3xl font-light tabular-nums ${highlight ? 'text-amber-900' : 'text-neutral-900'}`}>{value}</p>
    </div>
  );
}

export function EggMetrics({ metrics }: EggMetricsProps) {
  if (!metrics) {
    return (
      <div className="py-6 text-sm text-neutral-400">Ingen egg-data tilgjengelig ennå.</div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-light text-neutral-700">Rugeegg – oversikt</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Aktive bestillinger" value={metrics.total_orders ?? 0} />
        <Stat
          label="Omsetning"
          value={`kr ${Number(metrics.revenue ?? 0).toLocaleString('nb-NO')}`}
        />
        <Stat label="Fullt betalt" value={metrics.fully_paid ?? 0} />
        <Stat label="Mangler forskudd" value={metrics.unpaid_deposits ?? 0} highlight={(metrics.unpaid_deposits ?? 0) > 0} />
      </div>
      {((metrics.unpaid_remainders ?? 0) > 0 || (metrics.ready_to_ship ?? 0) > 0) && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Mangler rest" value={metrics.unpaid_remainders ?? 0} highlight={(metrics.unpaid_remainders ?? 0) > 0} />
          <Stat label="Klar til sending" value={metrics.ready_to_ship ?? 0} />
          <Stat label="Mangler frakt" value={metrics.shipping_missing ?? 0} highlight={(metrics.shipping_missing ?? 0) > 0} />
        </div>
      )}
    </div>
  );
}
