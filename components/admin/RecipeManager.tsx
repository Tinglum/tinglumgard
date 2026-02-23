'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle2,
  ChefHat,
  Clock,
  Users,
  Image as ImageIcon,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface Ingredient {
  amount: string;
  item: string;
}

interface Recipe {
  id: string;
  slug: string;
  title_no: string;
  title_en: string;
  intro_no: string;
  intro_en: string;
  ingredients_no: Ingredient[];
  ingredients_en: Ingredient[];
  steps_no: string[];
  steps_en: string[];
  tips_no: string;
  tips_en: string;
  mangalitsa_tip_no: string;
  mangalitsa_tip_en: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  image_url: string;
  related_extra_slugs: string[];
  active: boolean;
  display_order: number;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

function emptyRecipe(): Omit<Recipe, 'id'> {
  return {
    slug: '',
    title_no: '',
    title_en: '',
    intro_no: '',
    intro_en: '',
    ingredients_no: [{ amount: '', item: '' }],
    ingredients_en: [{ amount: '', item: '' }],
    steps_no: [''],
    steps_en: [''],
    tips_no: '',
    tips_en: '',
    mangalitsa_tip_no: '',
    mangalitsa_tip_en: '',
    difficulty: 'medium',
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    servings: 4,
    image_url: '',
    related_extra_slugs: [],
    active: true,
    display_order: 0,
  };
}

const difficultyColors: Record<string, string> = {
  easy: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  hard: 'bg-red-100 text-red-800 border-red-200',
};


export function RecipeManager() {
  const { t } = useLanguage();
  const copy = (t as any).admin.recipes;
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | (Omit<Recipe, 'id'> & { id?: undefined }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastType>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    loadRecipes();
  }, []);

  async function loadRecipes() {
    try {
      const res = await fetch('/api/admin/recipes');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecipes(data.recipes || []);
    } catch (error) {
      console.error('Failed to load recipes:', error);
      showToast(copy.errorLoadTitle, 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateRecipe(recipeId: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadRecipes();
      setEditingRecipe(null);
      showToast(copy.updateToastTitle, 'success');
    } catch (error: any) {
      console.error('Failed to update recipe:', error);
      showToast(error.message || copy.errorSaveTitle, 'error');
    }
  }

  async function createRecipe(data: Record<string, unknown>) {
    try {
      const res = await fetch('/api/admin/recipes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadRecipes();
      setEditingRecipe(null);
      showToast(copy.createToastTitle, 'success');
    } catch (error: any) {
      console.error('Failed to create recipe:', error);
      showToast(error.message || copy.errorCreateTitle, 'error');
    }
  }

  async function deleteRecipe(recipeId: string) {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      const res = await fetch(`/api/admin/recipes/${recipeId}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadRecipes();
      showToast(copy.deleteToastTitle, 'success');
    } catch (error: any) {
      console.error('Failed to delete recipe:', error);
      showToast(error.message || copy.errorDeleteTitle, 'error');
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">{copy.loading}</div>;

  return (
    <div className="space-y-8">
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-normal transition-all ${
          toast.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-neutral-900">{copy.title}</h2>
        <button
          onClick={() => setEditingRecipe(emptyRecipe())}
          className="flex items-center gap-2 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-sm font-normal transition-all"
        >
          <Plus className="w-4 h-4" />
          {copy.buttonNewRecipe}
        </button>
      </div>

      {recipes.length === 0 && (
        <div className="text-center py-12 text-neutral-500 font-light">
          {copy.emptyState}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {recipes.map((recipe) => (
          <div
            key={recipe.id}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-start gap-4">
              {recipe.image_url ? (
                <img
                  src={recipe.image_url}
                  alt={recipe.title_no}
                  className="w-16 h-16 rounded-lg object-cover flex-shrink-0 border border-neutral-200"
                />
              ) : (
                <div className="w-16 h-16 rounded-lg bg-neutral-100 border border-neutral-200 flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-6 h-6 text-neutral-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-normal text-neutral-900 truncate">{recipe.title_no}</h3>
                <p className="text-sm font-light text-neutral-400 truncate">{recipe.slug}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${difficultyColors[recipe.difficulty]}`}>
                    {{ easy: copy.difficultyEasy, medium: copy.difficultyMedium, hard: copy.difficultyHard }[recipe.difficulty]}
                  </span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-full border ${
                    recipe.active
                      ? 'bg-green-100 text-green-800 border-green-200'
                      : 'bg-neutral-100 text-neutral-500 border-neutral-200'
                  }`}>
                    {recipe.active ? copy.badgeActive : copy.badgeInactive}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-neutral-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {copy.labelMinutes.replace('{minutes}', String(recipe.prep_time_minutes + recipe.cook_time_minutes))}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-3.5 h-3.5" />
                {copy.labelServings.replace('{servings}', String(recipe.servings))}
              </span>
              <span className="flex items-center gap-1">
                <ChefHat className="w-3.5 h-3.5" />
                {copy.labelOrder.replace('{order}', String(recipe.display_order))}
              </span>
            </div>

            <div className="flex items-center gap-2 mt-4 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setEditingRecipe(recipe)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-neutral-50 rounded-lg transition-all text-neutral-600"
              >
                <Edit className="w-4 h-4" />
                {copy.buttonEdit}
              </button>
              <button
                onClick={() => deleteRecipe(recipe.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm hover:bg-red-50 rounded-lg transition-all text-red-600"
              >
                <Trash2 className="w-4 h-4" />
                {copy.buttonDelete}
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingRecipe && (
        <EditRecipeModal
          recipe={editingRecipe}
          onSave={(data) => {
            if (editingRecipe.id) {
              return updateRecipe(editingRecipe.id, data);
            } else {
              return createRecipe(data);
            }
          }}
          onClose={() => setEditingRecipe(null)}
        />
      )}
    </div>
  );
}

function EditRecipeModal({ recipe, onSave, onClose }: {
  recipe: Recipe | (Omit<Recipe, 'id'> & { id?: undefined });
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const copy = (t as any).admin.recipes;
  const isNew = !recipe.id;
  const [saving, setSaving] = useState(false);

  const [slug, setSlug] = useState(recipe.slug);
  const [titleNo, setTitleNo] = useState(recipe.title_no);
  const [titleEn, setTitleEn] = useState(recipe.title_en);
  const [introNo, setIntroNo] = useState(recipe.intro_no);
  const [introEn, setIntroEn] = useState(recipe.intro_en);
  const [ingredientsNo, setIngredientsNo] = useState<Ingredient[]>(
    recipe.ingredients_no?.length ? recipe.ingredients_no.map((i) => ({ ...i })) : [{ amount: '', item: '' }]
  );
  const [ingredientsEn, setIngredientsEn] = useState<Ingredient[]>(
    recipe.ingredients_en?.length ? recipe.ingredients_en.map((i) => ({ ...i })) : [{ amount: '', item: '' }]
  );
  const [stepsNo, setStepsNo] = useState<string[]>(
    recipe.steps_no?.length ? [...recipe.steps_no] : ['']
  );
  const [stepsEn, setStepsEn] = useState<string[]>(
    recipe.steps_en?.length ? [...recipe.steps_en] : ['']
  );
  const [tipsNo, setTipsNo] = useState(recipe.tips_no || '');
  const [tipsEn, setTipsEn] = useState(recipe.tips_en || '');
  const [mangalitsaTipNo, setMangalitsaTipNo] = useState(recipe.mangalitsa_tip_no || '');
  const [mangalitsaTipEn, setMangalitsaTipEn] = useState(recipe.mangalitsa_tip_en || '');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>(recipe.difficulty || 'medium');
  const [prepTime, setPrepTime] = useState(recipe.prep_time_minutes || 0);
  const [cookTime, setCookTime] = useState(recipe.cook_time_minutes || 0);
  const [servings, setServings] = useState(recipe.servings || 4);
  const [imageUrl, setImageUrl] = useState(recipe.image_url || '');
  const [relatedExtraSlugs, setRelatedExtraSlugs] = useState(
    (recipe.related_extra_slugs || []).join(', ')
  );
  const [active, setActive] = useState(recipe.active ?? true);
  const [displayOrder, setDisplayOrder] = useState(recipe.display_order || 0);

  function updateIngredient(lang: 'no' | 'en', index: number, field: keyof Ingredient, value: string) {
    const setter = lang === 'no' ? setIngredientsNo : setIngredientsEn;
    setter((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addIngredient(lang: 'no' | 'en') {
    const setter = lang === 'no' ? setIngredientsNo : setIngredientsEn;
    setter((prev) => [...prev, { amount: '', item: '' }]);
  }

  function removeIngredient(lang: 'no' | 'en', index: number) {
    const setter = lang === 'no' ? setIngredientsNo : setIngredientsEn;
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  function updateStep(lang: 'no' | 'en', index: number, value: string) {
    const setter = lang === 'no' ? setStepsNo : setStepsEn;
    setter((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function addStep(lang: 'no' | 'en') {
    const setter = lang === 'no' ? setStepsNo : setStepsEn;
    setter((prev) => [...prev, '']);
  }

  function removeStep(lang: 'no' | 'en', index: number) {
    const setter = lang === 'no' ? setStepsNo : setStepsEn;
    setter((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const slugsArray = relatedExtraSlugs
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      await onSave({
        slug,
        title_no: titleNo,
        title_en: titleEn,
        intro_no: introNo,
        intro_en: introEn,
        ingredients_no: ingredientsNo.filter((i) => i.item.trim()),
        ingredients_en: ingredientsEn.filter((i) => i.item.trim()),
        steps_no: stepsNo.filter((s) => s.trim()),
        steps_en: stepsEn.filter((s) => s.trim()),
        tips_no: tipsNo,
        tips_en: tipsEn,
        mangalitsa_tip_no: mangalitsaTipNo,
        mangalitsa_tip_en: mangalitsaTipEn,
        difficulty,
        prep_time_minutes: prepTime,
        cook_time_minutes: cookTime,
        servings,
        image_url: imageUrl,
        related_extra_slugs: slugsArray,
        active,
        display_order: displayOrder,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light text-sm';
  const smallInputCls = 'w-full px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-900 focus:outline-none font-light text-sm';
  const labelCls = 'text-sm font-light text-neutral-600 block mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-4xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">
            {isNew ? copy.modalTitleNew : copy.modalTitleEdit.replace('{title}', recipe.title_no)}
          </h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6 mb-6 max-h-[70vh] overflow-y-auto pr-2">
          {/* Titles */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{copy.labelTitleNo}</label>
              <input
                type="text"
                value={titleNo}
                onChange={(e) => setTitleNo(e.target.value)}
                className={inputCls}
                placeholder={copy.placeholderTitleNo}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelTitleEn}</label>
              <input
                type="text"
                value={titleEn}
                onChange={(e) => setTitleEn(e.target.value)}
                className={inputCls}
                placeholder={copy.placeholderTitleEn}
              />
            </div>
          </div>

          {/* Slug */}
          <div>
            <label className={labelCls}>{copy.labelSlug}</label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className={inputCls}
              placeholder={copy.placeholderSlug}
            />
          </div>

          {/* Intros */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{copy.labelIntroNo}</label>
              <textarea
                value={introNo}
                onChange={(e) => setIntroNo(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderIntroNo}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelIntroEn}</label>
              <textarea
                value={introEn}
                onChange={(e) => setIntroEn(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderIntroEn}
              />
            </div>
          </div>

          {/* Ingredients NO */}
          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-light text-neutral-600 mb-3">{copy.sectionIngredientsNo}</p>
            <div className="space-y-2">
              {ingredientsNo.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient('no', idx, 'amount', e.target.value)}
                    className={smallInputCls}
                    placeholder={copy.placeholderAmount}
                    style={{ maxWidth: '120px' }}
                  />
                  <input
                    type="text"
                    value={ing.item}
                    onChange={(e) => updateIngredient('no', idx, 'item', e.target.value)}
                    className={`${smallInputCls} flex-1`}
                    placeholder={copy.placeholderIngredient}
                  />
                  <button
                    onClick={() => removeIngredient('no', idx)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                    title={copy.buttonRemove}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addIngredient('no')}
              className="w-full mt-2 py-2 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg text-xs font-light text-neutral-600 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {copy.buttonAddIngredient}
            </button>
          </div>

          {/* Ingredients EN */}
          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-light text-neutral-600 mb-3">{copy.sectionIngredientsEn}</p>
            <div className="space-y-2">
              {ingredientsEn.map((ing, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ing.amount}
                    onChange={(e) => updateIngredient('en', idx, 'amount', e.target.value)}
                    className={smallInputCls}
                    placeholder={copy.placeholderAmountEn}
                    style={{ maxWidth: '120px' }}
                  />
                  <input
                    type="text"
                    value={ing.item}
                    onChange={(e) => updateIngredient('en', idx, 'item', e.target.value)}
                    className={`${smallInputCls} flex-1`}
                    placeholder={copy.placeholderIngredientEn}
                  />
                  <button
                    onClick={() => removeIngredient('en', idx)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0"
                    title={copy.buttonRemove}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addIngredient('en')}
              className="w-full mt-2 py-2 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg text-xs font-light text-neutral-600 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {copy.buttonAddIngredientEn}
            </button>
          </div>

          {/* Steps NO */}
          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-light text-neutral-600 mb-3">{copy.sectionStepsNo}</p>
            <div className="space-y-2">
              {stepsNo.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs text-neutral-400 mt-2.5 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep('no', idx, e.target.value)}
                    rows={2}
                    className={`${smallInputCls} flex-1`}
                    placeholder={copy.placeholderStep.replace('{number}', String(idx + 1))}
                  />
                  <button
                    onClick={() => removeStep('no', idx)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 mt-1"
                    title={copy.buttonRemoveStep}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addStep('no')}
              className="w-full mt-2 py-2 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg text-xs font-light text-neutral-600 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {copy.buttonAddStep}
            </button>
          </div>

          {/* Steps EN */}
          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-light text-neutral-600 mb-3">{copy.sectionStepsEn}</p>
            <div className="space-y-2">
              {stepsEn.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-xs text-neutral-400 mt-2.5 w-6 text-right flex-shrink-0">{idx + 1}.</span>
                  <textarea
                    value={step}
                    onChange={(e) => updateStep('en', idx, e.target.value)}
                    rows={2}
                    className={`${smallInputCls} flex-1`}
                    placeholder={copy.placeholderStepEn.replace('{number}', String(idx + 1))}
                  />
                  <button
                    onClick={() => removeStep('en', idx)}
                    className="p-1.5 hover:bg-red-50 rounded-lg transition-all flex-shrink-0 mt-1"
                    title={copy.buttonRemoveStepEn}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                  </button>
                </div>
              ))}
            </div>
            <button
              onClick={() => addStep('en')}
              className="w-full mt-2 py-2 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-lg text-xs font-light text-neutral-600 flex items-center justify-center gap-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              {copy.buttonAddStepEn}
            </button>
          </div>

          {/* Tips */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
            <div>
              <label className={labelCls}>{copy.labelTipsNo}</label>
              <textarea
                value={tipsNo}
                onChange={(e) => setTipsNo(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderTipsNo}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelTipsEn}</label>
              <textarea
                value={tipsEn}
                onChange={(e) => setTipsEn(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderTipsEn}
              />
            </div>
          </div>

          {/* Mangalitsa tips */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>{copy.labelMangalitsaTipNo}</label>
              <textarea
                value={mangalitsaTipNo}
                onChange={(e) => setMangalitsaTipNo(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderMangalitsaTipNo}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelMangalitsaTipEn}</label>
              <textarea
                value={mangalitsaTipEn}
                onChange={(e) => setMangalitsaTipEn(e.target.value)}
                rows={3}
                className={inputCls}
                placeholder={copy.placeholderMangalitsaTipEn}
              />
            </div>
          </div>

          {/* Metadata row */}
          <div className="grid grid-cols-4 gap-4 pt-4 border-t border-neutral-200">
            <div>
              <label className={labelCls}>{copy.labelDifficulty}</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                className={inputCls}
              >
                <option value="easy">{copy.difficultyEasy}</option>
                <option value="medium">{copy.difficultyMedium}</option>
                <option value="hard">{copy.difficultyHard}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{copy.labelPrepTime}</label>
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(Number(e.target.value))}
                className={inputCls}
                min={0}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelCookTime}</label>
              <input
                type="number"
                value={cookTime}
                onChange={(e) => setCookTime(Number(e.target.value))}
                className={inputCls}
                min={0}
              />
            </div>
            <div>
              <label className={labelCls}>{copy.labelServingsInput}</label>
              <input
                type="number"
                value={servings}
                onChange={(e) => setServings(Number(e.target.value))}
                className={inputCls}
                min={1}
              />
            </div>
          </div>

          {/* Image URL */}
          <div className="pt-4 border-t border-neutral-200">
            <label className={labelCls}>{copy.labelImageUrl}</label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className={inputCls}
              placeholder={copy.placeholderImageUrl}
            />
            {imageUrl && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={imageUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-lg object-cover border border-neutral-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="text-xs text-neutral-400">{copy.imagePreview}</span>
              </div>
            )}
          </div>

          {/* Related extras */}
          <div>
            <label className={labelCls}>{copy.labelRelatedExtras}</label>
            <input
              type="text"
              value={relatedExtraSlugs}
              onChange={(e) => setRelatedExtraSlugs(e.target.value)}
              className={inputCls}
              placeholder={copy.placeholderRelatedExtras}
            />
          </div>

          {/* Active + display order */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-neutral-200">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="recipe-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <label htmlFor="recipe-active" className="text-sm font-light text-neutral-600">
                {copy.checkboxActive}
              </label>
            </div>
            <div>
              <label className={labelCls}>{copy.labelDisplayOrder}</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className={inputCls}
                min={0}
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl font-normal transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? copy.buttonSaving : isNew ? copy.buttonCreate : copy.buttonSave}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border border-neutral-200 hover:border-neutral-300 rounded-xl font-normal transition-all"
          >
            {copy.buttonCancel}
          </button>
        </div>
      </div>
    </div>
  );
}
