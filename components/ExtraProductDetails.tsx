'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { ChefHat, ExternalLink, Flame } from 'lucide-react';

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

export function ExtraProductDetails({ extra }: { extra: ExtraProductDetailsExtra }) {
  const { lang, t } = useLanguage();

  const rawName = lang === 'no' ? extra.name_no : extra.name_en;
  const description = lang === 'no' ? extra.description_no : extra.description_en;
  const premiumDesc = lang === 'no' ? extra.description_premium_no : extra.description_premium_en;
  const chefTerm = lang === 'no' ? extra.chef_term_no : extra.chef_term_en;
  const prepTips = lang === 'no' ? extra.preparation_tips_no : extra.preparation_tips_en;
  const recipes = extra.recipe_suggestions || [];

  const displayName = chefTerm ? stripTrailingParens(rawName) : rawName;

  return (
    <>
      <div className="mb-4">
        <h3 className="text-xl font-normal text-neutral-900 mb-1">{displayName}</h3>
        {chefTerm && (
          <p className="text-sm font-light text-neutral-500 italic flex items-center gap-2">
            <ChefHat className="w-4 h-4" />
            {chefTerm}
          </p>
        )}
      </div>

      {description && (
        <div className="mb-4">
          <p className="text-xs font-normal uppercase tracking-wide text-neutral-500 mb-1">
            {t.extraModal.pureTerms}
          </p>
          <p className="text-sm font-light text-neutral-600 leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {premiumDesc && (
        <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
          <p className="text-sm font-light text-neutral-900 leading-relaxed">
            {premiumDesc}
          </p>
        </div>
      )}

      {prepTips && (
        <div className="mb-4">
          <p className="text-xs font-normal uppercase tracking-wide text-neutral-500 mb-1 flex items-center gap-1">
            <Flame className="w-3 h-3" />
            {t.extraModal.preparation}
          </p>
          <p className="text-sm font-light text-neutral-600 leading-relaxed">
            {prepTips}
          </p>
        </div>
      )}

      {recipes.length > 0 && (
        <div className="border-t border-neutral-200 pt-4">
          <p className="text-xs font-normal uppercase tracking-wide text-neutral-500 mb-2">
            {t.extraModal.recipes}
          </p>
          <div className="space-y-2">
            {recipes.map((recipe, idx) => {
              const recipeTitle = lang === 'no' ? recipe.title_no : recipe.title_en;
              const recipeDesc = lang === 'no' ? recipe.description_no : recipe.description_en;

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
                    <ExternalLink className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 transition-colors" />
                  </div>
                  <p className="text-xs font-light text-neutral-500">
                    {recipeDesc}
                  </p>
                  <p className="text-xs font-light text-neutral-400 mt-1 italic">
                    {t.extraModal.comingSoon}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

