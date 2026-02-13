'use client';

import { useState, useEffect, useCallback } from 'react';
import { Edit, Save, X, Plus, Trash2, GripVertical, AlertCircle, CheckCircle2 } from 'lucide-react';

interface PresetContent {
  id?: string;
  content_name_no: string;
  content_name_en: string;
  target_weight_kg: number | null;
  is_hero: boolean;
  display_order: number;
}

interface Preset {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  short_pitch_no: string;
  short_pitch_en: string;
  target_weight_kg: number;
  price_nok: number;
  target_audience_no: string;
  target_audience_en: string;
  scarcity_message_no: string;
  scarcity_message_en: string;
  active: boolean;
  is_premium: boolean;
  display_order: number;
  contents: PresetContent[];
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

export function MangalitsaBoxManager() {
  const [presets, setPresets] = useState<Preset[]>([]);
  const [editingPreset, setEditingPreset] = useState<Preset | null>(null);
  const [editingContents, setEditingContents] = useState<Preset | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastType>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  useEffect(() => {
    loadPresets();
  }, []);

  async function loadPresets() {
    try {
      const res = await fetch('/api/admin/mangalitsa/presets');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load presets:', error);
      showToast('Kunne ikke laste bokser', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function updatePreset(presetId: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/mangalitsa/presets/${presetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadPresets();
      setEditingPreset(null);
      showToast('Boks oppdatert', 'success');
    } catch (error: any) {
      console.error('Failed to update preset:', error);
      showToast(error.message || 'Lagring feilet', 'error');
    }
  }

  async function updateContents(presetId: string, contents: PresetContent[]) {
    try {
      const res = await fetch(`/api/admin/mangalitsa/presets/${presetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadPresets();
      setEditingContents(null);
      showToast('Innhold oppdatert', 'success');
    } catch (error: any) {
      console.error('Failed to update contents:', error);
      showToast(error.message || 'Lagring av innhold feilet', 'error');
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">Laster bokser...</div>;

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
        <h2 className="text-2xl font-light text-neutral-900">Mangalitsa Premium Bokser</h2>
        <div className="text-sm font-light text-neutral-600">
          Total per gris: {presets.reduce((sum, p) => sum + p.price_nok, 0).toLocaleString('nb-NO')} kr
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {presets.map((preset) => (
          <div
            key={preset.id}
            className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-normal text-neutral-900">{preset.name_no}</h3>
              <button
                onClick={() => setEditingPreset(preset)}
                className="p-2 hover:bg-neutral-50 rounded-xl transition-all"
                title="Rediger boks"
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

            {preset.short_pitch_no && (
              <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Kort pitch</p>
                <p className="text-sm font-light text-neutral-900">{preset.short_pitch_no}</p>
              </div>
            )}

            {preset.scarcity_message_no && (
              <div className="mb-4 p-3 bg-neutral-50 rounded-xl border border-neutral-200">
                <p className="text-xs uppercase tracking-wide text-neutral-500 mb-1">Knapphet-melding</p>
                <p className="text-sm font-light text-neutral-900">{preset.scarcity_message_no}</p>
              </div>
            )}

            <div className="pt-4 border-t border-neutral-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs uppercase tracking-wide text-neutral-500">Innhold:</p>
                <button
                  onClick={() => setEditingContents(preset)}
                  className="text-xs text-neutral-500 hover:text-neutral-900 underline transition-all"
                >
                  Rediger innhold
                </button>
              </div>
              <ul className="space-y-1 text-sm font-light text-neutral-600">
                {preset.contents?.map((content, idx) => (
                  <li key={idx} className={content.is_hero ? 'text-neutral-900 font-normal' : ''}>
                    {content.is_hero ? '\u2605 ' : '\u2022 '}{content.content_name_no}
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
          onSave={(updates) => updatePreset(editingPreset.id, updates)}
          onClose={() => setEditingPreset(null)}
        />
      )}

      {editingContents && (
        <EditContentsModal
          preset={editingContents}
          onSave={(contents) => updateContents(editingContents.id, contents)}
          onClose={() => setEditingContents(null)}
        />
      )}
    </div>
  );
}

function EditPresetModal({ preset, onSave, onClose }: {
  preset: Preset;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [nameNo, setNameNo] = useState(preset.name_no);
  const [nameEn, setNameEn] = useState(preset.name_en);
  const [descNo, setDescNo] = useState(preset.description_no || '');
  const [descEn, setDescEn] = useState(preset.description_en || '');
  const [pitchNo, setPitchNo] = useState(preset.short_pitch_no || '');
  const [pitchEn, setPitchEn] = useState(preset.short_pitch_en || '');
  const [price, setPrice] = useState(preset.price_nok);
  const [audienceNo, setAudienceNo] = useState(preset.target_audience_no || '');
  const [audienceEn, setAudienceEn] = useState(preset.target_audience_en || '');
  const [scarcityNo, setScarcityNo] = useState(preset.scarcity_message_no || '');
  const [scarcityEn, setScarcityEn] = useState(preset.scarcity_message_en || '');
  const [active, setActive] = useState(preset.active);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        name_no: nameNo,
        name_en: nameEn,
        description_no: descNo,
        description_en: descEn,
        short_pitch_no: pitchNo,
        short_pitch_en: pitchEn,
        price_nok: price,
        target_audience_no: audienceNo,
        target_audience_en: audienceEn,
        scarcity_message_no: scarcityNo,
        scarcity_message_en: scarcityEn,
        active,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-2xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">Rediger: {preset.name_no}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 mb-6 max-h-[60vh] overflow-y-auto pr-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Navn (NO)</label>
              <input type="text" value={nameNo} onChange={(e) => setNameNo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Name (EN)</label>
              <input type="text" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Beskrivelse (NO)</label>
              <textarea value={descNo} onChange={(e) => setDescNo(e.target.value)} rows={2} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Description (EN)</label>
              <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={2} className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Kort pitch (NO)</label>
              <input type="text" value={pitchNo} onChange={(e) => setPitchNo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Short pitch (EN)</label>
              <input type="text" value={pitchEn} onChange={(e) => setPitchEn(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Pris (NOK)</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(parseInt(e.target.value) || 0)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Publikum (NO)</label>
              <input type="text" value={audienceNo} onChange={(e) => setAudienceNo(e.target.value)} placeholder="f.eks. 'kokkeentusiasten'" className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Audience (EN)</label>
              <input type="text" value={audienceEn} onChange={(e) => setAudienceEn(e.target.value)} placeholder="e.g. 'the cooking enthusiast'" className={inputCls} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Knapphet-melding (NO)</label>
              <input type="text" value={scarcityNo} onChange={(e) => setScarcityNo(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Scarcity message (EN)</label>
              <input type="text" value={scarcityEn} onChange={(e) => setScarcityEn(e.target.value)} className={inputCls} />
            </div>
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

function EditContentsModal({ preset, onSave, onClose }: {
  preset: Preset;
  onSave: (contents: PresetContent[]) => Promise<void>;
  onClose: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [contents, setContents] = useState<PresetContent[]>(
    (preset.contents || []).map((c) => ({ ...c }))
  );

  function updateContent(index: number, field: keyof PresetContent, value: any) {
    setContents((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  }

  function addContent() {
    setContents((prev) => [
      ...prev,
      {
        content_name_no: '',
        content_name_en: '',
        target_weight_kg: null,
        is_hero: false,
        display_order: prev.length + 1,
      },
    ]);
  }

  function removeContent(index: number) {
    setContents((prev) => prev.filter((_, i) => i !== index));
  }

  function moveContent(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= contents.length) return;
    setContents((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next.map((c, i) => ({ ...c, display_order: i + 1 }));
    });
  }

  async function handleSave() {
    const invalid = contents.some((c) => !c.content_name_no.trim() || !c.content_name_en.trim());
    if (invalid) return;
    setSaving(true);
    try {
      await onSave(contents.map((c, i) => ({ ...c, display_order: i + 1 })));
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-900 focus:outline-none font-light text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-normal">Innhold: {preset.name_no}</h3>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 mb-6 max-h-[55vh] overflow-y-auto pr-2">
          {contents.map((content, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
              <div className="flex flex-col gap-1 mt-2">
                <button
                  onClick={() => moveContent(idx, -1)}
                  disabled={idx === 0}
                  className="p-1 hover:bg-neutral-200 rounded disabled:opacity-30"
                  title="Flytt opp"
                >
                  <GripVertical className="w-3 h-3" />
                </button>
              </div>

              <div className="flex-1 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">Navn (NO)</label>
                  <input
                    type="text"
                    value={content.content_name_no}
                    onChange={(e) => updateContent(idx, 'content_name_no', e.target.value)}
                    className={inputCls}
                    placeholder="f.eks. Indrefilet"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">Name (EN)</label>
                  <input
                    type="text"
                    value={content.content_name_en}
                    onChange={(e) => updateContent(idx, 'content_name_en', e.target.value)}
                    className={inputCls}
                    placeholder="e.g. Tenderloin"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-500 block mb-1">Vekt (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={content.target_weight_kg ?? ''}
                    onChange={(e) => updateContent(idx, 'target_weight_kg', e.target.value ? parseFloat(e.target.value) : null)}
                    className={inputCls}
                    placeholder="f.eks. 1.5"
                  />
                </div>
                <div className="flex items-end gap-3 pb-1">
                  <label className="flex items-center gap-2 text-sm font-light text-neutral-900">
                    <input
                      type="checkbox"
                      checked={content.is_hero}
                      onChange={(e) => updateContent(idx, 'is_hero', e.target.checked)}
                      className="w-4 h-4"
                    />
                    Hoved-kutt
                  </label>
                </div>
              </div>

              <button
                onClick={() => removeContent(idx)}
                className="p-2 hover:bg-red-50 rounded-xl transition-all mt-2"
                title="Fjern"
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addContent}
          className="w-full py-3 border-2 border-dashed border-neutral-300 hover:border-neutral-400 rounded-xl text-sm font-light text-neutral-600 flex items-center justify-center gap-2 mb-6 transition-all"
        >
          <Plus className="w-4 h-4" />
          Legg til kutt
        </button>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-400 text-white rounded-xl font-normal transition-all flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Lagrer...' : 'Lagre innhold'}
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
