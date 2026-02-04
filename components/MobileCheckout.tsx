"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, ChevronRight, Package } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ReferralCodeInput } from '@/components/ReferralCodeInput';
import { RebateCodeInput } from '@/components/RebateCodeInput';

interface MobileCheckoutProps {
  step: number;
  setStep: (step: number) => void;
  boxSize: '8' | '12' | '';
  setBoxSize: (size: '8' | '12') => void;
  ribbeChoice: 'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | '';
  setRibbeChoice: (choice: 'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | '') => void;
  extraProducts: string[];
  setExtraProducts: (products: string[]) => void;
  extraQuantities: Record<string, number>;
  setExtraQuantities: (quantities: Record<string, number>) => void;
  availableExtras: any[];
  deliveryType: 'farm' | 'trondheim' | 'e6';
  setDeliveryType: (type: 'farm' | 'trondheim' | 'e6') => void;
  freshDelivery: boolean;
  setFreshDelivery: (fresh: boolean) => void;
  agreedToTerms: boolean;
  setAgreedToTerms: (agreed: boolean) => void;
  agreedToDepositPolicy: boolean;
  setAgreedToDepositPolicy: (agreed: boolean) => void;
  isProcessing: boolean;
  handleCheckout: () => void;
  prices: any;
  addonPrices: any;
  depositTotal: number;
  remainderTotal: number;
  totalPrice: number;
  baseDepositTotal: number;
  referralData: any;
  setReferralData: (data: any) => void;
  rebateData: any;
  setRebateData: (data: any) => void;
  referralDiscount: number;
  rebateDiscount: number;
}

export function MobileCheckout(props: MobileCheckoutProps) {
  const {
    step,
    setStep,
    boxSize,
    setBoxSize,
    ribbeChoice,
    setRibbeChoice,
    extraProducts,
    setExtraProducts,
    extraQuantities,
    setExtraQuantities,
    availableExtras,
    deliveryType,
    setDeliveryType,
    freshDelivery,
    setFreshDelivery,
    agreedToTerms,
    setAgreedToTerms,
    agreedToDepositPolicy,
    setAgreedToDepositPolicy,
    isProcessing,
    handleCheckout,
    prices,
    addonPrices,
    depositTotal,
    remainderTotal,
    totalPrice,
    baseDepositTotal,
    referralData,
    setReferralData,
    rebateData,
    setRebateData,
    referralDiscount,
    rebateDiscount,
  } = props;

  const boxContents = {
    '8': [
      'ca. 2.0 kg ribbe',
      'ca. 0.75 kg nakkekoteletter',
      'ca. 0.5 kg julepølse',
      'ca. 1.0 kg svinesteik',
      'ca. 1.0 kg medisterfarse',
      '1 knoke',
      '+ Slakterens valg (ca. 2-3 kg)',
    ],
    '12': [
      'ca. 3.0 kg ribbe',
      'ca. 1.0 kg nakkekoteletter',
      'ca. 1.0 kg julepølse',
      'ca. 1.0 kg svinesteik',
      'ca. 1.5 kg medisterfarse',
      '1 knoke',
      '+ Slakterens valg (ca. 3.5-4.5 kg)',
    ],
  };

  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-32">
      {/* Progress Indicator */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-mobile-strong rounded-3xl p-4 mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                step >= s
                  ? 'bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg'
                  : 'bg-white/20 text-white/50'
              }`}
              style={{ textShadow: step >= s ? '0 2px 8px rgba(0,0,0,0.9)' : 'none' }}
            >
              {step > s ? <Check className="w-5 h-5" /> : s}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          {['Størrelse', 'Ribbe', 'Ekstra', 'Levering'].map((label, i) => (
            <span
              key={label}
              className="font-semibold text-white"
              style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
            >
              {label}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Step 1: Box Size */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 px-4 py-8"
        >
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--farm-earth)' }}>
            Velg kassestørrelse
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--farm-bark)' }}>
            Velg den størrelsen som passer for husstanden din
          </p>

          {(['8', '12'] as const).map((size) => (
            <motion.button
              key={size}
              onClick={() => {
                setBoxSize(size);
                setStep(2);
              }}
              whileTap={{ scale: 0.98 }}
              className={`w-full card-mobile p-6 text-left transition-all ${
                boxSize === size ? 'ring-2' : ''
              }`}
              style={{
                borderColor: boxSize === size ? 'var(--farm-moss)' : 'transparent',
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="text-4xl font-bold mb-1" style={{ color: 'var(--farm-earth)' }}>
                    {size} <span className="text-xl" style={{ color: 'var(--farm-bark)' }}>kg</span>
                  </div>
                  <div className="text-sm" style={{ color: 'var(--farm-bark)' }}>
                    {size === '8' ? '2-3 personer' : '4-6 personer'}
                  </div>
                </div>
                {prices && prices[size].total > 0 ? (
                  <div className="text-right">
                    <div className="text-2xl font-bold" style={{ color: 'var(--farm-earth)' }}>
                      {prices[size].total.toLocaleString('nb-NO')} kr
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--farm-bark)' }}>
                      Forskudd: {Math.floor(prices[size].total * 0.5).toLocaleString('nb-NO')} kr
                    </div>
                  </div>
                ) : (
                  <div className="text-lg pulse-loading" style={{ color: 'var(--farm-bark)' }}>
                    Laster...
                  </div>
                )}
              </div>

              {boxSize === size && boxContents[size] && (
                <div className="pt-4 border-t space-y-2" style={{ borderColor: 'var(--farm-snow)' }}>
                  <div className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: 'var(--farm-bark)' }}>
                    I kassen:
                  </div>
                  {boxContents[size].slice(0, 6).map((item, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--status-success)' }} />
                      <span className="text-sm" style={{ color: 'var(--farm-bark)' }}>
                        {item}
                      </span>
                    </div>
                  ))}
                  {boxContents[size].length > 6 && (
                    <p className="text-xs ml-6" style={{ color: 'var(--farm-bark)' }}>
                      + {boxContents[size].length - 6} mer
                    </p>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </motion.div>
      )}

      {/* Step 2: Ribbe Choice */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 px-4 py-8"
        >
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={() => setStep(1)}
              className="text-sm font-medium"
              style={{ color: 'var(--farm-moss)' }}
            >
              ← Endre størrelse
            </button>
          </div>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--farm-earth)' }}>
            Velg ribbetype
          </h2>
          <p className="text-base mb-6" style={{ color: 'var(--farm-bark)' }}>
            Vi anbefaler slakterens valg for beste kvalitet
          </p>

          <div className="space-y-3">
            {[
              { id: 'tynnribbe' as const, name: 'Tynnribbe', desc: 'Klassisk ribbe med ribbein' },
              { id: 'familieribbe' as const, name: 'Familieribbe', desc: 'Inkluderer kotelettkam - mer kjøtt' },
              { id: 'porchetta' as const, name: 'Porchetta', desc: 'Beinfri nedre mage - italiensk stil' },
              { id: 'butchers_choice' as const, name: 'Slakterens valg', desc: 'Vi velger basert på tilgjengelighet', recommended: true },
            ].map((option) => (
              <motion.button
                key={option.id}
                onClick={() => {
                  setRibbeChoice(option.id);
                  setStep(3);
                }}
                whileTap={{ scale: 0.98 }}
                className={`w-full card-mobile p-5 text-left transition-all ${
                  ribbeChoice === option.id ? 'ring-2' : ''
                }`}
                style={{
                  borderColor: ribbeChoice === option.id ? 'var(--farm-moss)' : 'transparent',
                }}
              >
                <div className="flex items-start gap-4">
                  <input
                    type="radio"
                    checked={ribbeChoice === option.id}
                    onChange={() => {}}
                    className="mt-1 w-5 h-5 flex-shrink-0"
                    style={{ accentColor: 'var(--farm-moss)' }}
                  />
                  <div className="flex-1">
                    <div className="font-semibold mb-1" style={{ color: 'var(--farm-earth)' }}>
                      {option.name}
                      {option.recommended && (
                        <span
                          className="ml-2 text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: 'var(--accent-gold)', color: 'white' }}
                        >
                          Anbefalt
                        </span>
                      )}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--farm-bark)' }}>
                      {option.desc}
                    </div>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Step 3: Extras */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 px-4 py-8"
        >
          <button
            onClick={() => setStep(2)}
            className="text-sm font-medium mb-4"
            style={{ color: 'var(--farm-moss)' }}
          >
            ← Tilbake
          </button>
          <div>
            <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--farm-earth)' }}>
              Levering
            </h2>
            <div className="space-y-2 mb-6">
              {[
                { id: 'farm' as const, name: 'Henting på gården', desc: 'Gratis henting', price: 0 },
                { id: 'trondheim' as const, name: 'Levering Trondheim', desc: 'Vi leverer til deg', price: addonPrices.trondheim },
                { id: 'e6' as const, name: 'Henting E6', desc: 'Møtepunkt langs E6', price: addonPrices.e6 },
              ].map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDeliveryType(option.id)}
                  className={`w-full card-mobile p-4 text-left flex justify-between items-center transition-all ${
                    deliveryType === option.id ? 'ring-2' : ''
                  }`}
                  style={{
                    borderColor: deliveryType === option.id ? 'var(--farm-moss)' : 'transparent',
                  }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--farm-earth)' }}>{option.name}</div>
                    <div className="text-sm" style={{ color: 'var(--farm-bark)' }}>{option.desc}</div>
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--farm-earth)' }}>
                    {option.price > 0 ? `${option.price} kr` : 'Gratis'}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--farm-earth)' }}>
              Ekstra produkter <span className="text-base font-normal" style={{ color: 'var(--farm-bark)' }}>(valgfritt)</span>
            </h3>
            <div className="space-y-3">
          {availableExtras
            .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
            .map((extra) => {
              const isSelected = extraProducts.includes(extra.slug);
              const quantity = extraQuantities[extra.slug] !== undefined ? extraQuantities[extra.slug] : (extra.default_quantity || 1);

              return (
                <motion.div
                  key={extra.slug}
                  whileTap={{ scale: 0.98 }}
                  className={`card-mobile p-5 transition-all ${
                    isSelected ? 'ring-2' : ''
                  }`}
                  style={{
                    borderColor: isSelected ? 'var(--farm-moss)' : 'transparent',
                  }}
                >
                  <label className="flex gap-4 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setExtraProducts(
                          extraProducts.includes(extra.slug)
                            ? extraProducts.filter(p => p !== extra.slug)
                            : [...extraProducts, extra.slug]
                        );
                        if (!isSelected && !extraQuantities[extra.slug]) {
                          const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                          setExtraQuantities({
                            ...extraQuantities,
                            [extra.slug]: defaultQty
                          });
                        }
                      }}
                      className="w-5 h-5 mt-1 rounded"
                      style={{ accentColor: 'var(--farm-moss)' }}
                    />
                    <div className="flex-1">
                      <div className="font-semibold mb-1" style={{ color: 'var(--farm-earth)' }}>
                        {extra.name_no}
                      </div>
                      {extra.description_no && (
                        <div className="text-sm mb-2" style={{ color: 'var(--farm-bark)' }}>
                          {extra.description_no}
                        </div>
                      )}
                      <div className="text-lg font-bold" style={{ color: 'var(--farm-earth)' }}>
                        {extra.price_nok} kr
                        <span className="text-sm ml-1" style={{ color: 'var(--farm-bark)' }}>
                          /{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                        </span>
                      </div>
                    </div>
                  </label>

                  {isSelected && (
                    <div className="mt-4 pt-4 border-t flex items-center gap-3" style={{ borderColor: 'var(--farm-snow)' }}>
                      <label className="text-sm font-semibold" style={{ color: 'var(--farm-bark)' }}>
                        Mengde:
                      </label>
                      <Input
                        type="number"
                        min={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                        step={extra.pricing_type === 'per_kg' ? '0.1' : '1'}
                        value={quantity}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value > 0) {
                            setExtraQuantities({
                              ...extraQuantities,
                              [extra.slug]: value
                            });
                          }
                        }}
                        className="w-24 text-center font-bold"
                      />
                      <span className="text-sm font-semibold" style={{ color: 'var(--farm-bark)' }}>
                        {extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                      </span>
                    </div>
                  )}
                </motion.div>
              );
            })}

          <button
            onClick={() => setStep(4)}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2"
          >
            Fortsett <ChevronRight className="w-5 h-5" />
          </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 4: Summary & Payment */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6 px-4 py-8 pb-32"
        >
          <button
            onClick={() => setStep(3)}
            className="text-sm font-medium mb-4"
            style={{ color: 'var(--farm-moss)' }}
          >
            ← Tilbake
          </button>

          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--farm-earth)' }}>
            Oppsummering
          </h2>

          {/* Order Summary Card */}
          <div className="card-mobile-dark p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--farm-snow)' }}>
                {boxSize}kg kasse
              </span>
              <span className="font-semibold" style={{ color: 'var(--farm-snow)' }}>
                {prices && prices[boxSize] ? `${prices[boxSize].total.toLocaleString('nb-NO')} kr` : '...'}
              </span>
            </div>

            <div className="flex justify-between items-center" style={{ color: 'rgba(244, 241, 232, 0.7)' }}>
              <span>
                {ribbeChoice === 'tynnribbe' && 'Tynnribbe'}
                {ribbeChoice === 'familieribbe' && 'Familieribbe'}
                {ribbeChoice === 'porchetta' && 'Porchetta'}
                {ribbeChoice === 'butchers_choice' && 'Slakterens valg'}
              </span>
              <span>Inkludert</span>
            </div>

            {deliveryType !== 'farm' && (
              <div className="flex justify-between items-center" style={{ color: 'rgba(244, 241, 232, 0.7)' }}>
                <span>
                  {deliveryType === 'trondheim' && 'Levering Trondheim'}
                  {deliveryType === 'e6' && 'Henting E6'}
                </span>
                <span>
                  {deliveryType === 'trondheim' && `${addonPrices?.trondheim || 200} kr`}
                  {deliveryType === 'e6' && `${addonPrices?.e6 || 300} kr`}
                </span>
              </div>
            )}

            {freshDelivery && (
              <div className="flex justify-between items-center" style={{ color: 'rgba(244, 241, 232, 0.7)' }}>
                <span>Fersk levering</span>
                <span>{addonPrices?.fresh || 500} kr</span>
              </div>
            )}

            {extraProducts.length > 0 && extraProducts.map(slug => {
              const extra = availableExtras.find(e => e.slug === slug);
              const quantity = extraQuantities[slug] || 1;
              if (!extra) return null;
              return (
                <div key={slug} className="flex justify-between items-center" style={{ color: 'rgba(244, 241, 232, 0.7)' }}>
                  <span>{extra.name_no} ({quantity}{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'})</span>
                  <span>{(extra.price_nok * quantity).toLocaleString('nb-NO')} kr</span>
                </div>
              );
            })}

            {/* Divider */}
            <div className="border-t pt-4" style={{ borderColor: 'rgba(255, 255, 255, 0.2)' }}>
              {(referralDiscount > 0 || rebateDiscount > 0) && (
                <div className="flex justify-between mb-2" style={{ color: 'var(--status-success)' }}>
                  <span>Rabatt</span>
                  <span className="font-semibold">-{(referralDiscount || rebateDiscount).toLocaleString('nb-NO')} kr</span>
                </div>
              )}
              
              <div className="flex justify-between text-lg mb-2">
                <span className="font-semibold" style={{ color: 'var(--farm-snow)' }}>Totalpris</span>
                <span className="font-bold" style={{ color: 'var(--accent-gold)' }}>
                  {totalPrice.toLocaleString('nb-NO')} kr
                </span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(244, 241, 232, 0.7)' }}>Forskudd (50%)</span>
                <span style={{ color: 'var(--farm-snow)' }}>{depositTotal.toLocaleString('nb-NO')} kr</span>
              </div>
              
              <div className="flex justify-between text-sm">
                <span style={{ color: 'rgba(244, 241, 232, 0.7)' }}>Rest ved levering</span>
                <span style={{ color: 'var(--farm-snow)' }}>{remainderTotal.toLocaleString('nb-NO')} kr</span>
              </div>
            </div>
          </div>

          {/* Discount Codes */}
          {!rebateData && (
            <div className="card-mobile p-4">
              <ReferralCodeInput
                depositAmount={baseDepositTotal}
                onCodeApplied={(data) => {
                  setReferralData({
                    code: data.code,
                    discountPercentage: data.discountPercentage,
                    discountAmount: data.discountAmount,
                    referrerPhone: data.referrerUserId,
                  });
                  setRebateData(null);
                }}
                onCodeRemoved={() => setReferralData(null)}
              />
            </div>
          )}

          {!referralData && (
            <div className="card-mobile p-4">
              <RebateCodeInput
                depositAmount={baseDepositTotal}
                boxSize={parseInt(boxSize)}
                onCodeApplied={(data) => {
                  setRebateData({
                    code: data.code,
                    discountAmount: data.discountAmount,
                    description: data.description,
                  });
                  setReferralData(null);
                }}
                onCodeRemoved={() => setRebateData(null)}
              />
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToDepositPolicy}
                onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                className="mt-1"
                style={{ accentColor: 'var(--farm-moss)' }}
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--farm-bark)' }}>
                <strong style={{ color: 'var(--farm-earth)' }}>Jeg forstår at forskuddet ikke refunderes.</strong> Dette utløser produksjonsplanlegging.
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
                style={{ accentColor: 'var(--farm-moss)' }}
              />
              <span className="text-sm leading-relaxed" style={{ color: 'var(--farm-bark)' }}>
                Jeg godtar <a href="/vilkar" className="underline" style={{ color: 'var(--farm-moss)' }}>vilkårene</a>
              </span>
            </label>
          </div>

          {/* Sticky Footer with Payment Button */}
          <div className="fixed bottom-0 left-0 right-0 border-t p-4" style={{ backgroundColor: 'white', borderColor: 'var(--farm-snow)' }}>
            <button
              disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
              onClick={handleCheckout}
              className="w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 disabled:opacity-50 touch-feedback"
              style={{ 
                backgroundColor: (!agreedToTerms || !agreedToDepositPolicy || isProcessing) ? 'var(--farm-bark)' : 'var(--farm-earth)',
                color: 'var(--farm-snow)'
              }}
            >
              {isProcessing ? (
                'Behandler...'
              ) : (
                <>
                  <span>Betal forskudd {depositTotal.toLocaleString('nb-NO')} kr</span>
                </>
              )}
            </button>
            <div className="text-xs text-center mt-2" style={{ color: 'var(--farm-bark)' }}>
              Sikker betaling med Vipps
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
