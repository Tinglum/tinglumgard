'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { fixMojibake } from '@/lib/utils/text';
import { ChefHat, ExternalLink, Flame, MapPin, Sparkles } from 'lucide-react';

interface Recipe {
  title_no: string;
  title_en: string;
  description_no: string;
  description_en: string;
  future_slug: string;
}

interface ExtraProductDetailsExtra {
  name_no: string;
  name_en: string;
  description_no?: string | null;
  description_en?: string | null;
  description_premium_no?: string | null;
  description_premium_en?: string | null;
  chef_term_no?: string | null;
  chef_term_en?: string | null;
  recipe_suggestions?: Recipe[] | null;
  preparation_tips_no?: string | null;
  preparation_tips_en?: string | null;
}

function stripTrailingParens(value: string) {
  return value.replace(/\s*\([^)]*\)\s*$/, '').trim();
}

function formatRecipeTitle(title: string, lang: 'no' | 'en', t: any): string {
  const trimmed = String(title || '').trim();
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
}

export function ExtraProductDetails({ extra }: { extra: ExtraProductDetailsExtra }) {
  const { lang, t } = useLanguage();

  const rawNameSource = lang === 'no' ? extra.name_no : extra.name_en;
  const descriptionSource = lang === 'no' ? extra.description_no : extra.description_en;
  const premiumDescSource = lang === 'no' ? extra.description_premium_no : extra.description_premium_en;
  const chefTermSource = lang === 'no' ? extra.chef_term_no : extra.chef_term_en;
  const prepTipsSource = lang === 'no' ? extra.preparation_tips_no : extra.preparation_tips_en;

  const rawName = fixMojibake(String(rawNameSource || ''));
  const description = typeof descriptionSource === 'string' ? fixMojibake(descriptionSource) : descriptionSource;
  const premiumDesc = typeof premiumDescSource === 'string' ? fixMojibake(premiumDescSource) : premiumDescSource;
  const chefTerm = typeof chefTermSource === 'string' ? fixMojibake(chefTermSource) : chefTermSource;
  const prepTips = typeof prepTipsSource === 'string' ? fixMojibake(prepTipsSource) : prepTipsSource;
  const recipes = extra.recipe_suggestions || [];

  const displayName = chefTerm ? stripTrailingParens(rawName) : rawName;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="pr-8">
        <h3 className="text-2xl font-normal text-neutral-900 mb-1 font-[family:var(--font-playfair)]">
          {displayName}
        </h3>
        {chefTerm && (
          <p className="text-sm font-light text-neutral-500 italic flex items-center gap-2">
            <ChefHat className="w-4 h-4 flex-shrink-0" />
            {chefTerm}
          </p>
        )}
      </div>

      {/* About the cut — where it comes from, anatomy, weight */}
      {description && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5" />
            {t.extraModal.pureTerms}
          </p>
          <p className="text-sm font-light text-neutral-700 leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* Why Mangalitsa — what makes this breed special for this cut */}
      {premiumDesc && (
        <div className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            {t.extraModal.whySpecial}
          </p>
          <p className="text-sm font-light text-neutral-900 leading-relaxed">
            {premiumDesc}
          </p>
        </div>
      )}

      {/* Preparation tips */}
      {prepTips && (
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-2 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5" />
            {t.extraModal.preparation}
          </p>
          <p className="text-sm font-light text-neutral-700 leading-relaxed">
            {prepTips}
          </p>
        </div>
      )}

      {/* Recipe suggestions */}
      {recipes.length > 0 && (
        <div className="border-t border-neutral-200 pt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">
            {t.extraModal.recipes}
          </p>
          <div className="space-y-2">
            {recipes.map((recipe, idx) => {
              const rawTitleSource = lang === 'no' ? recipe.title_no : recipe.title_en;
              const rawTitle = fixMojibake(String(rawTitleSource || ''));
              const recipeTitle = formatRecipeTitle(rawTitle, lang, t);
              const recipeDescSource = lang === 'no' ? recipe.description_no : recipe.description_en;
              const recipeDesc = fixMojibake(String(recipeDescSource || ''));

              return (
                <button
                  key={idx}
                  onClick={() => {
                    window.open(`/oppskrifter/${recipe.future_slug}`, '_blank');
                  }}
                  className="w-full text-left p-3 rounded-xl border border-neutral-200 hover:border-neutral-300 hover:shadow-[0_10px_30px_-10px_rgba(0,0,0,0.08)] transition-all duration-300 group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-normal text-neutral-900 group-hover:text-neutral-900">
                      {recipeTitle}
                    </p>
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors flex-shrink-0" />
                  </div>
                  <p className="text-xs font-light text-neutral-500">
                    {recipeDesc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
