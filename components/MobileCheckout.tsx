"use client";

import { ChevronDown, Check, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  const sectionCard = "rounded-2xl border border-[#E6D8C8] bg-[#FFF9F2] p-5 shadow-[0_12px_30px_rgba(50,36,24,0.08)]";
  const labelText = "text-xs font-semibold uppercase tracking-[0.25em] text-[#6C5A4A]";

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

  return (
    <div className="space-y-6 pb-28">
      <div className="sticky top-0 z-10 rounded-2xl border border-[#E6D8C8] bg-white/90 p-4 backdrop-blur">
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.25em] text-[#6C5A4A]">
          <span>Kasse</span>
          <span>Levering</span>
          <span>Tilpasning</span>
          <span>Betaling</span>
        </div>
        <div className="mt-3 h-1.5 rounded-full bg-[#EADBC8]">
          <div className="h-1.5 rounded-full bg-[#1F1A14]" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </div>

      {/* Step 1: Box Size */}
      <div className={sectionCard}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className={labelText}>1. Velg kasse</p>
            <p className="mt-2 text-lg font-semibold text-[#1F1A14]">
              {boxSize ? `${boxSize} kg` : t.checkout.step1Title}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 text-[#6C5A4A] transition-transform ${step === 1 ? 'rotate-180' : ''}`} />
        </button>

        {step === 1 && (
          <div className="mt-4 space-y-3">
            {(['8', '12'] as const).map((size) => (
              <button
                key={size}
                onClick={() => {
                  setBoxSize(size);
                  setStep(2);
                }}
                className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                  boxSize === size
                    ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]'
                    : 'border-[#E6D8C8] bg-white text-[#1F1A14]'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold">
                      {size} <span className="text-sm font-semibold">kg</span>
                    </p>
                    <p className={`text-sm ${boxSize === size ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                      {size === '8' ? t.product.perfectFor2to3 : t.product.idealFor4to6}
                    </p>
                  </div>
                  {prices && prices[size]?.total ? (
                    <div className="text-right">
                      <p className="text-lg font-bold">{prices[size].total.toLocaleString('nb-NO')} {t.common.currency}</p>
                      <p className={`text-xs ${boxSize === size ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                        {t.product.deposit50}: {prices[size].deposit.toLocaleString('nb-NO')} {t.common.currency}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-[#6C5A4A]">{t.common.loading}</p>
                  )}
                </div>

                {boxSize === size && (
                  <div className="mt-4 border-t border-white/20 pt-3 text-xs">
                    <p className="uppercase tracking-[0.25em] text-[#F7F1EA]/70">I kassen</p>
                    <ul className="mt-2 space-y-1 text-[#F7F1EA]/80">
                      {boxContents[size].slice(0, 4).map((item) => (
                        <li key={item} className="flex items-start gap-2">
                          <span className="mt-1 h-1.5 w-1.5 rounded-full bg-[#F7F1EA]" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Delivery */}
      <div className={sectionCard}>
        <button
          type="button"
          onClick={() => setStep(2)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className={labelText}>2. Levering</p>
            <p className="mt-2 text-lg font-semibold text-[#1F1A14]">{deliverySummary}</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-[#6C5A4A] transition-transform ${step === 2 ? 'rotate-180' : ''}`} />
        </button>

        {step === 2 && (
          <div className="mt-4 space-y-3">
            {deliveryOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => setDeliveryType(option.id as typeof deliveryType)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                  deliveryType === option.id
                    ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]'
                    : 'border-[#E6D8C8] bg-white text-[#1F1A14]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{option.name}</p>
                    <p className={`text-xs ${deliveryType === option.id ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                      {option.desc}
                    </p>
                  </div>
                  <p className="text-sm font-bold">{option.price > 0 ? `${option.price} ${t.common.currency}` : t.common.free}</p>
                </div>
              </button>
            ))}

            {deliveryType === 'farm' && (
              <button
                onClick={() => setFreshDelivery(!freshDelivery)}
                className={`w-full rounded-xl border px-4 py-4 text-left transition-all ${
                  freshDelivery
                    ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]'
                    : 'border-[#E6D8C8] bg-white text-[#1F1A14]'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{t.checkout.freshDelivery}</p>
                    <p className={`text-xs ${freshDelivery ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                      {t.checkout.freshDeliveryDesc}
                    </p>
                  </div>
                  <p className="text-sm font-bold">+{addonPrices?.fresh || 500} {t.common.currency}</p>
                </div>
              </button>
            )}

            <button
              onClick={() => setStep(3)}
              className="w-full rounded-xl bg-[#1F1A14] px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
            >
              Fortsett
            </button>
          </div>
        )}
      </div>

      {/* Step 3: Customization */}
      <div className={sectionCard}>
        <button
          type="button"
          onClick={() => setStep(3)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className={labelText}>3. Tilpasning</p>
            <p className="mt-2 text-lg font-semibold text-[#1F1A14]">
              {ribbeChoice ? ribbeSummary : t.checkout.selectRibbeType}
              {extraCount > 0 && ` · ${extraCount} tillegg`}
            </p>
          </div>
          <ChevronDown className={`h-5 w-5 text-[#6C5A4A] transition-transform ${step === 3 ? 'rotate-180' : ''}`} />
        </button>

        {step === 3 && (
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-[#1F1A14]">{t.checkout.selectRibbeType}</p>
              <div className="mt-3 space-y-2">
                {ribbeOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setRibbeChoice(option.id as typeof ribbeChoice)}
                    className={`w-full rounded-xl border px-4 py-3 text-left transition-all ${
                      ribbeChoice === option.id
                        ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]'
                        : 'border-[#E6D8C8] bg-white text-[#1F1A14]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">
                          {option.name}
                          {option.recommended && (
                            <span className="ml-2 rounded-full bg-[#C05621] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                              {t.checkout.recommended}
                            </span>
                          )}
                        </p>
                        <p className={`text-xs ${ribbeChoice === option.id ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                          {option.desc}
                        </p>
                      </div>
                      {ribbeChoice === option.id && <Check className="h-5 w-5 text-[#F7F1EA]" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#1F1A14]">{t.checkout.extrasTitle}</p>
              <p className="mt-1 text-xs text-[#6C5A4A]">{t.checkout.extrasWarning}</p>
              <div className="mt-3 space-y-3">
                {availableExtras
                  .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
                  .map((extra) => {
                    const isSelected = extraProducts.includes(extra.slug);
                    const quantity = extraQuantities[extra.slug] !== undefined ? extraQuantities[extra.slug] : (extra.default_quantity || 1);

                    return (
                      <div
                        key={extra.slug}
                        className={`rounded-xl border px-4 py-4 transition-all ${
                          isSelected ? 'border-[#1F1A14] bg-[#1F1A14] text-[#F7F1EA]' : 'border-[#E6D8C8] bg-white text-[#1F1A14]'
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
                            style={{ accentColor: '#1F1A14' }}
                          />
                          <div className="flex-1">
                            <p className="font-semibold">{extra.name_no}</p>
                            {extra.description_no && (
                              <p className={`text-xs ${isSelected ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                                {extra.description_no}
                              </p>
                            )}
                            <p className="mt-2 text-sm font-bold">
                              {extra.price_nok} {t.common.currency}
                              <span className={`ml-1 text-xs ${isSelected ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                                /{extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk}
                              </span>
                            </p>
                          </div>
                        </label>

                        {isSelected && (
                          <div className="mt-4 flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
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
                              className="h-9 w-9 p-0"
                            >
                              -
                            </Button>

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

                            <Button
                              variant="outline"
                              size="sm"
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
                              className="h-9 w-9 p-0"
                            >
                              +
                            </Button>
                            <span className={`text-xs ${isSelected ? 'text-[#F7F1EA]/70' : 'text-[#6C5A4A]'}`}>
                              {extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>

            <button
              onClick={() => setStep(4)}
              className="w-full rounded-xl bg-[#1F1A14] px-4 py-3 text-sm font-bold uppercase tracking-[0.2em] text-[#F7F1EA]"
            >
              Fortsett til betaling
            </button>
          </div>
        )}
      </div>

      {/* Step 4: Summary & Payment */}
      <div className={sectionCard}>
        <button
          type="button"
          onClick={() => setStep(4)}
          className="flex w-full items-center justify-between text-left"
        >
          <div>
            <p className={labelText}>4. Betaling</p>
            <p className="mt-2 text-lg font-semibold text-[#1F1A14]">Oppsummering</p>
          </div>
          <ChevronDown className={`h-5 w-5 text-[#6C5A4A] transition-transform ${step === 4 ? 'rotate-180' : ''}`} />
        </button>

        {step === 4 && (
          <div className="mt-4 space-y-4">
            <div className="rounded-xl border border-[#E6D8C8] bg-white p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>{boxSize} kg {boxSize === '12' ? t.product.box12 : t.product.box8}</span>
                <span className="font-semibold">
                  {prices && prices[boxSize] ? `${prices[boxSize].total.toLocaleString('nb-NO')} ${t.common.currency}` : '...'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-[#6C5A4A]">
                <span>{ribbeSummary}</span>
                <span>Inkludert</span>
              </div>

              {deliveryType !== 'farm' && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#6C5A4A]">
                  <span>{deliverySummary}</span>
                  <span>{deliveryType === 'trondheim' ? addonPrices?.trondheim || 200 : addonPrices?.e6 || 300} {t.common.currency}</span>
                </div>
              )}

              {freshDelivery && (
                <div className="mt-2 flex items-center justify-between text-xs text-[#6C5A4A]">
                  <span>{t.checkout.freshDelivery}</span>
                  <span>{addonPrices?.fresh || 500} {t.common.currency}</span>
                </div>
              )}

              {extraProducts.length > 0 && extraProducts.map(slug => {
                const extra = availableExtras.find(e => e.slug === slug);
                const quantity = extraQuantities[slug] || 1;
                if (!extra) return null;
                return (
                  <div key={slug} className="mt-2 flex items-center justify-between text-xs text-[#6C5A4A]">
                    <span>{extra.name_no} ({quantity}{extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk})</span>
                    <span>{(extra.price_nok * quantity).toLocaleString('nb-NO')} {t.common.currency}</span>
                  </div>
                );
              })}

              <div className="mt-4 border-t border-[#E6D8C8] pt-3">
                {(referralDiscount > 0 || rebateDiscount > 0) && (
                  <div className="flex items-center justify-between text-xs text-[#2F5D3A]">
                    <span>Rabatt</span>
                    <span className="font-semibold">-{(referralDiscount || rebateDiscount).toLocaleString('nb-NO')} {t.common.currency}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-base font-semibold">
                  <span>{t.common.total}</span>
                  <span>{totalPrice.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#6C5A4A]">
                  <span>{t.checkout.deposit50Percent}</span>
                  <span>{depositTotal.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[#6C5A4A]">
                  <span>{t.checkout.remainderBeforeDelivery}</span>
                  <span>{remainderTotal.toLocaleString('nb-NO')} {t.common.currency}</span>
                </div>
              </div>
            </div>

            {!rebateData && (
              <div className="rounded-xl border border-[#E6D8C8] bg-white p-4">
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
              <div className="rounded-xl border border-[#E6D8C8] bg-white p-4">
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

            <div className="space-y-3 text-xs text-[#6C5A4A]">
              <label className="flex items-start gap-3">
                <Checkbox
                  checked={agreedToDepositPolicy}
                  onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                  className="mt-1"
                />
                <span>
                  <strong className="text-[#1F1A14]">{t.checkout.depositNotRefundable}</strong> {t.checkout.triggersProd}
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
      </div>

      {step === 4 && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#E6D8C8] bg-white/95 p-4 backdrop-blur">
          <button
            disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
            onClick={handleCheckout}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#1F1A14] px-4 py-4 text-sm font-bold uppercase tracking-[0.2em] text-[#F7F1EA] disabled:opacity-50"
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
          <p className="mt-2 text-center text-xs text-[#6C5A4A]">{t.checkout.securePayment}</p>
        </div>
      )}
    </div>
  );
}
