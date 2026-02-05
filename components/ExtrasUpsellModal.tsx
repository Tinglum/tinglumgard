'use client';

import { useState, useEffect, useRef } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { X, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExtraProductsSelector } from '@/components/ExtraProductsSelector';

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
  default_quantity?: number | null;
  active: boolean;
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
    return Object.values(selectedQuantities).filter(qty => qty > 0).length;
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
            <ExtraProductsSelector
              availableExtras={extras}
              selectedQuantities={selectedQuantities}
              onQuantityChange={handleQuantityChange}
              disabled={loading}
              theme={theme}
              translations={{
                quantity: 'Antall',
                kg: 'kg',
                stk: 'stk'
              }}
            />
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
                    `Oppdater ekstra bestilling (${formatDeltaLabel()})`
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
