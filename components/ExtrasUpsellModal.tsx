'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, Plus, Minus, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Extra {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  stock_quantity: number | null;
}

interface ExtrasUpsellModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedExtras: { slug: string; quantity: number }[], proceedToPayment?: boolean) => void;
  currentExtras?: { slug: string; quantity: number }[];
  loading?: boolean;
  isPaymentFlow?: boolean; // Are we in the remainder payment flow?
  baseRemainderAmount?: number;
}

export function ExtrasUpsellModal({
  isOpen,
  onClose,
  onConfirm,
  currentExtras = [],
  loading = false,
  isPaymentFlow = false,
  baseRemainderAmount = 0,
}: ExtrasUpsellModalProps) {
  const { getThemeClasses } = useTheme();
  const { lang } = useLanguage();
  const theme = getThemeClasses();

  const [extras, setExtras] = useState<Extra[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [loadingExtras, setLoadingExtras] = useState(true);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingExtras(true);
      loadExtras();
      if (!initializedRef.current) {
        // Initialize with current extras only once per open
        const initialQuantities: Record<string, number> = {};
        currentExtras.forEach((extra) => {
          initialQuantities[extra.slug] = extra.quantity;
        });
        setSelectedQuantities(initialQuantities);
        initializedRef.current = true;
      }
    } else {
      initializedRef.current = false;
      setSelectedQuantities({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  async function loadExtras() {
    try {
      const response = await fetch('/api/extras');
      const data = await response.json();
      // Filter out delivery options - they are handled elsewhere
      const filteredExtras = (data.extras || []).filter(
        (extra: Extra) => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug)
      );
      setExtras(filteredExtras);
    } catch (error) {
      console.error('Failed to load extras:', error);
    } finally {
      setLoadingExtras(false);
    }
  }

  function updateQuantity(slug: string, delta: number, pricingType: 'per_unit' | 'per_kg') {
    setSelectedQuantities((prev) => {
      const current = prev[slug] || 0;
      // For kg items, increment/decrement by 0.5kg, for units by 1
      const step = pricingType === 'per_kg' ? 0.5 : 1;
      // Calculate new quantity based on direction
      let newQuantity = current + (delta * step);
      // Ensure non-negative
      newQuantity = Math.max(0, newQuantity);
      // Round to 1 decimal place for kg items to avoid floating point issues
      const rounded = pricingType === 'per_kg' ? Math.round(newQuantity * 10) / 10 : Math.round(newQuantity);
      return { ...prev, [slug]: rounded };
    });
  }

  function setDirectQuantity(slug: string, value: number) {
    setSelectedQuantities((prev) => ({
      ...prev,
      [slug]: Math.max(0, value)
    }));
  }

  function handleConfirm(proceedToPayment = false) {
    const selectedExtras = Object.entries(selectedQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([slug, quantity]) => ({ slug, quantity }));

    // Check if user is removing items
    const removedItems = currentExtras.filter(
      current => {
        const newQty = selectedQuantities[current.slug] || 0;
        return newQty < current.quantity;
      }
    );

    // Check if we're past the cutoff date (week 46, 2026)
    const now = new Date();
    const cutoffDate = new Date('2026-11-16'); // Week 46 of 2026
    const isPastCutoff = now > cutoffDate;

    // Show warning if removing items and past cutoff
    if (removedItems.length > 0 && isPastCutoff) {
      const itemNames = removedItems.map(item => {
        const extra = extras.find(e => e.slug === item.slug);
        return extra ? (lang === 'en' ? extra.name_en : extra.name_no) : item.slug;
      }).join(', ');

      const confirmMessage = lang === 'en'
        ? `You are removing: ${itemNames}.\n\nProduction is tight after the cutoff date. You will NOT be able to add these items back. Are you sure?`
        : `Du fjerner: ${itemNames}.\n\nProduksjonen er stram etter fristdato. Du vil IKKE kunne legge disse tilbake. Er du sikker?`;

      if (!window.confirm(confirmMessage)) {
        return; // User cancelled
      }
    }

    onConfirm(selectedExtras, proceedToPayment);
  }

  function calculateTotal() {
    return extras.reduce((total, extra) => {
      const quantity = selectedQuantities[extra.slug] || 0;
      return total + extra.price_nok * quantity;
    }, 0);
  }

  function calculateSelectedCount() {
    return extras.reduce((count, extra) => {
      const quantity = selectedQuantities[extra.slug] || 0;
      if (quantity <= 0) return count;
      return count + (extra.pricing_type === 'per_kg' ? 1 : quantity);
    }, 0);
  }

  function calculateCurrentExtrasTotal() {
    return currentExtras.reduce((total, extra) => {
      const catalogItem = extras.find((e) => e.slug === extra.slug);
      if (!catalogItem) return total;
      return total + catalogItem.price_nok * extra.quantity;
    }, 0);
  }

  function calculateDeltaAmount() {
    return calculateTotal() - calculateCurrentExtrasTotal();
  }

  function formatDeltaLabel() {
    const delta = calculateDeltaAmount();
    const formatted = Math.abs(delta).toLocaleString('nb-NO');
    if (delta === 0) return 'Ingen endringer';
    return `${delta > 0 ? '+' : '-'}kr ${formatted}`;
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onWheel={(event) => event.stopPropagation()}
      onTouchMove={(event) => event.stopPropagation()}
    >
      <div
        className={cn(
          'relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200',
          theme.bgCard
        )}
      >
        {/* Header */}
        <div className={cn('sticky top-0 z-10 px-8 py-6 border-b', theme.bgCard, theme.borderSecondary)}>
          <button
            onClick={onClose}
            className={cn(
              'absolute top-6 right-6 p-2 rounded-full transition-colors',
              theme.textMuted,
              'hover:bg-black/5'
            )}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="pr-12">
            <h2 className={cn('text-3xl font-bold mb-2', theme.textPrimary)}>
              Legg til ekstra produkter
            </h2>
            <p className={cn('text-base', theme.textSecondary)}>
              Øk din bestilling før du betaler restbeløpet. Alle priser legges til restbeløpet.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-8 py-6 pb-28 overflow-y-auto overscroll-contain max-h-[calc(90vh-220px)]">
          {loadingExtras ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
            </div>
          ) : extras.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart className={cn('w-16 h-16 mx-auto mb-4', theme.iconColor)} />
              <p className={cn('text-lg', theme.textSecondary)}>
                Ingen ekstra produkter tilgjengelig for øyeblikket
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {extras.map((extra, idx) => {
                const quantity = selectedQuantities[extra.slug] || 0;
                const name = lang === 'en' ? extra.name_en : extra.name_no;
                const description = lang === 'en' ? extra.description_en : extra.description_no;
                const unit = extra.pricing_type === 'per_kg' ? 'kg' : 'stk';
                const priceLabel = `kr ${extra.price_nok}/${unit}`;
                const isOutOfStock = extra.stock_quantity !== null && extra.stock_quantity <= 0;
                const isLowStock = extra.stock_quantity !== null && extra.stock_quantity > 0 && extra.stock_quantity <= 5;
                const minValue = 0;
                const stepValue = extra.pricing_type === 'per_kg' ? 0.5 : 1;
                return (
                  <div
                    key={extra.id}
                    className={cn(
                      'flex items-center gap-6 p-6 rounded-2xl border transition-all',
                      quantity > 0 ? 'border-green-500 bg-green-50/50' : theme.borderSecondary,
                      isOutOfStock && 'opacity-50'
                    )}
                  >
                    <div className="w-20 h-20 flex-shrink-0 flex items-center justify-center rounded-lg bg-white/5 text-2xl">
                      🥩
                    </div>

                    <div className="flex-1">
                      <h3 className={cn('text-lg font-semibold mb-1', theme.textPrimary)}>
                        {name}
                        {idx < 3 && (
                          <span className="ml-2 inline-block bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full text-xs font-medium">Anbefalt</span>
                        )}
                        {isOutOfStock && (
                          <span className="ml-2 text-sm font-normal text-red-600">(Utsolgt)</span>
                        )}
                      </h3>
                      <p className={cn('text-sm mb-2', theme.textSecondary)}>{description}</p>
                      <p className={cn('text-lg font-bold', theme.textPrimary)}>{priceLabel}</p>
                      {extra.stock_quantity !== null && !isOutOfStock && (
                        <p className={cn(
                          'text-xs mt-1 font-medium',
                          isLowStock ? 'text-amber-600' : theme.textMuted
                        )}>
                          {isLowStock && '⚠️ '}{extra.stock_quantity} på lager
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(extra.slug, -1, extra.pricing_type)}
                        disabled={quantity === 0 || isOutOfStock}
                        className={cn(
                          'p-3 rounded-xl transition-all border-2',
                          quantity === 0 || isOutOfStock
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:scale-110 hover:bg-black/5 border-neutral-300'
                        )}
                      >
                        <Minus className="w-5 h-5" />
                      </button>

                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min={minValue}
                          step={stepValue}
                          value={quantity || ''}
                          onChange={(e) => {
                            const inputValue = e.target.value;
                            if (inputValue === '' || inputValue === '0') {
                              setDirectQuantity(extra.slug, 0);
                            } else {
                              const value = parseFloat(inputValue);
                              if (!isNaN(value) && value >= 0) {
                                setDirectQuantity(extra.slug, value);
                              }
                            }
                          }}
                          onBlur={(e) => {
                            // Round on blur for cleaner display
                            const value = parseFloat(e.target.value);
                            if (!isNaN(value)) {
                              const rounded = extra.pricing_type === 'per_kg'
                                ? Math.round(value * 10) / 10
                                : Math.round(value);
                              setDirectQuantity(extra.slug, rounded);
                            }
                          }}
                          disabled={isOutOfStock}
                          className={cn(
                            'w-20 text-center font-bold text-lg border-2',
                            quantity > 0 ? 'border-green-500' : 'border-neutral-300',
                            isOutOfStock && 'opacity-50 cursor-not-allowed'
                          )}
                        />
                        <span className={cn('text-sm font-medium min-w-[2rem]', theme.textPrimary)}>
                          {unit}
                        </span>
                      </div>

                      <button
                        onClick={() => updateQuantity(extra.slug, 1, extra.pricing_type)}
                        disabled={
                          isOutOfStock ||
                          (extra.stock_quantity !== null && quantity >= extra.stock_quantity)
                        }
                        className={cn(
                          'p-3 rounded-xl transition-all border-2',
                          isOutOfStock ||
                            (extra.stock_quantity !== null && quantity >= extra.stock_quantity)
                            ? 'opacity-30 cursor-not-allowed'
                            : 'hover:scale-110 hover:bg-green-500 hover:text-white hover:border-green-500 border-green-500 text-green-600'
                        )}
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={cn('sticky bottom-0 px-8 py-6 border-t', theme.bgCard, theme.borderSecondary)}>
            <div className="flex items-center justify-between gap-6">
            <div>
              <p className={cn('text-sm mb-1', theme.textMuted)}>Ekstra produkter valgt:</p>
              <p className={cn('text-2xl font-bold', theme.textPrimary)}>
                {calculateSelectedCount()} stk • kr {calculateTotal().toLocaleString('nb-NO')}
              </p>
              <p className={cn('text-xs mt-1', theme.textMuted)}>
                Endring: {formatDeltaLabel()}
              </p>
              <p className={cn('text-xs mt-1', theme.textMuted)}>
                Dette beløpet legges til restbeløpet ditt
              </p>
            </div>
            <div className="flex gap-4">
              <Button variant="outline" onClick={onClose} disabled={loading} className="px-8">
                Avbryt
              </Button>
              {isPaymentFlow ? (
                // Payment flow: Update extras and go to summary
                <Button
                  onClick={() => handleConfirm(true)}
                  disabled={loading}
                  className="px-8 bg-green-600 hover:bg-green-700 text-white"
                  aria-disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Oppdaterer...
                    </>
                  ) : (
                    `Oppdater ekstra bestilling (${formatDeltaLabel()}) og gå til oppsummering`
                  )}
                </Button>
              ) : (
                // Normal flow: Just save
                <Button
                  onClick={() => handleConfirm(false)}
                  disabled={loading || calculateDeltaAmount() === 0}
                  className="px-8 bg-green-600 hover:bg-green-700 text-white"
                  aria-disabled={loading || calculateDeltaAmount() === 0}
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      Lagrer...
                    </>
                  ) : (
                      `Oppdater ekstra bestilling (${formatDeltaLabel()})`
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
