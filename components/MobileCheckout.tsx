"use client";

import { Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
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

  const { t } = useLanguage();

  const stepLabels = [
    t.checkout.stepSize || 'Størrelse',
    t.checkout.stepRibbe || 'Ribbe',
    t.checkout.stepDelivery || 'Levering',
    'Betaling',
  ];

  const stepTitle = step === 1
    ? t.checkout.step1Title
    : step === 2
      ? t.checkout.step2Title || t.checkout.selectRibbeType
      : step === 3
        ? t.checkout.deliveryOptions
        : t.checkout.summary;

  const sectionCard = "rounded-[28px] border border-[#E4DED5] bg-white p-5 shadow-[0_18px_40px_rgba(30,27,22,0.12)]";
  const labelText = "text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]";

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

  return (
    <div className="space-y-6 pb-32 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <div className={sectionCard}>
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">
          <span>Steg {step}/4</span>
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#0F6C6F]"
            >
              <ChevronLeft className="h-4 w-4" />
              {t.nav.back}
            </button>
          )}
        </div>
        <h2 className="mt-3 text-2xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">
          {stepTitle}
        </h2>
        <div className="mt-4 h-1.5 w-full rounded-full bg-[#E9E1D6]">
          <div className="h-1.5 rounded-full bg-[#0F6C6F]" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-[10px] uppercase tracking-[0.25em]">
          {stepLabels.map((label, index) => (
            <span
              key={label}
              className={`${step >= index + 1 ? 'text-[#0F6C6F] font-semibold' : 'text-[#B0A79C]'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {step === 1 && (
        <div className={sectionCard}>
          <p className={labelText}>Velg kasse</p>
          <div className="mt-4 space-y-4">
            {(['8', '12'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setBoxSize(size)}
                className={`w-full rounded-3xl border px-5 py-5 text-left transition-all ${
                  boxSize === size
                    ? 'border-[#0F6C6F] bg-[#0F6C6F] text-white'
                    : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em]">
                      {size} kg
                    </p>
                    <p className="mt-2 text-3xl font-semibold font-[family:var(--font-playfair)]">
                      {size} <span className="text-base font-semibold">kg</span>
                    </p>
                    <p className={`mt-2 text-sm ${boxSize === size ? 'text-white/70' : 'text-[#5E5A50]'}`}>
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
                  <div className="mt-4 border-t border-white/20 pt-3 text-xs">
                    <p className="uppercase tracking-[0.25em] text-white/70">{t.checkout.inBox}</p>
                    <ul className="mt-2 space-y-1 text-white/80">
                      {boxContents[size].slice(0, 4).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
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
          <div className="mt-4 space-y-3">
            {ribbeOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setRibbeChoice(option.id as typeof ribbeChoice)}
                className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
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
                    <p className={`text-xs ${ribbeChoice === option.id ? 'text-white/70' : 'text-[#5E5A50]'}`}>
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
              <p className={labelText}>{t.checkout.deliveryOptions}</p>
              <span className="text-xs text-[#5E5A50]">{deliverySummary}</span>
            </div>
            <div className="mt-4 space-y-3">
              {deliveryOptions.map((option) => (
                <button
                  key={option.id}
                  onClick={() => setDeliveryType(option.id as typeof deliveryType)}
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
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
                  className={`w-full rounded-2xl border px-4 py-4 text-left transition-all ${
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

          <div className={sectionCard}>
            <div className="flex items-center justify-between">
              <p className={labelText}>{t.checkout.extrasTitle}</p>
              <span className="text-xs text-[#5E5A50]">{extraCount > 0 ? `${extraCount} valgt` : 'Valgfritt'}</span>
            </div>
            <p className="mt-2 text-xs text-[#5E5A50]">{t.checkout.extrasWarning}</p>
            <div className="mt-4 space-y-3">
              {availableExtras
                .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
                .map((extra) => {
                  const isSelected = extraProducts.includes(extra.slug);
                  const quantity = extraQuantities[extra.slug] !== undefined ? extraQuantities[extra.slug] : (extra.default_quantity || 1);

                  return (
                    <div
                      key={extra.slug}
                      className={`rounded-2xl border px-4 py-4 transition-all ${
                        isSelected ? 'border-[#1E1B16] bg-[#1E1B16] text-white' : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                      }`}
                    >
                      <label className="flex cursor-pointer items-start gap-3">
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
                          className="mt-1 h-4 w-4 rounded"
                          style={{ accentColor: isSelected ? '#F6F4EF' : '#1E1B16' }}
                        />
                        <div className="flex-1">
                          <p className="font-semibold">{extra.name_no}</p>
                          {extra.description_no && (
                            <p className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                              {extra.description_no}
                            </p>
                          )}
                          <p className="mt-2 text-sm font-semibold">
                            {extra.price_nok} {t.common.currency}
                            <span className={`ml-1 text-xs ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                              /{extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk}
                            </span>
                          </p>
                        </div>
                      </label>

                      {isSelected && (
                        <div className="mt-4 flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              let newQty: number;
                              if (extra.pricing_type === 'per_kg') {
                                newQty = Math.floor((quantity - 0.1) / 0.5) * 0.5;
                              } else {
                                newQty = quantity - 1;
                              }

                              if (newQty <= 0) {
                                setExtraProducts(extraProducts.filter(p => p !== extra.slug));
                                const newQuantities = { ...extraQuantities };
                                delete newQuantities[extra.slug];
                                setExtraQuantities(newQuantities);
                              } else {
                                setExtraQuantities({
                                  ...extraQuantities,
                                  [extra.slug]: newQty
                                });
                              }
                            }}
                            className="h-9 w-9 rounded-full border border-white/40 text-sm font-semibold text-white"
                          >
                            -
                          </button>

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
                            className="w-20 text-center"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              let newQty: number;
                              if (extra.pricing_type === 'per_kg') {
                                newQty = Math.ceil((quantity + 0.1) / 0.5) * 0.5;
                              } else {
                                newQty = quantity + 1;
                              }
                              setExtraQuantities({
                                ...extraQuantities,
                                [extra.slug]: newQty
                              });
                            }}
                            className="h-9 w-9 rounded-full border border-white/40 text-sm font-semibold text-white"
                          >
                            +
                          </button>
                          <span className={`text-xs ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                            {extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk}
                          </span>
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

          <div className={`${sectionCard} space-y-3 text-xs text-[#5E5A50]`}>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={agreedToDepositPolicy}
                onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                className="mt-1"
              />
              <span>
                <strong className="text-[#1E1B16]">{t.checkout.depositNotRefundable}</strong> {t.checkout.triggersProd}
              </span>
            </label>
            <label className="flex items-start gap-3">
              <Checkbox
                checked={agreedToTerms}
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                className="mt-1"
              />
              <span>
                {t.checkout.agreeToTerms} <a href="/vilkar" className="underline">{t.checkout.termsLink}</a>
              </span>
            </label>
          </div>
        </div>
      )}

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E4DED5] bg-[#F6F4EF]/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-md flex-col gap-2">
          {step < 4 ? (
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
