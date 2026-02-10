'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Minus, Plus } from 'lucide-react';

interface ExtraProductCardProps {
  extra: {
    slug: string;
    name_no: string;
    name_en: string;
    description_no: string;
    description_en: string;
    price_nok: number;
    pricing_type: 'per_unit' | 'per_kg';
    stock_quantity: number | null;
  };
  quantity: number;
  onChange: (quantity: number) => void;
  disabled?: boolean;
}

export function ExtraProductCard({ extra, quantity, onChange, disabled }: ExtraProductCardProps) {
  const { getThemeClasses } = useTheme();
  const { lang, t } = useLanguage();
  const theme = getThemeClasses();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const copy = t.extraProductCard;

  const increment = extra.pricing_type === 'per_kg' ? 0.5 : 1;
  const totalPrice = quantity * extra.price_nok;
  const productName = lang === 'en' ? extra.name_en : extra.name_no;
  const productDescription = lang === 'en' ? extra.description_en : extra.description_no;
  const unitLabel = extra.pricing_type === 'per_kg' ? t.common.kg : copy.unitPieces;

  function handleIncrement() {
    onChange(quantity + increment);
  }

  function handleDecrement() {
    onChange(Math.max(0, quantity - increment));
  }

  function handleInputChange(value: string) {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed >= 0) {
      onChange(parsed);
    } else if (value === '') {
      onChange(0);
    }
  }

  return (
    <div className={cn('border rounded-lg p-4 transition-all',
      theme.borderSecondary,
      quantity > 0 && 'ring-2 ring-green-500/20'
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Product Info */}
        <div className="flex-1">
          <h3 className={cn('font-semibold mb-1', theme.textPrimary)}>
            {productName}
          </h3>
          <p className={cn('text-sm mb-2', theme.textSecondary)}>
            {productDescription}
          </p>
          <p className={cn('text-sm font-medium', theme.textPrimary)}>
            {t.common.currency} {extra.price_nok.toLocaleString(locale)}/{unitLabel}
          </p>
          {extra.stock_quantity !== null && extra.stock_quantity < 10 && (
            <p className="text-xs text-amber-600 mt-1">
              {extra.stock_quantity > 0
                ? copy.onlyLeft.replace('{count}', extra.stock_quantity.toString())
                : copy.soldOut}
            </p>
          )}
        </div>

        {/* Quantity Controls */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecrement}
            disabled={disabled || quantity === 0}
            className="h-9 w-9 p-0"
          >
            <Minus className="w-4 h-4" />
          </Button>

          <div className="flex flex-col items-center">
            <Input
              type="number"
              step={increment}
              min="0"
              value={quantity}
              onChange={(e) => handleInputChange(e.target.value)}
              disabled={disabled}
              className="w-20 text-center h-9"
            />
            <span className={cn('text-xs mt-1', theme.textMuted)}>
              {unitLabel}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleIncrement}
            disabled={disabled || (extra.stock_quantity !== null && quantity >= extra.stock_quantity)}
            className="h-9 w-9 p-0"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Total Price */}
      {quantity > 0 && (
        <div className={cn('mt-3 pt-3 border-t flex justify-between items-center', theme.borderSecondary)}>
          <span className={cn('text-sm', theme.textSecondary)}>
            {quantity} {unitLabel}
          </span>
          <span className={cn('text-lg font-bold', theme.textPrimary)}>
            {t.common.currency} {totalPrice.toLocaleString(locale)}
          </span>
        </div>
      )}
    </div>
  );
}
