'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  Beef,
  Calendar,
  CreditCard,
  Mail,
  MessageSquare,
  Package,
  RefreshCw,
  ShoppingCart,
  Truck,
} from 'lucide-react';

interface ActionDashboardProps {
  onNavigate: (tab: string, subTab?: string) => void;
}

export function ActionDashboard({ onNavigate }: ActionDashboardProps) {
  const { t, lang } = useLanguage();
  const copy = t.adminPage;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const lastLogin = localStorage.getItem('tinglum_last_login') || '';
      const params = lastLogin ? `?lastLogin=${encodeURIComponent(lastLogin)}` : '';
      const response = await fetch(`/api/admin/dashboard${params}`);
      if (!response.ok) throw new Error('Failed to load dashboard');
      const result = await response.json();
      setData(result);
      // Update last login timestamp
      localStorage.setItem('tinglum_last_login', new Date().toISOString());
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
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

  const { actionItems, keyMetrics, upcomingDates, newOrders, pig, healthAlerts, messages } = data;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-light tracking-tight text-neutral-900">{copy.dashboardTitle}</h2>
        <button
          onClick={loadDashboard}
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

      {/* Row 3: Upcoming Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-neutral-600" />
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Neste henting' : 'Next pickup'}
            </h3>
          </div>
          {upcomingDates?.nextPickup ? (
            <div>
              <p className="text-2xl font-light text-neutral-900">
                {new Date(upcomingDates.nextPickup.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm font-light text-neutral-500 mt-1">
                {upcomingDates.nextPickup.orderCount} {lang === 'no' ? 'bestillinger' : 'orders'}
              </p>
            </div>
          ) : (
            <p className="text-sm font-light text-neutral-500">
              {lang === 'no' ? 'Ingen planlagte hentinger' : 'No pickups scheduled'}
            </p>
          )}
          {upcomingDates?.pendingPigPickups > 0 && (
            <p className="text-sm font-light text-amber-600 mt-2">
              + {upcomingDates.pendingPigPickups} {lang === 'no' ? 'grisbestillinger venter' : 'pig orders pending'}
            </p>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="w-5 h-5 text-neutral-600" />
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Neste utsending' : 'Next send-out'}
            </h3>
          </div>
          {upcomingDates?.nextSendout ? (
            <div>
              <p className="text-2xl font-light text-neutral-900">
                {new Date(upcomingDates.nextSendout.date).toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
              <p className="text-sm font-light text-neutral-500 mt-1">
                {upcomingDates.nextSendout.orderCount} {lang === 'no' ? 'pakker' : 'packages'}
              </p>
            </div>
          ) : (
            <p className="text-sm font-light text-neutral-500">
              {lang === 'no' ? 'Ingen planlagte utsendinger' : 'No send-outs scheduled'}
            </p>
          )}
        </div>
      </div>

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
    </div>
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
