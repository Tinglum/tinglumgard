"use client";

import { motion } from 'framer-motion';
import { useState } from 'react';
import { Check, ChevronRight, Package } from 'lucide-react';
import Image from 'next/image';
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
          className="space-y-4"
        >
          <h2
            className="text-3xl font-bold text-white mb-6"
            style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
          >
            Velg kassestørrelse
          </h2>

          {(['8', '12'] as const).map((size) => (
            <motion.button
              key={size}
              onClick={() => {
                setBoxSize(size);
                setStep(2);
              }}
              whileTap={{ scale: 0.98 }}
              className={`w-full glass-mobile rounded-3xl p-6 text-left ${
                boxSize === size ? 'ring-2 ring-green-400' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p
                    className="text-6xl font-bold text-white"
                    style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
                  >
                    {size}
                    <span className="text-2xl ml-2">kg</span>
                  </p>
                  <p
                    className="text-sm font-semibold text-white mt-2"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                  >
                    {size === '8' ? '2-3 personer' : '4-6 personer'}
                  </p>
                </div>
                <p
                    className="text-3xl font-bold text-white"
                    style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
                  >
                  {prices ? `kr ${prices[size].total}` : '...'}
                </p>
              </div>

              {boxContents[size] && (
                <div className="space-y-2">
                  {boxContents[size].slice(0, 4).map((item, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                      <span
                        className="text-sm font-semibold text-white"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                  <p
                    className="text-xs font-semibold text-white/80 ml-6"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                  >
                    + {boxContents[size].length - 4} mer
                  </p>
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
          className="space-y-4"
        >
          <button
            onClick={() => setStep(1)}
            className="text-white font-semibold text-sm mb-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            ← Tilbake
          </button>
          <h2
            className="text-3xl font-bold text-white mb-6"
            style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
          >
            Velg ribbe-type
          </h2>

          {[
            { id: 'tynnribbe', name: 'Tynnribbe', desc: 'Klassisk ribbe med ribbein' },
            { id: 'familieribbe', name: 'Familieribbe', desc: 'Inkluderer kotelettkam - mer kjøtt' },
            { id: 'porchetta', name: 'Porchetta', desc: 'Beinfri nedre mage - italiensk stil' },
            { id: 'butchers_choice', name: 'Slakterens valg', desc: 'Vi velger basert på tilgjengelighet', tag: 'Anbefalt' },
          ].map((option) => (
            <motion.button
              key={option.id}
              onClick={() => {
                setRibbeChoice(option.id);
                setStep(3);
              }}
              whileTap={{ scale: 0.98 }}
              className={`w-full glass-mobile rounded-2xl p-5 text-left relative ${
                ribbeChoice === option.id ? 'ring-2 ring-green-400' : ''
              }`}
            >
              {option.tag && (
                <span className="absolute top-3 right-3 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {option.tag}
                </span>
              )}
              <p
                className="font-bold text-lg text-white mb-1"
                style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
              >
                {option.name}
              </p>
              <p
                className="text-sm font-semibold text-white"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                {option.desc}
              </p>
            </motion.button>
          ))}

          <button
            onClick={() => setStep(3)}
            disabled={!ribbeChoice}
            className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-bold py-4 rounded-2xl shadow-xl flex items-center justify-center gap-2 disabled:opacity-50"
          >
            Fortsett <ChevronRight className="w-5 h-5" />
          </button>
        </motion.div>
      )}

      {/* Step 3: Extras */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <button
            onClick={() => setStep(2)}
            className="text-white font-semibold text-sm mb-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            ← Tilbake
          </button>
          <h2
            className="text-3xl font-bold text-white mb-2"
            style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
          >
            Ekstra produkter
          </h2>
          <p
            className="text-sm font-semibold text-white mb-6"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            Valgfritt - trykk for å legge til
          </p>

          {availableExtras
            .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
            .map((extra) => {
              const isSelected = extraProducts.includes(extra.slug);
              const quantity = extraQuantities[extra.slug] || (extra.pricing_type === 'per_kg' ? 0.5 : 1);

              return (
                <motion.div
                  key={extra.slug}
                  whileTap={{ scale: 0.98 }}
                  className={`glass-mobile rounded-2xl p-5 ${
                    isSelected ? 'ring-2 ring-amber-400' : ''
                  }`}
                  onClick={() => {
                    setExtraProducts(prev =>
                      prev.includes(extra.slug)
                        ? prev.filter(p => p !== extra.slug)
                        : [...prev, extra.slug]
                    );
                    if (!isSelected && !extraQuantities[extra.slug]) {
                      setExtraQuantities(prev => ({
                        ...prev,
                        [extra.slug]: extra.pricing_type === 'per_kg' ? 0.5 : 1
                      }));
                    }
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p
                        className="font-bold text-lg text-white mb-1"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                      >
                        {extra.name_no}
                      </p>
                      {extra.description_no && (
                        <p
                          className="text-sm font-semibold text-white mb-3"
                          style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                        >
                          {extra.description_no}
                        </p>
                      )}
                      <p
                        className="text-2xl font-bold text-white"
                        style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                      >
                        {extra.price_nok} kr
                        <span className="text-sm ml-1">
                          /{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}
                        </span>
                      </p>
                    </div>
                    <div
                      className={`w-7 h-7 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-500' : 'border-white/40 bg-white/10'
                      }`}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white" />}
                    </div>
                  </div>

                  {isSelected && (
                    <div
                      className="mt-4 pt-4 border-t border-white/20 flex items-center gap-3"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <label
                        className="text-sm font-bold text-white"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                      >
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
                            setExtraQuantities(prev => ({
                              ...prev,
                              [extra.slug]: value
                            }));
                          }
                        }}
                        className="w-24 text-center font-bold bg-white/20 border-2 border-white/40 text-white"
                      />
                      <span
                        className="text-sm font-bold text-white"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                      >
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
        </motion.div>
      )}

      {/* Step 4: Delivery & Payment */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <button
            onClick={() => setStep(3)}
            className="text-white font-semibold text-sm mb-4"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            ← Tilbake
          </button>
          <h2
            className="text-3xl font-bold text-white mb-6"
            style={{ textShadow: '0 2px 15px rgba(0,0,0,0.9)' }}
          >
            Levering
          </h2>

          {/* Delivery Options */}
          <div className="space-y-3">
            {[
              { type: 'farm' as const, name: 'Henting på gården', location: 'Tinglemsvegen 91, Namdalseid', price: 0 },
              { type: 'trondheim' as const, name: 'Henting i Trondheim', location: 'Veita Mat AS, Jomfrugata', price: addonPrices?.trondheim || 200 },
              { type: 'e6' as const, name: 'Levering langs E6', location: 'Stjørdal-Namsos', price: addonPrices?.e6 || 300 },
            ].map((option) => (
              <button
                key={option.type}
                onClick={() => setDeliveryType(option.type)}
                className={`w-full glass-mobile rounded-2xl p-5 text-left ${
                  deliveryType === option.type ? 'ring-2 ring-green-400' : ''
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p
                      className="font-bold text-lg text-white mb-1"
                      style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                    >
                      {option.name}
                    </p>
                    <p
                      className="text-sm font-semibold text-white"
                      style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                      {option.location}
                    </p>
                  </div>
                  <p
                    className={`text-xl font-bold ${option.price === 0 ? 'text-green-400' : 'text-white'}`}
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                  >
                    {option.price === 0 ? 'Gratis' : `+${option.price} kr`}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Fresh Delivery Option */}
          {deliveryType === 'farm' && (
            <button
              onClick={() => setFreshDelivery(!freshDelivery)}
              className={`w-full glass-mobile rounded-2xl p-5 text-left ${
                freshDelivery ? 'ring-2 ring-green-400' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p
                    className="font-bold text-lg text-white mb-1"
                    style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                  >
                    Fersk levering (uke 50/51)
                  </p>
                  <p
                    className="text-sm font-semibold text-white"
                    style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                  >
                    Motta kassen fersk (ikke frossen)
                  </p>
                </div>
                <p
                  className="text-xl font-bold text-white"
                  style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
                >
                  +{addonPrices?.fresh || 500} kr
                </p>
              </div>
            </button>
          )}

          {/* Price Summary */}
          <div className="glass-mobile-strong rounded-3xl p-6 space-y-3">
            <h3
              className="text-xl font-bold text-white mb-4"
              style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
            >
              Sammendrag
            </h3>

            <div className="flex justify-between text-white">
              <span className="font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>Forskudd (50%)</span>
              <span className="font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>kr {baseDepositTotal.toLocaleString('nb-NO')}</span>
            </div>

            {(referralDiscount > 0 || rebateDiscount > 0) && (
              <div className="flex justify-between text-green-400">
                <span className="font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>Rabatt</span>
                <span className="font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>-kr {(referralDiscount || rebateDiscount).toLocaleString('nb-NO')}</span>
              </div>
            )}

            <div className="flex justify-between text-white">
              <span className="font-semibold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>Restbeløp</span>
              <span className="font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}>kr {remainderTotal.toLocaleString('nb-NO')}</span>
            </div>

            <div className="border-t border-white/20 pt-3 flex justify-between">
              <span className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>Totalt</span>
              <span className="text-2xl font-bold text-white" style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}>kr {totalPrice.toLocaleString('nb-NO')}</span>
            </div>
          </div>

          {/* Discount Codes */}
          {!rebateData && (
            <div className="glass-mobile rounded-2xl p-4">
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
            <div className="glass-mobile rounded-2xl p-4">
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
          <div className="glass-mobile rounded-2xl p-5">
            <Label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToDepositPolicy}
                onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                className="mt-1 bg-white/20 border-white/40"
              />
              <span
                className="text-sm font-semibold text-white leading-relaxed"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                <strong>Jeg forstår at depositumet ikke refunderes.</strong> Dette utløser produksjonsplanlegging.
              </span>
            </Label>
          </div>

          <div className="glass-mobile rounded-2xl p-5">
            <Label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1 bg-white/20 border-white/40"
              />
              <span
                className="text-sm font-semibold text-white leading-relaxed"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
              >
                Jeg godtar <a href="/vilkar" className="underline">vilkårene</a>
              </span>
            </Label>
          </div>

          {/* Payment Button */}
          <button
            disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
            onClick={handleCheckout}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold text-lg py-5 rounded-2xl shadow-2xl flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-gray-500"
            style={{ backgroundColor: isProcessing ? undefined : '#FF5B24' }}
          >
            {isProcessing ? (
              'Behandler...'
            ) : (
              <>
                <span>Betal med</span>
                <div className="relative w-20 h-8">
                  <Image
                    src="/vipps-logo.svg"
                    alt="Vipps"
                    fill
                    className="object-contain brightness-0 invert"
                  />
                </div>
              </>
            )}
          </button>

          <p
            className="text-xs text-center text-white"
            style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
          >
            Sikker betaling med Vipps
          </p>
        </motion.div>
      )}
    </div>
  );
}
