'use client';

import { useState, useEffect } from 'react';
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
  onConfirm: (selectedExtras: { slug: string; quantity: number }[]) => void;
  currentExtras?: { slug: string; quantity: number }[];
  loading?: boolean;
}

export function ExtrasUpsellModal({
  isOpen,
  onClose,
  onConfirm,
  currentExtras = [],
  loading = false,
}: ExtrasUpsellModalProps) {
  const { getThemeClasses } = useTheme();
  const { lang } = useLanguage();
  const theme = getThemeClasses();

  const [extras, setExtras] = useState<Extra[]>([]);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [loadingExtras, setLoadingExtras] = useState(true);

  useEffect(() => {
    if (isOpen) {
      loadExtras();
      // Initialize with current extras
      const initialQuantities: Record<string, number> = {};
      currentExtras.forEach((extra) => {
        initialQuantities[extra.slug] = extra.quantity;
      });
      setSelectedQuantities(initialQuantities);
    }
  }, [isOpen, currentExtras]);

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

  function handleConfirm() {
    const selectedExtras = Object.entries(selectedQuantities)
      .filter(([_, quantity]) => quantity > 0)
      .map(([slug, quantity]) => ({ slug, quantity }));

    onConfirm(selectedExtras);
  }

  function calculateTotal() {
    return extras.reduce((total, extra) => {
      const quantity = selectedQuantities[extra.slug] || 0;
      return total + extra.price_nok * quantity;
    }, 0);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
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
        <div className="px-8 py-6 overflow-y-auto max-h-[calc(90vh-220px)]">
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
              {extras.map((extra) => {
                const quantity = selectedQuantities[extra.slug] || 0;
                const name = lang === 'en' ? extra.name_en : extra.name_no;
                const description = lang === 'en' ? extra.description_en : extra.description_no;
                const unit = extra.pricing_type === 'per_kg' ? 'kg' : 'stk';
                const priceLabel = `kr ${extra.price_nok}/${unit}`;
                const isOutOfStock = extra.stock_quantity !== null && extra.stock_quantity <= 0;
                const minValue = extra.pricing_type === 'per_kg' ? 0.1 : 1;
                const stepValue = extra.pricing_type === 'per_kg' ? 0.1 : 1;

                return (
                  <div
                    key={extra.id}
                    className={cn(
                      'flex items-center gap-6 p-6 rounded-2xl border transition-all',
                      quantity > 0 ? 'border-green-500 bg-green-50/50' : theme.borderSecondary,
                      isOutOfStock && 'opacity-50'
                    )}
                  >
                    <div className="flex-1">
                      <h3 className={cn('text-lg font-semibold mb-1', theme.textPrimary)}>
                        {name}
                        {isOutOfStock && (
                          <span className="ml-2 text-sm font-normal text-red-600">(Utsolgt)</span>
                        )}
                      </h3>
                      <p className={cn('text-sm mb-2', theme.textSecondary)}>{description}</p>
                      <p className={cn('text-lg font-bold', theme.textPrimary)}>{priceLabel}</p>
                      {extra.stock_quantity !== null && !isOutOfStock && (
                        <p className={cn('text-xs mt-1', theme.textMuted)}>
                          {extra.stock_quantity} på lager
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
              <p className={cn('text-sm mb-1', theme.textMuted)}>Ekstra produkter totalt:</p>
              <p className={cn('text-3xl font-bold', theme.textPrimary)}>
                kr {calculateTotal().toLocaleString('nb-NO')}
              </p>
              <p className={cn('text-xs mt-1', theme.textMuted)}>
                Dette beløpet legges til restbeløpet ditt
              </p>
            </div>

            <div className="flex gap-4">
              <Button variant="outline" onClick={onClose} disabled={loading} className="px-8">
                Avbryt
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={loading}
                className="px-8 bg-green-600 hover:bg-green-700 text-white"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Oppdaterer...
                  </>
                ) : (
                  'Bekreft og fortsett til betaling'
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
