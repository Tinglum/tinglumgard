'use client';

import { useEffect, useState } from 'react';
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
  const { getThemeClasses } = useTheme();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const theme = getThemeClasses();
  const isMobile = useIsMobile();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [cutoffWeek, setCutoffWeek] = useState(46);
  const [cutoffYear, setCutoffYear] = useState(2026);
  const [canEdit, setCanEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'referrals' | 'messages'>('orders');

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadOrders();
      loadConfig();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated]);

  async function handleVippsLogin() {
    window.location.href = '/api/auth/vipps/login?returnTo=/min-side';
  }

  async function loadConfig() {
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
  }

  async function loadOrders() {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

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
      <div className={cn("min-h-screen flex items-center justify-center px-6", theme.bgGradientHero)}>
        <div className={cn("text-center max-w-md rounded-3xl p-8 border shadow-2xl", theme.bgCard, theme.glassBorder)}>
          <Package className={cn("w-16 h-16 mx-auto mb-4", theme.textPrimary)} />
          <h1 className={cn("text-2xl font-bold mb-4", theme.textPrimary)}>{t.minSide.loginRequired}</h1>
          <p className={cn("mb-6", theme.textMuted)}>{t.minSide.loginDesc}</p>
          <button
            onClick={() => window.location.href = '/api/auth/vipps/login?returnTo=/min-side'}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
            style={{ backgroundColor: '#FF5B24' }}
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

  // Desktop version
  return (
    <div className={cn("min-h-screen py-16 sm:py-24", theme.bgGradientHero)}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className={cn("text-4xl sm:text-5xl font-bold mb-6", theme.textPrimary)}>
            {t.minSide.title}
          </h1>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-gray-200 mb-8">
            <button
              onClick={() => setActiveTab('orders')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-semibold transition-all",
                activeTab === 'orders'
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Package className="w-5 h-5" />
              {t.minSide.myOrders}
            </button>
            <button
              onClick={() => setActiveTab('referrals')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-semibold transition-all",
                activeTab === 'referrals'
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <Gift className="w-5 h-5" />
              {t.minSide.referrals}
            </button>
            <button
              onClick={() => setActiveTab('messages')}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-semibold transition-all",
                activeTab === 'messages'
                  ? "border-b-2 border-green-600 text-green-600"
                  : "text-gray-500 hover:text-gray-700"
              )}
            >
              <MessageSquare className="w-5 h-5" />
              Meldinger
            </button>
          </div>

          {activeTab === 'orders' && (
            <p className={cn("text-lg", theme.textSecondary)}>
              {canEdit
                ? t.minSide.canEditUntil.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())
                : t.minSide.editPeriodExpired.replace('{week}', cutoffWeek.toString()).replace('{year}', cutoffYear.toString())}
            </p>
          )}
        </div>

        {/* Orders Tab Content */}
        {activeTab === 'orders' && (orders.length === 0 ? (
          <Card className={cn("p-12 text-center", theme.bgCard)}>
            <Package className={cn("w-16 h-16 mx-auto mb-4", theme.iconColor)} />
            <h2 className={cn("text-xl font-semibold mb-2", theme.textPrimary)}>{t.minSide.noOrders}</h2>
            <p className={cn("mb-6", theme.textSecondary)}>{t.minSide.noOrdersDesc}</p>
            <Link href="/bestill">
              <Button size="lg">{t.minSide.goToOrder}</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-8">
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
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
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
