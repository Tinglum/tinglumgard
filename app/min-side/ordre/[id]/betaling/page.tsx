'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/hooks/use-toast';
import { useAsyncAction } from '@/hooks/useAsyncAction';
import { Spinner } from '@/components/ui/spinner';
import { ExtraProductCard } from '@/components/ExtraProductCard';
import { ShoppingCart } from 'lucide-react';

interface OrderData {
  id: string;
  order_number: string;
  box_size: number;
  deposit_amount: number;
  remainder_amount: number;
  total_amount: number;
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
      <div className="max-w-3xl mx-auto">
        <Card className={cn('p-6 md:p-8', theme.bgCard, theme.borderSecondary)}>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h1 className={cn('text-2xl font-bold', theme.textPrimary)}>Betal restbeløp</h1>
              <p className={cn('text-sm', theme.textMuted)}>Ordre {order.order_number}</p>
            </div>
            <Link href="/min-side" className={cn('text-sm underline', theme.textPrimary)}>
              Tilbake
            </Link>
          </div>

          <div className={cn('p-4 rounded-xl border', theme.borderSecondary)}>
            <h2 className={cn('font-semibold mb-3', theme.textPrimary)}>Oppsummering</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className={theme.textSecondary}>Forskudd</span>
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
              {extrasTotal > 0 && (
                <div className="flex justify-between">
                  <span className={theme.textSecondary}>Ekstra produkter</span>
                  <span className={cn('font-semibold', theme.textPrimary)}>
                    kr {extrasTotal.toLocaleString('nb-NO')}
                  </span>
                </div>
              )}
              <div className={cn('pt-2 border-t flex justify-between', theme.borderSecondary)}>
                <span className={cn('font-semibold', theme.textPrimary)}>Restbetaling totalt</span>
                <span className={cn('font-bold', theme.textPrimary)}>
                  kr {order.remainder_amount.toLocaleString('nb-NO')}
                </span>
              </div>
            </div>
          </div>

          {order.extra_products && order.extra_products.length > 0 && (
            <div className={cn('mt-6 p-4 rounded-xl border', theme.borderSecondary)}>
              <h3 className={cn('font-semibold mb-3', theme.textPrimary)}>Ekstra produkter</h3>
              <div className="space-y-2">
                {order.extra_products.map((extra, idx) => (
                  <div key={`${extra.slug}-${idx}`} className="flex justify-between text-sm">
                    <span className={theme.textPrimary}>
                      {extra.quantity}x {extra.name}
                    </span>
                    <span className={theme.textSecondary}>
                      kr {extra.total_price?.toLocaleString('nb-NO')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={executePayment}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              disabled={isPaying}
            >
              {isPaying ? 'Starter betaling...' : 'Betal restbeløp med Vipps'}
            </Button>
            <Link href="/min-side" className="flex-1">
              <Button variant="outline" className="w-full">Tilbake til Min side</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
