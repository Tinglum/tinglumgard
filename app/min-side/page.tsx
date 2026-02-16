'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { OrderDetailsCard } from '@/components/OrderDetailsCard';
import { ReferralDashboard } from '@/components/ReferralDashboard';
import { MessagingPanel } from '@/components/MessagingPanel';
import { GlassCard } from '@/components/eggs/GlassCard';

interface Payment {
  id: string;
  payment_type: string;
  status: string;
  amount_nok: number;
  paid_at: string | null;
}

interface Order {
  id: string;
  order_number: string;
  box_size: number | null;
  effective_box_size?: number;
  display_box_name_no?: string | null;
  display_box_name_en?: string | null;
  status: string;
  delivery_type: string;
  fresh_delivery: boolean;
  ribbe_choice: string;
  extra_products: any[];
  notes: string;
  admin_notes: string;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  created_at: string;
  last_modified_at: string;
  locked_at: string | null;
  marked_delivered_at: string | null;
  at_risk: boolean;
  payments: Payment[];
}

export default function CustomerPortalPage() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutoffWeek, setCutoffWeek] = useState(46);
  const [cutoffYear, setCutoffYear] = useState(2026);
  const [canEdit, setCanEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'referrals' | 'messages'>('orders');

  async function handleVippsLogin() {
    window.location.href = '/api/auth/vipps/login?returnTo=/min-side';
  }

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.cutoff) {
        setCutoffWeek(data.cutoff.week);
        setCutoffYear(data.cutoff.year);

        const currentDate = new Date();
        const currentWeek = getWeekNumber(currentDate);
        setCanEdit(
          currentWeek.year < data.cutoff.year ||
          (currentWeek.year === data.cutoff.year && currentWeek.week <= data.cutoff.week)
        );
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    }
  }, []);

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadOrders();
      loadConfig();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadOrders, loadConfig]);

  function getWeekNumber(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  async function handlePayRemainder(orderId: string) {
    window.location.href = `/min-side/ordre/${orderId}/betaling`;
  }

  async function handleExitImpersonation() {
    try {
      const response = await fetch('/api/admin/customers/impersonate/stop', {
        method: 'POST',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to exit impersonation');
      }
      window.location.href = data?.redirectTo || '/admin';
    } catch (error) {
      console.error('Failed to exit impersonation:', error);
      window.location.href = '/admin';
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show login wall if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="text-center max-w-md bg-white border border-neutral-200 rounded-xl p-12 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          <Package className="w-20 h-20 mx-auto mb-6 text-neutral-400" />
          <h1 className="text-4xl font-light tracking-tight text-neutral-900 mb-4">{t.minSide.loginRequired}</h1>
          <p className="font-light text-neutral-600 mb-8">{t.minSide.loginDesc}</p>
          <button
            onClick={() => window.location.href = '/api/auth/vipps/login?returnTo=/min-side'}
            className="w-full bg-neutral-900 hover:bg-neutral-800 text-white font-light py-4 px-8 rounded-xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 uppercase tracking-wide text-sm"
          >
            <span>{t.minSide.loginWithVipps}</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-6xl space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-normal text-neutral-900 mb-2">{t.minSide.title}</h1>
            <p className="text-neutral-600">{t.minSide.myOrders}</p>
          </div>
          <Link href="/" className="text-sm text-neutral-600 hover:text-neutral-900">
            {t.nav.back}
          </Link>
        </div>

        {user?.isImpersonating && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-amber-900">{t.minSide.impersonationActive}</p>
            <button
              type="button"
              onClick={handleExitImpersonation}
              className="px-3 py-2 text-xs font-semibold uppercase tracking-wide rounded-lg bg-neutral-900 text-white hover:bg-neutral-800 transition-colors"
            >
              {t.minSide.impersonationBack}
            </button>
          </div>
        )}

        <div className="flex gap-4 border-b border-neutral-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'orders'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t.minSide.myOrders}
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'referrals'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t.minSide.referrals}
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-2 pb-3 text-sm font-normal transition-colors ${
              activeTab === 'messages'
                ? 'text-neutral-900 border-b-2 border-neutral-900'
                : 'text-neutral-500 hover:text-neutral-900'
            }`}
          >
            {t.eggs.myOrders.tabMessages}
          </button>
        </div>

        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-neutral-200 bg-white p-4 text-sm text-neutral-600 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)]">
              {canEdit
                ? t.minSide.canEditUntil.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())
                : t.minSide.editPeriodExpired.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())}
            </div>

            {orders.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                <Package className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                <p className="text-lg font-normal text-neutral-900 mb-2">{t.minSide.noOrders}</p>
                <p className="text-sm text-neutral-500 mb-6">{t.minSide.noOrdersDesc}</p>
                <Link href="/bestill" className="btn-primary inline-flex">
                  {t.minSide.goToOrder}
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {orders.map((order) => (
                  <OrderDetailsCard
                    key={order.id}
                    order={order}
                    canEdit={canEdit}
                    onPayRemainder={handlePayRemainder}
                    onRefresh={loadOrders}
                  />
                ))}

                <div className="text-center pt-4">
                  <Link href="/bestill" className="btn-secondary inline-flex">
                    <Package className="w-4 h-4" />
                    {t.minSide.newOrder}
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'referrals' && (
          <GlassCard className="p-6">
            <ReferralDashboard />
          </GlassCard>
        )}

        {activeTab === 'messages' && (
          <GlassCard className="p-6">
            <MessagingPanel />
          </GlassCard>
        )}
      </div>
    </div>
  );
}
