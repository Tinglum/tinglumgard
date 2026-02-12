'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, AlertTriangle, TrendingDown, TrendingUp, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface InventoryData {
  max_kg: number;
  allocated_kg: number;
  remaining_kg: number;
  utilization_rate: number;
  box_8kg_count: number;
  box_12kg_count: number;
  box_counts?: Record<string, number>;
  total_orders: number;
}

export function InventoryManagement() {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const copy = t.inventoryManagement;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [maxKg, setMaxKg] = useState(0);

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/inventory?action=status');
      const data = await response.json();
      setInventory(data.inventory);
      setMaxKg(data.inventory.max_kg);
    } catch (error) {
      console.error('Error loading inventory:', error);
    } finally {
      setLoading(false);
    }
  }

  async function updateMaxKg() {
    if (!maxKg || maxKg < 0) {
      toast({
        title: copy.invalidValueTitle,
        description: copy.invalidValueDescription,
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/admin/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'update_max', max_kg: maxKg }),
      });

      if (response.ok) {
        await loadInventory();
        toast({
          title: copy.updatedTitle,
          description: copy.updatedDescription,
        });
      } else {
        toast({
          title: copy.errorTitle,
          description: copy.updateErrorDescription,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error updating max kg:', error);
      toast({
        title: copy.errorTitle,
        description: copy.updateErrorDescription,
        variant: 'destructive',
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

  if (!inventory) {
    return (
      <Card className="p-6 text-center">
        <p className="text-gray-600">{copy.loadError}</p>
        <Button onClick={loadInventory} className="mt-4">{copy.retryButton}</Button>
      </Card>
    );
  }

  const utilizationColor =
    inventory.utilization_rate > 90 ? 'text-red-600 bg-red-50 border-red-200' :
    inventory.utilization_rate > 75 ? 'text-amber-600 bg-amber-50 border-amber-200' :
    'text-green-600 bg-green-50 border-green-200';

  const remainingColor =
    inventory.remaining_kg < 100 ? 'text-red-600' :
    inventory.remaining_kg < 500 ? 'text-amber-600' :
    'text-green-600';
  const boxCounts = inventory.box_counts || {
    '8': inventory.box_8kg_count || 0,
    '12': inventory.box_12kg_count || 0,
  };
  const sortedBoxEntries = Object.entries(boxCounts).sort((a, b) => Number(a[0]) - Number(b[0]));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="text-gray-600">{copy.subtitle}</p>
        </div>
        <Button onClick={loadInventory} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          {copy.refreshButton}
        </Button>
      </div>

      {inventory.utilization_rate > 75 && (
        <Card className={cn('p-4 border-2', utilizationColor)}>
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-6 h-6" />
            <div>
              <p className="font-bold">
                {inventory.utilization_rate > 90 ? copy.criticalStockTitle : copy.lowStockTitle}
              </p>
              <p className="text-sm">
                {inventory.utilization_rate > 90 ? copy.criticalStockDescription : copy.lowStockDescription}
              </p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <Package className="w-8 h-8 text-blue-600" />
            <p className="text-sm text-blue-700 font-medium">{copy.maxCapacityLabel}</p>
          </div>
          <p className="text-4xl font-bold text-blue-900">{inventory.max_kg} {t.common.kg}</p>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-8 h-8 text-purple-600" />
            <p className="text-sm text-purple-700 font-medium">{copy.allocatedLabel}</p>
          </div>
          <p className="text-4xl font-bold text-purple-900">{inventory.allocated_kg} {t.common.kg}</p>
          <p className="text-sm text-purple-600 mt-1">{copy.ordersCount.replace('{count}', String(inventory.total_orders))}</p>
        </Card>

        <Card className={cn('p-6 bg-gradient-to-br border-2',
          inventory.remaining_kg < 100 ? 'from-red-50 to-red-100 border-red-200' :
          inventory.remaining_kg < 500 ? 'from-amber-50 to-amber-100 border-amber-200' :
          'from-green-50 to-green-100 border-green-200'
        )}>
          <div className="flex items-center gap-3 mb-2">
            <TrendingDown className={cn('w-8 h-8', remainingColor)} />
            <p className={cn('text-sm font-medium', remainingColor)}>{copy.remainingLabel}</p>
          </div>
          <p className={cn('text-4xl font-bold', remainingColor)}>{inventory.remaining_kg} {t.common.kg}</p>
          <p className={cn('text-sm mt-1', remainingColor)}>
            {copy.utilizationValue.replace('{value}', inventory.utilization_rate.toFixed(1))}
          </p>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">{copy.utilizationTitle}</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span>{copy.utilizationLabel}</span>
            <span className="font-bold">{inventory.utilization_rate.toFixed(1)}%</span>
          </div>
          <div className="h-8 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full transition-all duration-500',
                inventory.utilization_rate > 90 ? 'bg-red-500' :
                inventory.utilization_rate > 75 ? 'bg-amber-500' :
                'bg-green-500'
              )}
              style={{ width: `${Math.min(inventory.utilization_rate, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-600">
            <span>0 {t.common.kg}</span>
            <span>{inventory.max_kg} {t.common.kg}</span>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">{copy.boxBreakdownTitle}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {sortedBoxEntries.map(([size, count]) => {
            const sizeNum = Number(size);
            return (
              <div key={size} className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700 mb-1">{size} kg</p>
                <p className="text-3xl font-bold text-blue-900">{count}</p>
                <p className="text-sm text-blue-600 mt-1">
                  {copy.kgTotal.replace('{count}', String(count * sizeNum))}
                </p>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4">{copy.updateCapacityTitle}</h3>
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>{copy.maxKgLabel}</Label>
            <Input
              type="number"
              value={maxKg}
              onChange={(e) => setMaxKg(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="100"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={updateMaxKg}
              disabled={saving || maxKg === inventory.max_kg}
              className="bg-[#2C1810] hover:bg-[#2C1810]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? copy.savingButton : copy.updateButton}
            </Button>
          </div>
        </div>
        <p className="text-sm text-gray-600 mt-2">{copy.capacityHint}</p>
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">{copy.historyTitle}</h3>
        <p className="text-sm text-gray-600">{copy.historyPlaceholder}</p>
      </Card>
    </div>
  );
}
