'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Package, Plus, Edit, Trash2, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLanguage } from '@/contexts/LanguageContext';

interface Extra {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description_no: string;
  description_en: string;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  stock_quantity: number | null;
  default_quantity: number;
  active: boolean;
  created_at: string;
}

function createInitialFormData(): Partial<Extra> {
  return {
    slug: '',
    name_no: '',
    name_en: '',
    description_no: '',
    description_en: '',
    price_nok: 0,
    pricing_type: 'per_unit',
    stock_quantity: null,
    default_quantity: 1,
    active: true,
  };
}

function replaceTokens(template: string, tokens: Record<string, string | number>): string {
  return Object.entries(tokens).reduce((text, [token, tokenValue]) => {
    return text.replace(new RegExp(`\\{${token}\\}`, 'g'), String(tokenValue));
  }, template);
}

export function ExtrasCatalogManager() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const copy = t.extrasCatalogManager;
  const currency = t.common.currency;
  const unitKg = t.common.kg;
  const unitPiece = t.common.stk;

  const [extras, setExtras] = useState<Extra[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Extra>>(createInitialFormData());

  useEffect(() => {
    loadExtras();
  }, []);

  async function loadExtras() {
    try {
      const response = await fetch('/api/admin/extras');
      const data = await response.json();
      setExtras(data.extras || []);
    } catch (error) {
      console.error('Failed to load extras:', error);
      toast({
        title: copy.errorTitle,
        description: copy.loadError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  function startCreate() {
    setFormData(createInitialFormData());
    setIsCreating(true);
    setEditingId(null);
  }

  function startEdit(extra: Extra) {
    setFormData(extra);
    setEditingId(extra.id);
    setIsCreating(false);
  }

  function cancelEdit() {
    setEditingId(null);
    setIsCreating(false);
    setFormData(createInitialFormData());
  }

  async function handleSave() {
    try {
      const url = editingId ? `/api/admin/extras/${editingId}` : '/api/admin/extras';
      const method = editingId ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || copy.saveError);
      }

      await loadExtras();
      cancelEdit();
    } catch (error) {
      console.error('Error saving extra:', error);
      toast({
        title: copy.errorTitle,
        description: error instanceof Error ? error.message : copy.saveError,
        variant: 'destructive',
      });
    }
  }

  function initiateDelete(id: string) {
    setProductToDelete(id);
    setDeleteConfirmOpen(true);
  }

  async function confirmDelete() {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/admin/extras/${productToDelete}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error(copy.deleteError);

      await loadExtras();
      toast({
        title: copy.successTitle,
        description: copy.deletedSuccess,
      });
    } catch (error) {
      console.error('Error deleting extra:', error);
      toast({
        title: copy.errorTitle,
        description: copy.deleteError,
        variant: 'destructive',
      });
    } finally {
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    }
  }

  async function toggleAvailability(extra: Extra) {
    try {
      const response = await fetch(`/api/admin/extras/${extra.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !extra.active }),
      });

      if (!response.ok) throw new Error(copy.updateAvailabilityError);

      await loadExtras();
    } catch (error) {
      console.error('Error updating availability:', error);
      toast({
        title: copy.errorTitle,
        description: copy.updateAvailabilityError,
        variant: 'destructive',
      });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={cn('text-2xl font-bold', theme.textPrimary)}>{copy.title}</h2>
          <p className={cn('text-sm mt-1', theme.textSecondary)}>{copy.subtitle}</p>
        </div>
        <Button
          onClick={startCreate}
          className="bg-green-600 hover:bg-green-700"
          disabled={isCreating || editingId !== null}
        >
          <Plus className="w-4 h-4 mr-2" />
          {copy.newProductButton}
        </Button>
      </div>

      {(isCreating || editingId) && (
        <div className={cn('p-6 rounded-xl border-2 border-blue-500', theme.bgCard)}>
          <h3 className={cn('text-lg font-bold mb-4', theme.textPrimary)}>
            {isCreating ? copy.createTitle : copy.editTitle}
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.slugLabel}</label>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder={copy.slugPlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.pricingTypeLabel}</label>
              <select
                value={formData.pricing_type}
                onChange={(e) => setFormData({ ...formData, pricing_type: e.target.value as 'per_unit' | 'per_kg' })}
                className={cn('w-full p-2 border rounded', theme.bgCard)}
              >
                <option value="per_unit">{copy.pricingPerUnit}</option>
                <option value="per_kg">{copy.pricingPerKg}</option>
              </select>
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.nameNoLabel}</label>
              <Input
                value={formData.name_no}
                onChange={(e) => setFormData({ ...formData, name_no: e.target.value })}
                placeholder={copy.nameNoPlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.nameEnLabel}</label>
              <Input
                value={formData.name_en}
                onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                placeholder={copy.nameEnPlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.descriptionNoLabel}</label>
              <Input
                value={formData.description_no}
                onChange={(e) => setFormData({ ...formData, description_no: e.target.value })}
                placeholder={copy.descriptionNoPlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.descriptionEnLabel}</label>
              <Input
                value={formData.description_en}
                onChange={(e) => setFormData({ ...formData, description_en: e.target.value })}
                placeholder={copy.descriptionEnPlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                {replaceTokens(copy.priceLabel, { currency })}
              </label>
              <Input
                type="number"
                value={formData.price_nok ?? 0}
                onChange={(e) => setFormData({ ...formData, price_nok: parseFloat(e.target.value) || 0 })}
                placeholder={copy.pricePlaceholder}
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.defaultQuantityLabel}</label>
              <Input
                type="number"
                step={formData.pricing_type === 'per_kg' ? '0.1' : '1'}
                min={formData.pricing_type === 'per_kg' ? '0.1' : '1'}
                value={formData.default_quantity ?? (formData.pricing_type === 'per_kg' ? 0.5 : 1)}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    default_quantity:
                      formData.pricing_type === 'per_kg'
                        ? parseFloat(e.target.value) || 0.1
                        : parseInt(e.target.value, 10) || 1,
                  })
                }
                placeholder={
                  formData.pricing_type === 'per_kg'
                    ? copy.defaultQuantityKgPlaceholder
                    : copy.defaultQuantityUnitPlaceholder
                }
              />
            </div>

            <div>
              <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>{copy.stockLabel}</label>
              <Input
                type="number"
                value={formData.stock_quantity ?? ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stock_quantity: e.target.value === '' ? null : parseInt(e.target.value, 10),
                  })
                }
                placeholder={copy.unlimitedPlaceholder}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {copy.saveButton}
            </Button>
            <Button onClick={cancelEdit} variant="outline">
              <X className="w-4 h-4 mr-2" />
              {copy.cancelButton}
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {extras.length === 0 ? (
          <div className="text-center py-12">
            <Package className={cn('w-16 h-16 mx-auto mb-4', theme.iconColor)} />
            <p className={cn('text-lg', theme.textSecondary)}>{copy.empty}</p>
          </div>
        ) : (
          extras.map((extra) => (
            <div
              key={extra.id}
              className={cn('p-4 rounded-xl border', theme.borderSecondary, !extra.active && 'opacity-50')}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className={cn('text-lg font-bold', theme.textPrimary)}>
                      {lang === 'en' ? extra.name_en || extra.name_no : extra.name_no || extra.name_en}
                    </h3>
                    <span className={cn('text-xs px-2 py-1 rounded', theme.bgSecondary)}>{extra.slug}</span>
                    {!extra.active && (
                      <span className="text-xs px-2 py-1 rounded bg-red-100 text-red-700">{copy.inactiveBadge}</span>
                    )}
                  </div>
                  <p className={cn('text-sm mb-2', theme.textSecondary)}>
                    {lang === 'en'
                      ? extra.description_en || extra.description_no
                      : extra.description_no || extra.description_en}
                  </p>
                  <div className="flex gap-4 text-sm">
                    <span className={cn('font-medium', theme.textPrimary)}>
                      {extra.price_nok} {copy.currencySymbol}/{extra.pricing_type === 'per_kg' ? unitKg : unitPiece}
                    </span>
                    {extra.stock_quantity !== null && (
                      <span className={theme.textSecondary}>
                        {replaceTokens(copy.stockValue, { count: extra.stock_quantity })}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => toggleAvailability(extra)} variant="outline" size="sm">
                    {extra.active ? copy.deactivateButton : copy.activateButton}
                  </Button>
                  <Button
                    onClick={() => startEdit(extra)}
                    variant="outline"
                    size="sm"
                    disabled={editingId !== null || isCreating}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={() => initiateDelete(extra.id)}
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title={copy.deleteDialogTitle}
        description={copy.deleteDialogDescription}
        confirmText={copy.deleteDialogConfirm}
        cancelText={copy.deleteDialogCancel}
        onConfirm={confirmDelete}
        variant="destructive"
      />
    </div>
  );
}
