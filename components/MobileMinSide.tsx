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

  const getPaymentStatus = (order: Order) => {
    const depositPaid = order.payments.some(p => p.payment_type === 'deposit' && p.status === 'completed');
    const remainderPaid = order.payments.some(p => p.payment_type === 'remainder' && p.status === 'completed');

    if (depositPaid && remainderPaid) return { label: t.minSide.completed, color: 'bg-[#1F1A14] text-white' };
    if (depositPaid) return { label: t.minSide.depositPaid, color: 'bg-[#C05621] text-white' };
    return { label: t.minSide.waitingForPayment, color: 'bg-[#E6D8C8] text-[#1F1A14]' };
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
    <div className="space-y-6 pb-24">
      <header className="rounded-2xl border border-[#E6D8C8] bg-[#FFF9F2] p-6 shadow-[0_12px_30px_rgba(50,36,24,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6C5A4A]">{t.minSide.title}</p>
        <h1 className="mt-2 text-3xl font-bold text-[#1F1A14]">{t.minSide.title}</h1>
        <p className="mt-2 text-sm text-[#6C5A4A]">{t.minSide.myOrders}</p>
      </header>

      <div className="flex gap-2 overflow-x-auto">
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
              className={`flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] ${
                isActive
                  ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]'
                  : 'border-[#E6D8C8] bg-white text-[#6C5A4A]'
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
          <div className="rounded-xl border border-[#E6D8C8] bg-white px-4 py-3 text-xs text-[#6C5A4A]">
            {canEdit
              ? t.minSide.canEditUntil.replace('{week}', String(cutoffWeek)).replace('{year}', String(cutoffYear))
              : t.minSide.editPeriodExpired.replace('{week}', String(cutoffWeek)).replace('{year}', String(cutoffYear))}
          </div>

          {orders.length === 0 ? (
            <div className="rounded-2xl border border-[#E6D8C8] bg-white p-6 text-center">
              <Package className="mx-auto h-10 w-10 text-[#C05621]" />
              <h3 className="mt-4 text-lg font-semibold text-[#1F1A14]">{t.minSide.noOrders}</h3>
              <p className="mt-2 text-sm text-[#6C5A4A]">{t.minSide.noOrdersDesc}</p>
              <Link
                href="/bestill"
                className="mt-4 inline-flex items-center justify-center rounded-xl bg-[#1F1A14] px-5 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
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
                <div key={order.id} className="rounded-2xl border border-[#E6D8C8] bg-white p-5 shadow-[0_12px_30px_rgba(50,36,24,0.08)]">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-[#6C5A4A]">{t.minSide.order}</p>
                      <p className="mt-2 text-lg font-bold text-[#1F1A14]">#{order.order_number}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${paymentStatus.color}`}>
                      {paymentStatus.label}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-[#6C5A4A]">
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.box}</span>
                      <span className="font-semibold text-[#1F1A14]">{order.box_size} kg</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.ribbe}</span>
                      <span className="font-semibold text-[#1F1A14]">{getRibbeLabel(order.ribbe_choice)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t.minSide.delivery}</span>
                      <span className="font-semibold text-[#1F1A14]">{getDeliveryLabel(order.delivery_type)}</span>
                    </div>
                  </div>

                  <div className="mt-4 border-t border-[#E6D8C8] pt-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-[#6C5A4A]">{t.minSide.deposit}</span>
                      <span className="flex items-center gap-2 font-semibold text-[#1F1A14]">
                        {order.deposit_amount.toLocaleString('nb-NO')} {t.common.currency}
                        {depositPaid && <Check className="h-4 w-4 text-[#2F5D3A]" />}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[#6C5A4A]">{t.minSide.remainder}</span>
                      <span className="flex items-center gap-2 font-semibold text-[#1F1A14]">
                        {order.remainder_amount.toLocaleString('nb-NO')} {t.common.currency}
                        {remainderPaid ? <Check className="h-4 w-4 text-[#2F5D3A]" /> : <Clock className="h-4 w-4 text-[#C05621]" />}
                      </span>
                    </div>
                    <div className="mt-3 flex items-center justify-between text-base font-semibold">
                      <span>{t.common.total}</span>
                      <span>{order.total_amount.toLocaleString('nb-NO')} {t.common.currency}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {depositPaid && !remainderPaid && (
                      <button
                        onClick={() => onPayRemainder(order.id)}
                        className="w-full rounded-xl bg-[#1F1A14] px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
                      >
                        {t.minSide.payRemainder}
                        <ChevronRight className="ml-2 inline h-4 w-4" />
                      </button>
                    )}

                    {canEdit && (
                      <Link
                        href={`/min-side/ordre/${order.id}`}
                        className="block w-full rounded-xl border border-[#E6D8C8] px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.2em] text-[#6C5A4A]"
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
        <div className="rounded-2xl border border-[#E6D8C8] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1F1A14]">{t.referrals.getCredit}</h3>
          <p className="mt-2 text-sm text-[#6C5A4A]">{t.referrals.friendsGet20}</p>
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="rounded-2xl border border-[#E6D8C8] bg-white p-4">
          <MessagingPanel variant="light" />
        </div>
      )}
    </div>
  );
}
