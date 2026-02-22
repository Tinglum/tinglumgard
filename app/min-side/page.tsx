'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Package } from 'lucide-react';
import Link from 'next/link';
import { ReferralDashboard } from '@/components/ReferralDashboard';
import { MessagingPanel } from '@/components/MessagingPanel';
import { GlassCard } from '@/components/eggs/GlassCard';
import { ChickenOrderCard } from '@/components/ChickenOrderCard';
import { EggOrderUnifiedCard } from '@/components/orders/EggOrderUnifiedCard';
import { PigOrderUnifiedCard } from '@/components/orders/PigOrderUnifiedCard';

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

interface EggOrder {
  id: string;
  order_number: string;
  status: string;
  quantity: number;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  remainder_due_date?: string | null;
  delivery_monday: string;
  week_number: number;
  delivery_method: string;
  delivery_fee?: number;
  created_at?: string | null;
  egg_breeds?: { name?: string; accent_color?: string } | null;
  egg_payments?: Array<{
    payment_type: string;
    status: string;
    amount_nok?: number;
    paid_at?: string | null;
  }>;
  egg_order_additions?: Array<{ quantity: number; subtotal: number }>;
}

interface ChickenOrder {
  id: string;
  order_number: string;
  quantity_hens: number;
  quantity_roosters: number;
  pickup_year: number;
  pickup_week: number;
  age_weeks_at_pickup: number;
  price_per_hen_nok: number;
  total_amount_nok: number;
  deposit_amount_nok: number;
  remainder_amount_nok: number;
  remainder_due_date?: string | null;
  delivery_method: string;
  status: string;
  created_at: string;
  chicken_breeds?: { name: string; accent_color: string };
  chicken_payments?: Array<{ payment_type: string; status: string; amount_nok: number }>;
}

type UnifiedOrderType = 'egg' | 'pig' | 'chicken';
type OrderViewMode = 'chronological' | 'next_step' | 'type';

interface UnifiedOrderItem {
  type: UnifiedOrderType;
  id: string;
  createdAt: number;
  nextStepAt: number;
}

function toTimestamp(value?: string | null, fallback: number = Number.POSITIVE_INFINITY): number {
  if (!value) return fallback;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getIsoWeekMondayTimestamp(year: number, week: number): number {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay() || 7;
  if (day <= 4) {
    simple.setUTCDate(simple.getUTCDate() - day + 1);
  } else {
    simple.setUTCDate(simple.getUTCDate() + 8 - day);
  }
  return simple.getTime();
}

export default function CustomerPortalPage() {
  const { t } = useLanguage();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const chickenOrdersCopy = (t as any).chickens.myOrders;

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'referrals' | 'messages'>('orders');
  const [orderViewMode, setOrderViewMode] = useState<OrderViewMode>('chronological');
  const [eggOrders, setEggOrders] = useState<EggOrder[]>([]);
  const [chickenOrders, setChickenOrders] = useState<ChickenOrder[]>([]);
  const [eggOrdersLoading, setEggOrdersLoading] = useState(false);
  const [chickenOrdersLoading, setChickenOrdersLoading] = useState(false);

  async function handleVippsLogin() {
    window.location.href = '/api/auth/vipps/login?returnTo=/min-side';
  }

  const loadConfig = useCallback(async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.cutoff) {
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

  const loadPigOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/orders', { cache: 'no-store' });
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load pig orders:', error);
      setOrders([]);
    }
  }, []);

  const loadEggOrders = useCallback(async () => {
    setEggOrdersLoading(true);
    try {
      const response = await fetch('/api/eggs/my-orders', { cache: 'no-store' });
      if (response.status === 401) {
        setEggOrders([]);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load egg orders');
      }
      setEggOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load egg orders:', error);
      setEggOrders([]);
    } finally {
      setEggOrdersLoading(false);
    }
  }, []);

  const loadChickenOrders = useCallback(async () => {
    setChickenOrdersLoading(true);
    try {
      const response = await fetch('/api/chickens/my-orders', { cache: 'no-store' });
      if (response.status === 401) {
        setChickenOrders([]);
        return;
      }
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load chicken orders');
      }
      setChickenOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load chicken orders:', error);
      setChickenOrders([]);
    } finally {
      setChickenOrdersLoading(false);
    }
  }, []);

  const loadAllOrders = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadPigOrders(), loadEggOrders(), loadChickenOrders(), loadConfig()]);
    setLoading(false);
  }, [loadPigOrders, loadEggOrders, loadChickenOrders, loadConfig]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadAllOrders();
    } else if (!authLoading && !isAuthenticated) {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, loadAllOrders]);

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

  async function handlePayChickenRemainder(orderId: string) {
    try {
      const response = await fetch(`/api/chickens/orders/${orderId}/remainder`, { method: 'POST' });
      if (!response.ok) return;
      const data = await response.json();
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    } catch (error) {
      console.error('Failed to start chicken remainder payment:', error);
    }
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

  const unifiedOrders = useMemo<UnifiedOrderItem[]>(() => {
    const eggItems: UnifiedOrderItem[] = eggOrders.map((order) => {
      const remainderPaid = (order.egg_payments || []).some(
        (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
      );
      const nextStepAt = order.status === 'deposit_paid' && !remainderPaid
        ? toTimestamp(order.remainder_due_date, toTimestamp(order.delivery_monday))
        : toTimestamp(order.delivery_monday, toTimestamp(order.created_at));

      return {
        type: 'egg',
        id: order.id,
        createdAt: toTimestamp(order.created_at, toTimestamp(order.delivery_monday, 0)),
        nextStepAt,
      };
    });

    const pigItems: UnifiedOrderItem[] = orders.map((order) => {
      const depositPaid = (order.payments || []).some(
        (payment) => payment.payment_type === 'deposit' && payment.status === 'completed'
      );
      const remainderPaid = (order.payments || []).some(
        (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
      );

      const nextStepAt = depositPaid && !remainderPaid
        ? toTimestamp(order.locked_at, toTimestamp(order.last_modified_at, toTimestamp(order.created_at)))
        : toTimestamp(order.marked_delivered_at, toTimestamp(order.last_modified_at, toTimestamp(order.created_at)));

      return {
        type: 'pig',
        id: order.id,
        createdAt: toTimestamp(order.created_at, 0),
        nextStepAt,
      };
    });

    const chickenItems: UnifiedOrderItem[] = chickenOrders.map((order) => {
      const remainderPaid = (order.chicken_payments || []).some(
        (payment) => payment.payment_type === 'remainder' && payment.status === 'completed'
      );
      const pickupAt = getIsoWeekMondayTimestamp(order.pickup_year, order.pickup_week);
      const nextStepAt = order.status === 'deposit_paid' && !remainderPaid
        ? toTimestamp(order.remainder_due_date, pickupAt)
        : pickupAt;

      return {
        type: 'chicken',
        id: order.id,
        createdAt: toTimestamp(order.created_at, pickupAt),
        nextStepAt,
      };
    });

    const allItems = [...eggItems, ...pigItems, ...chickenItems];
    if (orderViewMode === 'chronological') {
      return allItems.sort((a, b) => b.createdAt - a.createdAt);
    }
    if (orderViewMode === 'next_step') {
      return allItems.sort((a, b) => a.nextStepAt - b.nextStepAt || b.createdAt - a.createdAt);
    }
    return allItems;
  }, [eggOrders, orders, chickenOrders, orderViewMode]);

  const orderTypeLabel: Record<UnifiedOrderType, string> = {
    egg: t.minSide.sectionEggOrders,
    pig: t.minSide.sectionPigOrders,
    chicken: t.minSide.sectionChickenOrders,
  };

  const orderTypeBadgeClass: Record<UnifiedOrderType, string> = {
    egg: 'bg-sky-50 text-sky-700',
    pig: 'bg-neutral-100 text-neutral-700',
    chicken: 'bg-amber-50 text-amber-700',
  };

  const eggOrdersById = useMemo(() => new Map(eggOrders.map((order) => [order.id, order])), [eggOrders]);
  const pigOrdersById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders]);
  const chickenOrdersById = useMemo(
    () => new Map(chickenOrders.map((order) => [order.id, order])),
    [chickenOrders]
  );

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
            {t.minSide.orders}
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
            <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)]">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-neutral-600">{t.minSide.orderViewLabel}</span>
                <button
                  type="button"
                  onClick={() => setOrderViewMode('chronological')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    orderViewMode === 'chronological'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {t.minSide.orderViewChronological}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderViewMode('next_step')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    orderViewMode === 'next_step'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {t.minSide.orderViewNextStep}
                </button>
                <button
                  type="button"
                  onClick={() => setOrderViewMode('type')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    orderViewMode === 'type'
                      ? 'bg-neutral-900 text-white'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                  }`}
                >
                  {t.minSide.orderViewByType}
                </button>
              </div>
            </div>

            {orders.length === 0 && eggOrders.length === 0 && chickenOrders.length === 0 ? (
              <div className="rounded-xl border border-neutral-200 bg-white p-12 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
                <Package className="w-12 h-12 mx-auto mb-4 text-neutral-400" />
                <p className="text-lg font-normal text-neutral-900 mb-2">{t.minSide.noOrders}</p>
                <p className="text-sm text-neutral-500 mb-6">{t.minSide.noOrdersDesc}</p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Link href="/bestill" className="btn-primary inline-flex">
                    {t.minSide.goToOrder}
                  </Link>
                  <Link href="/rugeegg/raser" className="btn-secondary inline-flex">
                    {t.eggs.common.backToBreeds}
                  </Link>
                  <a href="/kyllinger" className="btn-secondary inline-flex">
                    {chickenOrdersCopy.seeAvailable}
                  </a>
                </div>
              </div>
            ) : orderViewMode === 'type' ? (
              <div className="space-y-10">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-normal text-neutral-900">{t.minSide.sectionEggOrders}</h2>
                    <Link href="/rugeegg/raser" className="text-sm text-neutral-600 hover:text-neutral-900">
                      {t.eggs.common.backToBreeds}
                    </Link>
                  </div>
                  {eggOrdersLoading ? (
                    <div className="text-center py-8 text-neutral-500">{t.minSide.loadingEggOrders}</div>
                  ) : eggOrders.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
                      {t.minSide.noEggOrders}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {eggOrders.map((order) => (
                        <EggOrderUnifiedCard key={order.id} order={order} />
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-normal text-neutral-900">{t.minSide.sectionPigOrders}</h2>
                    <Link href="/bestill" className="text-sm text-neutral-600 hover:text-neutral-900">
                      {t.minSide.newOrder}
                    </Link>
                  </div>
                  {orders.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
                      {t.minSide.noPigOrders}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <PigOrderUnifiedCard
                          key={order.id}
                          order={order}
                          canEdit={canEdit}
                          onPayRemainder={handlePayRemainder}
                          onRefresh={loadAllOrders}
                        />
                      ))}
                    </div>
                  )}
                </section>

                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-normal text-neutral-900">{t.minSide.sectionChickenOrders}</h2>
                    <a href="/kyllinger" className="text-sm text-neutral-600 hover:text-neutral-900">
                      {chickenOrdersCopy.seeAvailable}
                    </a>
                  </div>
                  {chickenOrdersLoading ? (
                    <div className="text-center py-8 text-neutral-500">{t.minSide.loadingChickenOrders}</div>
                  ) : chickenOrders.length === 0 ? (
                    <div className="rounded-xl border border-neutral-200 bg-white p-8 text-sm text-neutral-500">
                      {t.minSide.noChickenOrders}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chickenOrders.map((order) => (
                        <ChickenOrderCard
                          key={order.id}
                          order={order}
                          onPayRemainder={handlePayChickenRemainder}
                        />
                      ))}
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <div className="space-y-4">
                {unifiedOrders.map((item) => (
                  <div key={`${item.type}-${item.id}`} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${orderTypeBadgeClass[item.type]}`}>
                        {orderTypeLabel[item.type]}
                      </span>
                    </div>
                    {item.type === 'egg' && (
                      eggOrdersById.get(item.id) ? (
                        <EggOrderUnifiedCard order={eggOrdersById.get(item.id)!} />
                      ) : null
                    )}
                    {item.type === 'pig' && (
                      pigOrdersById.get(item.id) ? (
                        <PigOrderUnifiedCard
                          order={pigOrdersById.get(item.id)!}
                          canEdit={canEdit}
                          onPayRemainder={handlePayRemainder}
                          onRefresh={loadAllOrders}
                        />
                      ) : null
                    )}
                    {item.type === 'chicken' && (
                      chickenOrdersById.get(item.id) ? (
                        <ChickenOrderCard
                          order={chickenOrdersById.get(item.id)!}
                          onPayRemainder={handlePayChickenRemainder}
                        />
                      ) : null
                    )}
                  </div>
                ))}
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
