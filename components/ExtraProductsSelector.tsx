'use client';

import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Check, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface Extra {
  slug: string;
  name_no: string;
  name_en?: string;
  description_no?: string;
  description_en?: string;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  default_quantity?: number | null;
  stock_quantity?: number | null;
  active: boolean;
}

interface ExtraProductsSelectorProps {
  availableExtras: Extra[];
  selectedQuantities: Record<string, number>;
  onQuantityChange: (slug: string, quantity: number) => void;
  disabled?: boolean;
  theme?: any;
  translations?: {
    quantity?: string;
    kg?: string;
    stk?: string;
  };
}

export function ExtraProductsSelector({
  availableExtras,
  selectedQuantities,
  onQuantityChange,
  disabled = false,
  theme,
  translations,
}: ExtraProductsSelectorProps) {
  const { lang, t } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';

  const copy = {
    quantity: translations?.quantity || t.extraProductsSelector.quantity,
    kg: translations?.kg || t.common.kg,
    stk: translations?.stk || t.extraProductsSelector.unitPieces,
    importantInfo: t.extraProductsSelector.importantInfo,
    warning: t.extraProductsSelector.warning,
    onlyLeft: t.extraProductsSelector.onlyLeft,
    totalExtras: t.extraProductsSelector.totalExtras,
  };

  const total = useMemo(() => {
    return Object.entries(selectedQuantities).reduce((sum, [slug, qty]) => {
      if (qty === 0) return sum;
      const extra = availableExtras.find((item) => item.slug === slug);
      return sum + (extra ? extra.price_nok * qty : 0);
    }, 0);
  }, [selectedQuantities, availableExtras]);

  return (
    <>
      <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-900 mb-1">
              {copy.importantInfo}
            </p>
            <p className="text-sm text-amber-800 leading-relaxed">
              {copy.warning}
            </p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {availableExtras.map((extra) => {
          const quantity = selectedQuantities[extra.slug] || 0;
          const isSelected = quantity > 0;
          const name = lang === 'en' && extra.name_en ? extra.name_en : extra.name_no;
          const description = lang === 'en' && extra.description_en ? extra.description_en : extra.description_no;

          return (
            <div
              key={extra.slug}
              className={cn(
                'group relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer',
                isSelected
                  ? 'border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl scale-105'
                  : theme?.borderSecondary && theme?.bgCard
                    ? cn(theme.borderSecondary, theme.bgCard, 'hover:shadow-lg hover:scale-102 hover:border-amber-300')
                    : 'border-gray-200 bg-white hover:shadow-lg hover:scale-102 hover:border-amber-300'
              )}
              onClick={() => {
                if (!disabled) {
                  if (isSelected) {
                    onQuantityChange(extra.slug, 0);
                  } else {
                    const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                    onQuantityChange(extra.slug, defaultQty);
                  }
                }
              }}
            >
              <div className="absolute top-4 right-4">
                <div className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all',
                  isSelected
                    ? 'bg-amber-500 border-amber-500 shadow-md'
                    : 'border-gray-300 bg-white group-hover:border-amber-400'
                )}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>

              <div className="pr-8">
                <h4 className={cn(
                  'text-lg font-bold mb-2',
                  theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
                )}>
                  {name}
                </h4>

                {description && (
                  <p className={cn(
                    'text-sm mb-3 leading-relaxed',
                    theme?.textMuted ? theme.textMuted : 'text-gray-600'
                  )}>
                    {description}
                  </p>
                )}

                <div className="flex items-baseline gap-2 mb-4">
                  <span className={cn(
                    'text-2xl font-bold',
                    isSelected ? 'text-amber-600' : theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
                  )}>
                    {extra.price_nok.toLocaleString(locale)} {t.common.currency}
                  </span>
                  <span className={cn(
                    'text-sm',
                    theme?.textMuted ? theme.textMuted : 'text-gray-600'
                  )}>
                    /{extra.pricing_type === 'per_kg' ? copy.kg : copy.stk}
                  </span>
                </div>

                {extra.stock_quantity !== null && extra.stock_quantity !== undefined && extra.stock_quantity < 10 && (
                  <p className="text-xs text-amber-600 mb-3">
                    {extra.stock_quantity > 0
                      ? copy.onlyLeft.replace('{count}', String(extra.stock_quantity))
                      : t.product.soldOut}
                  </p>
                )}

                {isSelected && (
                  <div
                    className="flex items-center gap-3 pt-4 border-t border-amber-200 animate-in fade-in slide-in-from-top-2 duration-300"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <label className={cn(
                      'text-sm font-semibold',
                      theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
                    )}>
                      {copy.quantity}
                    </label>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (extra.pricing_type === 'per_kg') {
                          const newQty = Math.floor((quantity - 0.1) / 0.5) * 0.5;
                          onQuantityChange(extra.slug, newQty);
                        } else {
                          const newQty = quantity - 1;
                          onQuantityChange(extra.slug, newQty);
                        }
                      }}
                      disabled={disabled}
                      className="h-10 w-10 p-0 font-bold text-lg"
                    >
                      -
                    </Button>

                    <Input
                      type="number"
                      min={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                      step={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                      value={quantity}
                      onChange={(event) => {
                        const value = parseFloat(event.target.value);
                        if (!isNaN(value) && value > 0) {
                          onQuantityChange(extra.slug, value);
                        }
                      }}
                      disabled={disabled}
                      className={cn(
                        'w-20 text-center font-bold text-lg border-2 border-amber-300 focus:border-amber-500',
                        theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
                      )}
                    />

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (extra.pricing_type === 'per_kg') {
                          const newQty = Math.ceil((quantity + 0.1) / 0.5) * 0.5;
                          onQuantityChange(extra.slug, newQty);
                        } else {
                          const newQty = quantity + 1;
                          onQuantityChange(extra.slug, newQty);
                        }
                      }}
                      disabled={disabled}
                      className="h-10 w-10 p-0 font-bold text-lg"
                    >
                      +
                    </Button>

                    <span className={cn(
                      'text-sm font-medium',
                      theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
                    )}>
                      {extra.pricing_type === 'per_kg' ? copy.kg : copy.stk}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className={cn(
          'mt-6 pt-4 border-t flex justify-between items-center',
          theme?.borderSecondary ? theme.borderSecondary : 'border-gray-200'
        )}>
          <span className={cn(
            'font-semibold',
            theme?.textPrimary ? theme.textPrimary : 'text-gray-900'
          )}>
            {copy.totalExtras}
          </span>
          <span className="text-xl font-bold text-amber-600">
            {total.toLocaleString(locale)} {t.common.currency}
          </span>
        </div>
      )}
    </>
  );
}
