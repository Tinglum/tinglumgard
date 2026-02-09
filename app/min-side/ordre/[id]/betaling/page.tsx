'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
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
  extra_credit_amount_nok?: number;
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

interface OutOfStockItem {
  slug: string;
  name: string;
  requestedQty: number;
  availableQty: number;
  totalPrice: number;
}

export default function RemainderPaymentSummaryPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id;
  const { toast } = useToast();
  const remainderDueDate = new Date('2026-11-16');
  const formattedDueDate = remainderDueDate.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Extras management
  const [availableExtras, setAvailableExtras] = useState<ExtrasCatalogItem[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [outOfStockItems, setOutOfStockItems] = useState<OutOfStockItem[]>([]);
  const [resolvingStock, setResolvingStock] = useState(false);

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

  const extraCreditBalance = order?.extra_credit_amount_nok || 0;

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

  const creditApplied = useMemo(() => {
    return Math.min(extraCreditBalance, newExtrasTotal);
  }, [extraCreditBalance, newExtrasTotal]);

  // Total to pay = base remainder + NEW extras selection (minus credit) + delivery delta
  const finalTotal = useMemo(() => {
    const extrasAfterCredit = Math.max(0, newExtrasTotal - creditApplied);
    return baseRemainder + extrasAfterCredit + totalDeliveryDelta;
  }, [baseRemainder, newExtrasTotal, creditApplied, totalDeliveryDelta]);

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

  useEffect(() => {
    if (!order || availableExtras.length === 0) return;
    const issues: OutOfStockItem[] = [];

    (order.extra_products || []).forEach((extra) => {
      const catalogItem = availableExtras.find((item) => item.slug === extra.slug);
      const stockQty = catalogItem?.stock_quantity;
      if (stockQty === null || stockQty === undefined) return;
      if (stockQty < extra.quantity) {
        const totalPrice = extra.total_price || (catalogItem ? catalogItem.price_nok * extra.quantity : 0);
        issues.push({
          slug: extra.slug,
          name: extra.name,
          requestedQty: extra.quantity,
          availableQty: Math.max(0, stockQty),
          totalPrice,
        });
      }
    });

    setOutOfStockItems(issues);
  }, [order, availableExtras]);

  async function resolveOutOfStock(useCredit: boolean) {
    if (!orderId || outOfStockItems.length === 0) return;
    setResolvingStock(true);

    const nextQuantities = { ...selectedQuantities };
    outOfStockItems.forEach((item) => {
      delete nextQuantities[item.slug];
    });

    const updatedExtras = Object.entries(nextQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([slug, quantity]) => ({ slug, quantity }));

    const creditAmountNok = useCredit
      ? Math.round(outOfStockItems.reduce((sum, item) => sum + item.totalPrice * 1.1, 0))
      : 0;

    try {
      const response = await fetch(`/api/orders/${orderId}/add-extras`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extras: updatedExtras, creditAmountNok }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'Kunne ikke oppdatere ekstra produkter');
      }

      const refreshed = await fetch(`/api/orders/${orderId}`);
      if (refreshed.ok) {
        const data = await refreshed.json();
        setOrder(data);
        const quantities: Record<string, number> = {};
        (data.extra_products || []).forEach((ep: any) => {
          quantities[ep.slug] = ep.quantity;
        });
        setSelectedQuantities(quantities);
      }

      setOutOfStockItems([]);
      toast({
        title: 'Oppdatert',
        description: useCredit
          ? 'Utsolgte produkter fjernet og kreditt lagt til.'
          : 'Utsolgte produkter fjernet fra bestillingen.',
      });
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Kunne ikke oppdatere',
        description: err?.message || 'Prøv igjen.',
      });
    } finally {
      setResolvingStock(false);
    }
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
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="bg-white border border-neutral-200 rounded-xl p-8 max-w-md w-full shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
          <h1 className="text-2xl font-light tracking-tight text-neutral-900 mb-3">Kunne ikke hente ordre</h1>
          <p className="text-sm font-light text-neutral-600 mb-6">{error || 'Ukjent feil'}</p>
          <Link href="/min-side" className="text-sm font-light text-neutral-900 underline hover:text-neutral-600 transition-colors">
            Tilbake til Min side
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white py-20">
      {outOfStockItems.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-light text-neutral-900 mb-3">Beklager, noen ekstra varer er utsolgt</h2>
            <p className="text-sm text-neutral-600 mb-4">
              Vi har ikke nok lager til alle ekstra varer du valgte ved forskuddsbestilling.
              Du kan fjerne varene eller få 110% kreditt som kan brukes på andre ekstra produkter.
              Ubrukt kreditt refunderes ikke.
            </p>
            <div className="space-y-2 mb-5">
              {outOfStockItems.map((item) => (
                <div key={item.slug} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-2">
                  <div>
                    <p className="text-sm font-medium text-neutral-900">{item.name}</p>
                    <p className="text-xs text-neutral-500">
                      Bestilt: {item.requestedQty} • Tilgjengelig: {item.availableQty}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-neutral-700">
                    kr {item.totalPrice.toLocaleString('nb-NO')}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => resolveOutOfStock(false)}
                disabled={resolvingStock}
                className="flex-1 rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-900 hover:bg-neutral-50 disabled:opacity-50"
              >
                Fjern utsolgte produkter
              </button>
              <button
                onClick={() => resolveOutOfStock(true)}
                disabled={resolvingStock}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-3 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
              >
                Ta 110% kreditt
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Subtle parallax background */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute bottom-1/4 right-1/3 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-6 space-y-6">
        {/* Header Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-light tracking-tight text-neutral-900">Betal restbeløp</h1>
              <p className="text-sm font-light text-neutral-600 mt-2">Ordre {order.order_number}</p>
              <p className="text-xs text-neutral-500 mt-2">Forfallsdato: {formattedDueDate}</p>
              <p className="text-xs text-neutral-500 mt-1">
                Jo tidligere du betaler restbeløpet, jo større er sjansen for å få ekstra produkter.
              </p>
            </div>
            <Link href="/min-side" className="text-sm font-light text-neutral-600 underline hover:text-neutral-900 transition-colors">
              Tilbake
            </Link>
          </div>
        </div>

        {/* Extras Selection Card */}
        {!extrasLoading && availableExtras.length > 0 && (
          <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-3 mb-6">
              <ShoppingCart className="w-6 h-6 text-neutral-500" />
              <h2 className="text-2xl font-light tracking-tight text-neutral-900">Ekstra produkter (valgfritt)</h2>
            </div>
            <p className="text-sm font-light text-neutral-600 mb-8 leading-relaxed">
              Legg til ekstra produkter før du betaler. Prisen legges til restbeløpet.
            </p>

            <ExtraProductsSelector
              availableExtras={availableExtras}
              selectedQuantities={selectedQuantities}
              onQuantityChange={handleQuantityChange}
              disabled={isPaying}
              theme={{
                textPrimary: 'text-neutral-900',
                textSecondary: 'text-neutral-600',
                textMuted: 'text-neutral-500',
                bgCard: 'bg-white',
                borderSecondary: 'border-neutral-200'
              }}
              translations={{
                quantity: 'Antall',
                kg: 'kg',
                stk: 'stk'
              }}
            />

            {extrasDelta !== 0 && (
              <div className="mt-4 p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                {extrasDelta > 0 ? (
                  <p className="text-sm text-neutral-900">
                    ⬆ Du legger til kr {extrasDelta.toLocaleString('nb-NO')} til den opprinnelige bestillingen
                  </p>
                ) : (
                  <p className="text-sm text-neutral-900">
                    ⬇ Du reduserer bestillingen med kr {Math.abs(extrasDelta).toLocaleString('nb-NO')}
                  </p>
                )}
              </div>
            )}

            {hasExtrasChanges && (
              <div className="mt-4 p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <p className="text-sm font-light text-neutral-900 leading-relaxed">
                  ⚠️ Du har endringer som ikke er lagret. De vil bli lagret når du klikker &quot;Betal med Vipps&quot;.
                </p>
              </div>
            )}

            {extraCreditBalance > 0 && (
              <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
                <p className="text-sm font-light text-amber-900 leading-relaxed">
                  Kreditt for utsolgte produkter: kr {extraCreditBalance.toLocaleString('nb-NO')}.
                  Kreditten kan brukes på ekstra produkter og refunderes ikke.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pickup/Delivery Details Card - Interactive */}
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
          <h2 className="text-2xl font-light tracking-tight text-neutral-900 mb-6">Henting og levering</h2>

          <div className="space-y-6">
            {/* Delivery Type Selection */}
            <div>
              <p className="text-sm font-light text-neutral-900 mb-4 uppercase tracking-wide">Leveringsmetode</p>
              <div className="space-y-3">
                {/* Farm Pickup - FREE */}
                <button
                  onClick={() => setDeliveryType('pickup_farm')}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 transition-all duration-300 text-left",
                    deliveryType === 'pickup_farm'
                      ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-light text-neutral-900">Henting på gården</p>
                      <p className="text-sm font-light text-neutral-600 mt-1">Tinglum Gård, Sjøfossen</p>
                    </div>
                    <span className="text-sm font-normal text-neutral-900">Gratis</span>
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
                    "w-full p-6 rounded-xl border-2 transition-all duration-300 text-left",
                    deliveryType === 'pickup_e6'
                      ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-light text-neutral-900">Henting ved E6</p>
                      <p className="text-sm font-light text-neutral-600 mt-1">Hentested ved E6</p>
                    </div>
                    <span className="text-sm font-light text-neutral-900">
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
                    "w-full p-6 rounded-xl border-2 transition-all duration-300 text-left",
                    deliveryType === 'delivery_trondheim'
                      ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-light text-neutral-900">Levering i Trondheim</p>
                      <p className="text-sm font-light text-neutral-600 mt-1">Levering til din adresse</p>
                    </div>
                    <span className="text-sm font-light text-neutral-900">
                      +{pricingConfig?.delivery_fee_trondheim || 200} kr
                    </span>
                  </div>
                </button>
              </div>
            </div>

            {/* Fresh Delivery Option - Only with Farm Pickup */}
            {deliveryType === 'pickup_farm' && (
              <div>
                <p className="text-sm font-light text-neutral-900 mb-4 uppercase tracking-wide">Ekstra alternativ</p>
                <button
                  onClick={() => setFreshDelivery(!freshDelivery)}
                  disabled={isPaying}
                  className={cn(
                    "w-full p-6 rounded-xl border-2 transition-all duration-300 text-left",
                    freshDelivery
                      ? "border-neutral-900 bg-neutral-50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)]"
                      : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                  )}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      {freshDelivery && <Check className="w-6 h-6 text-neutral-900" />}
                      <div>
                        <p className="font-light text-neutral-900">
                          Fersk levering
                        </p>
                        <p className="text-sm font-light mt-1 text-neutral-600">
                          Produktene leveres ferske (ikke frosset)
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-light text-neutral-900">
                      +{pricingConfig?.fresh_delivery_fee || 500} kr
                    </span>
                  </div>
                </button>
              </div>
            )}

            {/* Delta Display */}
            {totalDeliveryDelta !== 0 && (
              <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-200">
                {totalDeliveryDelta > 0 ? (
                  <p className="text-sm text-neutral-900">
                    ⬆ Du legger til kr {totalDeliveryDelta.toLocaleString('nb-NO')} for leveringsendring
                  </p>
                ) : (
                  <p className="text-sm text-neutral-900">
                    ⬇ Du sparer kr {Math.abs(totalDeliveryDelta).toLocaleString('nb-NO')} på leveringsendring
                  </p>
                )}
              </div>
            )}

            {/* Changes Warning */}
            {hasDeliveryChanges && (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                <p className="text-sm font-light text-neutral-900 leading-relaxed">
                  ⚠️ Du har endret leveringsdetaljene. De vil bli lagret når du klikker &quot;Betal med Vipps&quot;.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Summary Card */}
        <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">

          <h2 className="text-2xl font-light tracking-tight text-neutral-900 mb-6">Betalingsoversikt</h2>

          <div className="space-y-4">
            <div className="flex justify-between">
              <span className="font-light text-neutral-600">Forskudd (betalt)</span>
              <span className="font-light text-neutral-900">
                kr {order.deposit_amount.toLocaleString('nb-NO')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="font-light text-neutral-600">Restbeløp kasse</span>
              <span className="font-light text-neutral-900">
                kr {baseRemainder.toLocaleString('nb-NO')}
              </span>
            </div>
            {newExtrasTotal > 0 && (
              <div className="flex justify-between">
                <span className="font-light text-neutral-600">Ekstra produkter</span>
                <span className="font-light text-neutral-900">
                  kr {newExtrasTotal.toLocaleString('nb-NO')}
                </span>
              </div>
            )}
            {creditApplied > 0 && (
              <div className="flex justify-between">
                <span className="font-light text-neutral-600">Kreditt ekstra produkter</span>
                <span className="font-light text-neutral-900">-kr {creditApplied.toLocaleString('nb-NO')}</span>
              </div>
            )}
            {totalDeliveryDelta !== 0 && (
              <div className="flex justify-between">
                <span className="font-light text-neutral-600">Leveringsendring</span>
                <span className={cn('font-light', totalDeliveryDelta > 0 ? 'text-neutral-900' : 'text-neutral-900')}>
                  {totalDeliveryDelta > 0 ? '+' : ''}kr {totalDeliveryDelta.toLocaleString('nb-NO')}
                </span>
              </div>
            )}
            <div className="pt-4 mt-4 border-t border-neutral-200 flex justify-between items-center">
              <span className="text-xl font-light text-neutral-900">Å betale nå</span>
              <span className="text-3xl font-light text-neutral-900">
                kr {finalTotal.toLocaleString('nb-NO')}
              </span>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-4">
            <button
              onClick={executePayment}
              disabled={isPaying || outOfStockItems.length > 0}
              className="w-full py-5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-base font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {isPaying ? (
                <span className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {hasExtrasChanges ? 'Lagrer ekstra produkter...' : 'Starter betaling...'}
                </span>
              ) : (
                `Betal kr ${finalTotal.toLocaleString('nb-NO')} med Vipps`
              )}
            </button>
            <Link href="/min-side" className="w-full">
              <button
                disabled={isPaying}
                className="w-full py-5 bg-neutral-50 hover:bg-neutral-100 text-neutral-900 border border-neutral-200 rounded-xl text-base font-light uppercase tracking-wide hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.15)] hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
              >
                Tilbake til Min side
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
