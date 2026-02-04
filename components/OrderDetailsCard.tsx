'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import {
  Package,
  Calendar,
  MapPin,
  CreditCard,
  FileText,
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

  const [showExtrasModal, setShowExtrasModal] = useState(false);
  const [showModificationModal, setShowModificationModal] = useState(false);
  const [showPaymentHistoryModal, setShowPaymentHistoryModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [addingExtras, setAddingExtras] = useState(false);
  const [expandedSection, setExpandedSection] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);
  const [isPaymentFlow, setIsPaymentFlow] = useState(false);

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

  // Determine next action
  function getNextAction() {
    if (order.status === 'completed') {
      return { type: 'completed', message: 'Ordren er fullført', color: 'green' };
    }
    if (order.status === 'ready_for_pickup') {
      return { type: 'ready', message: 'Klar for henting - se detaljer nedenfor', color: 'green' };
    }
    if (needsRemainderPayment) {
      return {
        type: 'payment',
        message: `Restbetaling på kr ${order.remainder_amount.toLocaleString('nb-NO')} må betales`,
        color: 'amber',
      };
    }
    if (depositPaid && !remainderPaid && order.locked_at) {
      return {
        type: 'locked',
        message: 'Ordre låst - venter på restbetaling',
        color: 'amber',
      };
    }
    if (!depositPaid) {
      return {
        type: 'deposit',
        message: 'Venter på forskuddsbetaling',
        color: 'amber',
      };
    }
    return { type: 'processing', message: 'Alt er i orden - vi holder deg oppdatert', color: 'blue' };
  }

  const nextAction = getNextAction();

  const deliveryTypeLabels: Record<string, string> = {
    pickup_farm: 'Henting på gård',
    pickup_e6: 'Henting ved E6',
    delivery_trondheim: 'Henting i Trondheim',
  };

  const ribbeChoiceLabels: Record<string, string> = {
    tynnribbe: 'Tynnribbe',
    familieribbe: 'Familieribbe',
    porchetta: 'Porchetta',
    butchers_choice: 'Slakterens valg',
  };

  async function handleAddExtras(selectedExtras: { slug: string; quantity: number }[], proceedToPayment = false) {
    setAddingExtras(true);
    try {
      const response = await fetch(`/api/orders/${order.id}/add-extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: selectedExtras }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error || 'Failed to update extras';
        throw new Error(message);
      }
      const addedCount = data?.extrasAdded ?? (selectedExtras.length);
      toast({ title: 'Oppdatert', description: `Oppdatert ekstra produkter (${addedCount}).` });

      setShowExtrasModal(false);

      // If this was called from remainder payment flow, proceed to payment
      if (proceedToPayment) {
        // Refresh to get updated amounts, then proceed to payment
        await onRefresh();
        window.location.href = `/min-side/ordre/${order.id}/betaling`;
      } else {
        onRefresh();
      }
    } catch (error: any) {
      console.error('Error adding extras:', error);
      toast({
        title: 'Feil',
        description: error?.message || 'Kunne ikke legge til ekstra produkter. Prøv igjen.',
        variant: 'destructive'
      });
    } finally {
      setAddingExtras(false);
    }
  }

  function handleRemainderPayment() {
    // Navigate directly to payment page where user can select extras inline
    window.location.href = `/min-side/ordre/${order.id}/betaling`;
  }

  function handleExtrasModalClose() {
    setShowExtrasModal(false);
  }

  function handleExtrasConfirm(selectedExtras: { slug: string; quantity: number }[]) {
    // For standalone extras button (not payment flow)
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

      if (!response.ok) throw new Error('Failed to save modifications');

      setShowModificationModal(false);
      onRefresh();
    } catch (error) {
      console.error('Error saving modifications:', error);
      throw error;
    }
  }

  async function handleReorder() {
    if (!window.confirm('Ønsker du å bestille samme okseboks på nytt?')) {
      return;
    }

    setReordering(true);
    try {
      const response = await fetch('/api/orders/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      });

      if (!response.ok) throw new Error('Failed to reorder');

      const data = await response.json();
      toast({
        title: 'Ny ordre opprettet',
        description: `Ordrenummer: ${data.orderNumber}`
      });
      onRefresh();
    } catch (error) {
      console.error('Error reordering:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke opprette ny ordre. Prøv igjen.',
        variant: 'destructive'
      });
    } finally {
      setReordering(false);
    }
  }

  function toggleSection(section: string) {
    setExpandedSection(expandedSection === section ? null : section);
  }

  function getEstimatedDeliveryDate() {
    // Estimate based on status
    if (order.marked_delivered_at) {
      return new Date(order.marked_delivered_at).toLocaleDateString('nb-NO');
    }

    if (order.status === 'ready_for_pickup') {
      return 'Klar nå!';
    }

    // Default: Week 47-48 of 2026
    return 'Uke 47-48, 2026';
  }

  return (
    <>
      <Card className={cn('overflow-hidden', theme.bgCard)}>
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
                Betal restbeløp
              </Button>
            )}
          </div>
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
                      ? 'Betaling gjenstår'
                      : order.status === 'deposit_paid'
                      ? 'Betaling gjenstår'
                      : order.status === 'paid'
                      ? 'Betalt'
                      : order.status === 'ready_for_pickup'
                      ? 'Levert'
                      : order.status === 'completed'
                      ? 'Fullført'
                      : 'Venter på forskudd'
                  }
                />
                {order.locked_at && (
                  <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-700">
                    <Lock className="w-4 h-4" />
                    <span className="text-xs font-medium">Låst</span>
                  </div>
                )}
              </div>
              <p className={cn('text-sm', theme.textMuted)}>
                Bestilt {new Date(order.created_at).toLocaleDateString('nb-NO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleDownloadReceipt}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  theme.textMuted,
                  'hover:bg-black/5'
                )}
                title="Last ned kvittering"
              >
                <Download className="w-5 h-5" />
              </button>
              <button
                onClick={() => window.print()}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  theme.textMuted,
                  'hover:bg-black/5'
                )}
                title="Skriv ut"
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
              Betalingsoversikt
            </h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={theme.textSecondary}>Forskudd ({order.box_size}kg boks)</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    kr {depositPaid && depositPayment
                      ? depositPayment.amount_nok.toLocaleString('nb-NO')
                      : order.deposit_amount.toLocaleString('nb-NO')}
                  </span>
                  {depositPaid && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              <div className="flex justify-between">
                <span className={theme.textSecondary}>Restbeløp kasse</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    kr {baseRemainder.toLocaleString('nb-NO')}
                  </span>
                </div>
              </div>
              {extrasTotal > 0 && (
                <div className="flex justify-between">
                  <span className={theme.textSecondary}>Ekstra produkter</span>
                  <div className="flex items-center gap-2">
                    <span className={cn('font-semibold', theme.textPrimary)}>
                      kr {extrasTotal.toLocaleString('nb-NO')}
                    </span>
                  </div>
                </div>
              )}
              <div className={cn('pt-2 border-t flex justify-between', theme.borderSecondary)}>
                <span className={theme.textSecondary}>Restbetaling totalt</span>
                <div className="flex items-center gap-2">
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    kr {remainderPaid && remainderPayment
                      ? remainderPayment.amount_nok.toLocaleString('nb-NO')
                      : order.remainder_amount.toLocaleString('nb-NO')}
                  </span>
                  {remainderPaid && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                </div>
              </div>
              <div className={cn('pt-2 border-t flex justify-between', theme.borderSecondary)}>
                <span className={cn('font-bold', theme.textPrimary)}>Totalt</span>
                <span className={cn('font-bold text-xl', theme.textPrimary)}>
                  kr {order.total_amount.toLocaleString('nb-NO')}
                </span>
              </div>
            </div>
          </div>

          {/* Order Contents */}
          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-3 flex items-center gap-2', theme.textPrimary)}>
              <Package className="w-5 h-5" />
              Bestillingsinnhold
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={cn('font-medium', theme.textPrimary)}>{order.box_size}kg Griskasse</span>
              </div>
              <div>
                <span className={theme.textMuted}>Ribbe: </span>
                <span className={theme.textPrimary}>{ribbeChoiceLabels[order.ribbe_choice] || order.ribbe_choice}</span>
              </div>
              {order.fresh_delivery && (
                <div className={cn('px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm inline-flex items-center')}>
                  Fersk levering (+kr 200)
                </div>
              )}
              {order.extra_products && order.extra_products.length > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className={cn('text-sm font-medium mb-2', theme.textSecondary)}>Ekstra produkter:</p>
                  <div className="space-y-1">
                    {order.extra_products.map((extra: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className={theme.textPrimary}>
                          {extra.quantity}x {extra.name}
                        </span>
                        <span className={theme.textSecondary}>kr {extra.total_price?.toLocaleString('nb-NO')}</span>
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
                  Legg til ekstra produkter
                </Button>
              )}
            </div>
          </div>

          {/* Delivery Information */}
          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-3 flex items-center gap-2', theme.textPrimary)}>
              <MapPin className="w-5 h-5" />
              Hente-/leveringsinformasjon
            </h4>
            <div className="space-y-2">
              <div>
                <span className={theme.textMuted}>Type: </span>
                <span className={theme.textPrimary}>{deliveryTypeLabels[order.delivery_type]}</span>
              </div>
              {order.delivery_type === 'pickup_farm' && (
                <div className={cn('text-sm p-3 rounded-lg bg-blue-50 border border-blue-200', theme.textSecondary)}>
                  <p className="font-medium text-blue-900 mb-1">Tinglum Gård</p>
                  <p>Adresse kommer i e-post når ordren er klar</p>
                  <p className="mt-2">
                    <strong>Hva du må ta med:</strong> Kjølebag eller kjøleboks
                  </p>
                </div>
              )}
              {order.notes && (
                <div className="mt-3">
                  <p className={cn('text-sm font-medium mb-1', theme.textSecondary)}>Dine notater:</p>
                  <p className={cn('text-sm p-2 rounded bg-gray-50', theme.textPrimary)}>{order.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Order Actions */}
          <div className={cn('p-4 rounded-xl border bg-gradient-to-r from-blue-50 to-indigo-50', theme.borderSecondary)}>
            <h4 className={cn('font-semibold mb-4 flex items-center gap-2 text-blue-900')}>
              <MessageSquare className="w-5 h-5" />
              Ordre-handlinger
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setShowPaymentHistoryModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Betalingshistorikk
              </Button>
              <Button
                onClick={() => setShowTimelineModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <Clock className="w-4 h-4 mr-2" />
                Ordrehistorikk
              </Button>
              <Button
                onClick={() => setShowContactModal(true)}
                variant="outline"
                className="w-full justify-start"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Kontakt oss
              </Button>
              <Button
                onClick={() => {
                  window.print();
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <Printer className="w-4 h-4 mr-2" />
                Skriv ut
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-blue-200 space-y-2">
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Mail className="w-4 h-4" />
                <span>post@tinglum.no</span>
              </div>
              <div className="flex items-center gap-2 text-blue-700 text-sm">
                <Phone className="w-4 h-4" />
                <span>+47 123 45 678</span>
              </div>
            </div>
          </div>

          {/* Estimated Delivery Date */}
          {!order.marked_delivered_at && (
            <div className={cn('p-4 rounded-xl border bg-purple-50 border-purple-200')}>
              <div className="flex items-center gap-2 text-purple-900 mb-1">
                <Calendar className="w-5 h-5" />
                <p className="font-medium">Estimert leveringsdato</p>
              </div>
              <p className="text-lg font-bold text-purple-900">{getEstimatedDeliveryDate()}</p>
              <p className="text-sm text-purple-700 mt-1">
                Vi sender varsel når ordren er klar for henting
              </p>
            </div>
          )}

          {/* Modification Status & Actions */}
          {!order.locked_at && canEdit && (
            <div className={cn('p-4 rounded-xl border bg-green-50 border-green-200')}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-green-900">
                  <Edit3 className="w-5 h-5" />
                  <p className="font-medium">Du kan fortsatt endre bestillingen din</p>
                </div>
              </div>
              <p className="text-sm text-green-700 mb-3">
                Endringer må gjøres før låsetidspunktet
              </p>
              <Button
                onClick={() => setShowModificationModal(true)}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Endre bestilling
              </Button>
            </div>
          )}

          {order.locked_at && (
            <div className={cn('p-4 rounded-xl border bg-gray-50 border-gray-200')}>
              <div className="flex items-center gap-2 text-gray-900">
                <Lock className="w-5 h-5" />
                <p className="font-medium">Bestillingen er låst</p>
              </div>
              <p className="text-sm text-gray-700 mt-1">
                Låst {new Date(order.locked_at).toLocaleDateString('nb-NO')} - ingen flere endringer mulig
              </p>
            </div>
          )}

          {/* Reorder Button for Completed Orders */}
          {order.status === 'completed' && (
            <div className={cn('p-4 rounded-xl border bg-blue-50 border-blue-200')}>
              <p className="font-medium text-blue-900 mb-3">Fornøyd med ordren?</p>
              <Button
                onClick={handleReorder}
                disabled={reordering}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                {reordering ? 'Oppretter ordre...' : 'Bestill igjen'}
              </Button>
              <p className="text-xs text-blue-700 mt-2">
                Opprett en ny ordre med samme innhold
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* Extras Upsell Modal */}
      <ExtrasUpsellModal
        isOpen={showExtrasModal}
        onClose={handleExtrasModalClose}
        onConfirm={handleExtrasConfirm}
        currentExtras={
          order.extra_products?.map((e: any) => ({ slug: e.slug, quantity: e.quantity })) || []
        }
        loading={addingExtras}
        isPaymentFlow={isPaymentFlow}
        baseRemainderAmount={order.remainder_amount}
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
        orderNumber={order.order_number}
        orderDetails={`Boksstørrelse: ${order.box_size}kg
Ribbevalg: ${order.ribbe_choice}
Leveringstype: ${order.delivery_type}
Status: ${order.status}
Totalbeløp: kr ${order.total_amount.toLocaleString('nb-NO')}`}
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
