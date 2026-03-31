'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Mail, RefreshCw } from 'lucide-react';

interface DeferredOrder {
  id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  deposit_amount: number;
  status: string;
  created_at: string;
  product_type: 'pork' | 'eggs' | 'chickens';
}

const productLabels: Record<string, Record<string, string>> = {
  no: { pork: 'Gris', eggs: 'Rugeegg', chickens: 'Kylling' },
  en: { pork: 'Pork', eggs: 'Eggs', chickens: 'Chicken' },
};

const productColors: Record<string, string> = {
  pork: 'bg-amber-100 text-amber-800',
  eggs: 'bg-blue-100 text-blue-800',
  chickens: 'bg-green-100 text-green-800',
};

export function DeferredPaymentsCard({ lang }: { lang: string }) {
  const [orders, setOrders] = useState<DeferredOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingMap, setSendingMap] = useState<Record<string, 'sending' | 'sent' | 'error'>>({});

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/deferred-payments');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Failed to load deferred payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const sendPaymentRequest = async (order: DeferredOrder) => {
    setSendingMap((prev) => ({ ...prev, [order.id]: 'sending' }));
    try {
      const res = await fetch('/api/admin/deferred-payments/request-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          productType: order.product_type,
          customerName: order.customer_name,
          customerEmail: order.customer_email,
          orderNumber: order.order_number,
        }),
      });
      if (!res.ok) throw new Error('Failed to send');
      setSendingMap((prev) => ({ ...prev, [order.id]: 'sent' }));
    } catch {
      setSendingMap((prev) => ({ ...prev, [order.id]: 'error' }));
    }
  };

  if (loading) {
    return null;
  }

  if (orders.length === 0) {
    return null;
  }

  const labels = productLabels[lang] || productLabels.no;

  return (
    <div className="bg-white border border-red-200 rounded-xl p-6 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.06)]">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-red-100">
            <AlertTriangle className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <h3 className="text-lg font-light text-neutral-900">
              {lang === 'no' ? 'Utsatte betalinger' : 'Deferred payments'}
            </h3>
            <p className="text-sm text-red-600">
              {lang === 'no'
                ? `${orders.length} bestilling${orders.length !== 1 ? 'er' : ''} uten depositum`
                : `${orders.length} order${orders.length !== 1 ? 's' : ''} without deposit`}
            </p>
          </div>
        </div>
        <button
          onClick={loadOrders}
          className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
        >
          <RefreshCw className="w-4 h-4 text-neutral-500" />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100">
              <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4">
                {lang === 'no' ? 'Ordre' : 'Order'}
              </th>
              <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4">
                {lang === 'no' ? 'Kunde' : 'Customer'}
              </th>
              <th className="text-left text-xs font-medium text-neutral-500 pb-2 pr-4">
                {lang === 'no' ? 'Produkt' : 'Product'}
              </th>
              <th className="text-right text-xs font-medium text-neutral-500 pb-2 pr-4">
                {lang === 'no' ? 'Depositum' : 'Deposit'}
              </th>
              <th className="text-right text-xs font-medium text-neutral-500 pb-2">
                {lang === 'no' ? 'Handling' : 'Action'}
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const status = sendingMap[order.id];
              return (
                <tr key={order.id} className="border-b border-neutral-50 last:border-0">
                  <td className="py-3 pr-4 font-medium text-neutral-900">
                    {order.order_number}
                  </td>
                  <td className="py-3 pr-4">
                    <div className="text-neutral-800">{order.customer_name}</div>
                    <div className="text-xs text-neutral-500">{order.customer_email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${productColors[order.product_type] || 'bg-neutral-100 text-neutral-800'}`}>
                      {labels[order.product_type] || order.product_type}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right tabular-nums text-neutral-700">
                    {order.deposit_amount ? `kr ${order.deposit_amount.toLocaleString('nb-NO')}` : '–'}
                  </td>
                  <td className="py-3 text-right">
                    {status === 'sent' ? (
                      <span className="text-green-600 text-xs font-medium">
                        {lang === 'no' ? 'Sendt ✓' : 'Sent ✓'}
                      </span>
                    ) : status === 'error' ? (
                      <button
                        onClick={() => sendPaymentRequest(order)}
                        className="text-red-600 text-xs font-medium hover:underline"
                      >
                        {lang === 'no' ? 'Feilet – prøv igjen' : 'Failed – retry'}
                      </button>
                    ) : (
                      <button
                        onClick={() => sendPaymentRequest(order)}
                        disabled={status === 'sending'}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900 text-white text-xs rounded-lg hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        {status === 'sending'
                          ? (lang === 'no' ? 'Sender...' : 'Sending...')
                          : (lang === 'no' ? 'Send betalingsforespørsel' : 'Send payment request')}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
