"use client";

import { useLanguage } from '@/contexts/LanguageContext';
import { Package, Gift, MessageSquare, ChevronRight, Check, Clock } from 'lucide-react';
import Link from 'next/link';
import { MessagingPanel } from '@/components/MessagingPanel';

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
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  customer_name: string;
  payments: Payment[];
  created_at: string;
}

interface MobileMinSideProps {
  orders: Order[];
  activeTab: 'orders' | 'referrals' | 'messages';
  setActiveTab: (tab: 'orders' | 'referrals' | 'messages') => void;
  canEdit: boolean;
  cutoffWeek: number;
  cutoffYear: number;
  onPayRemainder: (orderId: string) => void;
}

export function MobileMinSide(props: MobileMinSideProps) {
  const { orders, activeTab, setActiveTab, canEdit, cutoffWeek, cutoffYear, onPayRemainder } = props;
  const { t } = useLanguage();
  const remainderDueDate = new Date('2026-11-16');
  const formattedDueDate = remainderDueDate.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getPaymentStatus = (order: Order) => {
    const depositPaid = order.payments.some(p => p.payment_type === 'deposit' && p.status === 'completed');
    const remainderPaid = order.payments.some(p => p.payment_type === 'remainder' && p.status === 'completed');

    if (depositPaid && remainderPaid) return { label: t.minSide.completed, color: 'bg-[#0F6C6F] text-white' };
    if (depositPaid) return { label: t.minSide.depositPaid, color: 'bg-[#B35A2A] text-white' };
    return { label: t.minSide.waitingForPayment, color: 'bg-[#E9E1D6] text-[#1E1B16]' };
  };

  const getRibbeLabel = (choice: string) => {
    const labels: Record<string, string> = {
      tynnribbe: t.checkout.tynnribbe,
      familieribbe: t.checkout.familieribbe,
      porchetta: t.checkout.porchetta,
      butchers_choice: t.checkout.butchersChoice,
    };
    return labels[choice] || choice;
  };

  const getDeliveryLabel = (type: string) => {
    const labels: Record<string, string> = {
      pickup_farm: t.checkout.pickupFarm,
      delivery_trondheim: t.checkout.pickupTrondheim,
      pickup_e6: t.checkout.deliveryE6,
    };
    return labels[type] || type;
  };

  return (
    <div className="space-y-6 pb-24 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <header className="rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{t.minSide.title}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
          {t.minSide.title}
        </h1>
        <p className="mt-2 text-sm text-[#5E5A50]">{t.minSide.myOrders}</p>
      </header>

      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'orders', label: t.minSide.orders, icon: Package },
          { id: 'referrals', label: t.minSide.referrals, icon: Gift },
          { id: 'messages', label: 'Meldinger', icon: MessageSquare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] ${
                isActive
                  ? 'border-[#1E1B16] bg-[#1E1B16] text-[#F6F4EF]'
                  : 'border-[#E4DED5] bg-white text-[#6A6258]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] px-4 py-3 text-xs text-[#5E5A50]">
            {canEdit
              ? t.minSide.canEditUntil.replace('{week}', String(cutoffWeek)).replace('{year}', String(cutoffYear))
              : t.minSide.editPeriodExpired.replace('{week}', String(cutoffWeek)).replace('{year}', String(cutoffYear))}
          </div>

          {orders.length === 0 ? (
            <div className="rounded-[28px] border border-[#E4DED5] bg-white p-6 text-center">
              <Package className="mx-auto h-10 w-10 text-[#0F6C6F]" />
              <h3 className="mt-4 text-lg font-semibold text-[#1E1B16]">{t.minSide.noOrders}</h3>
              <p className="mt-2 text-sm text-[#5E5A50]">{t.minSide.noOrdersDesc}</p>
              <Link
                href="/bestill"
                className="mt-4 inline-flex items-center justify-center rounded-2xl bg-[#1E1B16] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
              >
                {t.minSide.goToOrder}
              </Link>
            </div>
          ) : (
            orders.map((order) => {
              const paymentStatus = getPaymentStatus(order);
              const depositPaid = order.payments.some(p => p.payment_type === 'deposit' && p.status === 'completed');
              const remainderPaid = order.payments.some(p => p.payment_type === 'remainder' && p.status === 'completed');

              return (
                <div key={order.id} className="rounded-[28px] border border-[#E4DED5] bg-white p-5 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{t.minSide.order}</p>
                      <p className="mt-2 text-lg font-semibold text-[#1E1B16]">#{order.order_number}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[#5E5A50]">
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.box}</span>
                      <span className="font-semibold text-[#1E1B16]">{order.box_size} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.ribbe}</span>
                      <span className="font-semibold text-[#1E1B16]">{getRibbeLabel(order.ribbe_choice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.delivery}</span>
                      <span className="font-semibold text-[#1E1B16]">{getDeliveryLabel(order.delivery_type)}</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#E4DED5] pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#5E5A50]">{t.minSide.deposit}</span>
                      <span className="flex items-center gap-2 font-semibold text-[#1E1B16]">
                        {order.deposit_amount.toLocaleString('nb-NO')} {t.common.currency}
                        {depositPaid && <Check className="h-4 w-4 text-[#0F6C6F]" />}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[#5E5A50]">{t.minSide.remainder}</span>
                      <span className="flex items-center gap-2 font-semibold text-[#1E1B16]">
                        {order.remainder_amount.toLocaleString('nb-NO')} {t.common.currency}
                        {remainderPaid ? <Check className="h-4 w-4 text-[#0F6C6F]" /> : <Clock className="h-4 w-4 text-[#B35A2A]" />}
                      </span>
                    </div>
                    {depositPaid && !remainderPaid && (
                      <div className="mt-2 text-xs text-[#6A6258]">
                        Forfallsdato: {formattedDueDate}
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-base font-semibold">
                      <span>{t.common.total}</span>
                      <span>{order.total_amount.toLocaleString('nb-NO')} {t.common.currency}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {depositPaid && !remainderPaid && (
                      <button
                        onClick={() => onPayRemainder(order.id)}
                        className="w-full rounded-2xl bg-[#1E1B16] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F6F4EF]"
                      >
                        {t.minSide.payRemainder}
                        <ChevronRight className="ml-2 inline h-4 w-4" />
                      </button>
                    )}

                    {canEdit && (
                      <Link
                        href={`/min-side/ordre/${order.id}`}
                        className="block w-full rounded-2xl border border-[#E4DED5] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6A6258]"
                      >
                        {t.minSide.seeDetails}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'referrals' && (
        <div className="rounded-[28px] border border-[#E4DED5] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1E1B16]">{t.referrals.getCredit}</h3>
          <p className="mt-2 text-sm text-[#5E5A50]">{t.referrals.friendsGet20}</p>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-[28px] border border-[#E4DED5] bg-white p-4">
          <MessagingPanel variant="light" />
        </div>
      )}
    </div>
  );
}
