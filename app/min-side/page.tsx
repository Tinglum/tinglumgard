'use client';

import { useCallback, useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Package, Gift, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { OrderDetailsCard } from '@/components/OrderDetailsCard';
import { ReferralDashboard } from '@/components/ReferralDashboard';
import { MessagingPanel } from '@/components/MessagingPanel';
import { MobileMinSide } from '@/components/MobileMinSide';

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
  box_size: number;
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
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const isMobile = useIsMobile();

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

  // Mobile version
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>
        <div className="mx-auto max-w-md px-5 pb-24 pt-6 font-[family:var(--font-manrope)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>

          <MobileMinSide
            orders={orders}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            canEdit={canEdit}
            cutoffWeek={cutoffWeek}
            cutoffYear={cutoffYear}
            onPayRemainder={handlePayRemainder}
          />

          {activeTab === 'referrals' && (
            <div className="mt-6">
              <ReferralDashboard />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop version - Nordic Minimal Design with Movement
  return (
    <div className="min-h-screen bg-white py-20">
      {/* Subtle parallax background layer */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute top-1/4 left-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.15 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        {/* Header */}
        <div className="mb-16">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300 mb-8"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>

          <h1 className="text-5xl font-light tracking-tight text-neutral-900 mb-8">
            {t.minSide.title}
          </h1>

          {/* Tab Navigation */}
          <div className="flex gap-4 border-b border-neutral-200 mb-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 relative",
                activeTab === 'orders'
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5"
              )}
            >
              <Package className="w-5 h-5" />
              {t.minSide.myOrders}
              {activeTab === 'orders' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={cn(
                "flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 relative",
                activeTab === 'referrals'
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5"
              )}
            >
              <Gift className="w-5 h-5" />
              {t.minSide.referrals}
              {activeTab === 'referrals' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={cn(
                "flex items-center gap-3 px-6 py-4 font-light transition-all duration-300 relative",
                activeTab === 'messages'
                  ? "text-neutral-900"
                  : "text-neutral-500 hover:text-neutral-900 hover:-translate-y-0.5"
              )}
            >
              <MessageSquare className="w-5 h-5" />
              Meldinger
              {activeTab === 'messages' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-neutral-900 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
          </div>

          {activeTab === 'orders' && (
            <p className="text-base font-light text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-6 py-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
              {canEdit
                ? t.minSide.canEditUntil.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())
                : t.minSide.editPeriodExpired.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())}
            </p>
          )}
        </div>

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (orders.length === 0 ? (
          <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
            <Package className="w-20 h-20 mx-auto mb-6 text-neutral-400" />
            <h2 className="text-3xl font-light mb-4 text-neutral-900">{t.minSide.noOrders}</h2>
            <p className="mb-8 font-light text-neutral-600 max-w-md mx-auto">{t.minSide.noOrdersDesc}</p>
            <Link href="/bestill">
              <button className="px-8 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300">
                {t.minSide.goToOrder}
              </button>
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

            <div className="text-center pt-8">
              <Link
                href="/bestill"
                className="inline-flex items-center gap-3 px-8 py-4 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
              >
                <Package className="w-5 h-5" />
                {t.minSide.newOrder}
              </Link>
            </div>
          </div>
        ))}

        {/* Referrals Tab Content */}
        {activeTab === 'referrals' && (
          <ReferralDashboard />
        )}

        {/* Messages Tab Content */}
        {activeTab === 'messages' && (
          <MessagingPanel />
        )}
      </div>
    </div>
  );
}
