"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { Check } from 'lucide-react';
import { ReferralCodeInput } from '@/components/ReferralCodeInput';
import { RebateCodeInput } from '@/components/RebateCodeInput';
import { MobileCheckout } from '@/components/MobileCheckout';
import { ExtraProductModal } from '@/components/ExtraProductModal';
import { useToast } from '@/hooks/use-toast';

// Reusable Components for Nordic Minimal Design
function MetaLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs uppercase tracking-wide text-neutral-500 font-medium">
      {children}
    </div>
  );
}

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const mainContentRef = useRef<HTMLDivElement>(null);
  const step1Ref = useRef<HTMLDivElement>(null);
  const step2Ref = useRef<HTMLDivElement>(null);
  const step3Ref = useRef<HTMLDivElement>(null);
  const step4Ref = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(1);
  const [boxSize, setBoxSize] = useState<'8' | '12' | ''>('');
  const [mangalitsaPreset, setMangalitsaPreset] = useState<any>(null);
  const [ribbeChoice, setRibbeChoice] = useState<'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | ''>('butchers_choice');
  const [extraProducts, setExtraProducts] = useState<string[]>([]);
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [hoveredExtra, setHoveredExtra] = useState<any>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [deliveryType, setDeliveryType] = useState<'farm' | 'trondheim' | 'e6'>('farm');
  const [freshDelivery, setFreshDelivery] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDepositPolicy, setAgreedToDepositPolicy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<any>(null);
  const [referralData, setReferralData] = useState<{
    code: string;
    discountPercentage: number;
    discountAmount: number;
    referrerPhone: string;
  } | null>(null);
  const [rebateData, setRebateData] = useState<{
    code: string;
    discountAmount: number;
    description: string;
  } | null>(null);
  const [showDiscountCodes, setShowDiscountCodes] = useState(false);
  const [summaryOffset, setSummaryOffset] = useState(0);

  const syncSummaryOffset = useCallback(() => {
    if (isMobile) {
      setSummaryOffset(0);
      return;
    }

    const mainContent = mainContentRef.current;
    if (!mainContent) return;

    const stepElements: Record<number, HTMLDivElement | null> = {
      1: step1Ref.current,
      2: step2Ref.current,
      3: step3Ref.current,
      4: step4Ref.current,
    };

    let targetStep = step;
    while (targetStep > 1 && !stepElements[targetStep]) {
      targetStep -= 1;
    }

    const targetElement = stepElements[targetStep] ?? step1Ref.current;
    if (!targetElement) return;

    const mainTop = mainContent.getBoundingClientRect().top + window.scrollY;
    const targetTop = targetElement.getBoundingClientRect().top + window.scrollY;
    const nextOffset = Math.max(0, targetTop - mainTop);

    setSummaryOffset((previous) => (previous === nextOffset ? previous : nextOffset));
  }, [isMobile, step]);

  // URL parameter handling
  useEffect(() => {
    const sizeParam = searchParams.get('size');
    const presetParam = searchParams.get('preset');

    if (presetParam) {
      // Load Mangalitsa preset
      fetch('/api/mangalitsa/presets')
        .then(res => res.json())
        .then(data => {
          const preset = (data.presets || []).find((p: any) => p.slug === presetParam);
          if (preset) {
            setMangalitsaPreset(preset);
            setBoxSize(String(preset.target_weight_kg) as any);
            setStep(2); // Skip to ribbe selection
          }
        })
        .catch(err => console.error('Failed to load preset:', err));
    } else if (sizeParam === '8' || sizeParam === '12') {
      setBoxSize(sizeParam);
      setStep(2);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isMobile && step > 4) {
      setStep(4);
    }
  }, [isMobile, step]);

  useEffect(() => {
    if (isMobile || typeof window === 'undefined') {
      setSummaryOffset(0);
      return;
    }

    let rafId: number | null = null;
    const scheduleSync = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }

      rafId = window.requestAnimationFrame(() => {
        syncSummaryOffset();
      });
    };

    scheduleSync();
    window.addEventListener('resize', scheduleSync);

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(scheduleSync)
      : null;

    [
      mainContentRef.current,
      step1Ref.current,
      step2Ref.current,
      step3Ref.current,
      step4Ref.current,
    ]
      .filter((element): element is HTMLDivElement => Boolean(element))
      .forEach((element) => resizeObserver?.observe(element));

    return () => {
      window.removeEventListener('resize', scheduleSync);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
      resizeObserver?.disconnect();
    };
  }, [isMobile, syncSummaryOffset]);

  // Fetch pricing configuration
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch('/api/config/pricing');
        const data = await response.json();
        setPricing(data);
      } catch (error) {
        console.error('Failed to fetch pricing config:', error);
      }
    }
    fetchConfig();
  }, []);

  // Fetch available extras
  useEffect(() => {
    async function fetchExtras() {
      try {
        const response = await fetch('/api/extras');
        const data = await response.json();
        if (data.extras) {
          setAvailableExtras(data.extras);
        }
      } catch (error) {
        console.error('Failed to fetch extras:', error);
      }
    }
    fetchExtras();
  }, []);

  async function handleCheckout() {
    setIsProcessing(true);

    try {
      let apiDeliveryType: 'pickup_farm' | 'pickup_e6' | 'delivery_trondheim' = 'pickup_farm';
      if (deliveryType === 'e6') {
        apiDeliveryType = 'pickup_e6';
      } else if (deliveryType === 'trondheim') {
        apiDeliveryType = 'delivery_trondheim';
      }

      // Build extras array with quantities
      const extrasWithQuantities = extraProducts.map(slug => ({
        slug,
        quantity: extraQuantities[slug] || 1
      }));

      // Prepare order details for Vipps login
      const orderDetails = {
        ...(mangalitsaPreset
          ? { mangalitsaPresetId: mangalitsaPreset.id }
          : { boxSize: parseInt(boxSize) }
        ),
        ribbeChoice,
        extraProducts: extrasWithQuantities,
        deliveryType: apiDeliveryType,
        freshDelivery,
        notes: '',
        // Include referral data if present
        ...(referralData && {
          referralCode: referralData.code,
          referralDiscount: referralData.discountAmount,
          referredByPhone: referralData.referrerPhone,
        }),
        // Include rebate data if present
        ...(rebateData && {
          rebateCode: rebateData.code,
          rebateDiscount: rebateData.discountAmount,
        }),
      };

      // POST to Vipps login with order details
      const response = await fetch('/api/auth/vipps/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ orderDetails }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to initiate payment');
      }

      // Redirect to Vipps OAuth login
      window.location.href = result.authUrl;
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({
        title: t.common.error,
        description: t.checkout.somethingWentWrong,
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  }

  // Calculate prices from dynamic config or Mangalitsa preset
  const mangalitsaPriceObj = mangalitsaPreset ? {
    deposit: Math.floor(mangalitsaPreset.price_nok * 0.5),
    remainder: mangalitsaPreset.price_nok - Math.floor(mangalitsaPreset.price_nok * 0.5),
    total: mangalitsaPreset.price_nok,
  } : null;

  const prices = pricing ? {
    '8': {
      deposit: Math.floor(pricing.box_8kg_price * (pricing.box_8kg_deposit_percentage / 100)),
      remainder: pricing.box_8kg_price - Math.floor(pricing.box_8kg_price * (pricing.box_8kg_deposit_percentage / 100)),
      total: pricing.box_8kg_price
    },
    '12': {
      deposit: Math.floor(pricing.box_12kg_price * (pricing.box_12kg_deposit_percentage / 100)),
      remainder: pricing.box_12kg_price - Math.floor(pricing.box_12kg_price * (pricing.box_12kg_deposit_percentage / 100)),
      total: pricing.box_12kg_price
    },
  } : null;

  const addonPrices = pricing ? {
    trondheim: pricing.delivery_fee_trondheim,
    e6: pricing.delivery_fee_pickup_e6,
    fresh: pricing.fresh_delivery_fee,
  } : null;

  const boxContents = {
    '8': [
      { name: t.boxContents.ribbe8kg, highlight: true },
      { name: t.boxContents.nakkekoteletter8kg },
      { name: t.boxContents.julepolse8kg },
      { name: t.boxContents.svinesteik8kg },
      { name: t.boxContents.medisterfarse8kg },
      { name: t.boxContents.knoke },
      { name: t.boxContents.butchersChoice8kg },
    ],
    '12': [
      { name: t.boxContents.ribbe12kg, highlight: true },
      { name: t.boxContents.nakkekoteletter12kg },
      { name: t.boxContents.julepolse12kg },
      { name: t.boxContents.svinesteik12kg },
      { name: t.boxContents.medisterfarse12kg },
      { name: t.boxContents.knoke },
      { name: t.boxContents.butchersChoice12kg },
    ],
  };

  const selectedPrice = mangalitsaPriceObj ? mangalitsaPriceObj : (boxSize && prices ? (prices as any)[boxSize] : null);
  const deliveryPrice = !addonPrices ? 0 : (deliveryType === 'farm' ? 0 : deliveryType === 'trondheim' ? addonPrices.trondheim : addonPrices.e6);
  const freshPrice = freshDelivery && addonPrices ? addonPrices.fresh : 0;

  // Calculate extras total
  const extrasTotal = extraProducts.reduce((total, slug) => {
    const extra = availableExtras.find(e => e.slug === slug);
    if (!extra) return total;
    const quantity = extraQuantities[slug] || 1;
    return total + (extra.price_nok * quantity);
  }, 0);

  const addonTotal = deliveryPrice + freshPrice + extrasTotal;

  // Deposit is ONLY 50% of box price - no extras included
  const baseDepositTotal = selectedPrice ? selectedPrice.deposit : 0;

  // Apply discount (referral OR rebate - cannot stack)
  const referralDiscount = referralData?.discountAmount || 0;
  const rebateDiscount = rebateData?.discountAmount || 0;
  const totalDiscount = referralDiscount || rebateDiscount; // Only one applies

  const depositTotal = baseDepositTotal - totalDiscount;
  // Remainder includes the other 50% of box price PLUS all extras
  const remainderTotal = selectedPrice ? selectedPrice.remainder + addonTotal : 0;
  const totalPrice = depositTotal + remainderTotal;

  const canProceedToStep2 = boxSize !== '';
  const canProceedToStep3 = ribbeChoice !== '';

  // Show order confirmation if order is confirmed
  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-white py-20">
        <div className="max-w-2xl mx-auto px-6">
          <div className="bg-white border border-neutral-200 rounded-xl p-16 text-center shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)]">
            {/* Success icon */}
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_15px_40px_-12px_rgba(34,197,94,0.4)]">
              <Check className="w-10 h-10 text-white" />
            </div>

            {/* Title */}
            <h1 className="text-5xl font-normal tracking-tight text-neutral-900 mb-4">
              {t.checkout.orderReceived}
            </h1>

            {/* Message */}
            <p className="text-base font-light leading-relaxed text-neutral-600 mb-4">
              {t.checkout.thankYou}
            </p>
            <p className="text-sm font-light text-neutral-500 mb-10">
              {t.checkout.expectedDelivery}
            </p>

            {/* Order number */}
            {orderId && (
              <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-8 mb-10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
                <MetaLabel>{t.checkout.orderNumber}</MetaLabel>
                <p className="text-3xl font-light text-neutral-900 font-mono tabular-nums mt-3">
                  {orderId}
                </p>
              </div>
            )}

            {/* Next steps */}
            <div className="space-y-5 text-left bg-neutral-50 border border-neutral-200 rounded-xl p-8 mb-10 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.05)]">
              <h3 className="font-normal text-neutral-900 text-lg">{t.checkout.nextSteps}</h3>
              <ol className="space-y-4">
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center text-sm font-light shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]">
                    1
                  </span>
                  <span className="text-sm font-light text-neutral-600 pt-1">{t.checkout.step1}</span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center text-sm font-light shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]">
                    2
                  </span>
                  <span className="text-sm font-light text-neutral-600 pt-1">{t.checkout.step2}</span>
                </li>
                <li className="flex gap-4">
                  <span className="flex-shrink-0 w-8 h-8 bg-neutral-900 text-white rounded-full flex items-center justify-center text-sm font-light shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]">
                    3
                  </span>
                  <span className="text-sm font-light text-neutral-600 pt-1">{t.checkout.step3}</span>
                </li>
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-4 justify-center">
              <Link
                href="/"
                className="px-8 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
              >
                {t.nav.backToHome}
              </Link>
              <Link
                href="/min-side"
                className="px-8 py-4 border-2 border-neutral-200 rounded-xl text-sm font-light text-neutral-900 hover:bg-neutral-50 hover:border-neutral-300 hover:-translate-y-1 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] transition-all duration-300"
              >
                {t.checkout.seeMyOrders}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mobile version - Keep existing design unchanged
  if (isMobile) {
    return (
      <div className="relative min-h-screen bg-[#F6F4EF] text-[#1E1B16]">
        <div className="pointer-events-none fixed inset-0 -z-10">
          <div className="absolute -top-24 right-0 h-72 w-72 rounded-full bg-[#E4F1F0] blur-3xl" />
          <div className="absolute top-40 -left-24 h-72 w-72 rounded-full bg-[#F4D7C1] blur-3xl" />
          <div className="absolute bottom-0 right-1/3 h-64 w-64 rounded-full bg-[#D9E6D6] blur-3xl" />
        </div>
        <div className="mx-auto max-w-md px-5 pb-32 pt-6 font-[family:var(--font-manrope)]">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>

          <div className="mt-6 mb-8 rounded-[28px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#6A6258]">{t.checkout.title}</p>
            <h1 className="mt-2 text-3xl font-semibold text-[#1E1B16] font-[family:var(--font-playfair)]">{t.checkout.pageTitle}</h1>
            <p className="mt-3 text-sm text-[#5E5A50]">{t.checkout.selectSize}</p>
          </div>

          <MobileCheckout
            step={step}
            setStep={setStep}
            boxSize={boxSize}
            setBoxSize={setBoxSize}
            ribbeChoice={ribbeChoice}
            setRibbeChoice={setRibbeChoice}
            extraProducts={extraProducts}
            setExtraProducts={setExtraProducts}
            extraQuantities={extraQuantities}
            setExtraQuantities={setExtraQuantities}
            availableExtras={availableExtras}
            deliveryType={deliveryType}
            setDeliveryType={setDeliveryType}
            freshDelivery={freshDelivery}
            setFreshDelivery={setFreshDelivery}
            agreedToTerms={agreedToTerms}
            setAgreedToTerms={setAgreedToTerms}
            agreedToDepositPolicy={agreedToDepositPolicy}
            setAgreedToDepositPolicy={setAgreedToDepositPolicy}
            isProcessing={isProcessing}
            handleCheckout={handleCheckout}
            prices={prices}
            addonPrices={addonPrices}
            depositTotal={depositTotal}
            remainderTotal={remainderTotal}
            totalPrice={totalPrice}
            baseDepositTotal={baseDepositTotal}
            referralData={referralData}
            setReferralData={setReferralData}
            rebateData={rebateData}
            setRebateData={setRebateData}
            referralDiscount={referralDiscount}
            rebateDiscount={rebateDiscount}
          />
        </div>
      </div>
    );
  }

  // Desktop version - Nordic Minimal Design with Movement
  return (
    <div className="min-h-screen bg-white">
      {/* Subtle parallax background layer */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div
          className="absolute bottom-0 right-1/4 w-[800px] h-[800px] rounded-full blur-3xl opacity-20 bg-neutral-100"
          style={{
            transform: `translateY(${typeof window !== 'undefined' ? window.scrollY * 0.1 : 0}px)`,
            transition: 'transform 0.05s linear'
          }}
        />
      </div>

      <div className="max-w-6xl mx-auto px-6 lg:px-8 py-20">
        {/* Header */}
        <div className="mb-12">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-sm font-light text-neutral-600 hover:text-neutral-900 transition-all duration-300"
          >
            <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t.nav.back}
          </Link>
        </div>

        {/* Hero */}
        <div className="mb-16">
          <MetaLabel>{t.checkout.title}</MetaLabel>
          <h1 className="text-5xl font-normal tracking-tight text-neutral-900 mt-3 mb-4">
            {t.checkout.pageTitle}
          </h1>
          <p className="text-base leading-relaxed text-neutral-600 max-w-2xl font-light">
            {t.checkout.selectSize}
          </p>
        </div>

        {/* Progress Steps - Enhanced with shadow and animation */}
        <div className="mb-16">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={cn(
                  "w-12 h-12 rounded-full border-2 flex items-center justify-center font-light transition-all duration-500",
                  step > s && "bg-neutral-900 border-neutral-900 text-white shadow-[0_10px_30px_-10px_rgba(0,0,0,0.3)]",
                  step === s && "border-neutral-900 text-neutral-900 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.2)] scale-110",
                  step < s && "border-neutral-200 text-neutral-400"
                )}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={cn(
                    "w-16 h-1 rounded-full transition-all duration-500",
                    step > s ? "bg-neutral-900" : "bg-neutral-200"
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-2 mt-6">
            <div className="text-center w-12">
              <p className="text-xs font-light text-neutral-500">{t.checkout.stepSize}</p>
            </div>
            <div className="w-16" />
            <div className="text-center w-12">
              <p className="text-xs font-light text-neutral-500">{t.checkout.stepRibbe}</p>
            </div>
            <div className="w-16" />
            <div className="text-center w-12">
              <p className="text-xs font-light text-neutral-500">{t.checkout.stepExtras}</p>
            </div>
            <div className="w-16" />
            <div className="text-center w-12">
              <p className="text-xs font-light text-neutral-500">{t.checkout.stepDelivery}</p>
            </div>
          </div>
        </div>

        <div className="md:flex md:gap-8 md:items-start">
          {/* Main Content */}
          <div ref={mainContentRef} className="md:flex-1 md:w-2/3 space-y-8 mb-8 md:mb-0">

            {/* Step 1: Box Size */}
            <div ref={step1Ref} className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-light text-neutral-900">{t.checkout.step1Title}</h2>
                {boxSize && step > 1 && (
                  <button
                    onClick={() => setStep(1)}
                    className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {t.common.edit}
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {(['8', '12'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setBoxSize(size);
                      if (step === 1) setStep(2);
                    }}
                    className={cn(
                      "p-8 border-2 rounded-xl transition-all duration-500 text-center group",
                      boxSize === size
                        ? "border-neutral-900 bg-neutral-50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
                        : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                    )}
                  >
                    <div className="space-y-4">
                      <h3 className="text-6xl font-light text-neutral-900 tabular-nums transition-transform duration-300 group-hover:scale-105">
                        {size} <span className="text-2xl text-neutral-500 font-light">{t.common.kg}</span>
                      </h3>
                      <p className="text-sm font-light text-neutral-600">
                        {size === '8' ? t.checkout.persons2to3 : t.checkout.persons4to6}
                      </p>
                      <div className="text-3xl font-light text-neutral-900 tabular-nums">
                        {prices ? `${prices[size].total} kr` : t.common.loading}
                      </div>
                      <p className="text-xs font-light text-neutral-500">
                        {t.checkout.payNow}: {prices ? `${prices[size].deposit} kr` : t.common.loading}
                      </p>
                    </div>

                    {boxSize === size && boxContents[size] && (
                      <div className="mt-8 pt-6 border-t border-neutral-200">
                        <MetaLabel>{t.checkout.inBox}</MetaLabel>
                        <ul className="space-y-3 mt-4">
                          {boxContents[size].map((item, idx) => (
                            <li key={idx} className="flex items-start gap-3 text-sm text-left">
                              <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                              <span className={cn(
                                "font-light",
                                item.highlight ? "text-neutral-900 font-normal" : "text-neutral-600"
                              )}>
                                {item.name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </button>
                ))}
              </div>

              {canProceedToStep2 && step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="mt-8 w-full px-6 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
                >
                  {t.checkout.goToRibbeChoice}
                </button>
              )}
            </div>

            {/* Step 2: Ribbe Choice */}
            {boxSize && (
              <div ref={step2Ref} className={cn(
                "bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500",
                step < 2 && "opacity-40 pointer-events-none",
                step >= 2 && "hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-light text-neutral-900">{t.checkout.step2Title}</h2>
                  {ribbeChoice && step > 2 && (
                    <button
                      onClick={() => setStep(2)}
                      className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {t.common.edit}
                    </button>
                  )}
                </div>

                <p className="text-sm font-light text-neutral-600 mb-6">
                  {t.checkout.boxContains.replace('{size}', boxSize === '8' ? '2.0' : '3.0')}
                </p>

                <div className="space-y-4">
                  {[
                    { id: 'tynnribbe', name: t.checkout.tynnribbe, desc: t.checkout.tynnribbeDesc },
                    { id: 'familieribbe', name: t.checkout.familieribbe, desc: t.checkout.familieribbeDesc },
                    { id: 'porchetta', name: t.checkout.porchetta, desc: t.checkout.porchettaDesc },
                    { id: 'butchers_choice', name: t.checkout.butchersChoice, desc: t.checkout.butchersChoiceDesc },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setRibbeChoice(option.id as typeof ribbeChoice);
                        if (step === 2) setStep(3);
                      }}
                      className={cn(
                        "w-full text-left p-6 border-2 rounded-xl transition-all duration-300 group",
                        ribbeChoice === option.id
                          ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                          : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-normal text-neutral-900">{option.name}</p>
                          <p className="text-sm font-light text-neutral-600 mt-2">{option.desc}</p>
                        </div>
                        {ribbeChoice === option.id && <Check className="w-5 h-5 text-neutral-900 flex-shrink-0 ml-4" />}
                      </div>
                    </button>
                  ))}
                </div>

                {canProceedToStep3 && step === 2 && (
                  <button
                    onClick={() => setStep(3)}
                    className="mt-8 w-full px-6 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
                  >
                    {t.checkout.goToExtras}
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Extra Products */}
            {ribbeChoice && (
              <div ref={step3Ref} className={cn(
                "bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500",
                step < 3 && "opacity-40 pointer-events-none",
                step >= 3 && "hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-light text-neutral-900">{t.checkout.step3Title}</h2>
                  {step > 3 && (
                    <button
                      onClick={() => setStep(3)}
                      className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-all duration-300 hover:-translate-y-0.5"
                    >
                      {t.common.edit}
                    </button>
                  )}
                </div>

                <div className="mb-8 p-5 bg-neutral-50 border border-neutral-200 rounded-xl">
                  <p className="text-sm font-light text-neutral-700 leading-relaxed">
                    {t.checkout.extrasWarning}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {availableExtras
                    .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
                    .map((extra) => {
                    const isSelected = extraProducts.includes(extra.slug);
                    const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                    const quantity = extraQuantities[extra.slug] || defaultQty;

                    return (
                      <div
                        key={extra.slug}
                        className={cn(
                          "p-6 border-2 rounded-xl transition-all duration-300 cursor-pointer group",
                          isSelected
                            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                        )}
                        onClick={() => {
                          setExtraProducts(prev =>
                            prev.includes(extra.slug)
                              ? prev.filter(p => p !== extra.slug)
                              : [...prev, extra.slug]
                          );
                          if (!isSelected && !extraQuantities[extra.slug]) {
                            const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
                            setExtraQuantities(prev => ({
                              ...prev,
                              [extra.slug]: defaultQty
                            }));
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <h4 className="font-normal text-neutral-900">
                              {lang === 'no' ? extra.name_no : (extra.name_en || extra.name_no)}
                            </h4>
                            {extra.chef_term_no && (
                              <span className="text-xs text-neutral-400 italic">({lang === 'no' ? extra.chef_term_no : (extra.chef_term_en || extra.chef_term_no)})</span>
                            )}
                            {(extra.description_premium_no || extra.recipe_suggestions) && (
                              <button
                                onClick={(e) => { e.stopPropagation(); }}
                                onMouseEnter={(e) => {
                                  e.stopPropagation();
                                  setHoveredExtra(extra);
                                  setModalPosition({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => setHoveredExtra(null)}
                                className="w-5 h-5 rounded-full border border-neutral-300 flex items-center justify-center text-xs text-neutral-400 hover:text-neutral-900 hover:border-neutral-900 transition-all"
                              >
                                i
                              </button>
                            )}
                          </div>
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                            isSelected ? "border-neutral-900 bg-neutral-900 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]" : "border-neutral-200 group-hover:border-neutral-300"
                          )}>
                            {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                          </div>
                        </div>

                        {(lang === 'no' ? (extra.description_premium_no || extra.description_no) : (extra.description_premium_en || extra.description_en || extra.description_no)) && (
                          <p className="text-sm font-light text-neutral-600 mb-4">
                            {lang === 'no' ? (extra.description_premium_no || extra.description_no) : (extra.description_premium_en || extra.description_en || extra.description_no)}
                          </p>
                        )}

                        <div className="text-2xl font-light text-neutral-900 tabular-nums">
                          {extra.price_nok} kr <span className="text-sm font-light text-neutral-500">/ {extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk}</span>
                        </div>

                        {isSelected && (
                          <div
                            className="flex items-center gap-2 pt-4 border-t border-neutral-200 mt-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              onClick={() => {
                                let newQty: number;
                                if (extra.pricing_type === 'per_kg') {
                                  newQty = Math.floor((quantity - 0.1) / 0.5) * 0.5;
                                } else {
                                  newQty = quantity - 1;
                                }

                                if (newQty <= 0) {
                                  setExtraProducts(prev => prev.filter(p => p !== extra.slug));
                                  setExtraQuantities(prev => {
                                    const newQuantities = { ...prev };
                                    delete newQuantities[extra.slug];
                                    return newQuantities;
                                  });
                                } else {
                                  setExtraQuantities(prev => ({
                                    ...prev,
                                    [extra.slug]: newQty
                                  }));
                                }
                              }}
                              className="w-8 h-8 border border-neutral-200 rounded flex items-center justify-center hover:bg-neutral-100"
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
                                  setExtraQuantities(prev => ({
                                    ...prev,
                                    [extra.slug]: value
                                  }));
                                }
                              }}
                              className="w-16 text-center border border-neutral-200 rounded px-2 py-1 tabular-nums"
                            />

                            <button
                              onClick={() => {
                                let newQty: number;
                                if (extra.pricing_type === 'per_kg') {
                                  newQty = Math.ceil((quantity + 0.1) / 0.5) * 0.5;
                                } else {
                                  newQty = quantity + 1;
                                }
                                setExtraQuantities(prev => ({
                                  ...prev,
                                  [extra.slug]: newQty
                                }));
                              }}
                              className="w-8 h-8 border border-neutral-200 rounded flex items-center justify-center hover:bg-neutral-100"
                            >
                              +
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Extra Product Info Modal */}
                {hoveredExtra && (
                  <ExtraProductModal
                    extra={hoveredExtra}
                    position={modalPosition}
                    onClose={() => setHoveredExtra(null)}
                  />
                )}

                {step === 3 && (
                  <button
                    onClick={() => setStep(4)}
                    className="mt-8 w-full px-6 py-4 bg-neutral-900 text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300"
                  >
                    {t.checkout.goToDelivery}
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Delivery */}
            {step >= 4 && (
              <div ref={step4Ref} className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.12)]">
                <h2 className="text-2xl font-light text-neutral-900 mb-6">{t.checkout.step4Title}</h2>

                <div className="space-y-6">
                  <div>
                    <MetaLabel>{t.checkout.deliveryOptions}</MetaLabel>
                    <div className="space-y-4 mt-4">
                      <button
                        onClick={() => setDeliveryType('farm')}
                        className={cn(
                          "w-full p-6 text-left border-2 rounded-xl transition-all duration-300 group",
                          deliveryType === 'farm'
                            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              deliveryType === 'farm' ? "border-neutral-900 bg-neutral-900 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]" : "border-neutral-200"
                            )}>
                              {deliveryType === 'farm' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="font-normal text-neutral-900">{t.checkout.pickupFarm}</p>
                              <p className="text-sm font-light text-neutral-600 mt-1">{t.checkout.pickupFarmAddress}</p>
                            </div>
                          </div>
                          <span className="text-sm font-light text-neutral-900">{t.common.free}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setDeliveryType('trondheim')}
                        className={cn(
                          "w-full p-6 text-left border-2 rounded-xl transition-all duration-300 group",
                          deliveryType === 'trondheim'
                            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              deliveryType === 'trondheim' ? "border-neutral-900 bg-neutral-900 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]" : "border-neutral-200"
                            )}>
                              {deliveryType === 'trondheim' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="font-normal text-neutral-900">{t.checkout.pickupTrondheim}</p>
                              <p className="text-sm font-light text-neutral-600 mt-1">{t.checkout.pickupTrondheimAddress}</p>
                            </div>
                          </div>
                          <span className="text-sm font-light text-neutral-900 tabular-nums">
                            +{addonPrices?.trondheim || 200} kr
                          </span>
                        </div>
                      </button>

                      <button
                        onClick={() => setDeliveryType('e6')}
                        className={cn(
                          "w-full p-6 text-left border-2 rounded-xl transition-all duration-300 group",
                          deliveryType === 'e6'
                            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-300",
                              deliveryType === 'e6' ? "border-neutral-900 bg-neutral-900 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]" : "border-neutral-200"
                            )}>
                              {deliveryType === 'e6' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <div>
                              <p className="font-normal text-neutral-900">{t.checkout.deliveryE6}</p>
                              <p className="text-sm font-light text-neutral-600 mt-1">{t.checkout.deliveryE6Address}</p>
                            </div>
                          </div>
                          <span className="text-sm font-light text-neutral-900 tabular-nums">
                            +{addonPrices?.e6 || 300} kr
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {deliveryType === 'farm' && (
                    <div>
                      <MetaLabel>{t.checkout.extraOptions}</MetaLabel>
                      <button
                        onClick={() => setFreshDelivery(!freshDelivery)}
                        className={cn(
                          "w-full p-6 text-left border-2 rounded-xl transition-all duration-300 mt-4 group",
                          freshDelivery
                            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
                            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] hover:-translate-y-0.5"
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-300",
                              freshDelivery ? "border-neutral-900 bg-neutral-900 shadow-[0_5px_15px_-5px_rgba(0,0,0,0.3)]" : "border-neutral-200"
                            )}>
                              {freshDelivery && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="font-normal text-neutral-900">{t.checkout.freshDelivery}</p>
                              <p className="text-sm font-light text-neutral-600 mt-1">{t.checkout.freshDeliveryDesc}</p>
                            </div>
                          </div>
                          <span className="text-sm font-light text-neutral-900 tabular-nums">
                            +{addonPrices?.fresh || 500} kr
                          </span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div
            className="w-full md:w-1/3 md:flex-shrink-0 md:self-start md:sticky md:top-28 transition-[margin] duration-300"
            style={!isMobile ? { marginTop: `${summaryOffset}px` } : undefined}
          >
            <div className="bg-white border border-neutral-200 rounded-xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] transition-all duration-500 hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.15)]">
                <h3 className="text-2xl font-light text-neutral-900 mb-6">
                  {t.checkout.summary}
                </h3>

                {/* Line items */}
                <div className="space-y-4 pb-6 border-b border-neutral-200">
                  {boxSize && prices && (
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-neutral-600">{boxSize} kg {boxSize === '8' ? t.product.box8 : t.product.box12}</span>
                      <span className="font-light text-neutral-900 tabular-nums">{prices[boxSize].total} kr</span>
                    </div>
                  )}
                  {deliveryType !== 'farm' && addonPrices && (
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-neutral-600">
                        {deliveryType === 'trondheim' ? t.checkout.pickupTrondheim : t.checkout.deliveryE6}
                      </span>
                      <span className="font-light text-neutral-900 tabular-nums">
                        +{deliveryType === 'trondheim' ? addonPrices.trondheim : addonPrices.e6} kr
                      </span>
                    </div>
                  )}
                  {freshDelivery && addonPrices && (
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-neutral-600">{t.checkout.freshDelivery}</span>
                      <span className="font-light text-neutral-900 tabular-nums">+{addonPrices.fresh} kr</span>
                    </div>
                  )}
                  {extraProducts.length > 0 && extraProducts.map(slug => {
                    const extra = availableExtras.find(e => e.slug === slug);
                    if (!extra) return null;
                    const quantity = extraQuantities[slug] || 1;
                    const itemTotal = extra.price_nok * quantity;
                    return (
                      <div key={slug} className="flex justify-between text-sm">
                        <span className="font-light text-neutral-600">
                          {extra.name_no} ({quantity} {extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk})
                        </span>
                        <span className="font-light text-neutral-900 tabular-nums">+{itemTotal} kr</span>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="space-y-4">
                  <div className="flex justify-between text-sm">
                    <span className="font-light text-neutral-600">{t.checkout.deposit50Percent}</span>
                    <span className="font-light text-neutral-900 tabular-nums">{baseDepositTotal.toLocaleString(locale)} {t.common.currency}</span>
                  </div>
                  {referralData && (
                    <div className="flex justify-between text-sm text-green-700">
                      <span className="font-light">{t.checkout.friendDiscount}</span>
                      <span className="font-light tabular-nums">-{referralDiscount.toLocaleString(locale)} {t.common.currency}</span>
                    </div>
                  )}
                  {rebateData && (
                    <div className="flex justify-between text-sm text-blue-700">
                      <span className="font-light">{t.checkout.discountCode}</span>
                      <span className="font-light tabular-nums">-{rebateDiscount.toLocaleString(locale)} {t.common.currency}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pb-4 border-b border-neutral-200">
                    <span className="font-light text-neutral-600">{t.checkout.remainderBeforeDelivery}</span>
                    <span className="font-light text-neutral-900 tabular-nums">{remainderTotal.toLocaleString(locale)} {t.common.currency}</span>
                  </div>
                  <div className="flex justify-between text-2xl">
                    <span className="font-light text-neutral-900">{t.common.total}</span>
                    <span className="font-light text-neutral-900 tabular-nums">{totalPrice.toLocaleString(locale)} {t.common.currency}</span>
                  </div>
                </div>

                {step === 4 && boxSize && (
                  <div className="space-y-6 mt-6">
                    {/* Discount codes */}
                    <div className="pt-6 border-t border-neutral-200">
                      <button
                        type="button"
                        onClick={() => setShowDiscountCodes(!showDiscountCodes)}
                        className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-colors duration-300"
                      >
                        {t.checkout.hasDiscountCode}
                      </button>

                      {showDiscountCodes && (
                        <div className="mt-4 space-y-4">
                          {!rebateData && (
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
                          )}

                          {!referralData && (
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
                          )}
                        </div>
                      )}
                    </div>

                    {/* Agreement checkboxes */}
                    <div className="space-y-5 pt-6 border-t border-neutral-200">
                      <Label htmlFor="deposit-policy" className="flex items-start gap-4 cursor-pointer group">
                        <Checkbox
                          id="deposit-policy"
                          checked={agreedToDepositPolicy}
                          onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-light leading-relaxed text-neutral-700 group-hover:text-neutral-900 transition-colors duration-300">
                          <strong className="font-normal text-neutral-900">{t.checkout.depositNotRefundable}</strong> {t.checkout.triggersProd}
                        </span>
                      </Label>

                      <Label htmlFor="terms" className="flex items-start gap-4 cursor-pointer group">
                        <Checkbox
                          id="terms"
                          checked={agreedToTerms}
                          onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                          className="mt-0.5"
                        />
                        <span className="text-sm font-light leading-relaxed text-neutral-700 group-hover:text-neutral-900 transition-colors duration-300">
                          {t.checkout.agreeToTerms} <a href="/vilkar" target="_blank" rel="noopener noreferrer" className="underline font-normal hover:text-neutral-900 transition-colors duration-300">{t.checkout.termsLink}</a>
                        </span>
                      </Label>
                    </div>

                    {/* CTA */}
                    <button
                      disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
                      onClick={handleCheckout}
                      className="w-full px-6 py-4 bg-[#FF5B24] text-white rounded-xl text-sm font-light uppercase tracking-wide shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] hover:bg-[#E6501F] hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.3)] flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        t.common.processing
                      ) : (
                        <span>{t.checkout.payWith} VIPPS</span>
                      )}
                    </button>

                    <div className="text-xs text-center font-light text-neutral-500">
                      {t.checkout.contactInfoFromVipps}
                    </div>
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

