'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Package, User, Mail, Phone, MapPin, CreditCard, FileText, AlertCircle, CheckCircle2, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface Payment {
  id: string;
  payment_type: string;
  status: string;
  amount_nok: number;
  paid_at: string | null;
  created_at: string;
}

interface Order {
  id: string;
  order_number: string;
  product_type?: 'pig_box' | 'eggs';
  customer_name: string;
  customer_email: string;
  customer_phone: string | null;
  shipping_address?: string | null;
  shipping_postal_code?: string | null;
  shipping_city?: string | null;
  shipping_country?: string | null;
  box_size?: number;
  fresh_delivery?: boolean;
  ribbe_choice?: string;
  extra_products?: any[];
  breed_id?: string;
  breed_name?: string;
  quantity?: number;
  week_number?: number;
  year?: number;
  delivery_monday?: string;
  price_per_egg?: number;
  status: string;
  delivery_type: string;
  notes: string;
  admin_notes: string;
  total_amount: number;
  deposit_amount: number;
  remainder_amount: number;
  created_at: string;
  locked_at: string | null;
  marked_delivered_at: string | null;
  payments: Payment[];
}

interface OrderDetailModalProps {
  order: Order | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: string) => void;
  onSaveNotes: (orderId: string, notes: string) => void;
}

export function OrderDetailModal({
  order,
  isOpen,
  onClose,
  onStatusChange,
  onSaveNotes,
}: OrderDetailModalProps) {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const copy = t.orderDetailModal;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [editingNotes, setEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  if (!isOpen || !order) return null;

  const depositPayment = order.payments?.find((p) => p.payment_type === 'deposit');
  const remainderPayment = order.payments?.find((p) => p.payment_type === 'remainder');

  const depositMismatch = depositPayment && depositPayment.amount_nok !== order.deposit_amount;
  const remainderMismatch = remainderPayment && remainderPayment.amount_nok !== order.remainder_amount;
  const actualDepositAmount = depositPayment?.amount_nok || order.deposit_amount;
  const actualRemainderAmount = remainderPayment?.amount_nok || order.remainder_amount;

  const formatMoney = (amount: number | undefined | null) => `${currency} ${Number(amount || 0).toLocaleString(locale)}`;

  const statusOptions = [
    { value: 'draft', label: copy.statusOptions.draft },
    { value: 'deposit_paid', label: copy.statusOptions.depositPaid },
    { value: 'paid', label: copy.statusOptions.paid },
    { value: 'ready_for_pickup', label: copy.statusOptions.readyForPickup },
    { value: 'completed', label: copy.statusOptions.completed },
    { value: 'cancelled', label: copy.statusOptions.cancelled },
  ];

  const deliveryTypeLabels: Record<string, string> = {
    pickup_farm: copy.deliveryTypes.pickupFarm,
    pickup_e6: copy.deliveryTypes.pickupE6,
    delivery_trondheim: copy.deliveryTypes.deliveryTrondheim,
    posten: copy.deliveryTypes.posten,
    farm_pickup: copy.deliveryTypes.farmPickup,
    e6_pickup: copy.deliveryTypes.e6Pickup,
  };

  const ribbeChoiceLabels: Record<string, string> = {
    tynnribbe: copy.ribbeChoices.tynnribbe,
    familieribbe: copy.ribbeChoices.familieribbe,
    porchetta: copy.ribbeChoices.porchetta,
    butchers_choice: copy.ribbeChoices.butchersChoice,
  };

  function handleStatusChange(newStatus: string) {
    if (!order) return;
    const statusLabel = statusOptions.find((s) => s.value === newStatus)?.label || newStatus;
    if (window.confirm(copy.confirmChangeStatus.replace('{status}', statusLabel))) {
      onStatusChange(order.id, newStatus);
      setSelectedStatus('');
    }
  }

  function handleSaveNotes() {
    if (!order) return;
    onSaveNotes(order.id, adminNotes);
    setEditingNotes(false);
  }

  async function handleSyncAmounts() {
    if (!order) return;
    if (!window.confirm(copy.confirmSyncAmounts)) {
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch('/api/admin/orders/sync-amounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      const result = await response.json();

      if (response.ok && result.synced) {
        toast({
          title: copy.syncSuccessTitle,
          description: copy.syncSuccessDescription,
        });
        window.location.reload();
      } else {
        toast({
          title: copy.infoTitle,
          description: result.message || copy.noSyncChangesNeeded,
        });
      }
    } catch (error) {
      console.error('Error syncing amounts:', error);
      toast({
        title: copy.errorTitle,
        description: copy.syncErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSyncing(false);
    }
  }

  function startEditingNotes() {
    if (!order) return;
    setAdminNotes(order.admin_notes || '');
    setEditingNotes(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl bg-white">
        <div className="sticky top-0 z-10 px-8 py-6 border-b bg-white">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="pr-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {copy.orderTitle} {order.order_number}
            </h2>
            <div className="flex items-center gap-4">
              <span className={cn(
                'px-3 py-1 rounded-full text-sm font-medium',
                order.status === 'completed' ? 'bg-green-100 text-green-800' :
                order.status === 'ready_for_pickup' ? 'bg-blue-100 text-blue-800' :
                order.status === 'paid' ? 'bg-green-100 text-green-800' :
                order.status === 'deposit_paid' ? 'bg-amber-100 text-amber-800' :
                'bg-gray-100 text-gray-800'
              )}>
                {statusOptions.find((s) => s.value === order.status)?.label || order.status}
              </span>
              <span className="text-sm text-gray-600">
                {copy.createdAtLabel} {new Date(order.created_at).toLocaleDateString(locale)}
              </span>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                {copy.customerInfoTitle}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{copy.nameLabel}</p>
                  <p className="font-medium text-gray-900">{order.customer_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${order.customer_email}`} className="text-blue-600 hover:underline">
                    {order.customer_email}
                  </a>
                </div>
                {order.customer_phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <a href={`tel:${order.customer_phone}`} className="text-blue-600 hover:underline">
                      {order.customer_phone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                {copy.paymentInfoTitle}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{copy.depositLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatMoney(actualDepositAmount)}</span>
                    {depositMismatch && (
                      <span className="text-xs text-amber-600" title={copy.orderAmountTitle.replace('{amount}', formatMoney(order.deposit_amount))}>
                        {copy.adjustedTag}
                      </span>
                    )}
                    {depositPayment?.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">{copy.remainderLabel}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatMoney(actualRemainderAmount)}</span>
                    {remainderMismatch && (
                      <span className="text-xs text-amber-600" title={copy.orderAmountTitle.replace('{amount}', formatMoney(order.remainder_amount))}>
                        {copy.adjustedTag}
                      </span>
                    )}
                    {remainderPayment?.status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
                <div className="pt-3 border-t flex justify-between items-center">
                  <span className="font-bold text-gray-900">{copy.totalLabel}</span>
                  <span className="font-bold text-xl text-gray-900">{formatMoney(order.total_amount)}</span>
                </div>
                {depositPayment && (
                  <div className="text-xs text-gray-600">
                    {copy.depositPaidAtLabel}{' '}
                    {depositPayment.paid_at ? new Date(depositPayment.paid_at).toLocaleString(locale) : copy.pending}
                  </div>
                )}
                {remainderPayment && remainderPayment.status === 'completed' && (
                  <div className="text-xs text-gray-600">
                    {copy.remainderPaidAtLabel}{' '}
                    {remainderPayment.paid_at ? new Date(remainderPayment.paid_at).toLocaleString(locale) : copy.pending}
                  </div>
                )}
                {(depositMismatch || remainderMismatch) && (
                  <div className="pt-3 border-t">
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 mb-2">
                      <p className="text-xs text-amber-900 mb-1">
                        <strong>{copy.mismatchNoteTitle}</strong> {copy.mismatchNoteBody}
                      </p>
                      <p className="text-xs text-amber-700">
                        {copy.orderAmountsLabel}{' '}
                        {copy.depositLabel} {formatMoney(order.deposit_amount)}, {copy.remainderLabel} {formatMoney(order.remainder_amount)}
                      </p>
                      <p className="text-xs text-amber-700">
                        {copy.actualAmountsLabel}{' '}
                        {copy.depositLabel} {formatMoney(actualDepositAmount)}, {copy.remainderLabel} {formatMoney(actualRemainderAmount)}
                      </p>
                    </div>
                    <Button onClick={handleSyncAmounts} disabled={syncing} size="sm" variant="outline" className="w-full">
                      {syncing ? copy.syncingButton : copy.syncButton}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                {copy.orderContentsTitle}
              </h3>
              <div className="space-y-3">
                {(!order.product_type || order.product_type === 'pig_box') && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">{copy.boxLabel}</p>
                      <p className="font-medium text-gray-900">
                        {copy.pigBoxValue.replace('{size}', String(order.box_size || 0))}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{copy.ribbeLabel}</p>
                      <p className="font-medium text-gray-900">
                        {ribbeChoiceLabels[order.ribbe_choice || ''] || order.ribbe_choice}
                      </p>
                    </div>
                    {order.fresh_delivery && (
                      <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm inline-block">
                        {copy.freshDeliveryTag}
                      </div>
                    )}
                    {order.extra_products && order.extra_products.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-gray-600 mb-2">{copy.extraProductsLabel}</p>
                        <div className="space-y-1">
                          {order.extra_products.map((extra: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{extra.quantity}x {extra.name}</span>
                              <span className="text-gray-600">{formatMoney(extra.total_price)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {order.product_type === 'eggs' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900">{copy.eggsTitle}</h4>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{copy.breedLabel}</p>
                      <p className="font-medium text-gray-900">{order.breed_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">{copy.eggCountLabel}</p>
                      <p className="font-medium text-gray-900">{order.quantity} {t.common.stk}</p>
                    </div>
                    {order.price_per_egg && (
                      <div>
                        <p className="text-sm text-gray-600">{copy.pricePerEggLabel}</p>
                        <p className="font-medium text-gray-900">
                          {((order.price_per_egg || 0) / 100).toFixed(2)} {currency}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">{copy.deliveryWeekLabel}</p>
                      <p className="font-medium text-gray-900">
                        {copy.weekValue.replace('{week}', String(order.week_number || '')).replace('{year}', String(order.year || ''))}
                      </p>
                    </div>
                    {order.delivery_monday && (
                      <div>
                        <p className="text-sm text-gray-600">{copy.deliveryDateMondayLabel}</p>
                        <p className="font-medium text-gray-900">
                          {new Date(order.delivery_monday).toLocaleDateString(locale, {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                {copy.deliveryInfoTitle}
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">{copy.typeLabel}</p>
                  <p className="font-medium text-gray-900">{deliveryTypeLabels[order.delivery_type]}</p>
                </div>
                {(order.shipping_address || order.shipping_postal_code || order.shipping_city) && (
                  <div>
                    <p className="text-sm text-gray-600">{copy.addressLabel}</p>
                    <p className="font-medium text-gray-900">
                      {order.shipping_address || ''}
                      {(order.shipping_postal_code || order.shipping_city) && (
                        <span>
                          {order.shipping_address ? ', ' : ''}
                          {[order.shipping_postal_code, order.shipping_city].filter(Boolean).join(' ')}
                        </span>
                      )}
                    </p>
                    {order.shipping_country && (
                      <p className="text-sm text-gray-600">{order.shipping_country}</p>
                    )}
                  </div>
                )}
                {order.locked_at && (
                  <div className="px-3 py-2 rounded-xl bg-gray-50 text-gray-700 text-sm">
                    {copy.lockedTag} {new Date(order.locked_at).toLocaleDateString(locale)}
                  </div>
                )}
                {order.marked_delivered_at && (
                  <div className="px-3 py-2 rounded-xl bg-green-50 text-green-700 text-sm">
                    {copy.deliveredTag} {new Date(order.marked_delivered_at).toLocaleDateString(locale)}
                  </div>
                )}
              </div>
            </div>

            {order.notes && (
              <div className="p-6 rounded-xl border border-gray-200 lg:col-span-2">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  {copy.customerNotesTitle}
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            <div className="p-6 rounded-xl border border-gray-200 lg:col-span-2 bg-amber-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  {copy.adminNotesTitle}
                </h3>
                {!editingNotes && (
                  <button
                    onClick={startEditingNotes}
                    className="flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    {t.common.edit}
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder={copy.adminNotesPlaceholder}
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNotes} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      {t.common.save}
                    </Button>
                    <Button onClick={() => setEditingNotes(false)} variant="outline" size="sm">
                      {t.common.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {order.admin_notes || copy.noAdminNotes}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 px-8 py-6 border-t bg-white">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">{copy.changeStatusLabel}</Label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">{copy.selectNewStatus}</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={onClose} variant="outline" className="px-8">
              {t.common.close}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
