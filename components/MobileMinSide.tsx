"use client";

import { motion } from 'framer-motion';
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

  const getPaymentStatus = (order: Order) => {
    const depositPaid = order.payments.some(p => p.payment_type === 'deposit' && p.status === 'completed');
    const remainderPaid = order.payments.some(p => p.payment_type === 'remainder' && p.status === 'completed');

    if (depositPaid && remainderPaid) return { label: 'Fullført', color: 'green' };
    if (depositPaid) return { label: 'Forskudd betalt', color: 'blue' };
    return { label: 'Venter på betaling', color: 'amber' };
  };

  const getRibbeLabel = (choice: string) => {
    const labels: Record<string, string> = {
      tynnribbe: 'Tynnribbe',
      familieribbe: 'Familieribbe',
      porchetta: 'Porchetta',
      butchers_choice: 'Slakterens valg',
    };
    return labels[choice] || choice;
  };

  const getDeliveryLabel = (type: string) => {
    const labels: Record<string, string> = {
      pickup_farm: 'Henting på gården',
      delivery_trondheim: 'Henting i Trondheim',
      pickup_e6: 'Levering langs E6',
    };
    return labels[type] || type;
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1
          className="text-4xl font-bold text-white mb-6"
          style={{ textShadow: '0 2px 20px rgba(0,0,0,0.9)' }}
        >
          Min side
        </h1>

        {/* Tab Navigation */}
        <div className="glass-mobile-strong rounded-3xl p-2 flex gap-2">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'orders'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'text-white/70'
            }`}
            style={activeTab === 'orders' ? { textShadow: '0 2px 8px rgba(0,0,0,0.9)' } : {}}
          >
            <Package className="w-5 h-5" />
            Bestillinger
          </button>
          <button
            onClick={() => setActiveTab('referrals')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'referrals'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'text-white/70'
            }`}
            style={activeTab === 'referrals' ? { textShadow: '0 2px 8px rgba(0,0,0,0.9)' } : {}}
          >
            <Gift className="w-5 h-5" />
            Vennerabatt
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${
              activeTab === 'messages'
                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                : 'text-white/70'
            }`}
            style={activeTab === 'messages' ? { textShadow: '0 2px 8px rgba(0,0,0,0.9)' } : {}}
          >
            <MessageSquare className="w-5 h-5" />
            Meldinger
          </button>
        </div>
      </motion.div>

      {/* Orders Tab */}
      {activeTab === 'orders' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Cutoff Info */}
          <div className="glass-mobile rounded-2xl p-5">
            <p
              className="text-sm font-semibold text-white text-center"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              {canEdit
                ? `Du kan endre bestillingen din frem til uke ${cutoffWeek}, ${cutoffYear}`
                : `Endringsperioden er utløpt (uke ${cutoffWeek}, ${cutoffYear})`}
            </p>
          </div>

          {/* Orders List */}
          {orders.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-mobile rounded-3xl p-8 text-center"
            >
              <Package className="w-16 h-16 mx-auto mb-4 text-white/50" />
              <h3
                className="text-xl font-bold text-white mb-2"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
              >
                Ingen bestillinger
              </h3>
              <p
                className="text-sm font-semibold text-white mb-6"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                Du har ikke lagt inn noen bestillinger ennå
              </p>
              <Link
                href="/bestill"
                className="inline-block bg-gradient-to-r from-green-500 to-green-600 text-white font-bold px-8 py-4 rounded-2xl shadow-xl"
              >
                Gå til bestilling
              </Link>
            </motion.div>
          ) : (
            <>
              {orders.map((order, index) => {
                const paymentStatus = getPaymentStatus(order);
                const depositPaid = order.payments.some(p => p.payment_type === 'deposit' && p.status === 'completed');
                const remainderPaid = order.payments.some(p => p.payment_type === 'remainder' && p.status === 'completed');

                return (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="glass-mobile rounded-3xl p-6 space-y-4"
                  >
                    {/* Order Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <p
                          className="text-xs font-bold text-white/70 mb-1"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          BESTILLING
                        </p>
                        <p
                          className="text-xl font-bold text-white"
                          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                        >
                          #{order.order_number}
                        </p>
                      </div>
                      <div
                        className={`px-4 py-2 rounded-full text-xs font-bold ${
                          paymentStatus.color === 'green'
                            ? 'bg-green-500 text-white'
                            : paymentStatus.color === 'blue'
                            ? 'bg-blue-500 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {paymentStatus.label}
                      </div>
                    </div>

                    {/* Order Details */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold text-white/80"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          Kasse
                        </span>
                        <span
                          className="text-sm font-bold text-white"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          {order.box_size} kg
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold text-white/80"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          Ribbe
                        </span>
                        <span
                          className="text-sm font-bold text-white"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          {getRibbeLabel(order.ribbe_choice)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold text-white/80"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          Levering
                        </span>
                        <span
                          className="text-sm font-bold text-white"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          {getDeliveryLabel(order.delivery_type)}
                        </span>
                      </div>

                      {order.fresh_delivery && (
                        <div className="flex items-center justify-between">
                          <span
                            className="text-sm font-semibold text-white/80"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            Fersk levering
                          </span>
                          <Check className="w-5 h-5 text-green-400" />
                        </div>
                      )}

                      {order.extra_products && order.extra_products.length > 0 && (
                        <div className="pt-3 border-t border-white/20">
                          <p
                            className="text-xs font-bold text-white/70 mb-2"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            EKSTRA PRODUKTER
                          </p>
                          {order.extra_products.map((extra: any, i: number) => (
                            <div key={i} className="flex items-center justify-between mb-1">
                              <span
                                className="text-sm font-semibold text-white"
                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                              >
                                {extra.name_no || extra.slug}
                              </span>
                              <span
                                className="text-sm font-bold text-white"
                                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                              >
                                {extra.quantity} {extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="pt-4 border-t border-white/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold text-white/80"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          Forskudd
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold text-white"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            kr {order.deposit_amount.toLocaleString('nb-NO')}
                          </span>
                          {depositPaid && <Check className="w-5 h-5 text-green-400" />}
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <span
                          className="text-sm font-semibold text-white/80"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          Restbeløp
                        </span>
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold text-white"
                            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                          >
                            kr {order.remainder_amount.toLocaleString('nb-NO')}
                          </span>
                          {remainderPaid ? (
                            <Check className="w-5 h-5 text-green-400" />
                          ) : (
                            <Clock className="w-5 h-5 text-amber-400" />
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-white/20">
                        <span
                          className="text-lg font-bold text-white"
                          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                        >
                          Totalt
                        </span>
                        <span
                          className="text-lg font-bold text-white"
                          style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                        >
                          kr {order.total_amount.toLocaleString('nb-NO')}
                        </span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="pt-4 space-y-2">
                      {depositPaid && !remainderPaid && (
                        <button
                          onClick={() => onPayRemainder(order.id)}
                          className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2"
                        >
                          Betal restbeløp
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}

                      {canEdit && (
                        <Link
                          href={`/min-side/ordre/${order.id}`}
                          className="block w-full bg-white/20 hover:bg-white/30 text-white font-bold py-3 rounded-xl text-center transition-all"
                        >
                          Se detaljer
                        </Link>
                      )}
                    </div>
                  </motion.div>
                );
              })}

              {/* New Order Button */}
              <Link
                href="/bestill"
                className="block glass-mobile-strong rounded-2xl p-5 text-center"
              >
                <Package className="w-8 h-8 mx-auto mb-2 text-white" />
                <p
                  className="font-bold text-white"
                  style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                >
                  Legg inn ny bestilling
                </p>
              </Link>
            </>
          )}
        </motion.div>
      )}

      {/* Referrals Tab */}
      {activeTab === 'referrals' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-mobile rounded-3xl p-6"
        >
          <h3
            className="text-xl font-bold text-white mb-4"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          >
            Vennerabatt
          </h3>
          <p
            className="text-sm font-semibold text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            Gi 20% rabatt til venner og få 10% kreditt selv!
          </p>
          {/* ReferralDashboard component will be rendered here in the parent */}
        </motion.div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass-mobile rounded-3xl p-6"
        >
          <MessagingPanel variant="dark" />
        </motion.div>
      )}
    </div>
  );
}
