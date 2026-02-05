"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
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

  const { t } = useLanguage();
  const [expandedBox, setExpandedBox] = useState<'8' | '12' | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const stepLabels = [
    t.checkout.stepSize || 'Størrelse',
    t.checkout.stepRibbe || 'Ribbe',
    t.checkout.stepExtras || 'Ekstra',
    t.checkout.stepDelivery || 'Levering',
    t.checkout.summary || 'Betaling',
  ];

  const stepTitle = step === 1
    ? t.checkout.step1Title
    : step === 2
      ? t.checkout.step2Title || t.checkout.selectRibbeType
      : step === 3
        ? t.checkout.step3Title || t.checkout.extrasTitle
        : step === 4
          ? t.checkout.step4Title || t.checkout.deliveryOptions
          : t.checkout.summary;

  const sectionCard = "rounded-[30px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]";
  const labelText = "text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6A6258]";

  const boxContents = {
    '8': [
      t.boxContents.ribbe8kg,
      t.boxContents.nakkekoteletter8kg,
      t.boxContents.julepølse8kg,
      t.boxContents.svinesteik8kg,
      t.boxContents.medisterfarse8kg,
      t.boxContents.knoke,
      t.boxContents.butchersChoice8kg,
    ],
    '12': [
      t.boxContents.ribbe12kg,
      t.boxContents.nakkekoteletter12kg,
      t.boxContents.julepølse12kg,
      t.boxContents.svinesteik12kg,
      t.boxContents.medisterfarse12kg,
      t.boxContents.knoke,
      t.boxContents.butchersChoice12kg,
    ],
  };

  const ribbeOptions = [
    { id: 'tynnribbe', name: t.checkout.tynnribbe, desc: t.checkout.tynnribbeDesc },
    { id: 'familieribbe', name: t.checkout.familieribbe, desc: t.checkout.familieribbeDesc },
    { id: 'porchetta', name: t.checkout.porchetta, desc: t.checkout.porchettaDesc },
    { id: 'butchers_choice', name: t.checkout.butchersChoice, desc: t.checkout.butchersChoiceDesc, recommended: true },
  ];

  const deliveryOptions = [
    { id: 'farm', name: t.checkout.pickupFarm, desc: t.checkout.pickupFarmAddress, price: 0 },
    { id: 'trondheim', name: t.checkout.pickupTrondheim, desc: t.checkout.pickupTrondheimAddress, price: addonPrices?.trondheim || 200 },
    { id: 'e6', name: t.checkout.deliveryE6, desc: t.checkout.deliveryE6Address, price: addonPrices?.e6 || 300 },
  ];

  const ribbeSummary = ribbeOptions.find((opt) => opt.id === ribbeChoice)?.name || t.checkout.selectRibbeType;
  const deliverySummary = deliveryOptions.find((opt) => opt.id === deliveryType)?.name || t.checkout.deliveryOptions;
  const extraCount = extraProducts.length;

  const canContinue = step === 1 ? boxSize !== '' : step === 2 ? ribbeChoice !== '' : true;
  const filteredExtras = availableExtras.filter(
    (extra) => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug)
  );

  useEffect(() => {
    if (!stepRef.current) return;
    stepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  return (
    <div className="space-y-8 pb-36 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <div ref={stepRef} className={`${sectionCard} scroll-mt-6`}>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6A6258]">
          <span>Steg {step}/5</span>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0F6C6F]"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.nav.back}
            </button>
          )}
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-[#1E1B16] leading-snug font-[family:var(--font-playfair)]">
          {stepTitle}
        </h2>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#E9E1D6]">
          <div className="h-1.5 rounded-full bg-[#0F6C6F]" style={{ width: `${(step / 5) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2 text-[9px] uppercase tracking-[0.18em]">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`text-center leading-3 ${step >= index + 1 ? 'text-[#0F6C6F] font-semibold' : 'text-[#B0A79C]'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className={sectionCard}>
          <p className={labelText}>Velg kasse</p>
          <div className="mt-5 space-y-5">
            {(['8', '12'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setBoxSize(size)}
                className={`w-full rounded-[28px] border px-5 py-5 text-left transition-all ${
                  boxSize === size
                    ? 'border-[#0F6C6F] bg-[#0F6C6F] text-white'
                    : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                }`}
              >
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]">
                      {size} kg
                    </p>
                    <p className="mt-2 text-3xl font-semibold font-[family:var(--font-playfair)]">
                      {size} <span className="text-base font-semibold">kg</span>
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${boxSize === size ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                      {size === '8' ? t.product.perfectFor2to3 : t.product.idealFor4to6}
                    </p>
                  </div>
                  {prices && prices[size]?.total ? (
                    <div className="text-right">
                      <p className="text-xl font-semibold">
                        {prices[size].total.toLocaleString('nb-NO')} {t.common.currency}
                      </p>
                      <p className={`text-xs ${boxSize === size ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {t.product.deposit50}: {prices[size].deposit.toLocaleString('nb-NO')} {t.common.currency}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#5E5A50]">{t.common.loading}</p>
                  )}
                </div>

                {boxSize === size && (
                  <div className="mt-4 rounded-2xl border border-white/15 bg-white/10 px-4 py-4 text-xs">
                    <div className="flex items-center justify-between">
                      <p className="uppercase tracking-[0.2em] text-white/70">{t.checkout.inBox}</p>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setExpandedBox(expandedBox === size ? null : size);
                        }}
                        className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70"
                      >
                        {expandedBox === size ? 'Vis mindre' : 'Se hele innholdet'}
                      </button>
                    </div>
                    <ul className="mt-3 space-y-1.5 text-white/80">
                      {(expandedBox === size ? boxContents[size] : boxContents[size].slice(0, 4)).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                    {expandedBox !== size && boxContents[size].length > 4 && (
                      <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-white/60">
                        + {boxContents[size].length - 4} {t.checkout.moreItems}
                      </p>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={sectionCard}>
          <div className="flex items-center justify-between">
            <p className={labelText}>Ribbe</p>
            <span className="text-xs text-[#5E5A50]">{boxSize ? `${boxSize} kg` : ''}</span>
          </div>
          <div className="mt-5 space-y-4">
            {ribbeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setRibbeChoice(option.id as typeof ribbeChoice)}
                className={`w-full rounded-3xl border px-5 py-5 text-left transition-all ${
                  ribbeChoice === option.id
                    ? 'border-[#1E1B16] bg-[#1E1B16] text-white'
                    : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {option.name}
                      {option.recommended && (
                        <span className="ml-2 rounded-full bg-[#B35A2A] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                          {t.checkout.recommended}
                        </span>
                      )}
                    </p>
                    <p className={`mt-1 text-xs leading-relaxed ${ribbeChoice === option.id ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                      {option.desc}
                    </p>
                  </div>
                  {ribbeChoice === option.id && <Check className="h-5 w-5 text-white" />}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <div className={sectionCard}>
            <div className="flex items-center justify-between">
              <p className={labelText}>{t.checkout.extrasTitle}</p>
              <span className="text-xs text-[#5E5A50]">{extraCount > 0 ? `${extraCount} valgt` : 'Valgfritt'}</span>
            </div>
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 mb-0.5">
                    Viktig informasjon
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t.checkout.extrasWarning}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {filteredExtras.map((extra) => {
                const isSelected = extraProducts.includes(extra.slug);
                const quantity = extraQuantities[extra.slug] !== undefined
                  ? extraQuantities[extra.slug]
                  : (extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1));
                const unitLabel = extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk;
                const formattedQty = extra.pricing_type === 'per_kg'
                  ? quantity.toLocaleString('nb-NO', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
                  : quantity.toLocaleString('nb-NO');

                const toggleExtra = () => {
                  if (extraProducts.includes(extra.slug)) {
                    setExtraProducts(extraProducts.filter(p => p !== extra.slug));
                    return;
                  }
                  setExtraProducts([...extraProducts, extra.slug]);
                  if (!extraQuantities[extra.slug]) {
                    const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                    setExtraQuantities({
                      ...extraQuantities,
                      [extra.slug]: defaultQty,
                    });
                  }
                };

                return (
                  <div
                    key={extra.slug}
                    role="button"
                    tabIndex={0}
                    onClick={toggleExtra}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        toggleExtra();
                      }
                    }}
                    className={`flex h-full flex-col justify-between rounded-[26px] border px-4 py-4 text-left transition-all ${
                      isSelected ? 'border-[#1E1B16] bg-[#1E1B16] text-white' : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-semibold leading-snug">{extra.name_no}</p>
                        <span className={`rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.2em] ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-[#EAE3DA] text-[#5E5A50]'
                        }`}>
                          {isSelected ? 'Valgt' : 'Legg til'}
                        </span>
                      </div>
                      {extra.description_no && (
                        <p className={`mt-2 text-[11px] leading-relaxed ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                          {extra.description_no}
                        </p>
                      )}
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs">
                      <span className="font-semibold">
                        {extra.price_nok} {t.common.currency}
                        <span className={`ml-1 text-[10px] ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                          /{unitLabel}
                        </span>
                      </span>
                    </div>

                    {isSelected && (
                      <div className="mt-4 flex items-center justify-between rounded-full bg-white/10 px-2 py-2 text-xs">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const stepValue = extra.pricing_type === 'per_kg' ? 0.5 : 1;
                            const newQty = Math.round((quantity - stepValue) * 10) / 10;
                            if (newQty <= 0) {
                              setExtraProducts(extraProducts.filter(p => p !== extra.slug));
                              const newQuantities = { ...extraQuantities };
                              delete newQuantities[extra.slug];
                              setExtraQuantities(newQuantities);
                            } else {
                              setExtraQuantities({
                                ...extraQuantities,
                                [extra.slug]: newQty,
                              });
                            }
                          }}
                          className="h-8 w-8 rounded-full border border-white/30 text-sm font-semibold text-white"
                        >
                          -
                        </button>
                        <div className="text-sm font-semibold text-white">
                          {formattedQty} {unitLabel}
                        </div>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            const stepValue = extra.pricing_type === 'per_kg' ? 0.5 : 1;
                            const newQty = Math.round((quantity + stepValue) * 10) / 10;
                            setExtraQuantities({
                              ...extraQuantities,
                              [extra.slug]: newQty,
                            });
                          }}
                          className="h-8 w-8 rounded-full border border-white/30 text-sm font-semibold text-white"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-6">
          <div className={sectionCard}>
            <div className="flex items-center justify-between">
              <p className={labelText}>{t.checkout.deliveryOptions}</p>
              <span className="text-xs text-[#5E5A50]">{deliverySummary}</span>
            </div>
            <div className="mt-5 space-y-4">
              {deliveryOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDeliveryType(option.id as typeof deliveryType)}
                  className={`w-full rounded-3xl border px-5 py-5 text-left transition-all ${
                    deliveryType === option.id
                      ? 'border-[#0F6C6F] bg-[#0F6C6F] text-white'
                      : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{option.name}</p>
                      <p className={`text-xs ${deliveryType === option.id ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {option.desc}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">
                      {option.price > 0 ? `${option.price} ${t.common.currency}` : t.common.free}
                    </p>
                  </div>
                </button>
              ))}

              {deliveryType === 'farm' && (
                <button
                  onClick={() => setFreshDelivery(!freshDelivery)}
                  className={`w-full rounded-3xl border px-5 py-5 text-left transition-all ${
                    freshDelivery
                      ? 'border-[#1E1B16] bg-[#1E1B16] text-white'
                      : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{t.checkout.freshDelivery}</p>
                      <p className={`text-xs ${freshDelivery ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {t.checkout.freshDeliveryDesc}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">+{addonPrices?.fresh || 500} {t.common.currency}</p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="space-y-6">
          <div className={sectionCard}>
            <div className="flex items-center justify-between">
              <p className={labelText}>Oppsummering</p>
              <span className="text-xs text-[#5E5A50]">{boxSize} kg</span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>{boxSize === '12' ? t.product.box12 : t.product.box8}</span>
                <span className="font-semibold">
                  {prices && prices[boxSize] ? `${prices[boxSize].total.toLocaleString('nb-NO')} ${t.common.currency}` : '...'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                <span>{ribbeSummary}</span>
                <span>Inkludert</span>
              </div>

              {deliveryType !== 'farm' && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{deliverySummary}</span>
                  <span>{deliveryType === 'trondheim' ? addonPrices?.trondheim || 200 : addonPrices?.e6 || 300} {t.common.currency}</span>
                </div>
              )}

              {freshDelivery && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{t.checkout.freshDelivery}</span>
                  <span>{addonPrices?.fresh || 500} {t.common.currency}</span>
                </div>
              )}

              {extraProducts.length > 0 && extraProducts.map(slug => {
                const extra = availableExtras.find(e => e.slug === slug);
                const quantity = extraQuantities[slug] || 1;
                if (!extra) return null;
                return (
                  <div key={slug} className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                    <span>{extra.name_no} ({quantity}{extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk})</span>
                    <span>{(extra.price_nok * quantity).toLocaleString('nb-NO')} {t.common.currency}</span>
                  </div>
                );
              })}

              <div className="mt-4 border-t border-[#E4DED5] pt-3">
                {(referralDiscount > 0 || rebateDiscount > 0) && (
                  <div className="flex items-center justify-between text-xs text-[#0F6C6F]">
                    <span>Rabatt</span>
                    <span className="font-semibold">-{(referralDiscount || rebateDiscount).toLocaleString('nb-NO')} {t.common.currency}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-base font-semibold">
                  <span>{t.common.total}</span>
                  <span>{totalPrice.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{t.checkout.deposit50Percent}</span>
                  <span>{depositTotal.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{t.checkout.remainderBeforeDelivery}</span>
                  <span>{remainderTotal.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
              </div>
            </div>
          </div>

          {!rebateData && (
            <div className={sectionCard}>
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
            <div className={sectionCard}>
              <RebateCodeInput
                depositAmount={baseDepositTotal}
                boxSize={boxSize ? parseInt(boxSize) : 0}
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

          <div className={`${sectionCard} space-y-4 text-xs text-[#5E5A50]`}>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={agreedToDepositPolicy}
                onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                className="mt-1"
              />
              <span className="leading-relaxed">
                <strong className="text-[#1E1B16]">{t.checkout.depositNotRefundable}</strong> {t.checkout.triggersProd}
              </span>
            </label>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <span className="leading-relaxed">
                {t.checkout.agreeToTerms} <a href="/vilkar" className="underline">{t.checkout.termsLink}</a>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4DED5] bg-[#F6F4EF]/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {step < 5 ? (
            <button
              disabled={!canContinue}
              onClick={() => setStep(step + 1)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E1B16] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF] disabled:opacity-50"
            >
              {t.common.continue}
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
              onClick={handleCheckout}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1E1B16] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F6F4EF] disabled:opacity-50"
            >
              {isProcessing ? (
                t.common.processing
              ) : (
                <>
                  Betal forskudd {depositTotal.toLocaleString('nb-NO')} {t.common.currency}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
          <p className="text-center text-xs text-[#5E5A50]">{t.checkout.securePayment}</p>
        </div>
      </div>
    </div>
  );
}
