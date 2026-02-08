'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity, Zap, Database, Mail, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error' | 'critical' | 'unknown';
  [key: string]: any;
}

export function SystemHealth() {
  const [health, setHealth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    performHealthCheck();
  }, []);

  async function performHealthCheck() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/health?check=all');
      const data = await response.json();
      setHealth(data);
      setLastChecked(new Date());
    } catch (error) {
      console.error('Health check error:', error);
    } finally {
      setLoading(false);
    }
  }

  function getStatusColor(status: string) {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'degraded':
        return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'unhealthy':
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  }

  function getStatusIcon(status: string) {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="w-6 h-6 text-green-600" />;
      case 'degraded':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'unhealthy':
      case 'critical':
      case 'error':
        return <XCircle className="w-6 h-6 text-red-600" />;
      default:
        return <Activity className="w-6 h-6 text-gray-600" />;
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!health) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600 mb-4">Kunne ikke hente systemhelse</p>
        <Button onClick={performHealthCheck}>Prøv igjen</Button>
      </Card>
    );
  }

  const checks = [
    {
      key: 'webhooks',
      name: 'Vipps Webhooks',
      icon: Zap,
      data: health.checks?.webhooks,
    },
    {
      key: 'payments',
      name: 'Betalingssystem',
      icon: ShoppingCart,
      data: health.checks?.payments,
    },
    {
      key: 'inventory',
      name: 'Lagerbeholdning',
      icon: Database,
      data: health.checks?.inventory,
    },
    {
      key: 'emails',
      name: 'E-postsystem',
      icon: Mail,
      data: health.checks?.emails,
    },
    {
      key: 'orders',
      name: 'Ordreintegritet',
      icon: ShoppingCart,
      data: health.checks?.orders,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Systemhelse</h2>
          {lastChecked && (
            <p className="text-gray-600 text-sm">
              Sist sjekket: {lastChecked.toLocaleTimeString('nb-NO')}
            </p>
          )}
        </div>
        <Button onClick={performHealthCheck} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          Oppdater
        </Button>
      </div>

      {/* Overall Status */}
      <Card className={cn('p-6 border-2', getStatusColor(health.status))}>
        <div className="flex items-center gap-4">
          {getStatusIcon(health.status)}
          <div>
            <h3 className="text-xl font-bold capitalize">{health.status}</h3>
            <p className="text-sm">
              {health.status === 'healthy'
                ? 'Alle systemer fungerer normalt'
                : health.status === 'degraded'
                ? 'Noen systemer har advarsler'
                : 'Kritiske problemer oppdaget'}
            </p>
          </div>
        </div>
      </Card>

      {/* Individual Checks */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {checks.map((check) => {
          const Icon = check.icon;
          const data = check.data;

          if (!data) return null;

          return (
            <Card key={check.key} className={cn('p-6 border-2', getStatusColor(data.status))}>
              <div className="flex items-start gap-4 mb-4">
                <Icon className="w-6 h-6 mt-1" />
                <div className="flex-1">
                  <h3 className="font-bold text-lg mb-1">{check.name}</h3>
                  <p className="text-sm capitalize">{data.status}</p>
                </div>
                {getStatusIcon(data.status)}
              </div>

              {/* Webhooks Details */}
              {check.key === 'webhooks' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Webhooks siste 24t:</span>
                    <span className="font-semibold">{data.total_webhooks_24h}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Feilet:</span>
                    <span className={cn('font-semibold', data.failed_webhooks_24h > 0 && 'text-red-600')}>
                      {data.failed_webhooks_24h}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Suksessrate:</span>
                    <span className="font-semibold">{data.success_rate}%</span>
                  </div>
                  {data.recent_failures && data.recent_failures.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="font-semibold text-red-900 mb-2 text-xs">Nylige feil:</p>
                      <div className="space-y-1">
                        {data.recent_failures.map((failure: any, i: number) => (
                          <p key={i} className="text-xs text-red-800">
                            Ordre: {failure.order_id} - {failure.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Payments Details */}
              {check.key === 'payments' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Manglende forskudd:</span>
                    <span className="font-semibold">{data.pending_deposits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Manglende restbeløp:</span>
                    <span className="font-semibold">{data.pending_remainders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Stuck betalinger (&gt;7 dager):</span>
                    <span className={cn('font-semibold', data.stuck_payments > 0 && 'text-amber-600')}>
                      {data.stuck_payments}
                    </span>
                  </div>
                  {data.at_risk_orders && data.at_risk_orders.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="font-semibold text-amber-900 mb-2 text-xs">Ordrer i risiko:</p>
                      <div className="space-y-1">
                        {data.at_risk_orders.slice(0, 3).map((order: any, i: number) => (
                          <p key={i} className="text-xs text-amber-800">
                            {order.order_number} - {order.days_pending} dager
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Inventory Details */}
              {check.key === 'inventory' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Maks kg:</span>
                    <span className="font-semibold">{data.max_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Allokert:</span>
                    <span className="font-semibold">{data.allocated_kg} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gjenværende:</span>
                    <span className={cn('font-semibold', data.remaining_kg < 100 && 'text-amber-600')}>
                      {data.remaining_kg} kg
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Utnyttelsesgrad:</span>
                    <span className="font-semibold">{data.utilization_rate}%</span>
                  </div>
                  {data.warning && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-800">{data.warning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Emails Details */}
              {check.key === 'emails' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>E-poster sendt siste 24t:</span>
                    <span className="font-semibold">{data.emails_sent_24h}</span>
                  </div>
                  {data.message && (
                    <p className="text-xs text-gray-600 mt-2">{data.message}</p>
                  )}
                </div>
              )}

              {/* Orders Details */}
              {check.key === 'orders' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Totalt ordrer:</span>
                    <span className="font-semibold">{data.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Integritetsproblemer:</span>
                    <span className={cn('font-semibold', data.integrity_issues > 0 && 'text-red-600')}>
                      {data.integrity_issues}
                    </span>
                  </div>
                  {data.issues && data.issues.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="font-semibold text-red-900 mb-2 text-xs">Problemer funnet:</p>
                      <div className="space-y-1">
                        {data.issues.map((issue: any, i: number) => (
                          <p key={i} className="text-xs text-red-800">
                            {issue.order_number}: {issue.issue}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
