"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/utils';
import { fixMojibake } from '@/lib/utils/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import Link from 'next/link';
import Image from 'next/image';
import { Check, ExternalLink, Sparkles, Info, Minus, Plus } from 'lucide-react';
import { ReferralCodeInput } from '@/components/ReferralCodeInput';
import { RebateCodeInput } from '@/components/RebateCodeInput';
import { MobileCheckout } from '@/components/MobileCheckout';
import { ExtraProductDetails } from '@/components/ExtraProductDetails';
import { useToast } from '@/hooks/use-toast';

interface MangalitsaPreset {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  short_pitch_no: string;
  short_pitch_en: string;
  target_weight_kg: number;
  price_nok: number;
  scarcity_message_no?: string | null;
  scarcity_message_en?: string | null;
  contents?: Array<{
    id: string;
    content_name_no: string;
    content_name_en: string;
    target_weight_kg?: number | null;
    display_order: number;
    is_hero: boolean;
  }>;
}

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
  const [boxSize, setBoxSize] = useState<'8' | '9' | '10' | '12' | ''>('');
  const [mangalitsaPresets, setMangalitsaPresets] = useState<MangalitsaPreset[]>([]);
  const [mangalitsaPreset, setMangalitsaPreset] = useState<MangalitsaPreset | null>(null);
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
  const [prefillReferralCode, setPrefillReferralCode] = useState<string | null>(null);

  const selectableExtras = useMemo(() => {
    return [...availableExtras]
      .filter((extra) => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
      .sort((a, b) => {
        const aIsSpecial = Boolean(a.chef_term_no || a.chef_term_en || String(a.slug || '').startsWith('extra-'));
        const bIsSpecial = Boolean(b.chef_term_no || b.chef_term_en || String(b.slug || '').startsWith('extra-'));

        if (aIsSpecial !== bIsSpecial) {
          return aIsSpecial ? -1 : 1;
        }

        return (a.display_order ?? 9999) - (b.display_order ?? 9999);
      });
  }, [availableExtras]);

  const chefPicks = useMemo(() => {
    const premiumSlugs = ['extra-guanciale', 'extra-secreto-presa-pluma', 'extra-tomahawk'];
    return selectableExtras.filter((extra) => premiumSlugs.includes(extra.slug));
  }, [selectableExtras]);

  const standardExtras = useMemo(() => {
    const chefPickSlugs = new Set(chefPicks.map((extra) => extra.slug));
    return selectableExtras.filter((extra) => !chefPickSlugs.has(extra.slug));
  }, [chefPicks, selectableExtras]);

  const checkoutExtrasTotal = useMemo(() => {
    return extraProducts.reduce((total, slug) => {
      const extra = availableExtras.find((candidate) => candidate.slug === slug);
      if (!extra) return total;
      const quantity = extraQuantities[slug] || extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
      return total + (extra.price_nok * quantity);
    }, 0);
  }, [availableExtras, extraProducts, extraQuantities]);

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

  // Load Mangalitsa presets
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch('/api/mangalitsa/presets');
        const data = await response.json();
        if (active) {
          setMangalitsaPresets(data.presets || []);
        }
      } catch (error) {
        console.error('Failed to load presets:', error);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  // URL parameter handling
  useEffect(() => {
    if (mangalitsaPresets.length === 0) return;

    const presetParam = searchParams.get('preset');
    const sizeParam = searchParams.get('size');
    const forceChooseBox = searchParams.get('chooseBox') === '1' || searchParams.get('choose') === '1';

    // When coming from oppdelingsplan with extras but without a box, we want the user
    // to actively pick a box instead of auto-selecting the first preset.
    if (!presetParam && !sizeParam && forceChooseBox) {
      setMangalitsaPreset(null);
      setBoxSize('');
      setStep(1);
      return;
    }

    const matchedBySlug = presetParam
      ? mangalitsaPresets.find((preset) => preset.slug === presetParam)
      : null;
    const matchedByWeight = sizeParam
      ? mangalitsaPresets.find((preset) => String(preset.target_weight_kg) === sizeParam)
      : null;

    const selected = matchedBySlug || matchedByWeight || mangalitsaPresets[0] || null;
    if (!selected) return;

    setMangalitsaPreset(selected);
    setBoxSize(String(selected.target_weight_kg) as '8' | '9' | '10' | '12');
    if (matchedBySlug || matchedByWeight) {
      setStep(2);
    }
  }, [searchParams, mangalitsaPresets]);

  // URL discount/referral prefill
  useEffect(() => {
    const incomingReferralCode =
      searchParams.get('ref') ||
      searchParams.get('referral') ||
      searchParams.get('referralCode') ||
      searchParams.get('code');

    if (incomingReferralCode) {
      setPrefillReferralCode(incomingReferralCode.toUpperCase());
      setShowDiscountCodes(true);
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

  // URL preselection of extras from other pages (supports ?extra=a,b and repeated ?extra=a&extra=b)
  useEffect(() => {
    if (availableExtras.length === 0) return;

    const rawExtras = searchParams.getAll('extra');
    const commaSeparated = searchParams.get('extras');
    const merged = [
      ...rawExtras.flatMap((value) => value.split(',')),
      ...(commaSeparated ? commaSeparated.split(',') : []),
    ]
      .map((value) => value.trim())
      .filter(Boolean);

    if (merged.length === 0) return;

    const validExtras = merged.filter((slug) => availableExtras.some((extra) => extra.slug === slug));
    if (validExtras.length === 0) return;

    setExtraProducts((previous) => Array.from(new Set([...previous, ...validExtras])));
    setExtraQuantities((previous) => {
      const next = { ...previous };
      validExtras.forEach((slug) => {
        if (!next[slug]) {
          const extra = availableExtras.find((candidate) => candidate.slug === slug);
          next[slug] = extra?.default_quantity || (extra?.pricing_type === 'per_kg' ? 0.5 : 1);
        }
      });
      return next;
    });
  }, [availableExtras, searchParams]);

  function recipeTagsForExtra(extra: any): string[] {
    const suggestions = Array.isArray(extra.recipe_suggestions)
      ? extra.recipe_suggestions
      : [];

    return suggestions
      .map((recipe: any) => {
        const rawTitle = lang === 'no' ? recipe.title_no : recipe.title_en;
        return formatRecipeTitle(fixMojibake(String(rawTitle || '')), lang);
      })
      .filter(Boolean);
  }

  function formatRecipeTitle(title: string, language: 'no' | 'en'): string {
    const trimmed = fixMojibake(String(title || '')).trim();
    if (!trimmed) return '';

    if (language === 'no') {
      if (/^speke\s+skinke$/i.test(trimmed)) {
        return t.checkout.recipeMakeYourOwnHam;
      }
      const match = trimmed.match(/^(.*?)-prosjekt$/i);
      if (match?.[1]) {
        return t.checkout.recipeMakeYourOwn.replace('{item}', match[1].trim().toLowerCase());
      }
      return trimmed;
    }

    if (/^cure\s+a\s+ham$/i.test(trimmed)) {
      return t.checkout.recipeMakeYourOwnHam;
    }
    const match = trimmed.match(/^(.*?)\s+project$/i);
    if (match?.[1]) {
      return t.checkout.recipeMakeYourOwn.replace('{item}', match[1].trim().toLowerCase());
    }

    return trimmed;
  }

  function stripToCardTeaser(text: string, maxChars: number) {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';

    // Prefer the first sentence as teaser.
    const sentenceMatch = cleaned.match(/^(.+?[.!?])(\s|$)/);
    const firstSentence = (sentenceMatch?.[1] || cleaned).trim();
    if (firstSentence.length <= maxChars) return firstSentence;

    // Cut on a word boundary without adding ellipsis.
    const sliced = firstSentence.slice(0, maxChars).trim();
    return sliced.replace(/\s+\S*$/, '').trim();
  }

  function getCardDescription(extra: any) {
    const override = (t.checkout as any)?.extraCardTeasers?.[String(extra.slug || '')];
    if (typeof override === 'string' && override.trim()) return override;

    const source = lang === 'no'
      ? (extra.description_premium_no || extra.description_no)
      : (extra.description_premium_en || extra.description_en || extra.description_no);

    return stripToCardTeaser(fixMojibake(String(source || '')), 120);
  }

  function splitExtraName(rawName: string) {
    const match = rawName.match(/^(.*)\s*\(([^)]+)\)\s*$/);
    if (!match) return { primary: rawName.trim(), chefFromName: '' };
    return { primary: match[1].trim(), chefFromName: match[2].trim() };
  }

  function isChefPick(extra: any): boolean {
    return chefPicks.some((pick) => pick.slug === extra.slug);
  }

  function getExtraQuantity(extra: any): number {
    const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
    return extraQuantities[extra.slug] || defaultQty;
  }

  function toggleExtraSelection(extra: any) {
    const isSelected = extraProducts.includes(extra.slug);
    setExtraProducts((previous) =>
      isSelected
        ? previous.filter((item) => item !== extra.slug)
        : [...previous, extra.slug]
    );

    if (!isSelected && !extraQuantities[extra.slug]) {
      const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
      setExtraQuantities((previous) => ({
        ...previous,
        [extra.slug]: defaultQty,
      }));
    }
  }

  function renderExtraCard(extra: any, emphasized = false) {
    const isSelected = extraProducts.includes(extra.slug);
    const quantity = getExtraQuantity(extra);
    const stepSize = extra.pricing_type === 'per_kg' ? 0.5 : 1;
    const unitLabel = extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk;

    const rawName = fixMojibake(lang === 'no' ? extra.name_no : (extra.name_en || extra.name_no));
    const parsedName = splitExtraName(rawName);
    const explicitChefTerm = lang === 'no' ? extra.chef_term_no : (extra.chef_term_en || extra.chef_term_no);
    const chefTerm = fixMojibake(String(explicitChefTerm || parsedName.chefFromName || '')).trim();
    const name = chefTerm ? parsedName.primary : rawName.trim();

    const description = getCardDescription(extra);

    const allRecipeTags = recipeTagsForExtra(extra);
    const visibleRecipeTags = allRecipeTags.slice(0, 2);
    const remainingRecipeCount = Math.max(0, allRecipeTags.length - visibleRecipeTags.length);

    const hasDetails = Boolean(
      chefTerm ||
      extra.description_premium_no ||
      extra.description_premium_en ||
      extra.preparation_tips_no ||
      extra.preparation_tips_en ||
      (Array.isArray(extra.recipe_suggestions) && extra.recipe_suggestions.length > 0)
    );

    return (
      <div
        key={extra.slug}
        className={cn(
          "border-2 rounded-2xl transition-all duration-300 group flex flex-col h-full",
          emphasized ? "p-6 md:p-7" : "p-5",
          isSelected
            ? "border-neutral-900 bg-neutral-50 shadow-[0_15px_40px_-12px_rgba(0,0,0,0.15)]"
            : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)]"
        )}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h4 className={cn("font-normal text-neutral-900 leading-tight", emphasized ? "text-xl" : "text-lg")}>
              {name}
            </h4>
            {chefTerm && (
              <p className="mt-1 text-sm font-light italic text-neutral-500">
                {chefTerm}
              </p>
            )}
          </div>

          {hasDetails && (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="h-10 w-10 rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm flex items-center justify-center hover:text-neutral-900 hover:border-neutral-400 hover:bg-neutral-50 transition-all"
                  aria-label={t.checkout.showProductInfoAria}
                >
                  <Info className="w-4 h-4" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="end"
                side="bottom"
                sideOffset={12}
                className="w-[420px] max-w-[92vw] p-6 max-h-[70vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white text-neutral-900 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.25)]"
              >
                <ExtraProductDetails extra={extra} />
              </PopoverContent>
            </Popover>
          )}
        </div>

        {description && (
          <p
            className="mt-4 text-sm font-light text-neutral-600 leading-relaxed"
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {description}
          </p>
        )}

        {visibleRecipeTags.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {visibleRecipeTags.map((tag) => (
              <span
                key={`${extra.slug}-${tag}`}
                className="text-[11px] px-2 py-1 rounded-full border border-neutral-200 bg-white text-neutral-600"
              >
                {tag}
              </span>
            ))}
            {remainingRecipeCount > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full border border-neutral-200 bg-white text-neutral-500">
                +{remainingRecipeCount}
              </span>
            )}
          </div>
        )}

        <div className="mt-auto pt-5 mt-5 border-t border-neutral-200">
          <div className="flex items-end justify-between gap-4">
            <p className="text-base font-normal text-neutral-900 tabular-nums">
              {extra.price_nok.toLocaleString(locale)} {t.common.currency}
              <span className="text-sm font-light text-neutral-500 whitespace-nowrap">/{unitLabel}</span>
            </p>

            {!isSelected && (
              <button
                type="button"
                onClick={() => toggleExtraSelection(extra)}
                className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-white hover:bg-neutral-800 transition-colors"
              >
                <Plus className="w-4 h-4" />
                {t.common.add}
              </button>
            )}
          </div>

          {isSelected && (
            <div className="mt-4 flex justify-end">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    const newQty = Math.round((quantity - stepSize) * 10) / 10;
                    if (newQty <= 0) {
                      setExtraProducts((previous) => previous.filter((item) => item !== extra.slug));
                      setExtraQuantities((previous) => {
                        const next = { ...previous };
                        delete next[extra.slug];
                        return next;
                      });
                      return;
                    }

                    setExtraQuantities((previous) => ({
                      ...previous,
                      [extra.slug]: newQty,
                    }));
                  }}
                  className="h-9 w-9 rounded-full border border-neutral-200 bg-white text-neutral-700 flex items-center justify-center hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  aria-label={`${t.common.remove} ${stepSize} ${unitLabel}`}
                >
                  <Minus className="w-4 h-4" />
                </button>

                <div className="flex flex-col items-center">
                  <Input
                    type="number"
                    min={extra.pricing_type === 'per_kg' ? '0.5' : '1'}
                    step={String(stepSize)}
                    value={quantity}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value);
                      if (!Number.isNaN(value) && value > 0) {
                        setExtraQuantities((previous) => ({
                          ...previous,
                          [extra.slug]: value,
                        }));
                      }
                    }}
                    className="w-16 text-center border border-neutral-200 rounded-xl px-2 py-2 tabular-nums"
                  />
                  <span className="mt-1 text-[10px] uppercase tracking-wide text-neutral-500">
                    {unitLabel}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const newQty = Math.round((quantity + stepSize) * 10) / 10;
                    setExtraQuantities((previous) => ({
                      ...previous,
                      [extra.slug]: newQty,
                    }));
                  }}
                  className="h-9 w-9 rounded-full border border-neutral-200 bg-white text-neutral-700 flex items-center justify-center hover:bg-neutral-50 hover:border-neutral-300 transition-colors"
                  aria-label={`${t.common.add} ${stepSize} ${unitLabel}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
      if (!mangalitsaPreset) {
        throw new Error('No Mangalitsa preset selected');
      }

      const orderDetails = {
        mangalitsaPresetId: mangalitsaPreset.id,
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

  const addonPrices = pricing ? {
    trondheim: pricing.delivery_fee_trondheim,
    e6: pricing.delivery_fee_pickup_e6,
    fresh: pricing.fresh_delivery_fee,
  } : null;

  const selectedPrice = mangalitsaPriceObj;
  const deliveryPrice = !addonPrices ? 0 : (deliveryType === 'farm' ? 0 : deliveryType === 'trondheim' ? addonPrices.trondheim : addonPrices.e6);
  const freshPrice = freshDelivery && addonPrices ? addonPrices.fresh : 0;

  // Calculate extras total
  const extrasTotal = extraProducts.reduce((total, slug) => {
    const extra = availableExtras.find(e => e.slug === slug);
    if (!extra) return total;
    const quantity = extraQuantities[slug] || extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);
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

  const canProceedToStep2 = !!mangalitsaPreset;
  const canProceedToStep3 = ribbeChoice !== '';
  const ribbeSpecialNote = t.checkout.ribbeSpecialNote;
  const ribbeOptions = [
    {
      id: 'tynnribbe',
      name: t.checkout.tynnribbe,
      desc: t.checkout.tynnribbeDesc,
      image: '🔥',
      serves: t.checkout.ribbeMeta.tynnribbe.serves,
      difficulty: t.checkout.ribbeMeta.tynnribbe.difficulty,
      recipeSlug: 'tynnribbe',
      isRecommended: false,
    },
    {
      id: 'familieribbe',
      name: t.checkout.familieribbe,
      desc: t.checkout.familieribbeDesc,
      image: '🍽️',
      serves: t.checkout.ribbeMeta.familieribbe.serves,
      difficulty: t.checkout.ribbeMeta.familieribbe.difficulty,
      recipeSlug: 'familieribbe',
      isRecommended: false,
    },
    {
      id: 'porchetta',
      name: t.checkout.porchetta,
      desc: t.checkout.porchettaDesc,
      image: '🇮🇹',
      serves: t.checkout.ribbeMeta.porchetta.serves,
      difficulty: t.checkout.ribbeMeta.porchetta.difficulty,
      recipeSlug: 'porchetta',
      isRecommended: false,
    },
    {
      id: 'butchers_choice',
      name: t.checkout.butchersChoice,
      desc: t.checkout.butchersChoiceDescEnhanced,
      image: '🔪',
      serves: t.checkout.ribbeMeta.butchersChoice.serves,
      difficulty: t.checkout.ribbeMeta.butchersChoice.difficulty,
      recipeSlug: 'butchers-choice-ribbe',
      isRecommended: true,
    },
  ] as const;

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
            <p className="mt-3 text-sm text-[#5E5A50]">{t.mangalitsa.hero.subtitle}</p>
          </div>

          <MobileCheckout
            step={step}
            setStep={setStep}
            boxSize={boxSize}
            presets={mangalitsaPresets}
            selectedPreset={mangalitsaPreset}
            setSelectedPreset={(preset) => {
              setMangalitsaPreset(preset);
              setBoxSize(String(preset.target_weight_kg) as '8' | '9' | '10' | '12');
            }}
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
            selectedPrice={selectedPrice}
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
            prefillReferralCode={prefillReferralCode}
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
                  <h2 className="text-2xl font-light text-neutral-900">
                  {t.checkout.choosePresetTitle}
                  </h2>
                  {mangalitsaPreset && step > 1 && (
                    <button
                      onClick={() => setStep(1)}
                    className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-all duration-300 hover:-translate-y-0.5"
                  >
                    {t.common.edit}
                  </button>
                )}
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {mangalitsaPresets.length === 0 && (
                  <div className="md:col-span-2 p-8 text-center text-sm font-light text-neutral-500 border border-neutral-200 rounded-xl">
                    {t.mangalitsa.loading}
                  </div>
                )}
                {mangalitsaPresets.map((preset) => {
                  const isSelected = mangalitsaPreset?.id === preset.id;
                  const presetName = fixMojibake(lang === 'no' ? preset.name_no : preset.name_en);
                  const presetPitch = fixMojibake(lang === 'no' ? preset.short_pitch_no : preset.short_pitch_en);
                  const scarcity = fixMojibake((lang === 'no' ? preset.scarcity_message_no : preset.scarcity_message_en) ?? '');
                  const sortedContents = [...(preset.contents || [])]
                    .sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
                  const visibleContents = isSelected ? sortedContents : sortedContents.slice(0, 4);

                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setMangalitsaPreset(preset);
                        setBoxSize(String(preset.target_weight_kg) as '8' | '9' | '10' | '12');
                        if (step === 1) setStep(2);
                      }}
                      className={cn(
                        "p-8 border-2 rounded-xl transition-all duration-500 text-left group",
                        isSelected
                          ? "border-neutral-900 bg-neutral-50 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)]"
                          : "border-neutral-200 hover:border-neutral-300 hover:shadow-[0_15px_40px_-12px_rgba(0,0,0,0.1)] hover:-translate-y-1"
                      )}
                    >
                      <div className="space-y-4">
                        <h3 className="text-2xl font-normal text-neutral-900">{presetName}</h3>
                        <p className="text-sm font-light text-neutral-600 italic">{presetPitch}</p>
                        {scarcity && (
                          <p className="text-xs font-light text-neutral-500 uppercase tracking-wide">
                            {scarcity}
                          </p>
                        )}
                        <div className="pt-4 border-t border-neutral-200">
                          <MetaLabel>{t.checkout.inBox}</MetaLabel>
                          <ul className="space-y-3 mt-4">
                            {visibleContents.map((content) => (
                              <li key={content.id} className="flex items-start gap-3 text-sm text-left">
                                <span className="w-1.5 h-1.5 rounded-full bg-neutral-400 mt-2 flex-shrink-0" />
                                <span
                                  className={cn(
                                    "font-light",
                                    content.is_hero ? "text-neutral-900 font-normal" : "text-neutral-600"
                                  )}
                                >
                                  {fixMojibake(lang === 'no' ? content.content_name_no : content.content_name_en)}
                                </span>
                              </li>
                            ))}
                          </ul>
                          {!isSelected && sortedContents.length > 4 && (
                            <p className="text-xs font-light text-neutral-500 mt-3">
                              +{sortedContents.length - 4} {t.checkout.moreItems}
                            </p>
                          )}
                        </div>

                        <div className="pt-4 border-t border-neutral-200 text-xs font-light text-neutral-500">
                          {preset.price_nok.toLocaleString(locale)} kr
                          <span className="mx-2">•</span>
                          {t.common.approx} {preset.target_weight_kg} kg
                        </div>
                        <div className="text-xs font-light text-neutral-600">
                          {Math.floor(preset.price_nok * 0.5).toLocaleString(locale)} {t.common.currency} {t.checkout.pricingSplit.now}
                          <span className="mx-1">+</span>
                          {(preset.price_nok - Math.floor(preset.price_nok * 0.5)).toLocaleString(locale)} {t.common.currency} {t.checkout.pricingSplit.atDelivery}
                          <span
                            className="ml-2 text-neutral-400 cursor-help"
                            title={t.checkout.pricingSplit.tooltip}
                          >
                            ⓘ
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
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
            {mangalitsaPreset && (
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
                  {t.mangalitsa.ribbeSelection.subtitle}
                </p>

                <div className="mb-6 p-5 rounded-xl border border-neutral-200 bg-neutral-50">
                  <p className="text-sm font-light text-neutral-700 leading-relaxed">
                    {ribbeSpecialNote}
                  </p>
                </div>

                <div className="space-y-4">
                  {ribbeOptions.map((option) => (
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
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900 text-sm text-white">
                              {option.image}
                            </span>
                            <p className="font-normal text-neutral-900">{option.name}</p>
                            {option.isRecommended && (
                              <span className="text-[10px] px-2 py-0.5 bg-neutral-900 text-white rounded-full uppercase tracking-wide">
                                {t.checkout.recommended}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-light text-neutral-600">{option.desc}</p>
                          <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-xs px-2 py-1 rounded-full border border-neutral-200 bg-white text-neutral-600">
                              {option.serves}
                            </span>
                            <span className="text-xs px-2 py-1 rounded-full border border-neutral-200 bg-white text-neutral-600">
                              {option.difficulty}
                            </span>
                            <a
                              href={`/oppskrifter/${option.recipeSlug}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(event) => event.stopPropagation()}
                              className="text-xs px-2 py-1 rounded-full border border-neutral-200 bg-white text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1"
                            >
                              {t.checkout.recipeLabel}
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
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
                <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-neutral-500">
                      {t.checkout.runningExtrasTotal}
                    </p>
                    <p className="text-sm font-light text-neutral-600">
                      {extraProducts.length > 0
                        ? t.checkout.extrasSelectedCount.replace('{count}', String(extraProducts.length))
                        : t.checkout.noExtrasSelected}
                    </p>
                  </div>
                  <p className="text-xl font-normal text-neutral-900 tabular-nums">
                    +{checkoutExtrasTotal.toLocaleString(locale)} {t.common.currency}
                  </p>
                </div>

                {chefPicks.length > 0 && (
                  <div className="mb-10">
                    <div className="mb-4 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-neutral-700" />
                      <p className="text-sm uppercase tracking-wide text-neutral-700">
                        {t.checkout.chefPicksTitle}
                      </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-6">
                      {chefPicks.map((extra) => renderExtraCard(extra, true))}
                    </div>
                  </div>
                )}

                {standardExtras.length > 0 && (
                  <div>
                    <p className="text-sm uppercase tracking-wide text-neutral-700 mb-4">
                      {t.checkout.moreExtrasTitle}
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      {standardExtras.map((extra) => renderExtraCard(extra, false))}
                    </div>
                  </div>
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
                  {mangalitsaPreset && selectedPrice && (
                    <div className="flex justify-between text-sm">
                      <span className="font-light text-neutral-600">
                        {fixMojibake(lang === 'no' ? mangalitsaPreset.name_no : mangalitsaPreset.name_en)} ({t.common.approx} {mangalitsaPreset.target_weight_kg} kg)
                      </span>
                      <span className="font-light text-neutral-900 tabular-nums">{selectedPrice.total.toLocaleString(locale)} kr</span>
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
                          {fixMojibake(lang === 'no' ? extra.name_no : (extra.name_en || extra.name_no))} ({quantity} {extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk})
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

                {step === 4 && mangalitsaPreset && (
                  <div className="space-y-6 mt-6">
                    {/* Discount codes */}
                    <div className="pt-6 border-t border-neutral-200">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm font-light text-neutral-700">
                            {t.checkout.hasDiscountCode}
                          </p>
                          {prefillReferralCode && !referralData && !rebateData && (
                            <p className="mt-1 text-xs text-emerald-700">
                              {lang === 'no'
                                ? `Henvisningskode oppdaget: ${prefillReferralCode}`
                                : `Referral code detected: ${prefillReferralCode}`}
                            </p>
                          )}
                          {(referralData || rebateData) && (
                            <p className="mt-1 text-xs text-emerald-700">
                              {lang === 'no'
                                ? `Rabatt aktiv: -${totalDiscount.toLocaleString(locale)} ${t.common.currency}`
                                : `Discount active: -${totalDiscount.toLocaleString(locale)} ${t.common.currency}`}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowDiscountCodes(!showDiscountCodes)}
                          className="text-sm font-light text-neutral-600 hover:text-neutral-900 underline transition-colors duration-300 whitespace-nowrap"
                        >
                          {showDiscountCodes
                            ? t.checkout.hideCodes
                            : t.checkout.showCodes}
                        </button>
                      </div>

                      {showDiscountCodes && (
                        <div className="mt-4 space-y-4">
                          {!rebateData && (
                            <ReferralCodeInput
                              initialCode={prefillReferralCode}
                              autoApplyInitialCode={Boolean(prefillReferralCode)}
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
                              boxSize={mangalitsaPreset.target_weight_kg}
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
