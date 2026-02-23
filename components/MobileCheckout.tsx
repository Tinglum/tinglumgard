"use client";

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, AlertCircle, Info, Minus, Plus } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { fixMojibake } from '@/lib/utils/text';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ExtraProductDetails } from '@/components/ExtraProductDetails';
import { RecipeQuickViewModal } from '@/components/RecipeQuickViewModal';
import { ReferralCodeInput } from '@/components/ReferralCodeInput';
import { RebateCodeInput } from '@/components/RebateCodeInput';

interface MobileCheckoutProps {
  step: number;
  setStep: (step: number) => void;
  boxSize: '8' | '9' | '10' | '12' | '';
  presets: any[];
  selectedPreset: any | null;
  setSelectedPreset: (preset: any) => void;
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
  selectedPrice: {
    deposit: number;
    remainder: number;
    total: number;
  } | null;
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
  prefillReferralCode?: string | null;
}

export function MobileCheckout(props: MobileCheckoutProps) {
  const {
    step,
    setStep,
    boxSize,
    presets,
    selectedPreset,
    setSelectedPreset,
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
    selectedPrice,
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
    prefillReferralCode,
  } = props;

  const { t, lang } = useLanguage();
  const [expandedBox, setExpandedBox] = useState<string | null>(null);
  const [showDiscountCodes, setShowDiscountCodes] = useState(false);
  const [recipeModalTarget, setRecipeModalTarget] = useState<{ slug: string; title: string } | null>(null);
  const stepRef = useRef<HTMLDivElement>(null);

  const mobileCopy = t.checkout.mobile;
  const locale = lang === 'no' ? 'nb-NO' : 'en-US';

  const checkoutStepLabels = [
    t.checkout.stepSize,
    t.checkout.stepRibbe,
    t.checkout.stepExtras,
    t.checkout.stepDelivery,
  ];
  const progressStep = Math.min(step, 4);

  const stepTitle = step === 1
    ? t.checkout.choosePresetTitle
    : step === 2
      ? t.checkout.step2Title || t.checkout.selectRibbeType
      : step === 3
        ? t.checkout.step3Title || t.checkout.extrasTitle
        : step === 4
          ? t.checkout.step4Title || t.checkout.deliveryOptions
          : t.checkout.summary;

  const sectionCard = "rounded-[30px] border border-[#E4DED5] bg-white p-6 shadow-[0_18px_40px_rgba(30,27,22,0.12)]";
  const labelText = "text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6A6258]";
  const selectedWeight = selectedPreset?.target_weight_kg
    ? String(selectedPreset.target_weight_kg)
    : boxSize;

  const ribbeSpecialNote = t.checkout.ribbeSpecialNote;
  const ribbeOptions = [
    {
      id: 'tynnribbe',
      name: t.checkout.tynnribbe,
      desc: t.checkout.tynnribbeDesc,
      serves: t.checkout.ribbeMeta.tynnribbe.serves,
      difficulty: t.checkout.ribbeMeta.tynnribbe.difficulty,
      recipeSlug: 'ullgris-ribbe-langstekt',
    },
    {
      id: 'familieribbe',
      name: t.checkout.familieribbe,
      desc: t.checkout.familieribbeDesc,
      serves: t.checkout.ribbeMeta.familieribbe.serves,
      difficulty: t.checkout.ribbeMeta.familieribbe.difficulty,
      recipeSlug: 'ullgris-ribbe-rask',
    },
    {
      id: 'porchetta',
      name: t.checkout.porchetta,
      desc: t.checkout.porchettaDesc,
      serves: t.checkout.ribbeMeta.porchetta.serves,
      difficulty: t.checkout.ribbeMeta.porchetta.difficulty,
      recipeSlug: 'asiatisk-ribbe-glaze',
    },
    {
      id: 'butchers_choice',
      name: t.checkout.butchersChoice,
      desc: t.checkout.butchersChoiceDescEnhanced,
      serves: t.checkout.ribbeMeta.butchersChoice.serves,
      difficulty: t.checkout.ribbeMeta.butchersChoice.difficulty,
      recipeSlug: 'ullgris-ribbe-langstekt',
      recommended: true,
    },
  ];

  const deliveryOptions = [
    { id: 'farm', name: t.checkout.pickupFarm, desc: t.checkout.pickupFarmAddress, price: 0 },
    { id: 'trondheim', name: t.checkout.pickupTrondheim, desc: t.checkout.pickupTrondheimAddress, price: addonPrices?.trondheim || 200 },
    { id: 'e6', name: t.checkout.deliveryE6, desc: t.checkout.deliveryE6Address, price: addonPrices?.e6 || 300 },
  ];

  const ribbeSummary = ribbeOptions.find((opt) => opt.id === ribbeChoice)?.name || t.checkout.selectRibbeType;
  const deliverySummary = deliveryOptions.find((opt) => opt.id === deliveryType)?.name || t.checkout.deliveryOptions;
  const canContinue = step === 1 ? !!selectedPreset : step === 2 ? ribbeChoice !== '' : true;
  const filteredExtras = [...availableExtras]
    .filter((extra) => !['delivery_trondheim', 'pickup_e6', 'fresh_delivery'].includes(extra.slug))
    .sort((a, b) => {
      const aIsSpecial = Boolean(a.chef_term_no || a.chef_term_en || String(a.slug || '').startsWith('extra-'));
      const bIsSpecial = Boolean(b.chef_term_no || b.chef_term_en || String(b.slug || '').startsWith('extra-'));

      if (aIsSpecial !== bIsSpecial) {
        return aIsSpecial ? -1 : 1;
      }

      return (a.display_order ?? 9999) - (b.display_order ?? 9999);
    });
  const chefPickSlugs = new Set(['extra-guanciale', 'extra-secreto-presa-pluma', 'extra-tomahawk']);
  const chefExtras = filteredExtras.filter((extra) => chefPickSlugs.has(extra.slug));
  const standardExtras = filteredExtras.filter((extra) => !chefPickSlugs.has(extra.slug));
  const extrasRunningTotal = extraProducts.reduce((total, slug) => {
    const extra = availableExtras.find((item) => item.slug === slug);
    if (!extra) return total;
    const quantity = extraQuantities[slug] !== undefined
      ? extraQuantities[slug]
      : (extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1));
    return total + (extra.price_nok * quantity);
  }, 0);
  const getExtraName = (extra: any) => fixMojibake(lang === 'en' && extra.name_en ? extra.name_en : extra.name_no);

  const formatRecipeTitle = (title: string) => {
    const trimmed = fixMojibake(String(title || '')).trim();
    if (!trimmed) return '';

    if (lang === 'no') {
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
  };

  const stripToCardTeaser = (text: string, maxChars: number) => {
    const cleaned = String(text || '').replace(/\s+/g, ' ').trim();
    if (!cleaned) return '';

    const sentenceMatch = cleaned.match(/^(.+?[.!?])(\s|$)/);
    const firstSentence = (sentenceMatch?.[1] || cleaned).trim();
    if (firstSentence.length <= maxChars) return firstSentence;

    const sliced = firstSentence.slice(0, maxChars).trim();
    return sliced.replace(/\s+\S*$/, '').trim();
  };

  const getExtraDescription = (extra: any) => {
    const override = (t.checkout as any)?.extraCardTeasers?.[String(extra.slug || '')];
    if (typeof override === 'string' && override.trim()) return override;

    const source = lang === 'en'
      ? (extra.description_en || extra.description_premium_en || extra.description_no)
      : (extra.description_no || extra.description_premium_no);

    return stripToCardTeaser(fixMojibake(String(source || '')), 120);
  };

  const formatCutSizeRange = (fromKg?: number | null, toKg?: number | null) => {
    if (fromKg == null || toKg == null) return null;
    const from = Number(fromKg);
    const to = Number(toKg);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
    const formattedFrom = from.toLocaleString(locale, { maximumFractionDigits: 2 });
    const formattedTo = to.toLocaleString(locale, { maximumFractionDigits: 2 });
    return `${t.common.approx} ${formattedFrom}-${formattedTo} ${t.common.kg}`;
  };

  const recipeTagsForExtra = (extra: any): Array<{ title: string; slug: string | null }> => {
    type RecipeSuggestion = {
      title_no?: string | null;
      title_en?: string | null;
      future_slug?: string | null;
      slug?: string | null;
    };
    const suggestions: RecipeSuggestion[] = Array.isArray(extra.recipe_suggestions)
      ? (extra.recipe_suggestions as RecipeSuggestion[])
      : [];
    return suggestions
      .slice(0, 2)
      .map((recipe) => {
        const raw = lang === 'en' ? recipe.title_en : recipe.title_no;
        const title = formatRecipeTitle(String(raw || ''));
        const slug = String(recipe.future_slug || recipe.slug || '').trim() || null;
        if (!title) return null;
        return { title, slug };
      })
      .filter((item): item is { title: string; slug: string | null } => item !== null);
  };

  const splitExtraName = (rawName: string) => {
    const match = rawName.match(/^(.*)\s*\(([^)]+)\)\s*$/);
    if (!match) return { primary: rawName.trim(), chefFromName: '' };
    return { primary: match[1].trim(), chefFromName: match[2].trim() };
  };

  const renderMobileExtraCard = (extra: any, featured = false) => {
    const isSelected = extraProducts.includes(extra.slug);
    const quantity = extraQuantities[extra.slug] !== undefined
      ? extraQuantities[extra.slug]
      : (extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1));
    const stepValue = extra.pricing_type === 'per_kg' ? 0.5 : 1;
    const unitLabel = extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk;
    const formattedQty = extra.pricing_type === 'per_kg'
      ? quantity.toLocaleString(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : quantity.toLocaleString(locale);
    const defaultQty = extra.default_quantity || (extra.pricing_type === 'per_kg' ? 0.5 : 1);

    const recipeTags = recipeTagsForExtra(extra);
    const rawName = getExtraName(extra);
    const parsedName = splitExtraName(rawName);
    const explicitChefTerm = lang === 'en'
      ? (extra.chef_term_en || extra.chef_term_no)
      : extra.chef_term_no;
    const chefTerm = (explicitChefTerm || parsedName.chefFromName || '').trim();
    const displayName = chefTerm ? parsedName.primary : rawName;

    const description = getExtraDescription(extra);
    const sizeRange = formatCutSizeRange(extra.cut_size_from_kg, extra.cut_size_to_kg);
    const hasDetails = Boolean(
      chefTerm ||
      extra.description_premium_no ||
      extra.description_premium_en ||
      extra.preparation_tips_no ||
      extra.preparation_tips_en ||
      (Array.isArray(extra.recipe_suggestions) && extra.recipe_suggestions.length > 0)
    );

    const selectExtra = () => {
      if (extraProducts.includes(extra.slug)) return;
      setExtraProducts([...extraProducts, extra.slug]);
      if (extraQuantities[extra.slug] === undefined) {
        setExtraQuantities({
          ...extraQuantities,
          [extra.slug]: defaultQty,
        });
      }
    };

    return (
      <div
        key={extra.slug}
        className={cn(
          'flex h-full flex-col rounded-[26px] border px-4 py-4 text-left transition-all',
          isSelected
            ? 'border-[#1E1B16] bg-white shadow-[0_18px_40px_rgba(30,27,22,0.12)]'
            : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
        )}
      >
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 pr-1">
              <p className="text-sm font-semibold leading-snug break-words">{displayName}</p>
              {chefTerm && (
                <p className="mt-1 text-[11px] italic text-[#7A7368] break-words">
                  {chefTerm}
                </p>
              )}
            </div>

              {hasDetails && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="h-9 w-9 flex items-center justify-center rounded-full border border-[#D7CEC1] bg-white text-[#6A6258] shadow-sm"
                      aria-label={t.checkout.showProductInfoAria}
                    >
                      <Info className="h-4 w-4" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-[92vw] sm:max-w-lg max-h-[85vh] overflow-y-auto border border-[#E4DED5] bg-white text-[#1E1B16] rounded-[28px] shadow-[0_30px_80px_-20px_rgba(30,27,22,0.35)]">
                    <ExtraProductDetails extra={extra} />
                  </DialogContent>
                </Dialog>
              )}
          </div>

          {description && (
            <p
              className="mt-3 text-[11px] leading-relaxed break-words text-[#5E5A50]"
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
          {sizeRange && (
            <p className="mt-2 text-[10px] uppercase tracking-[0.2em] text-[#6A6258]">
              {sizeRange}
            </p>
          )}
          {recipeTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {recipeTags.map((tag) => (
                <button
                  type="button"
                  key={`${extra.slug}-${tag.title}`}
                  onClick={() => {
                    if (!tag.slug) return;
                    setRecipeModalTarget({ slug: tag.slug, title: tag.title });
                  }}
                  disabled={!tag.slug}
                  className={cn(
                    "rounded-full border border-[#D7CEC1] px-2 py-0.5 text-[10px]",
                    tag.slug ? "text-[#5E5A50]" : "text-[#9A958A]"
                  )}
                >
                  {tag.title}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-4 border-t border-[#E4DED5] flex items-center justify-between gap-3 text-xs">
          <span className="font-semibold text-[#1E1B16]">
            {extra.price_nok.toLocaleString(locale)} {t.common.currency}
            <span className="ml-1 text-[10px] text-[#5E5A50]">/{unitLabel}</span>
          </span>

          {!isSelected ? (
            <button
              type="button"
              onClick={selectExtra}
              className="inline-flex items-center gap-2 rounded-full bg-[#1E1B16] px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              {t.common.add}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const newQty = Math.round((quantity - stepValue) * 10) / 10;
                  if (newQty <= 0) {
                    setExtraProducts(extraProducts.filter((slug) => slug !== extra.slug));
                    const next = { ...extraQuantities };
                    delete next[extra.slug];
                    setExtraQuantities(next);
                    return;
                  }
                  setExtraQuantities({
                    ...extraQuantities,
                    [extra.slug]: newQty,
                  });
                }}
                className="h-9 w-9 rounded-full border border-[#D7CEC1] bg-white text-[#1E1B16] flex items-center justify-center"
                aria-label={`${t.common.remove} ${stepValue} ${unitLabel}`}
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="text-[11px] font-semibold text-[#1E1B16] tabular-nums">
                {formattedQty} {unitLabel}
              </div>
              <button
                type="button"
                onClick={() => {
                  const newQty = Math.round((quantity + stepValue) * 10) / 10;
                  setExtraQuantities({
                    ...extraQuantities,
                    [extra.slug]: newQty,
                  });
                }}
                className="h-9 w-9 rounded-full border border-[#D7CEC1] bg-white text-[#1E1B16] flex items-center justify-center"
                aria-label={`${t.common.add} ${stepValue} ${unitLabel}`}
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!stepRef.current) return;
    stepRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step]);

  useEffect(() => {
    if (referralData || rebateData) {
      setShowDiscountCodes(true);
    }
  }, [referralData, rebateData]);

  useEffect(() => {
    if (prefillReferralCode) {
      setShowDiscountCodes(true);
    }
  }, [prefillReferralCode]);

  return (
    <div className="space-y-8 pb-36 text-[#1E1B16] font-[family:var(--font-manrope)]">
      <div ref={stepRef} className={`${sectionCard} scroll-mt-6`}>
        <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.2em] text-[#6A6258]">
          <span>{mobileCopy.step} {progressStep}/4</span>
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
        <div className="mt-4 flex gap-2">
          {checkoutStepLabels.map((_, index) => (
            <span
              key={index}
              className={`h-1.5 flex-1 rounded-full ${progressStep >= index + 1 ? 'bg-[#0F6C6F]' : 'bg-[#E9E1D6]'}`}
            />
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#B0A79C]">
          <span className="w-1/3 text-left truncate">{progressStep > 1 ? checkoutStepLabels[progressStep - 2] : ''}</span>
          <span className="w-1/3 text-center font-semibold text-[#0F6C6F]">{checkoutStepLabels[progressStep - 1]}</span>
          <span className="w-1/3 text-right truncate">{progressStep < checkoutStepLabels.length ? checkoutStepLabels[progressStep] : ''}</span>
        </div>
      </div>

      {step === 1 && (
        <div className={sectionCard}>
          <p className={labelText}>{mobileCopy.chooseBox}</p>
          <div className="mt-5 space-y-5">
            {presets.length === 0 && (
              <div className="rounded-[28px] border border-[#E4DED5] bg-[#FBFAF7] px-5 py-5 text-center text-sm text-[#5E5A50]">
                {t.mangalitsa.loading}
              </div>
            )}
            {presets.map((preset) => {
              const isSelected = selectedPreset?.id === preset.id;
              const presetName = fixMojibake(lang === 'en' ? preset.name_en : preset.name_no);
              const pitch = fixMojibake(lang === 'en' ? preset.short_pitch_en : preset.short_pitch_no);
              const scarcity = fixMojibake(lang === 'en' ? preset.scarcity_message_en : preset.scarcity_message_no);
              const presetContents = [...(preset.contents || [])]
                .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0));
              const visibleContents = isSelected
                ? (expandedBox === preset.id ? presetContents : presetContents.slice(0, 4))
                : presetContents.slice(0, 3);

              return (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPreset(preset)}
                  className={`w-full rounded-[28px] border px-5 py-5 text-left transition-all ${
                    isSelected
                    ? 'border-[#0F6C6F] bg-[#0F6C6F] text-white'
                    : 'border-[#E4DED5] bg-[#FBFAF7] text-[#1E1B16]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <p className="mt-2 text-3xl font-semibold font-[family:var(--font-playfair)]">
                        {presetName}
                      </p>
                      <p className={`mt-2 text-sm leading-relaxed ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {pitch}
                      </p>
                      {scarcity && (
                        <p className={`mt-2 text-[11px] uppercase tracking-[0.2em] ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                          {scarcity}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">
                        {preset.price_nok.toLocaleString(locale)} {t.common.currency}
                      </p>
                      <p className={`text-[11px] ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {t.product.deposit50}: {Math.floor(preset.price_nok * 0.5).toLocaleString(locale)} {t.common.currency}
                      </p>
                      <p className={`mt-1 text-[11px] ${isSelected ? 'text-white/70' : 'text-[#5E5A50]'}`}>
                        {t.common.approx} {preset.target_weight_kg} {t.common.kg}
                      </p>
                    </div>
                  </div>

                  {presetContents.length > 0 && (
                    <div className={`mt-4 rounded-2xl px-4 py-4 text-xs ${
                      isSelected
                        ? 'border border-white/15 bg-white/10'
                        : 'border border-[#E4DED5] bg-white'
                    }`}>
                      <div className="flex items-center justify-between">
                        <p className={`uppercase tracking-[0.2em] ${isSelected ? 'text-white/70' : 'text-[#6A6258]'}`}>{t.checkout.inBox}</p>
                        {isSelected && (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExpandedBox(expandedBox === preset.id ? null : preset.id);
                            }}
                            className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70"
                          >
                            {expandedBox === preset.id ? mobileCopy.showLess : mobileCopy.showAllContents}
                          </button>
                        )}
                      </div>
                      <ul className={`mt-3 space-y-1.5 ${isSelected ? 'text-white/80' : 'text-[#4F4A42]'}`}>
                        {visibleContents.map((item: any) => (
                          <li key={`${preset.id}-${item.id}`} className="flex items-start gap-2">
                            <span className={`mt-1.5 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-[#B35A2A]'}`} />
                            <div>
                              <span>{fixMojibake(lang === 'en' ? item.content_name_en : item.content_name_no)}</span>
                              {formatCutSizeRange(item.cut_size_from_kg, item.cut_size_to_kg) && (
                                <p className={`mt-1 text-[10px] uppercase tracking-[0.2em] ${isSelected ? 'text-white/65' : 'text-[#6A6258]'}`}>
                                  {formatCutSizeRange(item.cut_size_from_kg, item.cut_size_to_kg)}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ul>
                      {((isSelected && expandedBox !== preset.id && presetContents.length > 4) || (!isSelected && presetContents.length > 3)) && (
                        <p className={`mt-2 text-[10px] uppercase tracking-[0.2em] ${isSelected ? 'text-white/60' : 'text-[#6A6258]'}`}>
                          + {isSelected ? presetContents.length - 4 : presetContents.length - 3} {t.checkout.moreItems}
                        </p>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className={sectionCard}>
          <div className="flex items-center justify-between">
            <p className={labelText}>{mobileCopy.ribbeLabel}</p>
            <span className="text-xs text-[#5E5A50]">
              {selectedWeight ? `${t.common.approx} ${selectedWeight} kg` : ''}
            </span>
          </div>
          <div className="mt-4 rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] p-4">
            <p className="text-xs leading-relaxed text-[#5E5A50]">{ribbeSpecialNote}</p>
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
                    <p className="font-semibold flex items-center gap-2">
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
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-full px-2 py-1 text-[10px] border ${ribbeChoice === option.id ? 'border-white/30 text-white/80' : 'border-[#D7CEC1] text-[#5E5A50]'}`}>
                        {option.serves}
                      </span>
                      <span className={`rounded-full px-2 py-1 text-[10px] border ${ribbeChoice === option.id ? 'border-white/30 text-white/80' : 'border-[#D7CEC1] text-[#5E5A50]'}`}>
                        {option.difficulty}
                      </span>
                      <a
                        href={`/oppskrifter/${option.recipeSlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(event) => event.stopPropagation()}
                        className={`rounded-full px-2 py-1 text-[10px] border ${ribbeChoice === option.id ? 'border-white/30 text-white/80' : 'border-[#D7CEC1] text-[#5E5A50]'}`}
                      >
                        {t.checkout.recipeLabel}
                      </a>
                    </div>
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
            </div>
            <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-xl">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-amber-900 mb-0.5">
                    {mobileCopy.importantInfo}
                  </p>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    {t.checkout.extrasWarning}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-4 rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] p-4">
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#6A6258]">
                {t.checkout.runningExtrasTotal}
              </p>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-xs text-[#5E5A50]">
                  {extraProducts.length > 0
                    ? t.checkout.extrasSelectedCount.replace('{count}', String(extraProducts.length))
                    : t.checkout.noExtrasSelected}
                </p>
                <p className="text-sm font-semibold text-[#1E1B16]">
                  +{extrasRunningTotal.toLocaleString(locale)} {t.common.currency}
                </p>
              </div>
            </div>

            {chefExtras.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#6A6258]">
                  {t.checkout.chefPicksTitle}
                </p>
                <div className="grid grid-cols-1 gap-3">
                  {chefExtras.map((extra) => renderMobileExtraCard(extra, true))}
                </div>
              </div>
            )}

            {standardExtras.length > 0 && (
              <div className="mt-5">
                <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#6A6258]">
                  {t.checkout.moreExtrasTitle}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {standardExtras.map((extra) => renderMobileExtraCard(extra))}
                </div>
              </div>
            )}
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
              <p className={labelText}>{mobileCopy.summaryLabel}</p>
              <span className="text-xs text-[#5E5A50]">
                {selectedWeight ? `${t.common.approx} ${selectedWeight} kg` : ''}
              </span>
            </div>

            <div className="mt-4 rounded-2xl border border-[#E4DED5] bg-[#FBFAF7] p-4 text-sm">
              <div className="flex items-center justify-between">
                <span>{selectedPreset ? fixMojibake(lang === 'en' ? selectedPreset.name_en : selectedPreset.name_no) : t.checkout.step1Title}</span>
                <span className="font-semibold">
                  {selectedPrice ? `${selectedPrice.total.toLocaleString(locale)} ${t.common.currency}` : '...'}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                <span>{ribbeSummary}</span>
                <span>{mobileCopy.included}</span>
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
                const sizeRange = formatCutSizeRange(extra.cut_size_from_kg, extra.cut_size_to_kg);
                return (
                  <div key={slug} className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                    <span>
                      {getExtraName(extra)}
                      {sizeRange ? ` (${sizeRange})` : ''}
                      {' '}
                      ({quantity}{extra.pricing_type === 'per_kg' ? t.common.kg : t.common.stk})
                    </span>
                    <span>{(extra.price_nok * quantity).toLocaleString(locale)} {t.common.currency}</span>
                  </div>
                );
              })}

              <div className="mt-4 border-t border-[#E4DED5] pt-3">
                {(referralDiscount > 0 || rebateDiscount > 0) && (
                  <div className="flex items-center justify-between text-xs text-[#0F6C6F]">
                    <span>{mobileCopy.discount}</span>
                    <span className="font-semibold">-{(referralDiscount || rebateDiscount).toLocaleString(locale)} {t.common.currency}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between text-base font-semibold">
                  <span>{t.common.total}</span>
                  <span>{totalPrice.toLocaleString(locale)} {t.common.currency}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{t.checkout.deposit50Percent}</span>
                  <span>{depositTotal.toLocaleString(locale)} {t.common.currency}</span>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-[#5E5A50]">
                  <span>{t.checkout.remainderBeforeDelivery}</span>
                  <span>{remainderTotal.toLocaleString(locale)} {t.common.currency}</span>
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCard}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-[#5E5A50]">
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
                    {t.checkout.discountApplied}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowDiscountCodes(!showDiscountCodes)}
                className="text-sm text-[#5E5A50] underline"
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
                    boxSize={selectedPreset?.target_weight_kg || (boxSize ? parseInt(boxSize, 10) : 0)}
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

                {(referralData || rebateData) && (
                  <p className="text-xs text-center text-[#5E5A50]">
                    {t.checkout.onlyOneDiscount}
                  </p>
                )}
              </div>
            )}
          </div>

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
                  {mobileCopy.payDeposit} {depositTotal.toLocaleString(locale)} {t.common.currency}
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          )}
          <p className="text-center text-xs text-[#5E5A50]">{t.checkout.securePayment}</p>
        </div>
      </div>

      {recipeModalTarget && (
        <RecipeQuickViewModal
          slug={recipeModalTarget.slug}
          fallbackTitle={recipeModalTarget.title}
          onClose={() => setRecipeModalTarget(null)}
        />
      )}
    </div>
  );
}
