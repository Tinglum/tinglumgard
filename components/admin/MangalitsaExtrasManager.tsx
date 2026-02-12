'use client';

import { useState, useEffect } from 'react';
import { Edit, Plus, Save, X } from 'lucide-react';

export function MangalitsaExtrasManager() {
  const [extras, setExtras] = useState<any[]>([]);
  const [editingExtra, setEditingExtra] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      const res = await fetch('/api/admin/extras');
      const data = await res.json();
      setExtras(data.extras || []);
    } catch (error) {
      console.error('Failed to load extras:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateExtra(extraId: string, updates: any) {
    try {
      await fetch(`/api/admin/extras/${extraId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      loadExtras();
      setEditingExtra(null);
    } catch (error) {
      console.error('Failed to update extra:', error);
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">Laster ekstraprodukter...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-neutral-900">Ekstraprodukter - Mangalitsa</h2>
      </div>

      <div className="space-y-4">
        {extras.map((extra: any) => (
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
                <p className="text-sm font-light text-neutral-600 mb-2">{extra.description_no || extra.description}</p>
                {extra.description_premium_no && (
                  <p className="text-sm font-light text-neutral-900 bg-neutral-50 p-3 rounded-xl border border-neutral-200">
                    {extra.description_premium_no}
                  </p>
                )}
              </div>
              <button
                onClick={() => setEditingExtra(extra)}
                className="p-2 hover:bg-neutral-50 rounded-xl transition-all ml-4"
              >
                <Edit className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">Pris:</span>
                <span className="ml-2 font-normal text-neutral-900">{extra.price_nok} kr</span>
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

            {extra.recipe_suggestions && extra.recipe_suggestions.length > 0 && (
              <div className="mt-4 pt-4 border-t border-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Oppskrifter knyttet:</p>
                <div className="flex flex-wrap gap-2">
                  {extra.recipe_suggestions.map((recipe: any, idx: number) => (
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
          onSave={(updates: any) => updateExtra(editingExtra.id, updates)}
          onClose={() => setEditingExtra(null)}
        />
      )}
    </div>
  );
}

function EditExtraModal({ extra, onSave, onClose }: { extra: any; onSave: (updates: any) => void; onClose: () => void }) {
  const [descriptionPremiumNo, setDescriptionPremiumNo] = useState(extra.description_premium_no || '');
  const [descriptionPremiumEn, setDescriptionPremiumEn] = useState(extra.description_premium_en || '');
  const [chefTermNo, setChefTermNo] = useState(extra.chef_term_no || '');
  const [chefTermEn, setChefTermEn] = useState(extra.chef_term_en || '');
  const [prepTipsNo, setPrepTipsNo] = useState(extra.preparation_tips_no || '');
  const [prepTipsEn, setPrepTipsEn] = useState(extra.preparation_tips_en || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">{extra.name_no}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Premium beskrivelse (NO)</label>
            <textarea
              value={descriptionPremiumNo}
              onChange={(e) => setDescriptionPremiumNo(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Premium beskrivelse (EN)</label>
            <textarea
              value={descriptionPremiumEn}
              onChange={(e) => setDescriptionPremiumEn(e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
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
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
              />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Chef name (EN)</label>
              <input
                type="text"
                value={chefTermEn}
                onChange={(e) => setChefTermEn(e.target.value)}
                placeholder="e.g. 'lardo'"
                className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Tilberedningstips (NO)</label>
            <textarea
              value={prepTipsNo}
              onChange={(e) => setPrepTipsNo(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Preparation tips (EN)</label>
            <textarea
              value={prepTipsEn}
              onChange={(e) => setPrepTipsEn(e.target.value)}
              rows={2}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave({
              description_premium_no: descriptionPremiumNo,
              description_premium_en: descriptionPremiumEn,
              chef_term_no: chefTermNo,
              chef_term_en: chefTermEn,
              preparation_tips_no: prepTipsNo,
              preparation_tips_en: prepTipsEn,
            })}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-normal transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            Lagre
          </button>
          <button
            onClick={onClose}
            className="px-6 py-3 border border-neutral-200 hover:border-neutral-300 rounded-xl font-normal transition-all"
          >
            Avbryt
          </button>
        </div>
      </div>
    </div>
  );
}
