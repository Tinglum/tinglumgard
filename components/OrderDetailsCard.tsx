'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Calendar,
  MapPin,
  CreditCard,
  Phone,
  Mail,
  Download,
  ShoppingCart,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  Edit3,
  MessageSquare,
  Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderStatusTimeline } from '@/components/OrderStatusTimeline';
import { ExtrasUpsellModal } from '@/components/ExtrasUpsellModal';
import { OrderModificationModal } from '@/components/OrderModificationModal';
import { PaymentHistoryModal } from '@/components/PaymentHistoryModal';
import { ContactAdminModal } from '@/components/ContactAdminModal';
import { OrderTimelineModal } from '@/components/OrderTimelineModal';

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

interface OrderDetailsCardProps {
  order: Order;
  canEdit: boolean;
  onPayRemainder: (orderId: string) => void;
  onRefresh: () => void;
}

export function OrderDetailsCard({ order, canEdit, onPayRemainder, onRefresh }: OrderDetailsCardProps) {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const { toast } = useToast();
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const copy = t.orderDetailsCard;
  const currency = t.common.currency;

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [addingExtras, setAddingExtras] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [extrasError, setExtrasError] = useState<string | null>(null);
  const [contactInfo, setContactInfo] = useState<{
    email: string;
    phone: string;
  }>({
    email: copy.contactEmail,
    phone: copy.contactPhone,
  });

  const depositPayment = order.payments?.find((p) => p.payment_type === 'deposit');
  const depositPaid = depositPayment?.status === 'completed';
  const remainderPayment = order.payments?.find((p) => p.payment_type === 'remainder');
  const remainderPaid = remainderPayment?.status === 'completed';
  const needsRemainderPayment = depositPaid && !remainderPaid && !order.locked_at;
  const extrasTotal = order.extra_products?.reduce(
    (sum: number, e: any) => sum + (e.total_price || 0),
    0
  ) || 0;
  const baseRemainder = Math.max(0, order.remainder_amount - extrasTotal);
  const remainderDueDate = new Date('2026-11-16');
  const formattedDueDate = remainderDueDate.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const boxName = lang === 'no' ? order.display_box_name_no : order.display_box_name_en;
  const fallbackBoxName = lang === 'en' ? 'Mangalitsa box' : 'Mangalitsa-boks';
  const boxLabel = boxName || fallbackBoxName;
  const currentExtrasForModal = useMemo(
    () => order.extra_products?.map((e: any) => ({ slug: e.slug, quantity: Number(e.quantity) })) || [],
    [order.extra_products]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadPublicConfig() {
      try {
        const response = await fetch('/api/config', { cache: 'no-store' });
        const data = await response.json().catch(() => null);
        if (!response.ok || !data?.contact || !isMounted) {
          return;
        }

        setContactInfo({
          email: data.contact.email || copy.contactEmail,
          phone: data.contact.phone || copy.contactPhone,
        });
      } catch {
        // Keep fallback contact info from translations.
      }
    }

    loadPublicConfig();

    return () => {
      isMounted = false;
    };
  }, [copy.contactEmail, copy.contactPhone]);

  // Determine next action
  function getNextAction() {
    if (order.status === 'completed') {
      return { type: 'completed', message: copy.nextActionCompleted, color: 'green' };
    }
    if (order.status === 'ready_for_pickup') {
      return { type: 'ready', message: copy.nextActionReady, color: 'green' };
    }
    if (needsRemainderPayment) {
      return {
        type: 'payment',
        message: copy.nextActionPaymentDue
          .replace('{currency}', currency)
          .replace('{amount}', order.remainder_amount.toLocaleString(locale)),
        color: 'amber',
      };
    }
    if (depositPaid && !remainderPaid && order.locked_at) {
      return {
        type: 'locked',
        message: copy.nextActionLocked,
        color: 'amber',
      };
    }
    if (!depositPaid) {
      return {
        type: 'deposit',
        message: copy.nextActionWaitingDeposit,
        color: 'amber',
      };
    }
    return {
      type: 'processing',
      message: copy.nextActionProcessing,
      color: 'blue',
    };
  }

  const nextAction = getNextAction();

  const deliveryTypeLabels: Record<string, string> = {
    pickup_farm: copy.deliveryTypePickupFarm,
    pickup_e6: copy.deliveryTypePickupE6,
    delivery_trondheim: copy.deliveryTypePickupTrondheim,
  };

  const ribbeChoiceLabels: Record<string, string> = {
    tynnribbe: copy.ribChoiceTynnribbe,
    familieribbe: copy.ribChoiceFamilieribbe,
    porchetta: copy.ribChoicePorchetta,
    butchers_choice: copy.ribChoiceButchersChoice,
  };

  async function handleAddExtras(selectedExtras: { slug: string; quantity: number }[], proceedToPayment = false) {
    setAddingExtras(true);
    setExtrasError(null);
    try {
      const response = await fetch(`/api/orders/${order.id}/add-extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: selectedExtras }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error || copy.updateError;
        throw new Error(message);
      }
      const addedCount = data?.extrasAdded ?? (selectedExtras.length);
      toast({
        title: copy.updatedTitle,
        description: copy.updatedExtras.replace('{count}', String(addedCount)),
      });

      setShowExtrasModal(false);

      // If this was called from remainder payment flow, proceed to payment
      if (proceedToPayment) {
        // Refresh to get updated amounts, then proceed to payment
        await onRefresh();
        window.location.href = `/min-side/ordre/${order.id}/betaling`;
      } else {
        await onRefresh();
      }
    } catch (error: any) {
      console.error('Error adding extras:', error);
      setExtrasError(error?.message || copy.addExtrasError);
    } finally {
      setAddingExtras(false);
    }
  }

  function handleRemainderPayment() {
    onPayRemainder(order.id);
  }

  function handleExtrasModalClose() {
    setExtrasError(null);
    setShowExtrasModal(false);
  }

  function handleExtrasConfirm(selectedExtras: { slug: string; quantity: number }[]) {
    // For standalone extras button (not payment flow)
    setExtrasError(null);
    handleAddExtras(selectedExtras, false);
  }

  function handleDownloadReceipt() {
    // Generate receipt download
    window.print();
  }

  async function handleSaveModifications(modifications: any) {
    try {
      const response = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modifications),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || copy.saveModificationsError);
      }

      setShowModificationModal(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving modifications:', error);
      throw error;
    }
  }

  async function handleReorder() {
    if (!window.confirm(copy.reorderConfirm)) {
      return;
    }

    setReordering(true);
    try {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) throw new Error(copy.reorderFailed);

      const data = await response.json();
      toast({
        title: copy.reorderCreatedTitle,
        description: copy.reorderCreatedDescription.replace('{orderNumber}', data.orderNumber),
      });
      onRefresh();
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: copy.errorTitle,
        description: copy.reorderFailed,
        variant: 'destructive'
      });
    } finally {
      setReordering(false);
    }
  }

  function getEstimatedDeliveryDate() {
    if (order.marked_delivered_at) {
      return new Date(order.marked_delivered_at).toLocaleDateString(locale);
    }

    if (order.status === 'ready_for_pickup') {
      return copy.estimatedReadyNow;
    }

    return copy.estimatedWeekRange;
  }

  return (
    <>
      <Card className="overflow-hidden border-neutral-200 bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]">
        {/* Next Action Banner */}
        <div
          className={cn(
            'px-6 py-4 border-b',
            nextAction.color === 'green'
              ? 'bg-green-50 border-green-200'
              : nextAction.color === 'amber'
              ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
          )}
        >
          <div className="flex items-center gap-3">
            {nextAction.type === 'payment' || nextAction.type === 'deposit' ? (
              <AlertCircle
                className={cn(
                  'w-5 h-5',
                  nextAction.color === 'amber' ? 'text-amber-600' : 'text-blue-600'
                )}
              />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            )}
            <div className="flex-1">
              <p
                className={cn(
                  'font-semibold',
                  nextAction.color === 'green'
                    ? 'text-green-900'
                    : nextAction.color === 'amber'
                    ? 'text-amber-900'
                    : 'text-blue-900'
                )}
              >
                {nextAction.message}
              </p>
            </div>
            {needsRemainderPayment && (
              <Button
                onClick={handleRemainderPayment}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {copy.payRemainder}
              </Button>
            )}
          </div>
          {needsRemainderPayment && (
            <div className="mt-3 text-sm text-amber-900">
              <p>{copy.dueDate}: {formattedDueDate}</p>
              <p>{copy.earlyPaymentHint}</p>
            </div>
          )}
        </div>

        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h3 className={cn('text-2xl font-bold', theme.textPrimary)}>{order.order_number}</h3>
                <StatusBadge
                  status={
                    order.status === 'draft'
                      ? 'remainderDue'
                      : order.status === 'deposit_paid'
                      ? 'remainderDue'
                      : order.status === 'paid'
                      ? 'paid'
                      : order.status === 'ready_for_pickup'
                      ? 'delivered'
                      : order.status === 'completed'
                      ? 'completed'
                      : 'depositPaid'
                  }
                  label={
                    order.status === 'draft'
                      ? copy.statusPaymentRemaining
                      : order.status === 'deposit_paid'
                      ? copy.statusPaymentRemaining
                      : order.status === 'paid'
                      ? copy.statusPaid
                      : order.status === 'ready_for_pickup'
                      ? copy.statusDelivered
                      : order.status === 'completed'
                      ? copy.statusCompleted
                      : copy.statusWaitingDeposit
                  }
                />
                {order.locked_at && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-medium">{copy.locked}</span>
                  </div>
                )}
              </div>
              <p className={cn('text-sm', theme.textMuted)}>
                {copy.ordered}{' '}
                {new Date(order.created_at).toLocaleDateString(locale, {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleDownloadReceipt}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  theme.textMuted,
                  'hover:bg-black/5'
                )}
                title={copy.downloadReceipt}
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  theme.textMuted,
                  'hover:bg-black/5'
                )}
                title={copy.print}
              >
                <Printer className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Status Timeline */}
          <OrderStatusTimeline
            status={order.status}
            depositPaid={depositPaid}
            remainderPaid={remainderPaid}
            lockedAt={order.locked_at}
            markedDeliveredAt={order.marked_delivered_at}
          />

          {/* Payment Summary */}
          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-3 flex items-center gap-2', theme.textPrimary)}>
              <CreditCard className="w-5 h-5" />
              {copy.paymentSummary}
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={theme.textSecondary}>
                  {copy.depositBoxLabel.replace('{box}', boxLabel)}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    {currency} {depositPaid && depositPayment
                      ? depositPayment.amount_nok.toLocaleString(locale)
                      : order.deposit_amount.toLocaleString(locale)}
                  </span>
                  {depositPaid && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              <div className="flex justify-between">
                <span className={theme.textSecondary}>{copy.boxRemainder}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    {currency} {baseRemainder.toLocaleString(locale)}
                  </span>
                </div>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between">
                  <span className={theme.textSecondary}>{copy.extraProducts}</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold', theme.textPrimary)}>
                      {currency} {extrasTotal.toLocaleString(locale)}
                    </span>
                  </div>
                </div>
              )}
              <div className={cn('pt-2 border-t flex justify-between', theme.borderSecondary)}>
                <span className={theme.textSecondary}>{copy.remainderTotal}</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    {currency} {remainderPaid && remainderPayment
                      ? remainderPayment.amount_nok.toLocaleString(locale)
                      : order.remainder_amount.toLocaleString(locale)}
                  </span>
                  {remainderPaid && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{copy.remainderDueDate}</span>
                <span>{formattedDueDate}</span>
              </div>
              <div className={cn('pt-2 border-t flex justify-between', theme.borderSecondary)}>
                <span className={cn('font-bold', theme.textPrimary)}>{copy.total}</span>
                <span className={cn('font-bold text-xl', theme.textPrimary)}>
                  {currency} {order.total_amount.toLocaleString(locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Order Contents */}
          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-3 flex items-center gap-2', theme.textPrimary)}>
              <Package className="w-5 h-5" />
              {copy.orderContents}
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('font-medium', theme.textPrimary)}>
                  {boxLabel}
                </span>
              </div>
              <div>
                <span className={theme.textMuted}>{copy.ribChoice}: </span>
                <span className={theme.textPrimary}>{ribbeChoiceLabels[order.ribbe_choice] || order.ribbe_choice}</span>
              </div>
              {order.fresh_delivery && (
                <div className={cn('px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm inline-flex items-center')}>
                  {copy.freshDeliveryAddon.replace('{currency}', currency)}
                </div>
              )}
              {order.extra_products && order.extra_products.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className={cn('text-sm font-medium mb-2', theme.textSecondary)}>
                    {copy.extraProducts}:
                  </p>
                  <div className="space-y-1">
                    {order.extra_products.map((extra: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className={theme.textPrimary}>
                          {extra.quantity}x {extra.name}
                        </span>
                        <span className={theme.textSecondary}>{currency} {extra.total_price?.toLocaleString(locale)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!order.locked_at && canEdit && needsRemainderPayment && (
                <Button
                  onClick={() => setShowExtrasModal(true)}
                  variant="outline"
                  className="w-full mt-3"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  {copy.addExtraProducts}
                </Button>
              )}
            </div>
          </div>

          {/* Delivery Information */}
          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-3 flex items-center gap-2', theme.textPrimary)}>
              <MapPin className="w-5 h-5" />
              {copy.deliveryInfo}
            </h4>
            <div className="space-y-2">
              <div>
                <span className={theme.textMuted}>{copy.type}: </span>
                <span className={theme.textPrimary}>{deliveryTypeLabels[order.delivery_type]}</span>
              </div>
              {order.delivery_type === 'pickup_farm' && (
                <div className={cn('text-sm p-3 rounded-lg bg-blue-50 border border-blue-200', theme.textSecondary)}>
                  <p className="font-medium text-blue-900 mb-1">{copy.farmName}</p>
                  <p>{copy.addressByEmail}</p>
                  <p className="mt-2">
                    <strong>{copy.whatToBring}</strong> {copy.bringCooler}
                  </p>
                </div>
              )}
              {order.notes && (
                <div className="mt-3">
                  <p className={cn('text-sm font-medium mb-1', theme.textSecondary)}>{copy.yourNotes}</p>
                  <p className={cn('text-sm p-2 rounded bg-gray-50', theme.textPrimary)}>{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Actions */}
          <div className={cn('p-4 rounded-xl border bg-white', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-4 flex items-center gap-2', theme.textPrimary)}>
              <MessageSquare className="w-5 h-5" />
              {copy.orderActions}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowPaymentHistoryModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {copy.paymentHistory}
              </Button>
              <Button
                onClick={() => setShowTimelineModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Clock className="w-4 h-4 mr-2" />
                {copy.orderHistory}
              </Button>
              <Button
                onClick={() => setShowContactModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                {copy.contactUs}
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <Printer className="w-4 h-4 mr-2" />
                {copy.print}
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
              <div className="flex items-center gap-2 text-neutral-700 text-sm">
                <Mail className="w-4 h-4" />
                <span>{contactInfo.email}</span>
              </div>
              <div className="flex items-center gap-2 text-neutral-700 text-sm">
                <Phone className="w-4 h-4" />
                <span>{contactInfo.phone}</span>
              </div>
            </div>
          </div>

          {/* Estimated Delivery Date */}
          {!order.marked_delivered_at && (
            <div className={cn('p-4 rounded-xl border bg-neutral-50 border-neutral-200')}>
              <div className="flex items-center gap-2 text-neutral-900 mb-1">
                <Calendar className="w-5 h-5" />
                <p className="font-medium">{copy.estimatedDeliveryDate}</p>
              </div>
              <p className="text-lg font-bold text-neutral-900">{getEstimatedDeliveryDate()}</p>
              <p className="text-sm text-neutral-600 mt-1">
                {copy.notifyReady}
              </p>
            </div>
          )}

          {/* Modification Status & Actions */}
          {!order.locked_at && canEdit && (
            <div className={cn('p-4 rounded-xl border bg-green-50 border-green-200')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-900">
                  <Edit3 className="w-5 h-5" />
                  <p className="font-medium">{copy.canStillEdit}</p>
                </div>
              </div>
              <p className="text-sm text-green-700 mb-3">
                {copy.changesBeforeLock}
              </p>
              <Button
                onClick={() => setShowModificationModal(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                {copy.editOrder}
              </Button>
            </div>
          )}

          {order.locked_at && (
            <div className={cn('p-4 rounded-xl border bg-gray-50 border-gray-200')}>
              <div className="flex items-center gap-2 text-gray-900">
                <Lock className="w-5 h-5" />
                <p className="font-medium">{copy.orderLocked}</p>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                {copy.locked} {new Date(order.locked_at).toLocaleDateString(locale)} {copy.noMoreChanges}
              </p>
            </div>
          )}

          {/* Reorder Button for Completed Orders */}
          {order.status === 'completed' && (
            <div className={cn('p-4 rounded-xl border bg-blue-50 border-blue-200')}>
              <p className="font-medium text-blue-900 mb-3">{copy.happyWithOrder}</p>
              <Button
                onClick={handleReorder}
                disabled={reordering}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {reordering ? copy.creatingOrder : copy.orderAgain}
              </Button>
              <p className="text-xs text-blue-700 mt-2">
                {copy.reorderSameContents}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Extras Upsell Modal */}
      <ExtrasUpsellModal
        isOpen={showExtrasModal}
        onClose={handleExtrasModalClose}
        onConfirm={(extras) => handleExtrasConfirm(extras)}
        currentExtras={currentExtrasForModal}
        loading={addingExtras}
        isPaymentFlow={false}
        baseRemainderAmount={order.remainder_amount}
        errorMessage={extrasError}
        onClearError={() => setExtrasError(null)}
      />

      {/* Order Modification Modal */}
      {showModificationModal && (
        <OrderModificationModal
          order={order}
          isOpen={showModificationModal}
          onClose={() => setShowModificationModal(false)}
          onSave={handleSaveModifications}
        />
      )}

      {/* Payment History Modal */}
      <PaymentHistoryModal
        isOpen={showPaymentHistoryModal}
        onClose={() => setShowPaymentHistoryModal(false)}
        payments={order.payments || []}
        orderNumber={order.order_number}
        extraProducts={order.extra_products}
      />

      {/* Contact Admin Modal */}
      <ContactAdminModal
        isOpen={showContactModal}
        onClose={() => setShowContactModal(false)}
        orderId={order.id}
        orderNumber={order.order_number}
        orderDetails={`${copy.contactDetailsBoxSize}: ${boxLabel}
${copy.contactDetailsRibChoice}: ${ribbeChoiceLabels[order.ribbe_choice] || order.ribbe_choice}
${copy.contactDetailsDeliveryType}: ${deliveryTypeLabels[order.delivery_type] || order.delivery_type}
${copy.contactDetailsStatus}: ${order.status}
${copy.contactDetailsTotalAmount}: ${currency} ${order.total_amount.toLocaleString(locale)}`}
        contactEmail={contactInfo.email}
        contactPhone={contactInfo.phone}
      />

      {/* Order Timeline Modal */}
      <OrderTimelineModal
        isOpen={showTimelineModal}
        onClose={() => setShowTimelineModal(false)}
        order={order}
      />
    </>
  );
}
