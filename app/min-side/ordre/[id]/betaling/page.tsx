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

  const baseRemainder = useMemo(() => {
    if (!order) return 0;
    return Math.max(0, order.remainder_amount - savedExtrasTotal);
  }, [order, savedExtrasTotal]);

  // Total to pay = base remainder + NEW extras selection
  const finalTotal = useMemo(() => {
    return baseRemainder + newExtrasTotal;
  }, [baseRemainder, newExtrasTotal]);

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

  function handleQuantityChange(slug: string, quantity: number) {
    setSelectedQuantities(prev => ({
      ...prev,
      [slug]: quantity
    }));
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

        // Briefly show success
        toast({
          title: 'Ekstra produkter oppdatert',
          description: 'Starter betaling...',
        });
      }

      // Step 2: Create payment
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

            <div className="grid md:grid-cols-2 gap-6">
              {availableExtras.map((extra) => {
                const quantity = selectedQuantities[extra.slug] || 0;
                const isSelected = quantity > 0;

                return (
                  <div
                    key={extra.slug}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                      isSelected
                        ? "border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl scale-105"
                        : cn(theme.borderSecondary, theme.bgCard, "hover:shadow-lg hover:scale-102 hover:border-amber-300")
                    )}
                    onClick={() => {
                      if (!isPaying) {
                        if (isSelected) {
                          handleQuantityChange(extra.slug, 0);
                        } else {
                          const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                          handleQuantityChange(extra.slug, defaultQty);
                        }
                      }
                    }}
                  >
                    {/* Selection Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className={cn(
                        "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                        isSelected
                          ? "bg-amber-500 border-amber-500 shadow-md"
                          : "border-gray-300 bg-white group-hover:border-amber-400"
                      )}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                    </div>

                    {/* Product Info */}
                    <div className="pr-8">
                      <h4 className={cn("text-lg font-bold mb-2", theme.textPrimary)}>{extra.name_no}</h4>
                      {extra.description_no && (
                        <p className={cn("text-sm mb-3 leading-relaxed", theme.textMuted)}>{extra.description_no}</p>
                      )}

                      {/* Price */}
                      <div className="flex items-baseline gap-2 mb-4">
                        <span className={cn("text-2xl font-bold", isSelected ? "text-amber-600" : theme.textPrimary)}>
                          {extra.price_nok} kr
                        </span>
                        <span className={cn("text-sm", theme.textMuted)}>
                          /{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                        </span>
                      </div>

                      {/* Stock Warning */}
                      {extra.stock_quantity !== null && extra.stock_quantity < 10 && (
                        <p className="text-xs text-amber-600 mb-3">
                          {extra.stock_quantity > 0 ? `Bare ${extra.stock_quantity} igjen` : 'Utsolgt'}
                        </p>
                      )}

                      {/* Quantity Selector */}
                      {isSelected && (
                        <div
                          className="flex items-center gap-3 pt-4 border-t border-amber-200 animate-in fade-in slide-in-from-top-2 duration-300"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <label className={cn("text-sm font-semibold", theme.textPrimary)}>Antall</label>
                          <Input
                            type="number"
                            min={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                            step={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                            value={quantity}
                            onChange={(e) => {
                              const value = parseFloat(e.target.value);
                              if (!isNaN(value) && value > 0) {
                                handleQuantityChange(extra.slug, value);
                              }
                            }}
                            disabled={isPaying}
                            className={cn("w-24 text-center font-bold text-lg border-2 border-amber-300 focus:border-amber-500", theme.textPrimary)}
                          />
                          <span className={cn("text-sm font-medium", theme.textPrimary)}>
                            {extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {newExtrasTotal > 0 && (
              <div className={cn('mt-6 pt-4 border-t flex justify-between items-center', theme.borderSecondary)}>
                <span className={cn('font-semibold', theme.textPrimary)}>Totalt ekstra produkter</span>
                <span className={cn('text-xl font-bold text-amber-600')}>
                  kr {newExtrasTotal.toLocaleString('nb-NO')}
                </span>
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

        {/* Pickup/Delivery Details Card */}
        <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>
          <h2 className={cn('text-xl font-bold mb-4', theme.textPrimary)}>Henting og levering</h2>

          <div className="space-y-4">
            {/* Delivery Type */}
            <div>
              <p className={cn('text-sm font-semibold mb-2', theme.textPrimary)}>Leveringsmetode</p>
              <div className={cn('p-4 rounded-lg border-2', theme.bgSecondary, theme.borderSecondary)}>
                <p className={cn('font-semibold', theme.textPrimary)}>
                  {order.delivery_type === 'pickup_farm' && 'Henting på gården'}
                  {order.delivery_type === 'pickup_e6' && 'Henting ved E6'}
                  {order.delivery_type === 'delivery_trondheim' && 'Levering i Trondheim'}
                </p>
                <p className={cn('text-sm mt-1', theme.textMuted)}>
                  {order.delivery_type === 'pickup_farm' && 'Tinglum Gård, Sjøfossen'}
                  {order.delivery_type === 'pickup_e6' && 'Hentested ved E6'}
                  {order.delivery_type === 'delivery_trondheim' && 'Levering til din adresse i Trondheim'}
                </p>
              </div>
            </div>

            {/* Fresh Delivery Option */}
            {order.fresh_delivery && (
              <div>
                <p className={cn('text-sm font-semibold mb-2', theme.textPrimary)}>Ekstra alternativ</p>
                <div className={cn('p-4 rounded-lg border-2', 'bg-green-50', 'border-green-200')}>
                  <div className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-green-600" />
                    <p className={cn('font-semibold text-green-800')}>
                      Fersk levering
                    </p>
                  </div>
                  <p className="text-sm mt-1 text-green-700">
                    Dine produkter leveres ferske (ikke frosset)
                  </p>
                </div>
              </div>
            )}

            {/* Info Message */}
            <div className={cn('p-4 rounded-lg', 'bg-blue-50', 'border-2 border-blue-200')}>
              <p className="text-sm text-blue-800">
                ℹ️ Disse detaljene ble valgt ved bestilling. Trenger du å endre? Kontakt oss før du betaler.
              </p>
            </div>
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
