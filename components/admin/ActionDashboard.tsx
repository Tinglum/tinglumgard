'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { EmailSubTab } from './EmailControlCenter';
import {
  AlertTriangle,
  Beef,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Egg,
  Mail,
  MessageSquare,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Truck,
} from 'lucide-react';
import { DeferredPaymentsCard } from './DeferredPaymentsCard';
import { EggShippingModal } from './EggShippingModal';
import { PickupFulfillmentModal } from './PickupFulfillmentModal';

interface ActionDashboardProps {
  onNavigate: (tab: string, subTab?: string) => void;
  onNavigateToOrder?: (orderId: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
  onNavigateToEmailTab?: (tab: EmailSubTab) => void;
}

export function ActionDashboard({
  onNavigate,
  onNavigateToOrder,
  onNavigateToCustomer,
  onNavigateToMessage,
  onNavigateToEmailTab,
}: ActionDashboardProps) {
  const { t, lang } = useLanguage();
  const copy = t.adminPage;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [data, setData] = useState<any>(null);
  const [eggWeekTracker, setEggWeekTracker] = useState<any>(null);
  const [eggWeekOffset, setEggWeekOffset] = useState(0);
  const [eggWeekLoading, setEggWeekLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [shippingModalOrderId, setShippingModalOrderId] = useState<string | null>(null);
  const [pickupModalOrder, setPickupModalOrder] = useState<any>(null);

  const loadDashboard = useCallback(async (weekOffset = 0) => {
    setLoading(true);
    try {
      const lastLogin = localStorage.getItem('tinglum_last_login') || '';
      const params = new URLSearchParams();
      if (lastLogin) {
        params.set('lastLogin', lastLogin);
      }
      if (weekOffset !== 0) {
        params.set('eggWeekOffset', String(weekOffset));
      }
      const query = params.toString();
      const url = query ? `/api/admin/dashboard?${query}` : '/api/admin/dashboard';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to load dashboard');
      const result = await response.json();
      setData(result);
      setEggWeekTracker(result.eggWeekTracker);
      setEggWeekOffset(weekOffset);
      // Update last login timestamp
      localStorage.setItem('tinglum_last_login', new Date().toISOString());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEggWeekTracker = useCallback(async (weekOffset: number) => {
    setEggWeekLoading(true);
    try {
      const params = new URLSearchParams({
        section: 'eggWeekTracker',
        eggWeekOffset: String(weekOffset),
      });
      const response = await fetch(`/api/admin/dashboard?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to load egg week tracker');
      const result = await response.json();
      setEggWeekTracker(result.eggWeekTracker);
      setEggWeekOffset(weekOffset);
    } catch (error) {
      console.error('Failed to load egg week tracker:', error);
    } finally {
      setEggWeekLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard(0);
  }, [loadDashboard]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600">{copy.noData}</p>
      </Card>
    );
  }

  const { actionItems, keyMetrics, upcomingDates, newOrders, pig, healthAlerts, emailActivity } = data;
  const currentEggWeekTracker = eggWeekTracker || data.eggWeekTracker;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight text-neutral-900">{copy.dashboardTitle}</h2>
        <button
          onClick={() => loadDashboard(eggWeekOffset)}
          className="px-6 py-3 border-2 border-neutral-200 text-neutral-900 rounded-xl text-sm font-light flex items-center gap-2 hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300"
        >
          <RefreshCw className="w-4 h-4" />
          {copy.refreshButton}
        </button>
      </div>

      {/* Row 1: Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Unpaid Orders */}
        <button
          onClick={() => onNavigate('orders', 'pig')}
          className="text-left bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${actionItems.unpaid.count > 0 ? 'bg-red-100' : 'bg-green-100'}`}>
              <CreditCard className={`w-5 h-5 ${actionItems.unpaid.count > 0 ? 'text-red-600' : 'text-green-600'}`} />
            </div>
            <span className="text-sm font-light text-neutral-600">
              {lang === 'no' ? 'Ubetalte bestillinger' : 'Unpaid orders'}
            </span>
          </div>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{actionItems.unpaid.count}</p>
          {actionItems.unpaid.count > 0 && (
            <p className="text-sm font-light text-neutral-500 mt-1">
              {currency} {Math.round(actionItems.unpaid.value).toLocaleString(locale)}
            </p>
          )}
        </button>

        {/* Ready to Ship */}
        <button
          onClick={() => onNavigate('orders', 'egg')}
          className="text-left bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${actionItems.readyToShip.count > 0 ? 'bg-blue-100' : 'bg-neutral-100'}`}>
              <Package className={`w-5 h-5 ${actionItems.readyToShip.count > 0 ? 'text-blue-600' : 'text-neutral-400'}`} />
            </div>
            <span className="text-sm font-light text-neutral-600">
              {lang === 'no' ? 'Klare for sending' : 'Ready to ship'}
            </span>
          </div>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{actionItems.readyToShip.count}</p>
        </button>

        {/* Unread Messages */}
        <button
          onClick={() => onNavigate('customers', 'messages')}
          className="text-left bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${actionItems.unreadMessages.count > 0 ? 'bg-red-100' : 'bg-neutral-100'}`}>
              <MessageSquare className={`w-5 h-5 ${actionItems.unreadMessages.count > 0 ? 'text-red-600' : 'text-neutral-400'}`} />
            </div>
            <span className="text-sm font-light text-neutral-600">
              {lang === 'no' ? 'Uleste meldinger' : 'Unread messages'}
            </span>
          </div>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{actionItems.unreadMessages.count}</p>
        </button>

        {/* Missing Shipping Data */}
        <button
          onClick={() => onNavigate('orders', 'egg')}
          className="text-left bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)] hover:shadow-[0_20px_50px_-15px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition-all duration-300"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className={`p-2 rounded-lg ${actionItems.shippingMissing.count > 0 ? 'bg-amber-100' : 'bg-neutral-100'}`}>
              <Truck className={`w-5 h-5 ${actionItems.shippingMissing.count > 0 ? 'text-amber-600' : 'text-neutral-400'}`} />
            </div>
            <span className="text-sm font-light text-neutral-600">
              {lang === 'no' ? 'Manglende fraktdata' : 'Missing shipping data'}
            </span>
          </div>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{actionItems.shippingMissing.count}</p>
        </button>
      </div>

      {/* Deferred Payments Alert */}
      <DeferredPaymentsCard lang={lang} />

      {/* Row 2: Key Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-light text-neutral-500 mb-1">
            {lang === 'no' ? 'Totalt bestillinger' : 'Total orders'}
          </p>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{keyMetrics.totalOrders}</p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-light text-neutral-500 mb-1">
            {lang === 'no' ? 'Total omsetning' : 'Total revenue'}
          </p>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">
            {currency} {Math.round(keyMetrics.totalRevenue).toLocaleString(locale)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-light text-neutral-500 mb-1">
            {lang === 'no' ? 'Gj.snitt bestilling' : 'Avg order value'}
          </p>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">
            {currency} {keyMetrics.avgOrderValue.toLocaleString(locale)}
          </p>
        </div>
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <p className="text-sm font-light text-neutral-500 mb-1">
            {lang === 'no' ? 'Totalt kg solgt' : 'Total kg sold'}
          </p>
          <p className="text-3xl font-light text-neutral-900 tabular-nums">{keyMetrics.totalKgSold} kg</p>
        </div>
      </div>

      {/* Row 2.5: Egg Week Tracker */}
      {currentEggWeekTracker && (
        <EggWeekTrackerSection
          tracker={currentEggWeekTracker}
          lang={lang}
          copy={copy}
          loading={eggWeekLoading}
          weekOffset={eggWeekOffset}
          onChangeWeek={(nextOffset) => loadEggWeekTracker(nextOffset)}
        />
      )}

      {/* Row 3: Pickups & Shipments (week view with toggle) */}
      <WeekScheduleSection
        upcomingDates={upcomingDates}
        onNavigateToOrder={onNavigateToOrder}
        onPickupOrderClick={(order: any) => setPickupModalOrder(order)}
        onShipmentOrderClick={(order: any) => {
          if (order.type === 'egg') {
            setShippingModalOrderId(order.order_number);
          } else {
            onNavigateToOrder?.(order.order_number);
          }
        }}
        lang={lang}
        locale={locale}
      />

      <EmailActivitySection
        emailActivity={emailActivity}
        lang={lang}
        locale={locale}
        onNavigateToOrder={onNavigateToOrder}
        onNavigateToCustomer={onNavigateToCustomer}
        onNavigateToMessage={onNavigateToMessage}
        onNavigateToEmailTab={onNavigateToEmailTab}
      />

      {/* Row 4: New Orders Since Last Login */}
      {newOrders && newOrders.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <ShoppingCart className="w-5 h-5 text-neutral-600" />
              <h3 className="text-lg font-light text-neutral-900">
                {lang === 'no' ? 'Nye bestillinger' : 'New orders'}
              </h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => onNavigate('orders')}>
              {lang === 'no' ? 'Se alle' : 'See all'}
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-neutral-100">
                  <th className="text-left text-xs font-light text-neutral-500 pb-2 pr-4">{copy.table.orderNumber}</th>
                  <th className="text-left text-xs font-light text-neutral-500 pb-2 pr-4">{copy.table.customer}</th>
                  <th className="text-left text-xs font-light text-neutral-500 pb-2 pr-4">{copy.table.product}</th>
                  <th className="text-right text-xs font-light text-neutral-500 pb-2 pr-4">{copy.table.amount}</th>
                  <th className="text-right text-xs font-light text-neutral-500 pb-2">{copy.table.date}</th>
                </tr>
              </thead>
              <tbody>
                {newOrders.map((order: any) => (
                  <tr key={order.order_number} className="border-b border-neutral-50 last:border-0">
                    <td className="py-2 pr-4 text-sm font-medium text-neutral-900">{order.order_number}</td>
                    <td className="py-2 pr-4 text-sm text-neutral-700">{order.customer_name}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        order.product_type === 'pig' ? 'bg-amber-100 text-amber-800' :
                        order.product_type === 'egg' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {order.product_type === 'pig' ? (lang === 'no' ? 'Gris' : 'Pig') :
                         order.product_type === 'egg' ? (lang === 'no' ? 'Egg' : 'Egg') :
                         (lang === 'no' ? 'Kylling' : 'Chicken')}
                      </span>
                    </td>
                    <td className="py-2 pr-4 text-sm text-neutral-900 text-right tabular-nums">
                      {order.amount ? `${currency} ${Math.round(order.amount).toLocaleString(locale)}` : '–'}
                    </td>
                    <td className="py-2 text-sm text-neutral-500 text-right">
                      {timeAgo(order.created_at, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 5: Mangalitsa Overview */}
      {pig?.mangalitsa && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-6">
            <Beef className="w-6 h-6 text-amber-700" />
            <h3 className="text-lg font-light text-neutral-900">Mangalitsa</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700 mb-1">{lang === 'no' ? 'Bestillinger' : 'Orders'}</p>
              <p className="text-3xl font-bold text-amber-900">{pig.mangalitsa.total_orders}</p>
            </div>
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700 mb-1">{lang === 'no' ? 'Omsetning' : 'Revenue'}</p>
              <p className="text-3xl font-bold text-amber-900">
                {currency} {pig.mangalitsa.revenue.toLocaleString(locale)}
              </p>
            </div>
            <div className="p-5 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-sm text-amber-700 mb-1">{lang === 'no' ? 'Fordeling' : 'Breakdown'}</p>
              <div className="space-y-1 mt-2">
                {pig.mangalitsa.preset_breakdown.map((p: any) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="text-amber-800 truncate mr-2">{p.name}</span>
                    <span className="font-bold text-amber-900">{p.count}</span>
                  </div>
                ))}
                {pig.mangalitsa.preset_breakdown.length === 0 && (
                  <p className="text-sm text-amber-600">
                    {lang === 'no' ? 'Ingen bestillinger ennå' : 'No orders yet'}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 6: System Alerts */}
      {healthAlerts && healthAlerts.length > 0 && (
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Systemvarsler' : 'System alerts'}
            </h3>
          </div>
          <div className="space-y-2">
            {healthAlerts.map((alert: any, i: number) => (
              <div
                key={i}
                className={`p-3 rounded-lg text-sm ${
                  alert.level === 'error'
                    ? 'bg-red-50 text-red-800 border border-red-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                {alert.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <EggShippingModal
        orderId={shippingModalOrderId}
        open={!!shippingModalOrderId}
        onClose={() => {
          setShippingModalOrderId(null);
          loadDashboard(eggWeekOffset);
        }}
        lang={lang}
      />

      <PickupFulfillmentModal
        order={pickupModalOrder}
        onClose={() => setPickupModalOrder(null)}
        onRefresh={() => loadDashboard(eggWeekOffset)}
        onNavigateToCustomer={onNavigateToCustomer}
      />
    </div>
  );
}

function EggWeekTrackerSection({
  tracker,
  lang,
  copy,
  loading = false,
  weekOffset = 0,
  onChangeWeek,
}: {
  tracker: any;
  lang: string;
  copy: any;
  loading?: boolean;
  weekOffset?: number;
  onChangeWeek?: (nextOffset: number) => void;
}) {
  const ewt = copy.eggWeekTracker || {};
  const {
    weekLabel,
    weekRange,
    collectionWindow,
    daysCollected,
    daysRemaining,
    ordersTotal,
    collectedTotal,
    forecastTotal,
    missingNow,
    predictedEndOfWeek,
    breeds,
  } = tracker;

  // Compute deficit-only totals (surplus breeds can't substitute for deficit breeds)
  const deficitNow = (breeds || []).reduce((sum: number, b: any) => {
    const diff = b.orders - b.collected;
    return diff > 0 ? sum + diff : sum;
  }, 0);
  const deficitPred = (breeds || []).reduce((sum: number, b: any) => {
    const diff = b.orders - b.forecast;
    return diff > 0 ? sum + diff : sum;
  }, 0);

  // Use deficit-only for summary (surplus breeds can't cover other breeds)
  const nowIsDeficit = deficitNow > 0;
  const nowIsBalanced = deficitNow === 0;
  const predIsDeficit = deficitPred > 0;
  const predIsBalanced = deficitPred === 0;

  const formatDelta = (val: number) => {
    if (val === 0) return '0';
    if (val > 0) return `-${val}`;  // deficit: we are short
    return `+${Math.abs(val)}`;     // surplus: we have extra
  };

  const deltaColor = (val: number) => {
    if (val > 0) return 'text-red-600';
    if (val < 0) return 'text-green-600';
    return 'text-neutral-600';
  };

  const deltaBg = (val: number) => {
    if (val > 0) return 'bg-red-50 border-red-200';
    if (val < 0) return 'bg-green-50 border-green-200';
    return 'bg-neutral-50 border-neutral-200';
  };

  const statusLabel = (val: number) => {
    if (val > 0) return ewt.deficit || 'mangler';
    if (val < 0) return ewt.surplus || 'overskudd';
    return ewt.balanced || 'i balanse';
  };

  const previousWeekLabel = ewt.previousWeek || (lang === 'no' ? 'Forrige uke' : 'Previous week');
  const nextWeekLabel = ewt.nextWeek || (lang === 'no' ? 'Neste uke' : 'Next week');
  const currentWeekLabel = ewt.currentWeek || (lang === 'no' ? 'Til standardvisning' : 'Back to default view');

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-50">
            <Egg className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <h3 className="text-lg font-light text-neutral-900">
              {ewt.title || 'Ukeoversikt egg'}
            </h3>
            <p className="text-sm text-neutral-500">{weekLabel} &middot; {weekRange}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {loading && <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />}
          <button
            type="button"
            onClick={() => onChangeWeek?.(weekOffset - 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <ChevronLeft className="w-4 h-4" />
            {previousWeekLabel}
          </button>

          {weekOffset !== 0 && (
            <button
              type="button"
              onClick={() => onChangeWeek?.(0)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-100 px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              {currentWeekLabel}
            </button>
          )}

          <button
            type="button"
            onClick={() => onChangeWeek?.(weekOffset + 1)}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition-all hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {nextWeekLabel}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        {/* Ordered next Monday */}
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {ewt.orderedNextMonday || 'Bestilt neste mandag'}
          </p>
          <p className="text-2xl font-light text-neutral-900 tabular-nums">{ordersTotal}</p>
          <p className="text-xs text-neutral-400">{ewt.eggs || 'egg'}</p>
        </div>

        {/* Collected so far */}
        <div className="p-4 rounded-lg bg-neutral-50 border border-neutral-200">
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {ewt.collectedSoFar || 'Samlet s\u00e5 langt'}
          </p>
          <p className="text-2xl font-light text-neutral-900 tabular-nums">{collectedTotal}</p>
          <p className="text-xs text-neutral-400">({collectionWindow})</p>
        </div>

        {/* Forecast full week */}
        <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-xs font-medium text-blue-600 mb-1">
            {ewt.forecastFullWeek || 'Prognose (hele uken)'}
          </p>
          <p className="text-2xl font-light text-neutral-900 tabular-nums">
            {forecastTotal > 0 ? forecastTotal : (ewt.noForecast || 'N/A')}
          </p>
          <p className="text-xs text-blue-400">{ewt.eggs || 'egg'}</p>
        </div>

        {/* Status now */}
        <div className={`p-4 rounded-lg border ${deltaBg(deficitNow)}`}>
          <p className="text-xs font-medium text-neutral-500 mb-1">
            {ewt.statusNow || 'Mangler n\u00e5'}
          </p>
          <p className={`text-2xl font-light tabular-nums ${deltaColor(deficitNow)}`}>
            {formatDelta(deficitNow)}
          </p>
          <p className={`text-xs ${deltaColor(deficitNow)}`}>{statusLabel(deficitNow)}</p>
        </div>
      </div>

      {/* Prediction Sunday evening */}
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border mb-4 ${deltaBg(deficitPred)}`}>
        {predIsDeficit ? (
          <TrendingDown className="w-4 h-4 text-red-500" />
        ) : (
          <TrendingUp className="w-4 h-4 text-green-500" />
        )}
        <span className="text-sm text-neutral-700">
          {ewt.predictionSunday || 'Prediksjon s\u00f8ndag kveld'}:
        </span>
        <span className={`text-sm font-medium tabular-nums ${deltaColor(deficitPred)}`}>
          {formatDelta(deficitPred)} {ewt.eggs || 'egg'}
        </span>
        {forecastTotal === 0 && (
          <span className="text-xs text-neutral-400 ml-1">({ewt.noForecast || 'ingen prognose'})</span>
        )}
      </div>

      {/* Per-breed breakdown table */}
      {breeds && breeds.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100">
                <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4">{ewt.breed || 'Rase'}</th>
                <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4">{ewt.ordered || 'Bestilt'}</th>
                <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4">{ewt.collected || 'Samlet'}</th>
                <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4">{ewt.missingNow || 'Mangler n\u00e5'}</th>
                <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4">{ewt.forecast || 'Prognose'}</th>
                <th className="text-right text-xs font-medium text-neutral-500 pb-2">{ewt.missingPrediction || 'Mangler pred.'}</th>
              </tr>
            </thead>
            <tbody>
              {breeds.map((b: any) => {
                const breedMissingNow = b.orders - b.collected;
                const breedMissingPred = b.orders - b.forecast;
                return (
                  <tr key={b.breedName} className="border-b border-neutral-50 last:border-0">
                    <td className="py-2 pr-4 flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: b.accentColor }}
                      />
                      <span className="text-neutral-800">{b.breedName}</span>
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-700">{b.orders}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-700">{b.collected}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums font-medium ${deltaColor(breedMissingNow)}`}>
                      {formatDelta(breedMissingNow)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-500">
                      {b.forecast > 0 ? b.forecast : '\u2013'}
                    </td>
                    <td className={`py-2 text-right tabular-nums font-medium ${deltaColor(breedMissingPred)}`}>
                      {b.forecast > 0 ? formatDelta(breedMissingPred) : '\u2013'}
                    </td>
                  </tr>
                );
              })}
              {/* Totals row — only sum deficit breeds (surplus breeds can't substitute) */}
              {(() => {
                const deficitNow = breeds.reduce((sum: number, b: any) => {
                  const diff = b.orders - b.collected;
                  return diff > 0 ? sum + diff : sum;
                }, 0);
                const deficitPred = breeds.reduce((sum: number, b: any) => {
                  const diff = b.orders - b.forecast;
                  return diff > 0 ? sum + diff : sum;
                }, 0);
                return (
                  <tr className="border-t border-neutral-200 font-medium">
                    <td className="py-2 pr-4 text-neutral-900">{ewt.total || 'Totalt'}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-900">{ordersTotal}</td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-900">{collectedTotal}</td>
                    <td className={`py-2 pr-4 text-right tabular-nums ${deltaColor(deficitNow)}`}>
                      {formatDelta(deficitNow)}
                    </td>
                    <td className="py-2 pr-4 text-right tabular-nums text-neutral-700">
                      {forecastTotal > 0 ? forecastTotal : '\u2013'}
                    </td>
                    <td className={`py-2 text-right tabular-nums ${deltaColor(deficitPred)}`}>
                      {forecastTotal > 0 ? formatDelta(deficitPred) : '\u2013'}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {(!breeds || breeds.length === 0) && (
        <p className="text-sm text-neutral-500 text-center py-4">
          {ewt.noData || 'Ingen eggdata for denne uken'}
        </p>
      )}
    </div>
  );
}

function EmailActivitySection({
  emailActivity,
  lang,
  locale,
  onNavigateToOrder,
  onNavigateToCustomer,
  onNavigateToMessage,
  onNavigateToEmailTab,
}: {
  emailActivity: any;
  lang: string;
  locale: string;
  onNavigateToOrder?: (id: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
  onNavigateToEmailTab?: (tab: EmailSubTab) => void;
}) {
  const upcomingWeek = Array.isArray(emailActivity?.upcomingWeek) ? emailActivity.upcomingWeek : [];
  const sentLastWeek = Array.isArray(emailActivity?.sentLastWeek) ? emailActivity.sentLastWeek : [];
  const counts = emailActivity?.counts || {};

  const title = lang === 'no' ? 'E-postoversikt' : 'Email overview';
  const subtitle =
    lang === 'no'
      ? 'Hva som går ut neste uke, og hva som gikk ut siste uke.'
      : 'What is going out next week, and what went out last week.';
  const openEmailCenterLabel = lang === 'no' ? 'Åpne e-postsenter' : 'Open email center';
  const nextWeekTitle = lang === 'no' ? 'Neste 7 dager' : 'Next 7 days';
  const nextWeekSubtitle =
    lang === 'no' ? 'Planlagte og køsatte e-poster.' : 'Scheduled and queued emails.';
  const lastWeekTitle = lang === 'no' ? 'Siste 7 dager' : 'Last 7 days';
  const lastWeekSubtitle =
    lang === 'no' ? 'E-poster som faktisk ble sendt.' : 'Emails that were actually sent.';

  return (
    <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-sky-50">
            <Mail className="w-5 h-5 text-sky-700" />
          </div>
          <div>
            <h3 className="text-lg font-light text-neutral-900">{title}</h3>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
        </div>

        <Button variant="outline" size="sm" onClick={() => onNavigateToEmailTab?.('overview')}>
          {openEmailCenterLabel}
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <EmailActivityColumn
          title={nextWeekTitle}
          subtitle={nextWeekSubtitle}
          count={Number(counts.upcomingWeek || upcomingWeek.length || 0)}
          icon={<Calendar className="w-4 h-4 text-sky-700" />}
          entries={upcomingWeek}
          emptyLabel={lang === 'no' ? 'Ingen planlagte e-poster neste uke.' : 'No scheduled emails next week.'}
          lang={lang}
          locale={locale}
          onNavigateToOrder={onNavigateToOrder}
          onNavigateToCustomer={onNavigateToCustomer}
          onNavigateToMessage={onNavigateToMessage}
          onNavigateToEmailTab={onNavigateToEmailTab}
        />

        <EmailActivityColumn
          title={lastWeekTitle}
          subtitle={lastWeekSubtitle}
          count={Number(counts.sentLastWeek || sentLastWeek.length || 0)}
          icon={<Mail className="w-4 h-4 text-emerald-700" />}
          entries={sentLastWeek}
          emptyLabel={lang === 'no' ? 'Ingen utsendte e-poster siste uke.' : 'No emails sent in the last week.'}
          lang={lang}
          locale={locale}
          onNavigateToOrder={onNavigateToOrder}
          onNavigateToCustomer={onNavigateToCustomer}
          onNavigateToMessage={onNavigateToMessage}
          onNavigateToEmailTab={onNavigateToEmailTab}
        />
      </div>
    </div>
  );
}

function EmailActivityColumn({
  title,
  subtitle,
  count,
  icon,
  entries,
  emptyLabel,
  lang,
  locale,
  onNavigateToOrder,
  onNavigateToCustomer,
  onNavigateToMessage,
  onNavigateToEmailTab,
}: {
  title: string;
  subtitle: string;
  count: number;
  icon: ReactNode;
  entries: any[];
  emptyLabel: string;
  lang: string;
  locale: string;
  onNavigateToOrder?: (id: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
  onNavigateToEmailTab?: (tab: EmailSubTab) => void;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="mt-0.5">{icon}</div>
          <div>
            <h4 className="text-base font-medium text-neutral-900">{title}</h4>
            <p className="text-sm text-neutral-500">{subtitle}</p>
          </div>
        </div>
        <span className="inline-flex min-w-8 justify-center rounded-full bg-white px-2.5 py-1 text-xs font-medium text-neutral-700 border border-neutral-200">
          {count}
        </span>
      </div>

      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry: any) => (
            <EmailActivityItem
              key={`${entry.emailCenterTab}-${entry.id}`}
              entry={entry}
              lang={lang}
              locale={locale}
              onNavigateToOrder={onNavigateToOrder}
              onNavigateToCustomer={onNavigateToCustomer}
              onNavigateToMessage={onNavigateToMessage}
              onNavigateToEmailTab={onNavigateToEmailTab}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-neutral-200 bg-white px-4 py-6 text-sm text-neutral-500">
          {emptyLabel}
        </div>
      )}
    </div>
  );
}

function EmailActivityItem({
  entry,
  lang,
  locale,
  onNavigateToOrder,
  onNavigateToCustomer,
  onNavigateToMessage,
  onNavigateToEmailTab,
}: {
  entry: any;
  lang: string;
  locale: string;
  onNavigateToOrder?: (id: string) => void;
  onNavigateToCustomer?: (customerId: string) => void;
  onNavigateToMessage?: (messageId: string) => void;
  onNavigateToEmailTab?: (tab: EmailSubTab) => void;
}) {
  const heading = entry.subject || entry.label || (lang === 'no' ? 'E-post' : 'Email');
  const customerLabel = entry.customerName || entry.toEmail || (lang === 'no' ? 'Ukjent mottaker' : 'Unknown recipient');
  const orderLabel = entry.relatedOrderNumber || null;
  const primaryTime = entry.scheduledFor || entry.sentAt || entry.createdAt || null;
  const timePrefix = entry.scheduledFor
    ? lang === 'no'
      ? 'Planlagt'
      : 'Scheduled'
    : entry.sentAt
      ? lang === 'no'
        ? 'Sendt'
        : 'Sent'
      : lang === 'no'
        ? 'Opprettet'
        : 'Created';
  const openCenterLabel =
    entry.emailCenterTab === 'history'
      ? lang === 'no'
        ? 'Historikk'
        : 'History'
      : entry.emailCenterTab === 'queue'
        ? 'Kø'
        : lang === 'no'
          ? 'Livsløp'
          : 'Lifecycle';
  const customerButtonLabel = lang === 'no' ? 'Kunde' : 'Customer';
  const orderButtonLabel = lang === 'no' ? 'Ordre' : 'Order';
  const threadButtonLabel = lang === 'no' ? 'Tråd' : 'Thread';
  const templateLabel = entry.templateKey || entry.flowKey || entry.eventType || null;

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onNavigateToEmailTab?.(entry.emailCenterTab)}
              className="text-left text-base font-medium text-neutral-900 hover:text-blue-700 transition-colors"
            >
              {heading}
            </button>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-neutral-500">
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-700">
                {entry.classification || (lang === 'no' ? 'system' : 'system')}
              </span>
              {entry.productScope && (
                <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-700">
                  {entry.productScope}
                </span>
              )}
              {templateLabel && (
                <span className="truncate rounded-full bg-neutral-100 px-2 py-0.5 text-neutral-600 max-w-[260px]">
                  {templateLabel}
                </span>
              )}
            </div>
          </div>

          {primaryTime && (
            <div className="text-xs text-neutral-500 whitespace-nowrap">
              {timePrefix}: {formatEmailActivityDate(primaryTime, locale)}
            </div>
          )}
        </div>

        <div className="text-sm text-neutral-700">
          <button
            type="button"
            disabled={!entry.customerLookupId}
            onClick={() => entry.customerLookupId && onNavigateToCustomer?.(entry.customerLookupId)}
            className="font-medium text-left hover:text-blue-700 transition-colors disabled:cursor-default disabled:hover:text-neutral-700"
          >
            {customerLabel}
          </button>
          {entry.toEmail && (
            <span className="text-neutral-500"> · {entry.toEmail}</span>
          )}
          {orderLabel && (
            <>
              <span className="text-neutral-400"> · </span>
              <button
                type="button"
                onClick={() => onNavigateToOrder?.(orderLabel)}
                className="font-medium text-left text-neutral-700 hover:text-blue-700 transition-colors"
              >
                {orderLabel}
              </button>
            </>
          )}
        </div>

        {entry.lastError && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {entry.lastError}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => onNavigateToEmailTab?.(entry.emailCenterTab)}>
            {openCenterLabel}
          </Button>
          {entry.customerLookupId && (
            <Button variant="outline" size="sm" onClick={() => onNavigateToCustomer?.(entry.customerLookupId)}>
              {customerButtonLabel}
            </Button>
          )}
          {orderLabel && (
            <Button variant="outline" size="sm" onClick={() => onNavigateToOrder?.(orderLabel)}>
              {orderButtonLabel}
            </Button>
          )}
          {entry.relatedMessageId && (
            <Button variant="outline" size="sm" onClick={() => onNavigateToMessage?.(entry.relatedMessageId)}>
              {threadButtonLabel}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function formatEmailActivityDate(dateValue: string, locale: string) {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return dateValue;

  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function WeekScheduleSection({ upcomingDates, onNavigateToOrder, onPickupOrderClick, onShipmentOrderClick, lang, locale }: {
  upcomingDates: any;
  onNavigateToOrder?: (id: string) => void;
  onPickupOrderClick?: (order: any) => void;
  onShipmentOrderClick?: (order: any) => void;
  lang: string;
  locale: string;
}) {
  const [showNextWeek, setShowNextWeek] = useState(false);

  const pickups = upcomingDates?.pickups || { thisWeek: [], nextWeek: [] };
  const shipments = upcomingDates?.shipments || { thisWeek: [], nextWeek: [] };
  const pendingPigPickups = upcomingDates?.pendingPigPickups || [];

  const currentPickups = showNextWeek ? pickups.nextWeek : pickups.thisWeek;
  const currentShipments = showNextWeek ? shipments.nextWeek : shipments.thisWeek;

  const thisWeekLabel = lang === 'no' ? 'Denne uken' : 'This week';
  const nextWeekLabel = lang === 'no' ? 'Neste uke' : 'Next week';

  return (
    <div className="space-y-3">
      {/* Week toggle */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowNextWeek(false)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            !showNextWeek
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {thisWeekLabel}
        </button>
        <button
          onClick={() => setShowNextWeek(true)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            showNextWeek
              ? 'bg-neutral-900 text-white'
              : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
          }`}
        >
          {nextWeekLabel}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pickups */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-neutral-600" />
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Henting' : 'Pickups'}
            </h3>
          </div>
          {(currentPickups.length > 0 || (!showNextWeek && pendingPigPickups.length > 0)) ? (
            <div className="space-y-4">
              {currentPickups.map((group: any) => (
                <DateGroup key={group.date} group={group} onOrderClick={onPickupOrderClick} lang={lang} locale={locale} />
              ))}
              {!showNextWeek && pendingPigPickups.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-amber-700 mb-2">
                    {lang === 'no' ? 'Gris — venter på henting' : 'Pig — awaiting pickup'}
                    <span className="text-neutral-400 ml-2">({pendingPigPickups.length})</span>
                  </p>
                  <div className="space-y-1">
                    {pendingPigPickups.map((order: any) => (
                      <OrderRow key={order.order_number} order={order} onOrderClick={onPickupOrderClick} lang={lang} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm font-light text-neutral-500">
              {lang === 'no' ? 'Ingen hentinger' : 'No pickups'}
            </p>
          )}
        </div>

        {/* Shipments */}
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-neutral-600" />
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Utsending' : 'Shipments'}
            </h3>
          </div>
          {currentShipments.length > 0 ? (
            <div className="space-y-4">
              {currentShipments.map((group: any) => (
                <DateGroup key={group.date} group={group} onOrderClick={onShipmentOrderClick} lang={lang} locale={locale} />
              ))}
            </div>
          ) : (
            <p className="text-sm font-light text-neutral-500">
              {lang === 'no' ? 'Ingen utsendinger' : 'No shipments'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function DateGroup({ group, onNavigateToOrder, onOrderClick, lang, locale }: {
  group: { date: string; orders: any[] };
  onNavigateToOrder?: (id: string) => void;
  onOrderClick?: (order: any) => void;
  lang: string;
  locale: string;
}) {
  const isTomorrow = group.date === tomorrowDate();
  const isToday = group.date === todayDate();

  return (
    <div className={`rounded-lg ${isTomorrow ? 'bg-amber-50 border border-amber-200 p-3' : isToday ? 'bg-blue-50 border border-blue-200 p-3' : ''}`}>
      <p className="text-sm font-medium text-neutral-700 mb-2">
        {isToday && <span className="text-blue-700 mr-1">{lang === 'no' ? 'I dag' : 'Today'} —</span>}
        {isTomorrow && <span className="text-amber-700 mr-1">{lang === 'no' ? 'I morgen' : 'Tomorrow'} —</span>}
        {new Date(group.date + 'T12:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
        <span className="text-neutral-400 ml-2">({group.orders.length})</span>
      </p>
      <div className="space-y-1">
        {group.orders.map((order: any) => (
          <OrderRow
            key={order.order_number}
            order={order}
            onNavigateToOrder={onOrderClick ? undefined : onNavigateToOrder}
            onOrderClick={onOrderClick}
            lang={lang}
          />
        ))}
      </div>
    </div>
  );
}

function todayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function tomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

const typeBadge: Record<string, { bg: string; text: string; labelNo: string; labelEn: string }> = {
  egg: { bg: 'bg-blue-100', text: 'text-blue-800', labelNo: 'Egg', labelEn: 'Egg' },
  chicken: { bg: 'bg-green-100', text: 'text-green-800', labelNo: 'Kylling', labelEn: 'Chicken' },
  pig: { bg: 'bg-amber-100', text: 'text-amber-800', labelNo: 'Gris', labelEn: 'Pig' },
};

function OrderRow({ order, onNavigateToOrder, onOrderClick, lang }: { order: any; onNavigateToOrder?: (id: string) => void; onOrderClick?: (order: any) => void; lang: string }) {
  const badge = typeBadge[order.type] || typeBadge.egg;
  const firstName = (order.customer_name || '').split(/\s+/)[0] || '';
  const locale = lang === 'no' ? 'nb-NO' : 'en-GB';

  const pickupLabel = (() => {
    const date = order.pickup_date ? String(order.pickup_date).trim() : null;
    const time = order.pickup_time ? String(order.pickup_time).trim() : null;
    if (!date) return time ? `kl. ${time}` : null;
    const formatted = new Date(`${date}T12:00:00`).toLocaleDateString(locale, {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    return time ? `${formatted} kl. ${time}` : formatted;
  })();

  return (
    <button
      onClick={() => onOrderClick ? onOrderClick(order) : onNavigateToOrder?.(order.order_number)}
      className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left hover:bg-neutral-50 transition-colors group"
    >
      <span className="text-sm font-medium text-neutral-900 group-hover:text-blue-700 transition-colors min-w-[120px]">
        {order.order_number}
      </span>
      <span className="text-sm text-neutral-600 truncate flex-1">{firstName}</span>
      {pickupLabel && (
        <span className="text-xs text-neutral-400 whitespace-nowrap">{pickupLabel}</span>
      )}
      <span className={`px-2 py-0.5 text-xs rounded-full ${badge.bg} ${badge.text}`}>
        {lang === 'no' ? badge.labelNo : badge.labelEn}
      </span>
    </button>
  );
}

function timeAgo(dateStr: string, lang: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHrs = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 60) return `${diffMin}${lang === 'no' ? ' min siden' : 'm ago'}`;
  if (diffHrs < 24) return `${diffHrs}${lang === 'no' ? ' t siden' : 'h ago'}`;
  return `${diffDays}${lang === 'no' ? ' d siden' : 'd ago'}`;
}
