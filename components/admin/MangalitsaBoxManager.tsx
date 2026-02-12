'use client';

import { useState, useEffect } from 'react';
import { Edit, Save, X } from 'lucide-react';

export function MangalitsaBoxManager() {
  const [presets, setPresets] = useState<any[]>([]);
  const [editingPreset, setEditingPreset] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPresets();
  }, []);

  async function loadPresets() {
    try {
      const res = await fetch('/api/admin/mangalitsa/presets');
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load presets:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updatePreset(presetId: string, updates: any) {
    try {
      await fetch(`/api/admin/mangalitsa/presets/${presetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      loadPresets();
      setEditingPreset(null);
    } catch (error) {
      console.error('Failed to update preset:', error);
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">Laster bokser...</div>;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-neutral-900">Mangalitsa Premium Bokser</h2>
        <div className="text-sm font-light text-neutral-600">
          Total per gris: {presets.reduce((sum: number, p: any) => sum + p.price_nok, 0).toLocaleString('nb-NO')} kr
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {presets.map((preset: any) => (
          <div
            key={preset.id}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-normal text-neutral-900">{preset.name_no}</h3>
              <button
                onClick={() => setEditingPreset(preset)}
                className="p-2 hover:bg-neutral-50 rounded-xl transition-all"
              >
                <Edit className="w-5 h-5 text-neutral-600" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
              <div>
                <span className="text-neutral-500">Vekt:</span>
                <span className="ml-2 font-normal text-neutral-900">{preset.target_weight_kg} kg</span>
              </div>
              <div>
                <span className="text-neutral-500">Pris:</span>
                <span className="ml-2 font-normal text-neutral-900">{preset.price_nok.toLocaleString('nb-NO')} kr</span>
              </div>
              <div>
                <span className="text-neutral-500">Kr/kg:</span>
                <span className="ml-2 font-normal text-neutral-900">
                  {Math.round(preset.price_nok / preset.target_weight_kg)} kr/kg
                </span>
              </div>
              <div>
                <span className="text-neutral-500">Aktiv:</span>
                <span className={`ml-2 font-normal ${preset.active ? 'text-neutral-900' : 'text-neutral-400'}`}>
                  {preset.active ? 'Ja' : 'Nei'}
                </span>
              </div>
            </div>

            <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
              <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Knapphet-melding</p>
              <p className="text-sm font-light text-neutral-900">{preset.scarcity_message_no}</p>
            </div>

            <div className="pt-4 border-t border-neutral-200">
              <p className="text-xs uppercase tracking-wide text-neutral-500 mb-2">Innhold:</p>
              <ul className="space-y-1 text-sm font-light text-neutral-600">
                {preset.contents?.map((content: any, idx: number) => (
                  <li key={idx} className={content.is_hero ? 'text-neutral-900 font-normal' : ''}>
                    • {content.content_name_no}
                    {content.target_weight_kg && ` (${content.target_weight_kg} kg)`}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {editingPreset && (
        <EditPresetModal
          preset={editingPreset}
          onSave={(updates: any) => updatePreset(editingPreset.id, updates)}
          onClose={() => setEditingPreset(null)}
        />
      )}
    </div>
  );
}

function EditPresetModal({ preset, onSave, onClose }: { preset: any; onSave: (updates: any) => void; onClose: () => void }) {
  const [price, setPrice] = useState(preset.price_nok);
  const [active, setActive] = useState(preset.active);
  const [scarcityNo, setScarcityNo] = useState(preset.scarcity_message_no || '');
  const [scarcityEn, setScarcityEn] = useState(preset.scarcity_message_en || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl p-8 max-w-md w-full shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">{preset.name_no}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Pris (NOK)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Knapphet-melding (NO)</label>
            <input
              type="text"
              value={scarcityNo}
              onChange={(e) => setScarcityNo(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Knapphet-melding (EN)</label>
            <input
              type="text"
              value={scarcityEn}
              onChange={(e) => setScarcityEn(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
              className="w-5 h-5"
            />
            <label className="text-sm font-light text-neutral-900">Aktiv (vis på nettsiden)</label>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => onSave({ price_nok: price, active, scarcity_message_no: scarcityNo, scarcity_message_en: scarcityEn })}
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
