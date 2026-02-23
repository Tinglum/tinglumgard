'use client';

import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { fixMojibake } from '@/lib/utils/text';

type RecipeIngredient = {
  amount: string;
  item: string;
};

type RecipeRecord = {
  slug: string;
  title_no: string;
  title_en: string;
  intro_no: string;
  intro_en: string;
  ingredients_no: RecipeIngredient[];
  ingredients_en: RecipeIngredient[];
  steps_no: string[];
  steps_en: string[];
  tips_no?: string | null;
  tips_en?: string | null;
  mangalitsa_tip_no?: string | null;
  mangalitsa_tip_en?: string | null;
  image_url?: string | null;
};

interface RecipeQuickViewModalProps {
  slug: string;
  fallbackTitle?: string;
  onClose: () => void;
}

export function RecipeQuickViewModal({ slug, fallbackTitle, onClose }: RecipeQuickViewModalProps) {
  const { t, lang } = useLanguage();
  const [recipe, setRecipe] = useState<RecipeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setRecipe(null);

    (async () => {
      try {
        const response = await fetch(`/api/recipes/${encodeURIComponent(slug)}`);
        if (!response.ok) throw new Error('Failed to fetch recipe');
        const data = await response.json();
        if (!active) return;
        setRecipe(data.recipe || null);
      } catch {
        if (!active) return;
        setRecipe(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const title = fixMojibake(
    recipe
      ? (lang === 'no' ? recipe.title_no : recipe.title_en)
      : (fallbackTitle || '')
  );
  const intro = fixMojibake(
    recipe
      ? (lang === 'no' ? recipe.intro_no : recipe.intro_en)
      : ''
  );
  const ingredients = recipe
    ? (lang === 'no' ? recipe.ingredients_no : recipe.ingredients_en) || []
    : [];
  const steps = recipe
    ? (lang === 'no' ? recipe.steps_no : recipe.steps_en) || []
    : [];
  const tips = fixMojibake(
    String(recipe ? (lang === 'no' ? recipe.tips_no : recipe.tips_en) || '' : '')
  );
  const mangalitsaTip = fixMojibake(
    String(recipe ? (lang === 'no' ? recipe.mangalitsa_tip_no : recipe.mangalitsa_tip_en) || '' : '')
  );

  return (
    <>
      <div className="fixed inset-0 z-[70] bg-black/60" onClick={onClose} />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="relative h-[80vh] w-[80vw] max-w-[1200px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_35px_100px_-25px_rgba(0,0,0,0.45)]">
          <button
            type="button"
            onClick={onClose}
            aria-label={t.common.close}
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="h-full overflow-y-auto px-6 py-6 md:px-10 md:py-8">
            {loading ? (
              <div className="py-20 text-center text-sm font-light text-neutral-500">{t.common.loading}</div>
            ) : !recipe ? (
              <div className="py-20 text-center text-sm font-light text-neutral-500">{t.recipes.noRecipes}</div>
            ) : (
              <div className="space-y-7">
                <div className="pr-12">
                  <h2 className="text-3xl font-normal text-neutral-900 md:text-4xl">{title}</h2>
                  {intro && <p className="mt-3 max-w-3xl text-sm font-light leading-relaxed text-neutral-600">{intro}</p>}
                </div>

                {recipe.image_url && (
                  <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                    <Image
                      src={recipe.image_url}
                      alt={title}
                      width={1600}
                      height={900}
                      className="h-[260px] w-full object-cover md:h-[320px]"
                    />
                  </div>
                )}

                <section>
                  <h3 className="mb-3 text-lg font-normal text-neutral-900">{t.recipes.ingredients}</h3>
                  <ul className="space-y-2">
                    {ingredients.map((ingredient, index) => (
                      <li key={`${ingredient.item}-${index}`} className="text-sm font-light text-neutral-700">
                        {ingredient.amount ? `${ingredient.amount} ` : ''}{fixMojibake(String(ingredient.item || ''))}
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <h3 className="mb-3 text-lg font-normal text-neutral-900">{t.recipes.steps}</h3>
                  <ol className="space-y-3">
                    {steps.map((step, index) => (
                      <li key={index} className="text-sm font-light leading-relaxed text-neutral-700">
                        <span className="mr-2 font-normal text-neutral-900">{index + 1}.</span>
                        {fixMojibake(String(step || ''))}
                      </li>
                    ))}
                  </ol>
                </section>

                {tips && (
                  <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="mb-2 text-base font-normal text-neutral-900">{t.recipes.tips}</h3>
                    <p className="text-sm font-light leading-relaxed text-neutral-700">{tips}</p>
                  </section>
                )}

                {mangalitsaTip && (
                  <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                    <h3 className="mb-2 text-base font-normal text-neutral-900">{t.recipes.mangalitsaTip}</h3>
                    <p className="text-sm font-light leading-relaxed text-neutral-700">{mangalitsaTip}</p>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
