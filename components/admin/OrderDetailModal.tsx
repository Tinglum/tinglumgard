'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { X, Package, User, Mail, Phone, MapPin, CreditCard, Calendar, FileText, AlertCircle, CheckCircle2, Edit3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

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

  // Pig-specific fields
  box_size?: number;
  fresh_delivery?: boolean;
  ribbe_choice?: string;
  extra_products?: any[];

  // Egg-specific fields
  breed_id?: string;
  breed_name?: string;
  quantity?: number;
  week_number?: number;
  year?: number;
  delivery_monday?: string;
  price_per_egg?: number;

  // Common fields
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
  const [editingNotes, setEditingNotes] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [syncing, setSyncing] = useState(false);

  if (!isOpen || !order) return null;

  const depositPayment = order.payments?.find((p) => p.payment_type === 'deposit');
  const remainderPayment = order.payments?.find((p) => p.payment_type === 'remainder');

  // Check for mismatch between order amounts and actual payment amounts
  const depositMismatch = depositPayment && depositPayment.amount_nok !== order.deposit_amount;
  const remainderMismatch = remainderPayment && remainderPayment.amount_nok !== order.remainder_amount;
  const actualDepositAmount = depositPayment?.amount_nok || order.deposit_amount;
  const actualRemainderAmount = remainderPayment?.amount_nok || order.remainder_amount;

  const statusOptions = [
    { value: 'draft', label: 'Utkast' },
    { value: 'deposit_paid', label: 'Forskudd betalt' },
    { value: 'paid', label: 'Fullstendig betalt' },
    { value: 'ready_for_pickup', label: 'Klar for henting' },
    { value: 'completed', label: 'Fullført' },
    { value: 'cancelled', label: 'Kansellert' },
  ];

  const deliveryTypeLabels: Record<string, string> = {
    pickup_farm: 'Henting på gård',
    pickup_e6: 'Henting ved E6',
    delivery_trondheim: 'Levering i Trondheim',
  };

  const ribbeChoiceLabels: Record<string, string> = {
    tynnribbe: 'Tynnribbe',
    familieribbe: 'Familieribbe',
    porchetta: 'Porchetta',
    butchers_choice: 'Slakterens valg',
  };

  function handleStatusChange(newStatus: string) {
    if (!order) return;
    if (window.confirm(`Endre status til "${statusOptions.find((s) => s.value === newStatus)?.label}"?`)) {
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
    if (!confirm('Synkroniser ordrebeløp med faktiske betalingsbeløp? Dette vil oppdatere forskudd og restbeløp i ordren.')) {
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
          title: 'Beløp synkronisert',
          description: 'Oppdater siden for å se endringene.'
        });
        window.location.reload();
      } else {
        toast({
          title: 'Info',
          description: result.message || 'Ingen endringer nødvendig'
        });
      }
    } catch (error) {
      console.error('Error syncing amounts:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke synkronisere beløp',
        variant: 'destructive'
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
        {/* Header */}
        <div className="sticky top-0 z-10 px-8 py-6 border-b bg-white">
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="pr-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              Ordre {order.order_number}
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
                Opprettet {new Date(order.created_at).toLocaleDateString('nb-NO')}
              </span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                Kundeinformasjon
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Navn</p>
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

            {/* Payment Information */}
            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                Betalingsinformasjon
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Forskudd</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">kr {actualDepositAmount.toLocaleString('nb-NO')}</span>
                    {depositMismatch && (
                      <span className="text-xs text-amber-600" title={`Order amount: kr ${order.deposit_amount}`}>
                        (tilpasset)
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
                  <span className="text-gray-600">Restbeløp</span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">kr {actualRemainderAmount.toLocaleString('nb-NO')}</span>
                    {remainderMismatch && (
                      <span className="text-xs text-amber-600" title={`Order amount: kr ${order.remainder_amount}`}>
                        (tilpasset)
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
                  <span className="font-bold text-gray-900">Totalt</span>
                  <span className="font-bold text-xl text-gray-900">kr {order.total_amount.toLocaleString('nb-NO')}</span>
                </div>
                {depositPayment && (
                  <div className="text-xs text-gray-600">
                    Forskudd betalt: {depositPayment.paid_at ? new Date(depositPayment.paid_at).toLocaleString('nb-NO') : 'Venter'}
                  </div>
                )}
                {remainderPayment && remainderPayment.status === 'completed' && (
                  <div className="text-xs text-gray-600">
                    Restbeløp betalt: {remainderPayment.paid_at ? new Date(remainderPayment.paid_at).toLocaleString('nb-NO') : 'Venter'}
                  </div>
                )}
                {(depositMismatch || remainderMismatch) && (
                  <div className="pt-3 border-t">
                    <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 mb-2">
                      <p className="text-xs text-amber-900 mb-1">
                        <strong>Bemerkning:</strong> Betalingsbeløp avviker fra ordrebeløp. Dette kan skylde manuell tilpasning.
                      </p>
                      <p className="text-xs text-amber-700">
                        Ordre: Forskudd kr {order.deposit_amount.toLocaleString('nb-NO')}, Restbeløp kr {order.remainder_amount.toLocaleString('nb-NO')}
                      </p>
                      <p className="text-xs text-amber-700">
                        Faktisk: Forskudd kr {actualDepositAmount.toLocaleString('nb-NO')}, Restbeløp kr {actualRemainderAmount.toLocaleString('nb-NO')}
                      </p>
                    </div>
                    <Button
                      onClick={handleSyncAmounts}
                      disabled={syncing}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      {syncing ? 'Synkroniserer...' : 'Synkroniser beløp'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Order Contents */}
            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-gray-600" />
                Bestillingsinnhold
              </h3>
              <div className="space-y-3">
                {/* Pig Box Order */}
                {(!order.product_type || order.product_type === 'pig_box') && (
                  <>
                    <div>
                      <p className="text-sm text-gray-600">Boks</p>
                      <p className="font-medium text-gray-900">{order.box_size}kg Griskasse</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Ribbe</p>
                      <p className="font-medium text-gray-900">{ribbeChoiceLabels[order.ribbe_choice || ''] || order.ribbe_choice}</p>
                    </div>
                    {order.fresh_delivery && (
                      <div className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-sm inline-block">
                        Fersk levering
                      </div>
                    )}
                    {order.extra_products && order.extra_products.length > 0 && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-gray-600 mb-2">Ekstra produkter:</p>
                        <div className="space-y-1">
                          {order.extra_products.map((extra: any, index: number) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{extra.quantity}x {extra.name}</span>
                              <span className="text-gray-600">kr {extra.total_price?.toLocaleString('nb-NO')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Egg Order */}
                {order.product_type === 'eggs' && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🥚</span>
                      <h4 className="text-lg font-semibold text-gray-900">Rugeegg</h4>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Rase</p>
                      <p className="font-medium text-gray-900">{order.breed_name}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Antall egg</p>
                      <p className="font-medium text-gray-900">{order.quantity} stk</p>
                    </div>
                    {order.price_per_egg && (
                      <div>
                        <p className="text-sm text-gray-600">Pris per egg</p>
                        <p className="font-medium text-gray-900">
                          {((order.price_per_egg || 0) / 100).toFixed(2)} kr
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-sm text-gray-600">Leveringsuke</p>
                      <p className="font-medium text-gray-900">
                        Uke {order.week_number}, {order.year}
                      </p>
                    </div>
                    {order.delivery_monday && (
                      <div>
                        <p className="text-sm text-gray-600">Leveringsdato (mandag)</p>
                        <p className="font-medium text-gray-900">
                          {new Date(order.delivery_monday).toLocaleDateString('nb-NO', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Delivery Information */}
            <div className="p-6 rounded-xl border border-gray-200">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-gray-600" />
                Leveringsinformasjon
              </h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-600">Type</p>
                  <p className="font-medium text-gray-900">{deliveryTypeLabels[order.delivery_type]}</p>
                </div>
                {order.locked_at && (
                  <div className="px-3 py-2 rounded-lg bg-gray-50 text-gray-700 text-sm">
                    🔒 Ordre låst {new Date(order.locked_at).toLocaleDateString('nb-NO')}
                  </div>
                )}
                {order.marked_delivered_at && (
                  <div className="px-3 py-2 rounded-lg bg-green-50 text-green-700 text-sm">
                    ✓ Levert {new Date(order.marked_delivered_at).toLocaleDateString('nb-NO')}
                  </div>
                )}
              </div>
            </div>

            {/* Customer Notes */}
            {order.notes && (
              <div className="p-6 rounded-xl border border-gray-200 lg:col-span-2">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-600" />
                  Kundens notater
                </h3>
                <p className="text-gray-700 whitespace-pre-wrap">{order.notes}</p>
              </div>
            )}

            {/* Admin Notes */}
            <div className="p-6 rounded-xl border border-gray-200 lg:col-span-2 bg-amber-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-amber-600" />
                  Interne notater (admin)
                </h3>
                {!editingNotes && (
                  <button
                    onClick={startEditingNotes}
                    className="flex items-center gap-2 px-3 py-1 rounded-lg bg-amber-600 text-white hover:bg-amber-700 transition-colors text-sm"
                  >
                    <Edit3 className="w-4 h-4" />
                    Rediger
                  </button>
                )}
              </div>
              {editingNotes ? (
                <div className="space-y-3">
                  <Textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    rows={4}
                    placeholder="Legg til interne notater..."
                    className="bg-white"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleSaveNotes} size="sm">
                      <Save className="w-4 h-4 mr-2" />
                      Lagre
                    </Button>
                    <Button onClick={() => setEditingNotes(false)} variant="outline" size="sm">
                      Avbryt
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">
                  {order.admin_notes || 'Ingen interne notater ennå'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-8 py-6 border-t bg-white">
          <div className="flex items-center justify-between gap-6">
            <div className="flex-1">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Endre status</Label>
              <select
                value={selectedStatus}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Velg ny status...</option>
                {statusOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={onClose} variant="outline" className="px-8">
              Lukk
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
