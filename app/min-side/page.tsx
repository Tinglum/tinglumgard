'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/StatusBadge';
import Link from 'next/link';
import { Package, Calendar, MapPin, Edit, Save, X, Lock } from 'lucide-react';

interface Payment {
  id: string;
  payment_type: string;
  status: string;
  amount_nok: number;
}

interface Order {
  id: string;
  order_number: string;
  box_size: number;
  status: string;
  delivery_type: string;
  fresh_delivery: boolean;
  add_ons_json: Record<string, boolean>;
  notes: string;
  created_at: string;
  last_modified_at: string;
  locked_at: string | null;
  at_risk: boolean;
  vipps_remainder_order_id: string | null;
  payments: Payment[];
}

export default function CustomerPortalPage() {
  const { t } = useLanguage();
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Order>>({});
  const [cutoffWeek, setCutoffWeek] = useState(46);
  const [cutoffYear, setCutoffYear] = useState(2026);
  const [canEdit, setCanEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payingRemainder, setPayingRemainder] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const response = await fetch('/api/auth/session');
      if (response.ok) {
        const data = await response.json();
        if (data.authenticated) {
          setIsAuthenticated(true);
          loadOrders();
          loadConfig();
        } else {
          setIsAuthenticated(false);
          setLoading(false);
        }
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setIsAuthenticated(false);
      setLoading(false);
    }
  }

  async function handleVippsLogin() {
    window.location.href = '/api/auth/vipps/login?returnTo=/min-side';
  }

  async function loadConfig() {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      if (data.cutoff) {
        setCutoffWeek(data.cutoff.week);
        setCutoffYear(data.cutoff.year);

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
  }

  async function loadOrders() {
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data.orders || []);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function getWeekNumber(date: Date): { year: number; week: number } {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
  }

  function startEditing(order: Order) {
    setEditingOrderId(order.id);
    setEditData({
      delivery_type: order.delivery_type,
      fresh_delivery: order.fresh_delivery,
      add_ons_json: order.add_ons_json || {},
      notes: order.notes || '',
    });
  }

  function cancelEditing() {
    setEditingOrderId(null);
    setEditData({});
  }

  async function saveChanges(orderId: string) {
    setSaving(true);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deliveryType: editData.delivery_type,
          freshDelivery: editData.fresh_delivery,
          addOns: editData.add_ons_json,
          notes: editData.notes,
        }),
      });

      if (response.ok) {
        await loadOrders();
        setEditingOrderId(null);
        setEditData({});
      } else {
        const data = await response.json();
        alert(data.error || 'Kunne ikke lagre endringer');
      }
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Kunne ikke lagre endringer');
    } finally {
      setSaving(false);
    }
  }

  async function payRemainder(orderId: string) {
    setPayingRemainder(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/remainder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        alert(data.error || 'Kunne ikke opprette betaling');
        setPayingRemainder(null);
      }
    } catch (error) {
      console.error('Failed to create remainder payment:', error);
      alert('Kunne ikke opprette betaling');
      setPayingRemainder(null);
    }
  }

  function getStatusKey(status: string): 'depositPaid' | 'remainderDue' | 'paid' | 'locked' | 'delivered' | 'completed' | 'atRisk' {
    const statusMap: Record<string, 'depositPaid' | 'remainderDue' | 'paid' | 'locked' | 'delivered' | 'completed' | 'atRisk'> = {
      draft: 'remainderDue', // Waiting for deposit payment
      deposit_paid: 'remainderDue', // Deposit paid, waiting for remainder
      paid: 'paid', // Fully paid
      ready_for_pickup: 'delivered', // Ready for pickup/delivery
      completed: 'completed', // Order completed
      cancelled: 'atRisk', // Order cancelled (reuse atRisk styling)
    };
    return statusMap[status] || 'depositPaid';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Show login wall if not authenticated
  if (isAuthenticated === false) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center px-6", theme.bgGradientHero)}>
        <div className={cn("text-center max-w-md rounded-3xl p-8 border shadow-2xl", theme.bgCard, theme.glassBorder)}>
          <Package className={cn("w-16 h-16 mx-auto mb-4", theme.textPrimary)} />
          <h1 className={cn("text-2xl font-bold mb-4", theme.textPrimary)}>Logg inn for å se dine bestillinger</h1>
          <p className={cn("mb-6", theme.textMuted)}>Du må logge inn med Vipps for å se og administrere dine bestillinger.</p>
          <button
            onClick={handleVippsLogin}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-4 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3"
            style={{ backgroundColor: '#FF5B24' }}
          >
            <span>Logg inn med Vipps</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("min-h-screen py-16 sm:py-24", theme.bgGradientHero)}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h1 className={cn("text-4xl sm:text-5xl font-semibold mb-4", theme.textPrimary)}>{t.customer.title}</h1>
          <p className={theme.textSecondary}>
            {canEdit
              ? `Du kan endre bestillingen din frem til uke ${cutoffWeek}, ${cutoffYear}`
              : `Endringsperioden er utløpt (uke ${cutoffWeek}, ${cutoffYear})`}
          </p>
        </div>

        {orders.length === 0 ? (
          <Card className={cn("p-12 text-center", theme.bgCard)}>
            <Package className={cn("w-16 h-16 mx-auto mb-4", theme.iconColor)} />
            <h2 className={cn("text-xl font-semibold mb-2", theme.textPrimary)}>Ingen bestillinger</h2>
            <p className={cn("mb-6", theme.textSecondary)}>Du har ikke lagt inn noen bestillinger ennå.</p>
            <Link href="/bestill">
              <Button>Gå til bestilling</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => {
              const isEditing = editingOrderId === order.id;
              const depositPayment = order.payments?.find((p) => p.payment_type === 'deposit');
              const depositPaid = depositPayment?.status === 'completed';
              const remainderPayment = order.payments?.find((p) => p.payment_type === 'remainder');
              const remainderPaid = remainderPayment?.status === 'completed';
              const needsRemainderPayment = depositPaid && !remainderPaid && !order.locked_at;

              return (
                <Card key={order.id} className={cn("p-6 sm:p-8", theme.bgCard)}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 mb-6">
                    <div className="space-y-4 flex-1">
                      <div className="flex items-center gap-3">
                        <Package className={cn("w-5 h-5", theme.iconColor)} strokeWidth={1.5} />
                        <div>
                          <span className={cn("text-sm", theme.textSecondary)}>{t.customer.orderNumber}</span>
                          <p className={cn("font-semibold text-lg", theme.textPrimary)}>{order.order_number}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Calendar className={cn("w-5 h-5", theme.iconColor)} strokeWidth={1.5} />
                        <div>
                          <span className={cn("text-sm", theme.textSecondary)}>Bestilt</span>
                          <p className={cn("font-medium", theme.textPrimary)}>
                            {new Date(order.created_at).toLocaleDateString('nb-NO')}
                          </p>
                        </div>
                      </div>

                      {isEditing ? (
                        <div className={cn("space-y-4 pt-4 border-t", theme.borderSecondary)}>
                          <div>
                            <Label className={cn("text-sm font-semibold mb-3 block", theme.textPrimary)}>Levering</Label>
                            <RadioGroup
                              value={editData.delivery_type}
                              onValueChange={(value) =>
                                setEditData({ ...editData, delivery_type: value })
                              }
                            >
                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="pickup_farm" id="pickup_farm" />
                                  <Label htmlFor="pickup_farm" className="cursor-pointer">
                                    Henting på gården
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="pickup_e6" id="pickup_e6" />
                                  <Label htmlFor="pickup_e6" className="cursor-pointer">
                                    Levering E6 (kr 250)
                                  </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="delivery_trondheim" id="delivery_trondheim" />
                                  <Label htmlFor="delivery_trondheim" className="cursor-pointer">
                                    Levering til Trondheim (kr 300)
                                  </Label>
                                </div>
                              </div>
                            </RadioGroup>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id="fresh"
                              checked={editData.fresh_delivery}
                              onCheckedChange={(checked) =>
                                setEditData({ ...editData, fresh_delivery: checked as boolean })
                              }
                            />
                            <Label htmlFor="fresh" className="cursor-pointer">
                              Fersk levering (+kr 500)
                            </Label>
                          </div>

                          <div>
                            <Label className={cn("text-sm font-semibold mb-2 block", theme.textPrimary)}>Notater</Label>
                            <Textarea
                              value={editData.notes}
                              onChange={(e) =>
                                setEditData({ ...editData, notes: e.target.value })
                              }
                              placeholder="Spesielle ønsker eller informasjon"
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <MapPin className={cn("w-5 h-5", theme.iconColor)} strokeWidth={1.5} />
                            <div>
                              <span className={cn("text-sm", theme.textSecondary)}>Levering</span>
                              <p className={cn("font-medium", theme.textPrimary)}>
                                {order.delivery_type === 'pickup_farm'
                                  ? 'Henting på gården'
                                  : order.delivery_type === 'pickup_e6'
                                  ? 'Levering E6'
                                  : 'Levering til Trondheim'}
                              </p>
                            </div>
                          </div>

                          {order.fresh_delivery && (
                            <div className={cn("text-sm", theme.textSecondary)}>
                              ✓ Fersk levering
                            </div>
                          )}

                          {order.notes && (
                            <div className="text-sm">
                              <span className={theme.textSecondary}>Notater:</span>
                              <p className={cn("mt-1", theme.textPrimary)}>{order.notes}</p>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="flex flex-col items-start lg:items-end gap-4">
                      <StatusBadge
                        status={getStatusKey(order.status)}
                        label={t.customer.statuses[getStatusKey(order.status)]}
                      />
                      <div className="text-right">
                        <p className={cn("text-sm mb-1", theme.textSecondary)}>Boks</p>
                        <p className={cn("text-2xl font-semibold", theme.textPrimary)}>{order.box_size} kg</p>
                      </div>
                      <div className="space-y-2">
                        {depositPaid && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ Depositum betalt
                          </div>
                        )}
                        {remainderPaid && (
                          <div className="text-sm text-green-600 font-medium">
                            ✓ Restbetaling betalt
                          </div>
                        )}
                        {order.at_risk && (
                          <div className="text-sm text-amber-600 font-medium">
                            ⚠ Venter på restbetaling
                          </div>
                        )}
                        {order.locked_at && (
                          <div className={cn("text-sm", theme.textSecondary)}>
                            <Lock className="w-3 h-3 inline mr-1" />
                            Ordre låst
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={cn("border-t pt-6 mt-6", theme.borderSecondary)}>
                    <div className="flex flex-col sm:flex-row gap-3">
                      {isEditing ? (
                        <>
                          <Button
                            onClick={() => saveChanges(order.id)}
                            disabled={saving}
                            className="flex-1"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            {saving ? 'Lagrer...' : 'Lagre endringer'}
                          </Button>
                          <Button
                            variant="outline"
                            onClick={cancelEditing}
                            disabled={saving}
                            className="flex-1"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Avbryt
                          </Button>
                        </>
                      ) : (
                        <>
                          {needsRemainderPayment && (
                            <Button
                              onClick={() => payRemainder(order.id)}
                              disabled={payingRemainder === order.id}
                              className="flex-1"
                            >
                              {payingRemainder === order.id
                                ? 'Oppretter betaling...'
                                : 'Betal restbeløp'}
                            </Button>
                          )}
                          {canEdit && !order.locked_at && (
                            <Button
                              variant="outline"
                              onClick={() => startEditing(order)}
                              className="flex-1"
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              {t.customer.edit}
                            </Button>
                          )}
                          {!canEdit && !needsRemainderPayment && (
                            <div className={cn("flex items-center gap-2 text-sm py-2", theme.textMuted)}>
                              <Lock className="w-4 h-4" />
                              <span>{t.customer.cannotEdit}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}

            <div className="text-center pt-8">
              <Link
                href="/"
                className={cn("text-sm transition-colors", theme.textSecondary, `hover:${theme.textPrimary}`)}
              >
                ← {t.nav.products}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
