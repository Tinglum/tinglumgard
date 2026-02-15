'use client';

import { useState, useEffect, useCallback } from 'react';
import { Edit, Save, X, Plus, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

interface Recipe {
  title_no: string;
  title_en: string;
  description_no: string;
  description_en: string;
  future_slug: string;
}

interface Extra {
  id: string;
  slug: string;
  cut_id?: string | null;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  description_premium_no: string | null;
  description_premium_en: string | null;
  chef_term_no: string | null;
  chef_term_en: string | null;
  recipe_suggestions: Recipe[] | null;
  preparation_tips_no: string | null;
  preparation_tips_en: string | null;
  price_nok: number;
  pricing_type: string;
  active: boolean;
}

interface CutOption {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  chef_name_no?: string | null;
  chef_name_en?: string | null;
  part?: { id: string; key: string; name_no: string; name_en: string } | null;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

export function MangalitsaExtrasManager() {
  const [extras, setExtras] = useState<Extra[]>([]);
  const [cutsCatalog, setCutsCatalog] = useState<CutOption[]>([]);
  const [editingExtra, setEditingExtra] = useState<Extra | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastType>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      const [extrasRes, cutsRes] = await Promise.all([
        fetch('/api/admin/extras'),
        fetch('/api/admin/mangalitsa/cuts'),
      ]);

      if (!extrasRes.ok) throw new Error(`HTTP ${extrasRes.status}`);
      const data = await extrasRes.json();
      setExtras(data.extras || []);

      if (cutsRes.ok) {
        const cutsData = await cutsRes.json();
        setCutsCatalog(cutsData.cuts || []);
      } else {
        setCutsCatalog([]);
      }
    } catch (error) {
      console.error('Failed to load extras:', error);
      showToast('Kunne ikke laste ekstraprodukter', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updateExtra(extraId: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/extras/${extraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadExtras();
      setEditingExtra(null);
      showToast('Ekstraprodukt oppdatert', 'success');
    } catch (error: any) {
      console.error('Failed to update extra:', error);
      showToast(error.message || 'Lagring feilet', 'error');
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">Laster ekstraprodukter...</div>;

  return (
    <div className="space-y-8">
      {toast && (
        <div className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-normal transition-all ${
          toast.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-neutral-900">Ekstraprodukter - Mangalitsa</h2>
      </div>

      <div className="space-y-4">
        {extras.map((extra) => (
          <div
            key={extra.id}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-normal text-neutral-900">{extra.name_no}</h3>
                  {extra.chef_term_no && (
                    <span className="text-xs px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-full text-neutral-600">
                      {extra.chef_term_no}
                    </span>
                  )}
                </div>
                <p className="text-sm font-light text-neutral-600 mb-2">{extra.description_no}</p>
                {extra.description_premium_no && (
                  <p className="text-sm font-light text-neutral-900 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    {extra.description_premium_no}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingExtra(extra)}
                className="p-2 hover:bg-neutral-50 rounded-xl transition-all ml-4"
                title="Rediger"
              >
                <Edit className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Pris:</span>
                <span className="ml-2 font-normal text-neutral-900">{extra.price_nok} kr/{extra.pricing_type === 'per_kg' ? 'kg' : 'stk'}</span>
              </div>
              <div>
                <span className="text-neutral-500">Slug:</span>
                <span className="ml-2 font-normal text-neutral-900">{extra.slug}</span>
              </div>
              <div>
                <span className="text-neutral-500">Aktiv:</span>
                <span className={`ml-2 font-normal ${extra.active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {extra.active ? 'Ja' : 'Nei'}
                </span>
              </div>
            </div>

            {extra.preparation_tips_no && (
              <div className="mt-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Tilberedning</p>
                <p className="text-sm font-light text-neutral-900">{extra.preparation_tips_no}</p>
              </div>
            )}

            {Array.isArray(extra.recipe_suggestions) && extra.recipe_suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Oppskrifter knyttet:</p>
                <div className="flex flex-wrap gap-2">
                  {extra.recipe_suggestions.map((recipe, idx) => (
                    <span key={idx} className="text-xs px-3 py-1 bg-neutral-900 text-white rounded-full">
                      {recipe.title_no}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {editingExtra && (
        <EditExtraModal
          extra={editingExtra}
          cuts={cutsCatalog}
          onSave={(updates) => updateExtra(editingExtra.id, updates)}
          onClose={() => setEditingExtra(null)}
        />
      )}
    </div>
  );
}

function EditExtraModal({ extra, cuts, onSave, onClose }: {
  extra: Extra;
  cuts: CutOption[];
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [cutId, setCutId] = useState(extra.cut_id || '');
  const [descriptionPremiumNo, setDescriptionPremiumNo] = useState(extra.description_premium_no || '');
  const [descriptionPremiumEn, setDescriptionPremiumEn] = useState(extra.description_premium_en || '');
  const [chefTermNo, setChefTermNo] = useState(extra.chef_term_no || '');
  const [chefTermEn, setChefTermEn] = useState(extra.chef_term_en || '');
  const [prepTipsNo, setPrepTipsNo] = useState(extra.preparation_tips_no || '');
  const [prepTipsEn, setPrepTipsEn] = useState(extra.preparation_tips_en || '');
  const [recipes, setRecipes] = useState<Recipe[]>(
    Array.isArray(extra.recipe_suggestions) ? extra.recipe_suggestions.map((r) => ({ ...r })) : []
  );

  function updateRecipe(index: number, field: keyof Recipe, value: string) {
    setRecipes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addRecipe() {
    setRecipes((prev) => [
      ...prev,
      { title_no: '', title_en: '', description_no: '', description_en: '', future_slug: '' },
    ]);
  }

  function removeRecipe(index: number) {
    setRecipes((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        cut_id: cutId || null,
        description_premium_no: descriptionPremiumNo || null,
        description_premium_en: descriptionPremiumEn || null,
        chef_term_no: chefTermNo || null,
        chef_term_en: chefTermEn || null,
        preparation_tips_no: prepTipsNo || null,
        preparation_tips_en: prepTipsEn || null,
        recipe_suggestions: recipes.length > 0 ? recipes : null,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light';
  const smallInputCls = 'w-full px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-900 focus:outline-none font-light text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">{extra.name_no}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Knyt til stykke (katalog)</label>
            <select
              value={cutId}
              onChange={(e) => setCutId(e.target.value)}
              className={inputCls}
            >
              <option value="">Ikke knyttet</option>
              {cuts.map((cut) => (
                <option key={cut.id} value={cut.id}>
                  {cut.name_no}{cut.chef_name_no ? ` (${cut.chef_name_no})` : ''}
                </option>
              ))}
            </select>
            {cutId && cuts.find((c) => c.id === cutId)?.part?.name_no && (
              <p className="mt-1 text-xs text-neutral-500">
                Fra del av gris: {cuts.find((c) => c.id === cutId)?.part?.name_no}
              </p>
            )}
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Premium beskrivelse (NO)</label>
            <textarea
              value={descriptionPremiumNo}
              onChange={(e) => setDescriptionPremiumNo(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Premium beskrivelse (EN)</label>
            <textarea
              value={descriptionPremiumEn}
              onChange={(e) => setDescriptionPremiumEn(e.target.value)}
              rows={3}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Kokke-navn (NO)</label>
              <input
                type="text"
                value={chefTermNo}
                onChange={(e) => setChefTermNo(e.target.value)}
                placeholder="f.eks. 'lardo'"
                className={inputCls}
              />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Chef name (EN)</label>
              <input
                type="text"
                value={chefTermEn}
                onChange={(e) => setChefTermEn(e.target.value)}
                placeholder="e.g. 'lardo'"
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Tilberedningstips (NO)</label>
            <textarea
              value={prepTipsNo}
              onChange={(e) => setPrepTipsNo(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Preparation tips (EN)</label>
            <textarea
              value={prepTipsEn}
              onChange={(e) => setPrepTipsEn(e.target.value)}
              rows={2}
              className={inputCls}
            />
          </div>

          {/* Recipe suggestions editor */}
          <div className="pt-4 border-t border-neutral-200">
            <p className="text-sm font-light text-neutral-600 mb-3">Oppskrifter</p>

            <div className="space-y-3">
              {recipes.map((recipe, idx) => (
                <div key={idx} className="p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs uppercase tracking-wide text-neutral-500">Oppskrift {idx + 1}</span>
                    <button
                      onClick={() => removeRecipe(idx)}
                      className="p-1 hover:bg-red-50 rounded-lg transition-all"
                      title="Fjern oppskrift"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Tittel (NO)</label>
                      <input
                        type="text"
                        value={recipe.title_no}
                        onChange={(e) => updateRecipe(idx, 'title_no', e.target.value)}
                        className={smallInputCls}
                        placeholder="f.eks. Carbonara med guanciale"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Title (EN)</label>
                      <input
                        type="text"
                        value={recipe.title_en}
                        onChange={(e) => updateRecipe(idx, 'title_en', e.target.value)}
                        className={smallInputCls}
                        placeholder="e.g. Carbonara with guanciale"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Beskrivelse (NO)</label>
                      <input
                        type="text"
                        value={recipe.description_no}
                        onChange={(e) => updateRecipe(idx, 'description_no', e.target.value)}
                        className={smallInputCls}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-neutral-500 block mb-1">Description (EN)</label>
                      <input
                        type="text"
                        value={recipe.description_en}
                        onChange={(e) => updateRecipe(idx, 'description_en', e.target.value)}
                        className={smallInputCls}
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="text-xs text-neutral-500 block mb-1">URL-slug (fremtidig oppskrift)</label>
                      <input
                        type="text"
                        value={recipe.future_slug}
                        onChange={(e) => updateRecipe(idx, 'future_slug', e.target.value)}
                        className={smallInputCls}
                        placeholder="f.eks. carbonara-guanciale"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={addRecipe}
              className="w-full mt-3 py-2.5 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl text-sm font-light text-neutral-600 flex items-center justify-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              Legg til oppskrift
            </button>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl font-normal transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Lagrer...' : 'Lagre'}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border border-neutral-200 hover:border-neutral-300 rounded-xl font-normal transition-all"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
