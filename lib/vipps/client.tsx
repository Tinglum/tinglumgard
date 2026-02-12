"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ChevronRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function CheckoutPage() {
  const { t, lang } = useLanguage();
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const copy = t.vippsCheckout;
  const currency = t.common.currency;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const [step, setStep] = useState(1);
  const [boxSize, setBoxSize] = useState<'8' | '12' | ''>('');
  const [ribbeChoice, setRibbeChoice] = useState<'tynnribbe' | 'familieribbe' | 'porchetta' | 'butchers_choice' | ''>('butchers_choice');
  const [extraProducts, setExtraProducts] = useState<string[]>([]);
  const [extraQuantities, setExtraQuantities] = useState<Record<string, number>>({});
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [deliveryType, setDeliveryType] = useState<'farm' | 'trondheim' | 'e6'>('farm');
  const [freshDelivery, setFreshDelivery] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToDepositPolicy, setAgreedToDepositPolicy] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pricing, setPricing] = useState<any>(null);

  // URL parameter handling
  useEffect(() => {
    const sizeParam = searchParams.get('size');
    if (sizeParam === '8' || sizeParam === '12') {
      setBoxSize(sizeParam);
      setStep(2);
    }
  }, [searchParams]);

  // Fetch pricing configuration from app_config
  useEffect(() => {
    async function fetchPricing() {
      try {
        const response = await fetch('/api/config/pricing');
        const data = await response.json();
        setPricing(data);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
        // Do not set fallback - let UI show loading state
        // This ensures we never show incorrect hardcoded prices
      }
    }
    fetchPricing();
  }, []);

  // Fetch available extras
  useEffect(() => {
    async function fetchExtras() {
      try {
        const response = await fetch('/api/extras');
        const data = await response.json();
        if (data.extras) {
          setAvailableExtras(data.extras);
          // Initialize extraQuantities with default values from extras
          const defaultQuantities: Record<string, number> = {};
          data.extras.forEach((extra: any) => {
            defaultQuantities[extra.slug] = extra.default_quantity || 1;
          });
          setExtraQuantities(defaultQuantities);
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

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boxSize: parseInt(boxSize),
          ribbeChoice,
          extraProducts: extrasWithQuantities,
          deliveryType: apiDeliveryType,
          freshDelivery,
          notes: '',
          customerName: '',
          customerEmail: '',
          customerPhone: '',
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Order created successfully, now initiate deposit payment
        const orderId = data.orderId;

        try {
          // Create deposit payment session with Vipps
          const paymentResponse = await fetch(`/api/orders/${orderId}/deposit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });

          const paymentData = await paymentResponse.json();

          if (paymentData.success && paymentData.redirectUrl) {
            // Redirect to Vipps payment
            window.location.href = paymentData.redirectUrl;
          } else {
            // Payment creation failed, but order exists
            console.error('Failed to create payment:', paymentData.error);
            setOrderConfirmed(true);
            setOrderId(orderId);
            toast({
              title: copy.toastOrderCreatedTitle,
              description: copy.toastOrderCreatedDescription,
              variant: 'destructive'
            });
          }
        } catch (paymentError) {
          console.error('Payment creation failed:', paymentError);
          // Fallback: show order confirmation even if payment fails
          setOrderConfirmed(true);
          setOrderId(orderId);
          toast({
            title: copy.toastOrderCreatedTitle,
            description: copy.toastOrderCreatedDescription,
            variant: 'destructive'
          });
        }
      } else {
        toast({
          title: copy.toastErrorTitle,
          description: copy.toastErrorDescription,
          variant: 'destructive'
        });
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Checkout failed:', error);
      toast({
        title: copy.toastErrorTitle,
        description: copy.toastErrorDescription,
        variant: 'destructive'
      });
      setIsProcessing(false);
    }
  }

  const depositPercent = pricing?.deposit_percentage || 50;
  const getPresetTotal = (size: '8' | '12') => {
    return pricing?.preset_prices?.[size] ?? 0;
  };

  const prices = {
    '8': {
      total: getPresetTotal('8'),
      deposit: Math.floor(getPresetTotal('8') * depositPercent / 100),
      remainder: Math.floor(getPresetTotal('8') * (100 - depositPercent) / 100),
    },
    '12': {
      total: getPresetTotal('12'),
      deposit: Math.floor(getPresetTotal('12') * depositPercent / 100),
      remainder: Math.floor(getPresetTotal('12') * (100 - depositPercent) / 100),
    },
  };

  const addonPrices = {
    trondheim: pricing?.delivery_fee_trondheim || 200,
    e6: pricing?.delivery_fee_e6 || 300,
    fresh: 500,
  };

  const boxContents = {
    '8': copy.boxContents8.map((name, index) => ({ name, highlight: index === 0 })),
    '12': copy.boxContents12.map((name, index) => ({ name, highlight: index === 0 })),
  };

  const selectedPrice = boxSize ? prices[boxSize] : null;
  const deliveryPrice = deliveryType === 'farm' ? 0 : deliveryType === 'trondheim' ? addonPrices.trondheim : addonPrices.e6;
  const freshPrice = freshDelivery ? addonPrices.fresh : 0;

  // Calculate extras total
  const extrasTotal = extraProducts.reduce((total, slug) => {
    const extra = availableExtras.find(e => e.slug === slug);
    if (!extra) return total;
    const quantity = extraQuantities[slug] || 1;
    return total + (extra.price_nok * quantity);
  }, 0);

  const addonTotal = deliveryPrice + freshPrice + extrasTotal;

  const depositTotal = selectedPrice ? selectedPrice.deposit + addonTotal : 0;
  const totalPrice = selectedPrice ? selectedPrice.deposit + selectedPrice.remainder + addonTotal : 0;

  const canProceedToStep2 = boxSize !== '';
  const canProceedToStep3 = ribbeChoice !== '';

  // Show order confirmation if order is confirmed
  if (orderConfirmed) {
    return (
      <div className="min-h-screen relative overflow-x-hidden">
        {/* Animated background */}
        <div className="fixed inset-0 -z-10">
          <div className={cn("absolute inset-0", theme.bgGradientHero)} />
          <div className={cn("absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse bg-gradient-to-bl", theme.bgGradientOrbs[0], "to-transparent")} />
          <div className={cn("absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse bg-gradient-to-tr", theme.bgGradientOrbs[1], "to-transparent")} style={{ animationDelay: '1s' }} />
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className={cn("rounded-3xl p-12 text-center border-2 animate-in fade-in slide-in-from-bottom-4 duration-700", theme.glassCard, theme.bgCard, theme.glassBorder)}>
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className={cn("w-10 h-10", theme.textOnDark)} />
            </div>

            <h1 className={cn("text-4xl md:text-5xl font-bold mb-4", theme.textPrimary)}>
              {copy.confirmationTitle}
            </h1>

            <p className={cn("text-lg mb-8", theme.textMuted)}>
              {copy.confirmationBody}
            </p>

            {orderId && (
              <div className={cn("rounded-2xl p-6 mb-8", theme.bgSecondary)}>
                <p className={cn("text-sm mb-2", theme.textMuted)}>{copy.orderNumberLabel}</p>
                <p className={cn("text-2xl font-bold font-mono", theme.textPrimary)}>{orderId}</p>
              </div>
            )}

            <div className={cn("space-y-4 text-left rounded-2xl p-6 mb-8", theme.bgSecondary)}>
              <h3 className={cn("font-bold text-lg mb-4", theme.textPrimary)}>{copy.nextStepsTitle}</h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5", theme.bgDark, theme.textOnDark)}>1</div>
                  <p className={cn("text-sm", theme.textSecondary)}>{copy.nextStep1}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5", theme.bgDark, theme.textOnDark)}>1</div>
                  <p className={cn("text-sm", theme.textSecondary)}>{copy.nextStep2}</p>
                </div>
                <div className="flex items-start gap-3">
                  <div className={cn("w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5", theme.bgDark, theme.textOnDark)}>3</div>
                  <p className={cn("text-sm", theme.textSecondary)}>{copy.nextStep3}</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/"
                className={cn("px-8 py-4 rounded-2xl font-bold hover:shadow-2xl hover:scale-105 transition-all duration-300", theme.buttonPrimary, theme.buttonPrimaryHover, theme.textOnDark)}
              >
                {copy.backToHome}
              </Link>
              <Link
                href="/min-side"
                className={cn("px-8 py-4 rounded-2xl font-bold border hover:shadow-2xl hover:scale-105 transition-all duration-300", theme.buttonSecondary, theme.buttonSecondaryHover, theme.textPrimary, theme.glassBorder, theme.glassCard)}
              >
                {copy.viewOrders}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className={cn("absolute inset-0", theme.bgGradientHero)} />
        <div className={cn("absolute top-0 right-0 w-[600px] h-[600px] rounded-full blur-3xl animate-pulse bg-gradient-to-bl", theme.bgGradientOrbs[0], "to-transparent")} />
        <div className={cn("absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full blur-3xl animate-pulse bg-gradient-to-tr", theme.bgGradientOrbs[1], "to-transparent")} style={{ animationDelay: '1s' }} />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="mb-12 flex items-center justify-between">
          <Link
            href="/"
            className={cn("group flex items-center gap-2 transition-colors", theme.textSecondary, `hover:${theme.textPrimary}`)}
          >
            <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {copy.back}
          </Link>
        </div>

        {/* Hero */}
        <div className="text-center mb-16 animate-in fade-in duration-700">
          <h1 className={cn("text-5xl md:text-6xl font-bold mb-4", theme.textPrimary)}>
            {copy.heroTitle}
          </h1>
          <p className={cn("text-lg max-w-2xl mx-auto", theme.textMuted)}>
            {copy.heroSubtitle}
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-12">
          <div className="flex items-center justify-center gap-4">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-4">
                <div className={cn(
                  "relative flex items-center justify-center w-12 h-12 rounded-full font-bold transition-all duration-500",
                  step >= s
                    ? cn(theme.buttonPrimary, theme.textOnDark, "shadow-xl scale-110")
                    : cn(theme.buttonSecondary, theme.textMuted, "border", theme.borderSecondary, theme.glassCard)
                )}>
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </div>
                {s < 4 && (
                  <div className={cn(
                    "w-12 md:w-24 h-1 rounded-full transition-all duration-500",
                    step > s ? theme.buttonPrimary : theme.borderSecondary
                  )} />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="text-center w-12 md:w-24">
              <p className={cn("text-xs font-semibold", theme.textPrimary)}>{copy.progressSize}</p>
            </div>
            <div className="w-12 md:w-24" />
            <div className="text-center w-12 md:w-24">
              <p className={cn("text-xs font-semibold", theme.textPrimary)}>{copy.progressRibbe}</p>
            </div>
            <div className="w-12 md:w-24" />
            <div className="text-center w-12 md:w-24">
              <p className={cn("text-xs font-semibold", theme.textPrimary)}>{copy.progressExtras}</p>
            </div>
            <div className="w-12 md:w-24" />
            <div className="text-center w-12 md:w-24">
              <p className={cn("text-xs font-semibold", theme.textPrimary)}>{copy.progressDelivery}</p>
            </div>
          </div>
        </div>

        <div className="md:flex md:gap-8 md:items-start">
          {/* Main Content */}
          <div className="md:flex-1 md:w-2/3 space-y-6 mb-8 md:mb-0">

            {/* Step 1: Box Size */}
            <div className={cn(
              "relative rounded-3xl p-8 border shadow-2xl transition-all duration-500",
              theme.bgCard,
              theme.glassCard,
              theme.glassBorder,
              step === 1 ? cn("ring-2", theme.borderPrimary) : step > 1 ? "opacity-60" : ""
            )}>
              <div className="flex items-center justify-between mb-6">
                <h2 className={cn("text-2xl font-bold", theme.textPrimary)}>{copy.step1Title}</h2>
                {boxSize && step > 1 && (
                  <button
                    onClick={() => setStep(1)}
                    className={cn("text-sm underline", theme.textSecondary, `hover:${theme.textPrimary}`)}
                  >
                    {copy.change}
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                {(['8', '12'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => {
                      setBoxSize(size);
                      if (step === 1) setStep(2);
                    }}
                    className={cn(
                      "group relative p-6 rounded-2xl border-2 transition-all duration-300",
                      boxSize === size
                        ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl scale-105")
                        : cn(theme.borderSecondary, `hover:${theme.borderSecondary} hover:shadow-lg`)
                    )}
                  >
                    <div className="text-center mb-4">
                      <p className={cn("text-5xl font-bold mb-2", theme.textPrimary)}>
                        {size} <span className={cn("text-2xl", theme.textMuted)}>{copy.unitKg}</span>
                      </p>
                      <p className={cn("text-sm", theme.textMuted)}>
                        {size === '8' ? copy.sizePeople8 : copy.sizePeople12}
                      </p>
                    </div>
                    {pricing && prices[size].total > 0 ? (
                      <p className={cn("text-2xl font-bold text-center", theme.textPrimary)}>
                        {currency} {prices[size].total.toLocaleString(locale)}
                      </p>
                    ) : (
                      <p className={cn("text-xl text-center animate-pulse", theme.textMuted)}>{copy.loadingPrices}</p>
                    )}

                    {boxSize === size && boxContents[size] && (
                      <div className={cn("mt-6 pt-6 border-t animate-in fade-in slide-in-from-top-2 duration-500", theme.borderSecondary)}>
                        <p className={cn("text-xs font-bold uppercase tracking-wider mb-3", theme.textPrimary)}>{copy.inBox}</p>
                        <ul className="space-y-2">
                          {boxContents[size].map((item, idx) => (
                            <li key={idx} className={cn("flex items-start gap-2 text-sm", item.highlight ? cn("font-medium", theme.textPrimary) : theme.textMuted)}>
                              <Check className="w-4 h-4 flex-shrink-0 mt-0.5 text-green-600" />
                              <span>{item.name}</span>
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
                  className={cn("mt-6 w-full px-8 py-4 rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", theme.buttonPrimary, theme.buttonPrimaryHover, theme.textOnDark)}
                >
                  {copy.nextToRibbe}
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Step 2: Ribbe Choice */}
            {boxSize && (
              <div className={cn(
                "relative rounded-3xl p-8 border shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4",
                theme.bgCard,
                theme.glassCard,
                theme.glassBorder,
                step === 2 ? cn("ring-2", theme.borderPrimary) : step > 2 ? "opacity-60" : step < 2 ? "opacity-40 pointer-events-none" : ""
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn("text-2xl font-bold", theme.textPrimary)}>{copy.step2Title}</h2>
                  {ribbeChoice && step > 2 && (
                    <button
                      onClick={() => setStep(2)}
                      className={cn("text-sm underline", theme.textSecondary, `hover:${theme.textPrimary}`)}
                    >
                      {copy.change}
                    </button>
                  )}
                </div>

                <p className={cn("text-sm mb-6", theme.textMuted)}>
                  {copy.ribbeHint.replace('{amount}', boxSize === '8' ? '2.0' : '3.0')}
                </p>

                <div className="grid gap-4">
                  {[
                    { id: 'tynnribbe', name: copy.ribOptionTynnribbeName, desc: copy.ribOptionTynnribbeDesc, tag: null },
                    { id: 'familieribbe', name: copy.ribOptionFamilieribbeName, desc: copy.ribOptionFamilieribbeDesc, tag: null },
                    { id: 'porchetta', name: copy.ribOptionPorchettaName, desc: copy.ribOptionPorchettaDesc, tag: null },
                    { id: 'butchers_choice', name: copy.ribOptionButcherName, desc: copy.ribOptionButcherDesc, tag: copy.ribOptionTagDefault },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => {
                        setRibbeChoice(option.id as typeof ribbeChoice);
                        if (step === 2) setStep(3);
                      }}
                      className={cn(
                        "relative text-left p-5 rounded-xl border-2 transition-all duration-300",
                        ribbeChoice === option.id
                          ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl")
                          : cn(theme.borderSecondary, "hover:shadow-lg")
                      )}
                    >
                      {option.tag && (
                        <span className={cn("absolute top-3 right-3 px-3 py-1 text-xs font-bold rounded-full", theme.bgDark, theme.textOnDark)}>
                          {option.tag}
                        </span>
                      )}
                      <p className={cn("font-bold mb-1", theme.textPrimary)}>{option.name}</p>
                      <p className={cn("text-sm", theme.textMuted)}>{option.desc}</p>
                    </button>
                  ))}
                </div>

                {canProceedToStep3 && step === 2 && (
                  <button
                    onClick={() => setStep(3)}
                    className={cn("mt-6 w-full px-8 py-4 rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", theme.buttonPrimary, theme.buttonPrimaryHover, theme.textOnDark)}
                  >
                    {copy.nextToExtras}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Step 3: Extra Products */}
            {ribbeChoice && (
              <div className={cn(
                "relative rounded-3xl p-8 border shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4",
                theme.bgCard,
                theme.glassCard,
                theme.glassBorder,
                step === 3 ? cn("ring-2", theme.borderPrimary) : step > 3 ? "opacity-60" : step < 3 ? "opacity-40 pointer-events-none" : ""
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h2 className={cn("text-2xl font-bold", theme.textPrimary)}>{copy.step3Title}</h2>
                  {step > 3 && (
                    <button
                      onClick={() => setStep(3)}
                      className={cn("text-sm underline", theme.textSecondary, `hover:${theme.textPrimary}`)}
                    >
                      {copy.change}
                    </button>
                  )}
                </div>

                <div className="mb-8 p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm">
                  <p className="text-sm text-amber-900 leading-relaxed">
                    <strong className="font-bold">{copy.extrasNoticeTitle}</strong> {copy.extrasNoticeBody}
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {availableExtras
                    .filter(extra => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
                    .map((extra) => {
                    const isSelected = extraProducts.includes(extra.slug);
                    const quantity = extraQuantities[extra.slug] !== undefined ? extraQuantities[extra.slug] : (extra.default_quantity || 1);

                    return (
                      <div
                        key={extra.slug}
                        className={cn(
                          "group relative p-6 rounded-2xl border-2 transition-all duration-300 cursor-pointer",
                          isSelected
                            ? cn("border-amber-500 bg-gradient-to-br from-amber-50 to-orange-50 shadow-xl scale-105")
                            : cn(theme.borderSecondary, theme.bgCard, "hover:shadow-lg hover:scale-102 hover:border-amber-300")
                        )}
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
                        {/* Selection Indicator */}
                        <div className="absolute top-4 right-4">
                          <div className={cn(
                            "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                            isSelected
                              ? "bg-amber-500 border-amber-500 shadow-md"
                              : "border-gray-300 bg-white group-hover:border-amber-400"
                          )}>
                            {isSelected && <Check className="w-4 h-4 text-white" />}
                          </div>
                        </div>

                        {/* Product Info */}
                        <div className="pr-8">
                          <h4 className={cn("text-lg font-bold mb-2", theme.textPrimary)}>{extra.name_no}</h4>
                          {extra.description_no && (
                            <p className={cn("text-sm mb-3 leading-relaxed", theme.textMuted)}>{extra.description_no}</p>
                          )}

                          {/* Price */}
                          <div className="flex items-baseline gap-2 mb-4">
                            <span className={cn("text-2xl font-bold", isSelected ? "text-amber-600" : theme.textPrimary)}>
                              {currency} {extra.price_nok.toLocaleString(locale)}
                            </span>
                            <span className={cn("text-sm", theme.textMuted)}>
                              /{extra.pricing_type === 'per_kg' ? copy.unitKg : copy.unitPieces}
                            </span>
                          </div>

                          {/* Quantity Selector */}
                          {isSelected && (
                            <div
                              className="flex items-center gap-3 pt-4 border-t border-amber-200 animate-in fade-in slide-in-from-top-2 duration-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <label className={cn("text-sm font-semibold", theme.textPrimary)}>{copy.quantityLabel}</label>
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
                                className={cn("w-24 text-center font-bold text-lg border-2 border-amber-300 focus:border-amber-500", theme.textPrimary)}
                              />
                              <span className={cn("text-sm font-medium", theme.textPrimary)}>
                                {extra.pricing_type === 'per_kg' ? copy.unitKg : copy.unitPieces}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {step === 3 && (
                  <button
                    onClick={() => setStep(4)}
                    className={cn("mt-6 w-full px-8 py-4 rounded-2xl font-bold uppercase tracking-wider hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2", theme.buttonPrimary, theme.buttonPrimaryHover, theme.textOnDark)}
                  >
                    {copy.nextToDelivery}
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}
              </div>
            )}

            {/* Step 4: Delivery */}
            {step >= 4 && (
              <div className={cn(
                "relative rounded-3xl p-8 border shadow-2xl transition-all duration-500 animate-in slide-in-from-bottom-4",
                theme.bgCard,
                theme.glassCard,
                theme.glassBorder,
                step === 4 ? cn("ring-2", theme.borderPrimary) : ""
              )}>
                <h2 className={cn("text-2xl font-bold mb-6", theme.textPrimary)}>{copy.step4Title}</h2>

                <div className="space-y-6">
                  {/* Delivery Type Selection */}
                  <div>
                    <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3", theme.textPrimary)}>{copy.deliveryOptionsTitle}</h3>
                    <div className="space-y-3">
                      <button
                        onClick={() => setDeliveryType('farm')}
                        className={cn(
                          "w-full p-5 rounded-xl border-2 transition-all duration-300 text-left hover:shadow-lg",
                          deliveryType === 'farm' ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl") : theme.borderSecondary
                        )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                              deliveryType === 'farm' ? cn(theme.buttonPrimary, theme.borderPrimary) : theme.borderSecondary
                            )}>
                              {deliveryType === 'farm' && <div className={cn("w-2.5 h-2.5 rounded-full", theme.textOnDark)} />}
                            </div>
                            <div>
                              <p className={cn("font-semibold", theme.textPrimary)}>{copy.pickupFarmTitle}</p>
                              <p className={cn("text-sm", theme.textMuted)}>{copy.pickupFarmAddress}</p>
                            </div>
                          </div>
                          <span className="text-sm font-bold text-green-600">{copy.free}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setDeliveryType('trondheim')}
                        className={cn(
                          "w-full p-5 rounded-xl border-2 transition-all duration-300 text-left hover:shadow-lg",
                          deliveryType === 'trondheim' ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl") : theme.borderSecondary
                        )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                              deliveryType === 'trondheim' ? cn(theme.buttonPrimary, theme.borderPrimary) : theme.borderSecondary
                            )}>
                              {deliveryType === 'trondheim' && <div className={cn("w-2.5 h-2.5 rounded-full", theme.textOnDark)} />}
                            </div>
                            <div>
                              <p className={cn("font-semibold", theme.textPrimary)}>{copy.pickupTrondheimTitle}</p>
                              <p className={cn("text-sm", theme.textMuted)}>{copy.pickupTrondheimAddress}</p>
                            </div>
                          </div>
                          <span className={cn("text-sm font-bold", theme.textPrimary)}>+{addonPrices.trondheim} {currency}</span>
                        </div>
                      </button>

                      <button
                        onClick={() => setDeliveryType('e6')}
                        className={cn(
                          "w-full p-5 rounded-xl border-2 transition-all duration-300 text-left hover:shadow-lg",
                          deliveryType === 'e6' ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl") : theme.borderSecondary
                        )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
                              deliveryType === 'e6' ? cn(theme.buttonPrimary, theme.borderPrimary) : theme.borderSecondary
                            )}>
                              {deliveryType === 'e6' && <div className={cn("w-2.5 h-2.5 rounded-full", theme.textOnDark)} />}
                            </div>
                            <div>
                              <p className={cn("font-semibold", theme.textPrimary)}>{copy.deliveryE6Title}</p>
                              <p className={cn("text-sm", theme.textMuted)}>{copy.deliveryE6Address}</p>
                            </div>
                          </div>
                          <span className={cn("text-sm font-bold", theme.textPrimary)}>+{addonPrices.e6} {currency}</span>
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Fresh Delivery Option - Only available with farm pickup */}
                  {deliveryType === 'farm' && (
                    <div>
                      <h3 className={cn("text-sm font-bold uppercase tracking-wider mb-3", theme.textPrimary)}>{copy.extraOptionsTitle}</h3>
                      <button
                        onClick={() => setFreshDelivery(!freshDelivery)}
                        className={cn(
                          "w-full p-5 rounded-xl border-2 transition-all duration-300 text-left hover:shadow-lg",
                          freshDelivery ? cn(theme.borderPrimary, theme.bgSecondary, "shadow-xl") : theme.borderSecondary
                        )}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              "w-5 h-5 rounded border-2 flex items-center justify-center",
                              freshDelivery ? cn(theme.buttonPrimary, theme.borderPrimary) : theme.borderSecondary
                            )}>
                              {freshDelivery && <Check className={cn("w-3 h-3", theme.textOnDark)} />}
                            </div>
                            <div>
                              <p className={cn("font-semibold", theme.textPrimary)}>{copy.freshDeliveryTitle}</p>
                              <p className={cn("text-sm", theme.textMuted)}>{copy.freshDeliveryDesc}</p>
                            </div>
                          </div>
                          <span className={cn("text-sm font-bold", theme.textPrimary)}>+{addonPrices.fresh} {currency}</span>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>

          {/* Sidebar Summary - Sticky */}
          <div className="md:w-1/3 md:flex-shrink-0">
            <div className="sticky top-4 md:top-24 lg:top-28 z-20">
              <div className={cn("rounded-3xl p-6 sm:p-8 border-2 shadow-2xl backdrop-blur-xl", theme.bgCard, theme.glassBorder)}>
              {/* Vipps Logo */}
              <div className="flex items-center justify-center mb-6 pb-6 border-b-2 border-gray-200">
                <div className="relative w-40 h-14">
                  <Image
                    src="/vipps-logo.svg"
                    alt={copy.vippsLogoAlt}
                    fill
                    className="object-contain"
                    priority
                  />
                </div>
              </div>

              <h3 className={cn("text-xl sm:text-2xl font-bold mb-4 sm:mb-6", theme.textPrimary)}>{t.checkout.summary}</h3>

              <div className="space-y-4 mb-6">
                {boxSize && (
                  <div className="flex justify-between text-sm">
                    <span className={theme.textMuted}>
                      {copy.summaryBoxLabel.replace('{size}', boxSize)}
                    </span>
                    <span className={cn("font-bold", theme.textPrimary)}>
                      {currency} {prices[boxSize].total.toLocaleString(locale)}
                    </span>
                  </div>
                )}
                {deliveryType !== 'farm' && (
                  <div className="flex justify-between text-sm">
                    <span className={theme.textMuted}>
                      {deliveryType === 'trondheim' ? copy.summaryPickupTrondheim : copy.summaryDeliveryE6}
                    </span>
                    <span className={cn("font-bold", theme.textPrimary)}>
                      +{deliveryType === 'trondheim' ? addonPrices.trondheim : addonPrices.e6} {currency}
                    </span>
                  </div>
                )}
                {freshDelivery && (
                  <div className="flex justify-between text-sm">
                    <span className={theme.textMuted}>{copy.summaryFreshDelivery}</span>
                    <span className={cn("font-bold", theme.textPrimary)}>+{addonPrices.fresh} {currency}</span>
                  </div>
                )}
                {extraProducts.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className={cn("text-xs uppercase tracking-wider font-semibold", theme.textMuted)}>{copy.summaryExtrasTitle}</p>
                    {extraProducts.map(slug => {
                      const extra = availableExtras.find(e => e.slug === slug);
                      if (!extra) return null;
                      const quantity = extraQuantities[slug] || 1;
                      const itemTotal = extra.price_nok * quantity;
                      return (
                        <div key={slug} className="flex justify-between text-sm">
                          <span className={theme.textMuted}>
                            {copy.summaryExtraItem
                              .replace('{name}', extra.name_no)
                              .replace('{quantity}', String(quantity))
                              .replace('{unit}', extra.pricing_type === 'per_kg' ? copy.unitKg : copy.unitPieces)}
                          </span>
                          <span className={cn("font-bold", theme.textPrimary)}>+{currency} {itemTotal.toLocaleString(locale)}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className={cn("border-t pt-4 mb-6", theme.borderSecondary)}>
                <div className="flex justify-between text-sm mb-2">
                  <span className={theme.textMuted}>{t.checkout.payNow}</span>
                  <span className={cn("font-bold", theme.textPrimary)}>{currency} {depositTotal.toLocaleString(locale)}</span>
                </div>
                <div className="flex justify-between text-sm mb-4">
                  <span className={theme.textMuted}>{t.checkout.payLater}</span>
                  <span className={cn("font-bold", theme.textPrimary)}>
                    {currency} {(selectedPrice?.remainder || 0).toLocaleString(locale)}
                  </span>
                </div>
                <div className="flex justify-between text-lg sm:text-xl font-bold">
                  <span className={theme.textPrimary}>{t.checkout.totalLabel}</span>
                  <span className={theme.textPrimary}>{currency} {totalPrice.toLocaleString(locale)}</span>
                </div>
              </div>

              {step === 4 && boxSize && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl shadow-sm">
                    <Label htmlFor="deposit-policy" className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        id="deposit-policy"
                        checked={agreedToDepositPolicy}
                        onCheckedChange={(checked) => setAgreedToDepositPolicy(checked as boolean)}
                        className="mt-0.5 rounded"
                      />
                      <span className="text-sm leading-relaxed text-amber-900">
                        <strong className="font-bold">{copy.depositPolicyTitle}</strong> {copy.depositPolicyBody}
                      </span>
                    </Label>
                  </div>

                  <div className="p-5 bg-slate-50 border-2 border-slate-300 rounded-xl">
                    <Label htmlFor="terms" className="flex items-start gap-3 cursor-pointer">
                      <Checkbox
                        id="terms"
                        checked={agreedToTerms}
                        onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
                        className="mt-0.5 rounded"
                      />
                      <span className="text-sm leading-relaxed text-slate-800">
                        {copy.termsTextStart}{' '}
                        <a href="/vilkar" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-amber-600">
                          {copy.termsLinkText}
                        </a>
                      </span>
                    </Label>
                  </div>

                  <button
                    disabled={!agreedToTerms || !agreedToDepositPolicy || isProcessing}
                    onClick={handleCheckout}
                    className="w-full bg-[#FF5B24] hover:bg-[#E6501F] text-white font-bold text-lg py-5 px-8 rounded-2xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:bg-gray-400"
                  >
                    {isProcessing ? copy.processing : copy.payWithVipps}
                  </button>

                  {/* Info text */}
                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{copy.securePayment}</span>
                    </div>
                    <p className="text-xs text-center text-gray-500">
                      {copy.vippsInfo}
                    </p>
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
