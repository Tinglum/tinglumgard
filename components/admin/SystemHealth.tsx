'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle, Activity, Zap, Database, Mail, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface HealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'error' | 'critical' | 'unknown';
  [key: string]: any;
}

export function SystemHealth() {
  const { t, lang } = useLanguage();
  const copy = t.systemHealth;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

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
        <p className="text-gray-600 mb-4">{copy.loadError}</p>
        <Button onClick={performHealthCheck}>{copy.retryButton}</Button>
      </Card>
    );
  }

  const checks: Array<{ key: string; name: string; icon: any; data: HealthCheck | undefined }> = [
    {
      key: 'webhooks',
      name: copy.checkNames.webhooks,
      icon: Zap,
      data: health.checks?.webhooks,
    },
    {
      key: 'payments',
      name: copy.checkNames.payments,
      icon: ShoppingCart,
      data: health.checks?.payments,
    },
    {
      key: 'inventory',
      name: copy.checkNames.inventory,
      icon: Database,
      data: health.checks?.inventory,
    },
    {
      key: 'emails',
      name: copy.checkNames.emails,
      icon: Mail,
      data: health.checks?.emails,
    },
    {
      key: 'orders',
      name: copy.checkNames.orders,
      icon: ShoppingCart,
      data: health.checks?.orders,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          {lastChecked && (
            <p className="text-gray-600 text-sm">
              {copy.lastCheckedLabel} {lastChecked.toLocaleTimeString(locale)}
            </p>
          )}
        </div>
        <Button onClick={performHealthCheck} disabled={loading}>
          <RefreshCw className={cn('w-4 h-4 mr-2', loading && 'animate-spin')} />
          {copy.refreshButton}
        </Button>
      </div>

      <Card className={cn('p-6 border-2', getStatusColor(health.status))}>
        <div className="flex items-center gap-4">
          {getStatusIcon(health.status)}
          <div>
            <h3 className="text-xl font-bold">{copy.statusValues[health.status as keyof typeof copy.statusValues] || health.status}</h3>
            <p className="text-sm">
              {health.status === 'healthy'
                ? copy.overallHealthy
                : health.status === 'degraded'
                  ? copy.overallDegraded
                  : copy.overallCritical}
            </p>
          </div>
        </div>
      </Card>

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
                  <p className="text-sm">
                    {copy.statusValues[data.status as keyof typeof copy.statusValues] || data.status}
                  </p>
                </div>
                {getStatusIcon(data.status)}
              </div>

              {check.key === 'webhooks' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{copy.webhooks.last24hLabel}</span>
                    <span className="font-semibold">{data.total_webhooks_24h}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.webhooks.failedLabel}</span>
                    <span className={cn('font-semibold', data.failed_webhooks_24h > 0 && 'text-red-600')}>
                      {data.failed_webhooks_24h}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.webhooks.successRateLabel}</span>
                    <span className="font-semibold">{data.success_rate}%</span>
                  </div>
                  {data.recent_failures && data.recent_failures.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="font-semibold text-red-900 mb-2 text-xs">{copy.webhooks.recentFailuresTitle}</p>
                      <div className="space-y-1">
                        {data.recent_failures.map((failure: any, i: number) => (
                          <p key={i} className="text-xs text-red-800">
                            {copy.webhooks.orderLabel}: {failure.order_id} - {failure.error}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {check.key === 'payments' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{copy.payments.pendingDepositsLabel}</span>
                    <span className="font-semibold">{data.pending_deposits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.payments.pendingRemaindersLabel}</span>
                    <span className="font-semibold">{data.pending_remainders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.payments.stuckPaymentsLabel}</span>
                    <span className={cn('font-semibold', data.stuck_payments > 0 && 'text-amber-600')}>
                      {data.stuck_payments}
                    </span>
                  </div>
                  {data.at_risk_orders && data.at_risk_orders.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="font-semibold text-amber-900 mb-2 text-xs">{copy.payments.atRiskTitle}</p>
                      <div className="space-y-1">
                        {data.at_risk_orders.slice(0, 3).map((order: any, i: number) => (
                          <p key={i} className="text-xs text-amber-800">
                            {order.order_number} - {copy.payments.daysPending.replace('{count}', String(order.days_pending))}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {check.key === 'inventory' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{copy.inventory.maxKgLabel}</span>
                    <span className="font-semibold">{data.max_kg} {t.common.kg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.inventory.allocatedLabel}</span>
                    <span className="font-semibold">{data.allocated_kg} {t.common.kg}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.inventory.remainingLabel}</span>
                    <span className={cn('font-semibold', data.remaining_kg < 100 && 'text-amber-600')}>
                      {data.remaining_kg} {t.common.kg}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.inventory.utilizationLabel}</span>
                    <span className="font-semibold">{data.utilization_rate}%</span>
                  </div>
                  {data.warning && (
                    <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <p className="text-xs text-amber-800">{data.warning}</p>
                    </div>
                  )}
                </div>
              )}

              {check.key === 'emails' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{copy.emails.sentLast24hLabel}</span>
                    <span className="font-semibold">{data.emails_sent_24h}</span>
                  </div>
                  {data.message && (
                    <p className="text-xs text-gray-600 mt-2">{data.message}</p>
                  )}
                </div>
              )}

              {check.key === 'orders' && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>{copy.orders.totalOrdersLabel}</span>
                    <span className="font-semibold">{data.total_orders}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{copy.orders.integrityIssuesLabel}</span>
                    <span className={cn('font-semibold', data.integrity_issues > 0 && 'text-red-600')}>
                      {data.integrity_issues}
                    </span>
                  </div>
                  {data.issues && data.issues.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-100">
                      <p className="font-semibold text-red-900 mb-2 text-xs">{copy.orders.issuesFoundTitle}</p>
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
