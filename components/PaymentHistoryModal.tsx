'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useLanguage } from '@/contexts/LanguageContext';
import { X, CreditCard, CheckCircle2, Clock, XCircle, Download, ShoppingBag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface Payment {
  id: string;
  payment_type: string;
  status: string;
  amount_nok: number;
  paid_at: string | null;
  created_at?: string;
  vipps_session_id?: string;
}

interface ExtraProduct {
  slug: string;
  name: string;
  quantity: number;
  total_price: number;
}

interface PaymentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  payments: Payment[];
  orderNumber: string;
  extraProducts?: ExtraProduct[];
}

export function PaymentHistoryModal({ isOpen, onClose, payments, orderNumber, extraProducts }: PaymentHistoryModalProps) {
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const copy = t.paymentHistoryModal;

  if (!isOpen) return null;

  const getPaymentTypeLabel = (type: string) => {
    if (type === 'deposit') return copy.paymentTypeDeposit;
    if (type === 'remainder') return copy.paymentTypeRemainder;
    return type;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusLabel = (status: string) => {
    if (status === 'completed') return copy.statusCompleted;
    if (status === 'pending') return copy.statusPending;
    if (status === 'failed') return copy.statusFailed;
    return status;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const totalPaid = payments
    .filter((payment) => payment.status === 'completed')
    .reduce((sum, payment) => sum + payment.amount_nok, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{copy.title}</h2>
            <p className="text-gray-600">
              {copy.orderPrefix} {orderNumber}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-green-50 to-green-100 border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">{copy.totalPaid}</p>
              <p className="text-3xl font-bold text-green-900">{t.common.currency} {totalPaid.toLocaleString(locale)}</p>
            </div>
            <CreditCard className="w-12 h-12 text-green-600" />
          </div>
        </div>

        {extraProducts && extraProducts.length > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-amber-700" />
              <p className="font-semibold text-amber-900">{copy.extrasTitle}</p>
            </div>
            <div className="space-y-2">
              {extraProducts.map((extra, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span className="text-amber-800">
                    {extra.quantity}x {extra.name}
                  </span>
                  <span className="font-medium text-amber-900">
                    {t.common.currency} {extra.total_price?.toLocaleString(locale)}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-amber-200 flex justify-between">
                <span className="font-semibold text-amber-900">{copy.extrasTotal}</span>
                <span className="font-bold text-amber-900">
                  {t.common.currency} {extraProducts.reduce((sum, extra) => sum + (extra.total_price || 0), 0).toLocaleString(locale)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {payments.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{copy.noPayments}</p>
            </div>
          ) : (
            payments.map((payment) => (
              <div
                key={payment.id}
                className="p-4 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(payment.status)}
                    <div>
                      <p className="font-semibold text-lg">{getPaymentTypeLabel(payment.payment_type)}</p>
                      <p className="text-sm text-gray-600">
                        {payment.paid_at
                          ? new Date(payment.paid_at).toLocaleDateString(locale, {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : copy.notPaid}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{t.common.currency} {payment.amount_nok.toLocaleString(locale)}</p>
                    <span
                      className={cn(
                        'inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1',
                        getStatusColor(payment.status)
                      )}
                    >
                      {getStatusLabel(payment.status)}
                    </span>
                  </div>
                </div>

                {payment.vipps_session_id && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500">
                      {copy.transactionId}: {payment.vipps_session_id.substring(0, 20)}...
                    </p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 pt-6 border-t flex gap-3">
          <Button onClick={onClose} variant="outline" className="flex-1">
            {copy.close}
          </Button>
          {totalPaid > 0 && (
            <Button
              onClick={() => {
                toast({
                  title: copy.receipt,
                  description: copy.receiptDesc,
                });
              }}
              className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
            >
              <Download className="w-4 h-4 mr-2" />
              {copy.downloadReceipt}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
