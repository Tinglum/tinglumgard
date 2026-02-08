'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLanguage } from '@/lib/eggs/language-context'
import { Breed, WeekInventory } from '@/lib/eggs/types'
import { formatPrice, formatDate, clamp } from '@/lib/eggs/utils'
import { GlassCard } from './GlassCard'
import { X, Minus, Plus, Calendar, Package, Info } from 'lucide-react'

interface QuantitySelectorProps {
  breed: Breed
  week: WeekInventory
  initialQuantity?: number
  onClose: () => void
  onContinue: (quantity: number) => void
}

export function QuantitySelector({ breed, week, initialQuantity, onClose, onContinue }: QuantitySelectorProps) {
  const { language, t } = useLanguage()
  const maxQuantity = Math.min(week.eggsAvailable, breed.maxOrderQuantity)
  const minQuantity = 1
  const defaultQuantity = Math.max(10, breed.minOrderQuantity)
  const [quantity, setQuantity] = useState(
    clamp(
      initialQuantity ?? defaultQuantity,
      minQuantity,
      Math.min(maxQuantity, breed.maxOrderQuantity)
    )
  )

  useEffect(() => {
    setQuantity(
      clamp(
        initialQuantity ?? defaultQuantity,
        minQuantity,
        Math.min(maxQuantity, breed.maxOrderQuantity)
      )
    )
  }, [initialQuantity, defaultQuantity, maxQuantity])

  const handleQuantityChange = (newQuantity: number) => {
    setQuantity(clamp(newQuantity, minQuantity, maxQuantity))
  }

  const subtotal = quantity * breed.pricePerEgg

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-40 flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        {/* Mobile: Bottom sheet, Desktop: Centered modal */}
        <motion.div
          initial={{ y: '100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full md:max-w-lg md:rounded-xl rounded-t-xl md:rounded-b-lg overflow-hidden"
        >
          <GlassCard variant="strong" className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h2 className="text-2xl font-display font-semibold text-neutral-900 mb-2">
                  {breed.name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-neutral-600">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {t.common.week} {week.weekNumber} · {formatDate(week.deliveryMonday, language)}
                  </span>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-neutral-400 hover:text-neutral-900 transition-colors p-1 focus-ring rounded"
                aria-label="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Availability info */}
            <div className="glass-dark rounded-xl p-4 mb-6 flex items-start gap-3">
              <Info className="w-5 h-5 text-neutral-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-neutral-700">
                {week.eggsAvailable} {t.quantity.available}
              </p>
            </div>

            {/* Quantity selector with numeric input + slider */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-neutral-700 mb-4">
                {t.quantity.numberOfEggs}
              </label>

              {/* Numeric input with +/- buttons */}
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={() => handleQuantityChange(quantity - 1)}
                  disabled={quantity <= minQuantity}
                  className="w-12 h-12 rounded-full glass-light flex items-center justify-center hover:glass-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring"
                  aria-label="Decrease quantity"
                >
                  <Minus className="w-5 h-5 text-neutral-700" />
                </button>

                <div className="flex-1">
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => handleQuantityChange(parseInt(e.target.value) || minQuantity)}
                    min={minQuantity}
                    max={maxQuantity}
                    className="w-full text-center text-4xl font-display font-semibold text-neutral-900 bg-transparent border-none focus:outline-none focus:ring-4 focus:ring-black/5 rounded"
                    style={{ MozAppearance: 'textfield' }}
                  />
                  <style jsx>{`
                    input::-webkit-outer-spin-button,
                    input::-webkit-inner-spin-button {
                      -webkit-appearance: none;
                      margin: 0;
                    }
                  `}</style>
                </div>

                <button
                  onClick={() => handleQuantityChange(quantity + 1)}
                  disabled={quantity >= maxQuantity}
                  className="w-12 h-12 rounded-full glass-light flex items-center justify-center hover:glass-strong disabled:opacity-40 disabled:cursor-not-allowed transition-all focus-ring"
                  aria-label="Increase quantity"
                >
                  <Plus className="w-5 h-5 text-neutral-700" />
                </button>
              </div>

              {/* Slider (secondary input method) */}
              <div className="relative">
                <input
                  type="range"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value))}
                  min={minQuantity}
                  max={maxQuantity}
                  step={1}
                  className="w-full h-2 bg-neutral-200 rounded-full appearance-none cursor-pointer focus:outline-none focus:ring-4 focus:ring-black/5"
                  style={{
                    background: `linear-gradient(to right, ${breed.accentColor} 0%, ${breed.accentColor} ${
                      ((quantity - minQuantity) / Math.max(1, maxQuantity - minQuantity)) * 100
                    }%, #e5e5e5 ${
                      ((quantity - minQuantity) / Math.max(1, maxQuantity - minQuantity)) * 100
                    }%, #e5e5e5 100%)`,
                  }}
                />
                <style jsx>{`
                  input[type='range']::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    appearance: none;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: ${breed.accentColor};
                    cursor: pointer;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  }
                  input[type='range']::-moz-range-thumb {
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background: ${breed.accentColor};
                    cursor: pointer;
                    border: none;
                    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                  }
                `}</style>
              </div>

              <p className="text-xs text-neutral-500 text-center mt-3">
                {t.quantity.min}: {breed.minOrderQuantity}, {t.quantity.max}: {maxQuantity} {t.quantity.eggs}
              </p>
            </div>

            {/* Price breakdown */}
            <div className="space-y-3 mb-6 pt-6 border-t border-neutral-200">
              <div className="flex justify-between items-baseline text-sm">
                <span className="text-neutral-600">
                  {quantity} × {formatPrice(breed.pricePerEgg, language)}
                </span>
                <span className="font-medium text-neutral-900">{formatPrice(subtotal, language)}</span>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-base font-medium text-neutral-900">{t.quantity.subtotal}</span>
                <span className="text-2xl font-display font-semibold text-neutral-900">
                  {formatPrice(subtotal, language)}
                </span>
              </div>
              <p className="text-xs text-neutral-500">+ {t.quantity.shippingCalculated}</p>
            </div>

            {/* Continue button */}
            <button onClick={() => onContinue(quantity)} className="btn-primary w-full">
              {t.quantity.addToCart}
            </button>
          </GlassCard>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
