'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Spinner } from '@/components/ui/spinner';
import { ExtraProductCard } from '@/components/ExtraProductCard';
import { ExtraProductsSelector } from '@/components/ExtraProductsSelector';
import { ShoppingCart, Check } from 'lucide-react';

interface OrderData {
  id: string;
  order_number: string;
  box_size: number;
  deposit_amount: number;
  remainder_amount: number;
  total_amount: number;
  delivery_type: 'pickup_farm' | 'pickup_e6' | 'delivery_trondheim';
  fresh_delivery: boolean;
  extra_products?: Array<{ slug: string; name: string; quantity: number; total_price: number }>;
}

interface ExtrasCatalogItem {
  slug: string;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  default_quantity?: number | null;
  stock_quantity: number | null;
  active: boolean;
}

export default function RemainderPaymentSummaryPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const { toast } = useToast();

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extras management
  const [availableExtras, setAvailableExtras] = useState<ExtrasCatalogItem[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // Delivery management
  const [deliveryType, setDeliveryType] = useState<'pickup_farm' | 'pickup_e6' | 'delivery_trondheim'>('pickup_farm');
  const [freshDelivery, setFreshDelivery] = useState<boolean>(false);
  const [pricingConfig, setPricingConfig] = useState<any>(null);

  // Load order data
  useEffect(() => {
    if (!orderId) return;
    let isMounted = true;
    async function loadOrder() {
      setLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Kunne ikke hente ordre');
        }
        if (isMounted) {
          setOrder(data);
          setError(null);

          // Initialize delivery type and fresh delivery from order
          setDeliveryType(data.delivery_type || 'pickup_farm');
          setFreshDelivery(data.fresh_delivery || false);

          // Initialize selected quantities from existing extras
          if (data.extra_products) {
            const quantities: Record<string, number> = {};
            data.extra_products.forEach((ep: any) => {
              quantities[ep.slug] = ep.quantity;
            });
            setSelectedQuantities(quantities);
          }
        }
      } catch (err: any) {
        if (isMounted) setError(err?.message || 'Kunne ikke hente ordre');
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    loadOrder();
    return () => {
      isMounted = false;
    };
  }, [orderId]);

  // Load available extras catalog
  useEffect(() => {
    let isMounted = true;
    async function loadExtras() {
      setExtrasLoading(true);
      try {
        const response = await fetch('/api/extras');
        const data = await response.json();
        if (response.ok && isMounted) {
          setAvailableExtras(data.extras || []);
        }
      } catch (err) {
        console.error('Failed to load extras:', err);
      } finally {
        if (isMounted) setExtrasLoading(false);
      }
    }
    loadExtras();
    return () => {
      isMounted = false;
    };
  }, []);

  // Load pricing config
  useEffect(() => {
    async function loadPricing() {
      try {
        const response = await fetch('/api/config/pricing');
        const data = await response.json();
        if (response.ok) {
          setPricingConfig(data);
        }
      } catch (err) {
        console.error('Failed to load pricing:', err);
      }
    }
    loadPricing();
  }, []);

  // Calculate totals based on CURRENT selections (not saved extras)
  const newExtrasTotal = useMemo(() => {
    return Object.entries(selectedQuantities).reduce((sum, [slug, qty]) => {
      if (qty === 0) return sum;
      const extra = availableExtras.find(e => e.slug === slug);
      return sum + (extra ? extra.price_nok * qty : 0);
    }, 0);
  }, [selectedQuantities, availableExtras]);

  const savedExtrasTotal = useMemo(() => {
    return order?.extra_products?.reduce((sum, e) => sum + (e.total_price || 0), 0) || 0;
  }, [order]);

  // The baseRemainder should be the remainder WITHOUT any extras
  // remainder_amount from DB = total_amount - deposit_amount (includes extras)
  // So we need to subtract the saved extras to get just the box remainder
  const baseRemainder = useMemo(() => {
    if (!order) return 0;
    return order.remainder_amount - savedExtrasTotal;
  }, [order, savedExtrasTotal]);

  // Calculate the delta between new extras and saved extras
  const extrasDelta = useMemo(() => {
    return newExtrasTotal - savedExtrasTotal;
  }, [newExtrasTotal, savedExtrasTotal]);

  // Calculate delivery fee delta
  const deliveryFeeDelta = useMemo(() => {
    if (!order || !pricingConfig) return 0;

    const originalFee = order.delivery_type === 'pickup_e6'
      ? pricingConfig.delivery_fee_pickup_e6
      : order.delivery_type === 'delivery_trondheim'
      ? pricingConfig.delivery_fee_trondheim
      : 0;

    const newFee = deliveryType === 'pickup_e6'
      ? pricingConfig.delivery_fee_pickup_e6
      : deliveryType === 'delivery_trondheim'
      ? pricingConfig.delivery_fee_trondheim
      : 0;

    return newFee - originalFee;
  }, [order, deliveryType, pricingConfig]);

  const freshDeliveryFeeDelta = useMemo(() => {
    if (!pricingConfig) return 0;
    const originalFee = order?.fresh_delivery ? pricingConfig.fresh_delivery_fee : 0;
    const newFee = freshDelivery ? pricingConfig.fresh_delivery_fee : 0;
    return newFee - originalFee;
  }, [order, freshDelivery, pricingConfig]);

  const totalDeliveryDelta = deliveryFeeDelta + freshDeliveryFeeDelta;

  // Total to pay = base remainder + NEW extras selection + delivery delta
  const finalTotal = useMemo(() => {
    return baseRemainder + newExtrasTotal + totalDeliveryDelta;
  }, [baseRemainder, newExtrasTotal, totalDeliveryDelta]);

  // Check if extras have changed from saved state
  const hasExtrasChanges = useMemo(() => {
    const savedExtras = order?.extra_products || [];
    const selectedEntries = Object.entries(selectedQuantities).filter(([_, qty]) => qty > 0);

    // Different count?
    if (savedExtras.length !== selectedEntries.length) return true;

    // Different items or quantities?
    for (const [slug, qty] of selectedEntries) {
      const saved = savedExtras.find(e => e.slug === slug);
      if (!saved || saved.quantity !== qty) return true;
    }

    return false;
  }, [selectedQuantities, order]);

  // Check if delivery has changed from saved state
  const hasDeliveryChanges = useMemo(() => {
    if (!order) return false;
    return deliveryType !== order.delivery_type || freshDelivery !== order.fresh_delivery;
  }, [deliveryType, freshDelivery, order]);

  function handleQuantityChange(slug: string, quantity: number) {
    setSelectedQuantities(prev => {
      // If quantity is 0 or less, remove the item entirely (deselect)
      if (quantity <= 0) {
        const newQuantities = { ...prev };
        delete newQuantities[slug];
        return newQuantities;
      }

      return {
        ...prev,
        [slug]: quantity
      };
    });
  }

  function getSelectedExtras() {
    return Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([slug, quantity]) => ({ slug, quantity }));
  }

  const [isPaying, executePayment] = useAsyncAction(
    async () => {
      if (!orderId) throw new Error('Mangler ordre-ID');

      // Step 1: Save extras if they've changed
      if (hasExtrasChanges) {
        const extrasResponse = await fetch(`/api/orders/${orderId}/add-extras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extras: getSelectedExtras() }),
        });

        if (!extrasResponse.ok) {
          const extrasData = await extrasResponse.json().catch(() => null);
          throw new Error(extrasData?.error || 'Kunne ikke oppdatere ekstra produkter');
        }
      }

      // Step 2: Save delivery changes if they've changed
      if (hasDeliveryChanges) {
        const deliveryResponse = await fetch(`/api/orders/${orderId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            delivery_type: deliveryType,
            fresh_delivery: freshDelivery,
          }),
        });

        if (!deliveryResponse.ok) {
          const deliveryData = await deliveryResponse.json().catch(() => null);
          throw new Error(deliveryData?.error || 'Kunne ikke oppdatere leveringsdetaljer');
        }
      }

      // Show brief success if any changes were made
      if (hasExtrasChanges || hasDeliveryChanges) {
        toast({
          title: 'Endringer lagret',
          description: 'Starter betaling...',
        });
      }

      // Step 3: Create payment
      const response = await fetch(`/api/orders/${orderId}/remainder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (response.ok && data.redirectUrl) {
        window.location.href = data.redirectUrl;
      } else {
        throw new Error(data?.error || `Kunne ikke starte betaling (status ${response.status})`);
      }
    },
    {
      onError: (err) => {
        toast({
          variant: 'destructive',
          title: 'Betalingsfeil',
          description: err.message || 'Kunne ikke starte betaling. Prøv igjen.',
        });
      },
    }
  );

  if (loading) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center', theme.bgGradientHero)}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className={cn('min-h-screen flex items-center justify-center px-6', theme.bgGradientHero)}>
        <Card className={cn('p-8 max-w-md w-full', theme.bgCard, theme.borderSecondary)}>
          <h1 className={cn('text-xl font-bold mb-2', theme.textPrimary)}>Kunne ikke hente ordre</h1>
          <p className={cn('text-sm mb-4', theme.textMuted)}>{error || 'Ukjent feil'}</p>
          <Link href="/min-side" className={cn('text-sm underline', theme.textPrimary)}>
            Tilbake til Min side
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className={cn('min-h-screen px-4 py-10', theme.bgGradientHero)}>
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header Card */}
        <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>
          <div className="flex items-start justify-between">
            <div>
              <h1 className={cn('text-2xl font-bold', theme.textPrimary)}>Betal restbeløp</h1>
              <p className={cn('text-sm', theme.textMuted)}>Ordre {order.order_number}</p>
            </div>
            <Link href="/min-side" className={cn('text-sm underline', theme.textPrimary)}>
              Tilbake
            </Link>
          </div>
        </Card>

        {/* Extras Selection Card */}
        {!extrasLoading && availableExtras.length > 0 && (
          <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>
            <div className="flex items-center gap-2 mb-4">
              <ShoppingCart className="w-5 h-5" />
              <h2 className={cn('text-xl font-bold', theme.textPrimary)}>Ekstra produkter (valgfritt)</h2>
            </div>
            <p className={cn('text-sm mb-6', theme.textMuted)}>
              Legg til ekstra produkter før du betaler. Prisen legges til restbeløpet.
            </p>

            <ExtraProductsSelector
              availableExtras={availableExtras}
              selectedQuantities={selectedQuantities}
              onQuantityChange={handleQuantityChange}
              disabled={isPaying}
              theme={theme}
              translations={{
                quantity: 'Antall',
                kg: 'kg',
                stk: 'stk'
              }}
            />

            {extrasDelta !== 0 && (
              <div className={cn('mt-4 p-3 rounded-lg',
                extrasDelta > 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
              )}>
                {extrasDelta > 0 ? (
                  <p className="text-sm text-green-800">
                    ⬆ Du legger til kr {extrasDelta.toLocaleString('nb-NO')} til den opprinnelige bestillingen
                  </p>
                ) : (
                  <p className="text-sm text-orange-800">
                    ⬇ Du reduserer bestillingen med kr {Math.abs(extrasDelta).toLocaleString('nb-NO')}
                  </p>
                )}
              </div>
            )}

            {hasExtrasChanges && (
              <div className={cn('mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200')}>
                <p className="text-sm text-amber-800">
                  ⚠️ Du har endringer som ikke er lagret. De vil bli lagret når du klikker &quot;Betal med Vipps&quot;.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* Pickup/Delivery Details Card - Interactive */}
        <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>
          <h2 className={cn('text-xl font-bold mb-4', theme.textPrimary)}>Henting og levering</h2>

          <div className="space-y-4">
            {/* Delivery Type Selection */}
            <div>
              <p className={cn('text-sm font-semibold mb-3', theme.textPrimary)}>Leveringsmetode</p>
              <div className="space-y-3">
                {/* Farm Pickup - FREE */}
                <button
                  onClick={() => setDeliveryType('pickup_farm')}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    deliveryType === 'pickup_farm'
                      ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg"
                      : cn(theme.borderSecondary, theme.bgCard, "hover:border-amber-300")
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={cn("font-semibold", theme.textPrimary)}>Henting på gården</p>
                      <p className={cn("text-sm", theme.textMuted)}>Tinglum Gård, Sjøfossen</p>
                    </div>
                    <span className="text-sm font-bold text-green-600">Gratis</span>
                  </div>
                </button>

                {/* E6 Pickup - Fee */}
                <button
                  onClick={() => {
                    setDeliveryType('pickup_e6');
                    setFreshDelivery(false); // Can't have fresh delivery with E6
                  }}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    deliveryType === 'pickup_e6'
                      ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg"
                      : cn(theme.borderSecondary, theme.bgCard, "hover:border-amber-300")
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={cn("font-semibold", theme.textPrimary)}>Henting ved E6</p>
                      <p className={cn("text-sm", theme.textMuted)}>Hentested ved E6</p>
                    </div>
                    <span className={cn("text-sm font-semibold", theme.textPrimary)}>
                      +{pricingConfig?.delivery_fee_pickup_e6 || 300} kr
                    </span>
                  </div>
                </button>

                {/* Trondheim Delivery - Fee */}
                <button
                  onClick={() => {
                    setDeliveryType('delivery_trondheim');
                    setFreshDelivery(false); // Can't have fresh delivery with Trondheim
                  }}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    deliveryType === 'delivery_trondheim'
                      ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg"
                      : cn(theme.borderSecondary, theme.bgCard, "hover:border-amber-300")
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className={cn("font-semibold", theme.textPrimary)}>Levering i Trondheim</p>
                      <p className={cn("text-sm", theme.textMuted)}>Levering til din adresse</p>
                    </div>
                    <span className={cn("text-sm font-semibold", theme.textPrimary)}>
                      +{pricingConfig?.delivery_fee_trondheim || 200} kr
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Fresh Delivery Option - Only with Farm Pickup */}
            {deliveryType === 'pickup_farm' && (
              <div>
                <p className={cn('text-sm font-semibold mb-3', theme.textPrimary)}>Ekstra alternativ</p>
                <button
                  onClick={() => setFreshDelivery(!freshDelivery)}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-4 rounded-lg border-2 transition-all text-left",
                    freshDelivery
                      ? "border-green-500 bg-green-50 shadow-lg"
                      : cn(theme.borderSecondary, theme.bgCard, "hover:border-green-300")
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      {freshDelivery && <Check className="w-5 h-5 text-green-600" />}
                      <div>
                        <p className={cn("font-semibold", freshDelivery ? "text-green-800" : theme.textPrimary)}>
                          Fersk levering
                        </p>
                        <p className={cn("text-sm", freshDelivery ? "text-green-700" : theme.textMuted)}>
                          Produktene leveres ferske (ikke frosset)
                        </p>
                      </div>
                    </div>
                    <span className={cn("text-sm font-semibold", freshDelivery ? "text-green-800" : theme.textPrimary)}>
                      +{pricingConfig?.fresh_delivery_fee || 500} kr
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Delta Display */}
            {totalDeliveryDelta !== 0 && (
              <div className={cn('p-3 rounded-lg',
                totalDeliveryDelta > 0 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'
              )}>
                {totalDeliveryDelta > 0 ? (
                  <p className="text-sm text-green-800">
                    ⬆ Du legger til kr {totalDeliveryDelta.toLocaleString('nb-NO')} for leveringsendring
                  </p>
                ) : (
                  <p className="text-sm text-orange-800">
                    ⬇ Du sparer kr {Math.abs(totalDeliveryDelta).toLocaleString('nb-NO')} på leveringsendring
                  </p>
                )}
              </div>
            )}

            {/* Changes Warning */}
            {hasDeliveryChanges && (
              <div className={cn('p-3 rounded-lg bg-amber-50 border border-amber-200')}>
                <p className="text-sm text-amber-800">
                  ⚠️ Du har endret leveringsdetaljene. De vil bli lagret når du klikker &quot;Betal med Vipps&quot;.
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Payment Summary Card */}
        <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>

          <h2 className={cn('text-xl font-bold mb-4', theme.textPrimary)}>Betalingsoversikt</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className={theme.textSecondary}>Forskudd (betalt)</span>
              <span className={cn('font-semibold', theme.textPrimary)}>
                kr {order.deposit_amount.toLocaleString('nb-NO')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className={theme.textSecondary}>Restbeløp kasse</span>
              <span className={cn('font-semibold', theme.textPrimary)}>
                kr {baseRemainder.toLocaleString('nb-NO')}
              </span>
            </div>
            {newExtrasTotal > 0 && (
              <div className="flex justify-between">
                <span className={theme.textSecondary}>Ekstra produkter</span>
                <span className={cn('font-semibold text-green-600')}>
                  kr {newExtrasTotal.toLocaleString('nb-NO')}
                </span>
              </div>
            )}
            {totalDeliveryDelta !== 0 && (
              <div className="flex justify-between">
                <span className={theme.textSecondary}>Leveringsendring</span>
                <span className={cn('font-semibold', totalDeliveryDelta > 0 ? 'text-green-600' : 'text-orange-600')}>
                  {totalDeliveryDelta > 0 ? '+' : ''}kr {totalDeliveryDelta.toLocaleString('nb-NO')}
                </span>
              </div>
            )}
            <div className={cn('pt-3 mt-3 border-t flex justify-between items-center', theme.borderSecondary)}>
              <span className={cn('text-lg font-bold', theme.textPrimary)}>Å betale nå</span>
              <span className={cn('text-2xl font-bold text-green-600')}>
                kr {finalTotal.toLocaleString('nb-NO')}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3">
            <Button
              onClick={executePayment}
              className="w-full py-6 text-lg bg-green-600 hover:bg-green-700 text-white"
              disabled={isPaying}
              size="lg"
            >
              {isPaying ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  {hasExtrasChanges ? 'Lagrer ekstra produkter...' : 'Starter betaling...'}
                </>
              ) : (
                `Betal kr ${finalTotal.toLocaleString('nb-NO')} med Vipps`
              )}
            </Button>
            <Link href="/min-side" className="w-full">
              <Button variant="outline" className="w-full" disabled={isPaying}>
                Tilbake til Min side
              </Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
