'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Edit, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface PigPart {
  id: string;
  key: string;
  name_no: string;
  name_en: string;
  display_order?: number;
  active?: boolean;
}

interface Cut {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  chef_name_no?: string | null;
  chef_name_en?: string | null;
  description_no?: string | null;
  description_en?: string | null;
  size_from_kg?: number | null;
  size_to_kg?: number | null;
  display_order: number;
  active: boolean;
  part_id: string | null;
  part?: PigPart | null;
}

type ToastType = { message: string; type: 'success' | 'error' } | null;

export function MangalitsaCutsManager() {
  const { t, lang } = useLanguage();
  const copy = (t as any).admin.mangalitsaCuts;
  const [cuts, setCuts] = useState<Cut[]>([]);
  const [parts, setParts] = useState<PigPart[]>([]);
  const [editingCut, setEditingCut] = useState<Cut | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastType>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [cutsRes, partsRes] = await Promise.all([
        fetch('/api/admin/mangalitsa/cuts'),
        fetch('/api/admin/mangalitsa/parts'),
      ]);

      if (!cutsRes.ok) throw new Error(`Cuts API failed (${cutsRes.status})`);
      const cutsJson = await cutsRes.json();
      setCuts(cutsJson.cuts || []);

      if (partsRes.ok) {
        const partsJson = await partsRes.json();
        setParts((partsJson.parts || []).filter((p: PigPart) => p.active !== false));
      } else {
        setParts([]);
      }
    } catch (error) {
      console.error('Failed to load cuts/parts:', error);
      showToast(copy.errorLoadTitle, 'error');
    } finally {
      setLoading(false);
    }
  }, [copy.errorLoadTitle, showToast]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const partsById = useMemo(() => new Map(parts.map((p) => [p.id, p])), [parts]);

  function formatSizeRange(fromKg?: number | null, toKg?: number | null) {
    if (fromKg == null || toKg == null) return null;
    const format = (value: number) => value.toLocaleString('nb-NO', { maximumFractionDigits: 2 });
    return `${format(fromKg)}-${format(toKg)} kg`;
  }

  async function saveCut(cutId: string, updates: Record<string, unknown>) {
    try {
      const res = await fetch(`/api/admin/mangalitsa/cuts/${cutId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      await loadAll();
      setEditingCut(null);
      showToast(copy.updateToastTitle, 'success');
    } catch (error: any) {
      console.error('Failed to update cut:', error);
      showToast(error.message || copy.errorUpdateTitle, 'error');
    }
  }

  if (loading) return <div className="py-8 text-center text-neutral-500">{copy.loading}</div>;

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`fixed top-6 right-6 z-[60] flex items-center gap-2 px-5 py-3 rounded-xl shadow-lg text-sm font-normal transition-all ${
            toast.type === 'success' ? 'bg-emerald-900 text-white' : 'bg-red-900 text-white'
          }`}
        >
          {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.message}
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-light text-neutral-900">{copy.title}</h2>
        <div className="text-sm font-light text-neutral-600">{copy.countLabel.replace('{count}', String(cuts.length))}</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {cuts.map((cut) => {
          const part = cut.part_id ? cut.part || partsById.get(cut.part_id) || null : null;
          return (
            <div key={cut.id} className="bg-white border border-neutral-200 rounded-xl p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-2">
                    <h3 className="text-lg font-normal text-neutral-900">{cut.name_no}</h3>
                    {cut.chef_name_no && (
                      <span className="text-xs px-3 py-1 bg-neutral-50 border border-neutral-200 rounded-full text-neutral-600 italic">
                        {cut.chef_name_no}
                      </span>
                    )}
                    {!cut.active && (
                      <span className="text-xs px-3 py-1 bg-neutral-100 border border-neutral-200 rounded-full text-neutral-500">
                        {copy.badgeInactive}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 mb-3">
                    {copy.labelSlug} <span className="font-mono">{cut.slug}</span>
                  </p>
                  <p className="text-sm font-light text-neutral-700">
                    {copy.labelPartOf}{' '}
                    <span className="font-normal text-neutral-900">
                      {part ? (lang === 'no' ? part.name_no : part.name_en) : copy.labelUnknownPart}
                    </span>
                  </p>
                  {formatSizeRange(cut.size_from_kg, cut.size_to_kg) && (
                    <p className="text-sm font-light text-neutral-700 mt-1">
                      {copy.labelWeightRange}{' '}
                      <span className="font-normal text-neutral-900">
                        {formatSizeRange(cut.size_from_kg, cut.size_to_kg)}
                      </span>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setEditingCut(cut)}
                  className="p-2 hover:bg-neutral-50 rounded-xl transition-all"
                  title={copy.buttonEdit}
                >
                  <Edit className="w-5 h-5 text-neutral-600" />
                </button>
              </div>

              {cut.description_no && (
                <div className="mt-4 p-4 bg-neutral-50 rounded-xl border border-neutral-200">
                  <p className="text-sm font-light text-neutral-900 leading-relaxed">{cut.description_no}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingCut && (
        <EditCutModal
          cut={editingCut}
          parts={parts}
          onClose={() => setEditingCut(null)}
          onSave={(updates) => saveCut(editingCut.id, updates)}
        />
      )}
    </div>
  );
}

function EditCutModal({
  cut,
  parts,
  onClose,
  onSave,
}: {
  cut: Cut;
  parts: PigPart[];
  onClose: () => void;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
}) {
  const { t } = useLanguage();
  const copy = (t as any).admin.mangalitsaCuts;
  const [saving, setSaving] = useState(false);
  const [nameNo, setNameNo] = useState(cut.name_no || '');
  const [nameEn, setNameEn] = useState(cut.name_en || '');
  const [chefNo, setChefNo] = useState(cut.chef_name_no || '');
  const [chefEn, setChefEn] = useState(cut.chef_name_en || '');
  const [partId, setPartId] = useState(cut.part_id || '');
  const [descNo, setDescNo] = useState(cut.description_no || '');
  const [descEn, setDescEn] = useState(cut.description_en || '');
  const [sizeFromKg, setSizeFromKg] = useState(cut.size_from_kg != null ? String(cut.size_from_kg) : '');
  const [sizeToKg, setSizeToKg] = useState(cut.size_to_kg != null ? String(cut.size_to_kg) : '');
  const [displayOrder, setDisplayOrder] = useState<number>(Number.isFinite(cut.display_order) ? cut.display_order : 0);
  const [active, setActive] = useState(Boolean(cut.active));

  async function handleSave() {
    setSaving(true);
    try {
      const parsedFrom = sizeFromKg ? parseFloat(sizeFromKg) : null;
      const parsedTo = sizeToKg ? parseFloat(sizeToKg) : null;

      if ((parsedFrom == null) !== (parsedTo == null)) {
        window.alert(copy.modalAlertWeightBoth);
        return;
      }

      if (parsedFrom != null && parsedTo != null && parsedTo < parsedFrom) {
        window.alert(copy.modalAlertWeightOrder);
        return;
      }

      await onSave({
        name_no: nameNo,
        name_en: nameEn,
        chef_name_no: chefNo || null,
        chef_name_en: chefEn || null,
        part_id: partId || null,
        description_no: descNo || null,
        description_en: descEn || null,
        size_from_kg: parsedFrom,
        size_to_kg: parsedTo,
        display_order: displayOrder,
        active,
      });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-4 py-3 border border-neutral-200 rounded-xl focus:border-neutral-900 focus:outline-none font-light';
  const smallInputCls = 'w-full px-3 py-2 border border-neutral-200 rounded-lg focus:border-neutral-900 focus:outline-none font-light text-sm';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl p-8 max-w-3xl w-full shadow-xl my-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-2xl font-normal">{cut.name_no}</h3>
            <p className="text-xs text-neutral-500 mt-1">
              Slug: <span className="font-mono">{cut.slug}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-neutral-50 rounded-xl" title="Lukk">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Navn (NO)</label>
            <input value={nameNo} onChange={(e) => setNameNo(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Name (EN)</label>
            <input value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Kokke-navn (NO)</label>
            <input value={chefNo} onChange={(e) => setChefNo(e.target.value)} className={inputCls} placeholder="f.eks. coppa" />
          </div>
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Chef name (EN)</label>
            <input value={chefEn} onChange={(e) => setChefEn(e.target.value)} className={inputCls} placeholder="e.g. coppa" />
          </div>

          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Del av gris</label>
            <select value={partId} onChange={(e) => setPartId(e.target.value)} className={inputCls}>
              <option value="">Velg del</option>
              {parts.map((part) => (
                <option key={part.id} value={part.id}>
                  {part.name_no}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-light text-neutral-600 block mb-2">Rekkefølge</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(parseInt(e.target.value || '0', 10))}
                className={smallInputCls}
              />
            </div>
            <div className="flex items-center gap-3 pt-8">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-5 h-5"
              />
              <label className="text-sm font-light text-neutral-900">Aktiv</label>
            </div>
          </div>
        </div>


        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Fra vekt (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sizeFromKg}
              onChange={(e) => setSizeFromKg(e.target.value)}
              className={inputCls}
              placeholder="f.eks. 0.8"
            />
          </div>
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Til vekt (kg)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={sizeToKg}
              onChange={(e) => setSizeToKg(e.target.value)}
              className={inputCls}
              placeholder="f.eks. 1.1"
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Beskrivelse (NO)</label>
            <textarea value={descNo} onChange={(e) => setDescNo(e.target.value)} rows={4} className={inputCls} />
          </div>
          <div>
            <label className="text-sm font-light text-neutral-600 block mb-2">Description (EN)</label>
            <textarea value={descEn} onChange={(e) => setDescEn(e.target.value)} rows={4} className={inputCls} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl font-normal transition-all disabled:opacity-60"
          >
            {saving ? t.common.processing : t.common.save}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-6 py-3 border border-neutral-200 hover:border-neutral-300 rounded-xl font-normal transition-all disabled:opacity-60"
          >
            {copy.modalButtonClose}
          </button>
        </div>
      </div>
    </div>
  );
}
