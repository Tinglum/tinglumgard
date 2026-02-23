'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import { cn } from '@/lib/utils';
import { Calendar, Save, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface SeasonConfig {
  cutoff_year: number;
  cutoff_week: number;
  delivery_week_start: number;
  delivery_week_end: number;
  order_start_date: string | null;
  order_end_date: string | null;
  is_accepting_orders: boolean;
}

export function SeasonSettings() {
  const { getThemeClasses } = useTheme();
  const theme = getThemeClasses();
  const { toast } = useToast();
  const { t } = useLanguage();
  const copy = (t as any).admin.seasonSettings;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SeasonConfig>({
    cutoff_year: 2026,
    cutoff_week: 46,
    delivery_week_start: 47,
    delivery_week_end: 48,
    order_start_date: null,
    order_end_date: null,
    is_accepting_orders: true,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const response = await fetch('/api/admin/config');
      const data = await response.json();

      if (data.config) {
        setConfig({
          cutoff_year: parseInt(data.config.cutoff_year) || 2026,
          cutoff_week: parseInt(data.config.cutoff_week) || 46,
          delivery_week_start: parseInt(data.config.delivery_week_start) || 47,
          delivery_week_end: parseInt(data.config.delivery_week_end) || 48,
          order_start_date: data.config.order_start_date || null,
          order_end_date: data.config.order_end_date || null,
          is_accepting_orders: data.config.is_accepting_orders ?? true,
        });
      }
    } catch (error) {
      console.error('Failed to load config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutoff_year: config.cutoff_year,
          cutoff_week: config.cutoff_week,
          delivery_week_start: config.delivery_week_start,
          delivery_week_end: config.delivery_week_end,
          order_start_date: config.order_start_date,
          order_end_date: config.order_end_date,
          is_accepting_orders: config.is_accepting_orders,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      toast({
        title: t.common.save,
        description: copy.title
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: t.common.error,
        description: copy.title,
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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
      <div>
        <h2 className={cn('text-2xl font-bold', theme.textPrimary)}>
          {copy.title}
        </h2>
        <p className={cn('text-sm mt-1', theme.textSecondary)}>
          {copy.subtitle}
        </p>
      </div>

      <div className={cn('p-6 rounded-xl border', theme.borderSecondary, theme.bgCard)}>
        <div className="grid grid-cols-2 gap-6">
          {/* Cutoff Settings */}
          <div className="col-span-2">
            <h3 className={cn('text-lg font-semibold mb-4 flex items-center gap-2', theme.textPrimary)}>
              <Calendar className="w-5 h-5" />
              {copy.sectionCutoffTitle}
            </h3>
            <div className={cn('p-4 rounded-xl bg-amber-50 border border-amber-200 mb-4')}>
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-amber-900">
                    {copy.cutoffInfoTitle}
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    {copy.cutoffInfoDescription.replace('{week}', String(config.cutoff_week)).replace('{year}', String(config.cutoff_year))}
                  </p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelYear}
                </label>
                <Input
                  type="number"
                  value={config.cutoff_year}
                  onChange={(e) => setConfig({ ...config, cutoff_year: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelWeekNumber}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={config.cutoff_week}
                  onChange={(e) => setConfig({ ...config, cutoff_week: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </div>

          {/* Delivery Window */}
          <div className="col-span-2">
            <h3 className={cn('text-lg font-semibold mb-4', theme.textPrimary)}>
              {copy.sectionDeliveryWindow}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelStartWeek}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={config.delivery_week_start}
                  onChange={(e) => setConfig({ ...config, delivery_week_start: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelEndWeek}
                </label>
                <Input
                  type="number"
                  min="1"
                  max="52"
                  value={config.delivery_week_end}
                  onChange={(e) => setConfig({ ...config, delivery_week_end: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <p className={cn('text-xs mt-2', theme.textMuted)}>
              {copy.deliveryWindowPreview
                .replace('{startWeek}', String(config.delivery_week_start))
                .replace('{endWeek}', String(config.delivery_week_end))
                .replace('{year}', String(config.cutoff_year))}
            </p>
          </div>

          {/* Order Period */}
          <div className="col-span-2">
            <h3 className={cn('text-lg font-semibold mb-4', theme.textPrimary)}>
              {copy.sectionOrderPeriod}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelStartDate}
                </label>
                <Input
                  type="date"
                  value={config.order_start_date || ''}
                  onChange={(e) => setConfig({ ...config, order_start_date: e.target.value || null })}
                />
              </div>
              <div>
                <label className={cn('text-sm font-medium mb-1 block', theme.textPrimary)}>
                  {copy.labelEndDate}
                </label>
                <Input
                  type="date"
                  value={config.order_end_date || ''}
                  onChange={(e) => setConfig({ ...config, order_end_date: e.target.value || null })}
                />
              </div>
            </div>
          </div>

          {/* Accepting Orders Toggle */}
          <div className="col-span-2">
            <div className="flex items-center justify-between p-4 rounded-xl border border-neutral-200">
              <div>
                <p className={cn('font-medium', theme.textPrimary)}>
                  {copy.toggleAcceptOrders}
                </p>
                <p className={cn('text-sm', theme.textMuted)}>
                  {copy.toggleAcceptOrdersDescription}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.is_accepting_orders}
                  onChange={(e) => setConfig({ ...config, is_accepting_orders: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex gap-4 mt-6">
          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                {t.common.processing}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {t.common.save}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
