'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Package, Truck, Snowflake, Save } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrderModificationModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (modifications: any) => Promise<void>;
}

export function OrderModificationModal({ order, isOpen, onClose, onSave }: OrderModificationModalProps) {
  const [boxSize, setBoxSize] = useState(order.box_size);
  const [ribbeChoice, setRibbeChoice] = useState(order.ribbe_choice);
  const [deliveryType, setDeliveryType] = useState(order.delivery_type);
  const [freshDelivery, setFreshDelivery] = useState(order.fresh_delivery);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBoxSize(order.box_size);
      setRibbeChoice(order.ribbe_choice);
      setDeliveryType(order.delivery_type);
      setFreshDelivery(order.fresh_delivery);
    }
  }, [isOpen, order]);

  if (!isOpen) return null;

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        box_size: boxSize,
        ribbe_choice: ribbeChoice,
        delivery_type: deliveryType,
        fresh_delivery: freshDelivery,
      });
      onClose();
    } catch (error) {
      console.error('Failed to save modifications:', error);
      alert('Kunne ikke lagre endringer. Prøv igjen.');
    } finally {
      setSaving(false);
    }
  }

  const hasChanges =
    boxSize !== order.box_size ||
    ribbeChoice !== order.ribbe_choice ||
    deliveryType !== order.delivery_type ||
    freshDelivery !== order.fresh_delivery;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Endre bestilling</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Box Size */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Boksstørrelse
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setBoxSize(8)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all',
                  boxSize === 8
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="text-2xl font-bold">8 kg</p>
                <p className="text-sm text-gray-600">Kr 6490</p>
              </button>
              <button
                onClick={() => setBoxSize(12)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all',
                  boxSize === 12
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="text-2xl font-bold">12 kg</p>
                <p className="text-sm text-gray-600">Kr 8990</p>
              </button>
            </div>
          </div>

          {/* Ribbe Choice */}
          <div>
            <Label className="text-lg font-semibold mb-3">Ribbevalg</Label>
            <div className="grid grid-cols-2 gap-4">
              {[
                { value: 'tynnribbe', label: 'Tynnribbe' },
                { value: 'familieribbe', label: 'Familieribbe' },
                { value: 'porchetta', label: 'Porchetta' },
                { value: 'butchers_choice', label: 'Slakterens valg' },
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setRibbeChoice(option.value)}
                  className={cn(
                    'p-4 rounded-xl border-2 transition-all text-left',
                    ribbeChoice === option.value
                      ? 'border-[#2C1810] bg-[#2C1810]/5'
                      : 'border-gray-200 hover:border-gray-300'
                  )}
                >
                  <p className="font-semibold">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Type */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Truck className="w-5 h-5" />
              Leveringsmåte
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeliveryType('pickup')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'pickup'
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-semibold">Henting på gården</p>
                <p className="text-sm text-gray-600">Gratis</p>
              </button>
              <button
                onClick={() => setDeliveryType('delivery')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'delivery'
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-semibold">Levering</p>
                <p className="text-sm text-gray-600">Kr 500</p>
              </button>
            </div>
          </div>

          {/* Fresh Delivery */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Snowflake className="w-5 h-5" />
              Type levering
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFreshDelivery(false)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  !freshDelivery
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-semibold">Frossen levering</p>
                <p className="text-sm text-gray-600">Standard</p>
              </button>
              <button
                onClick={() => setFreshDelivery(true)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  freshDelivery
                    ? 'border-[#2C1810] bg-[#2C1810]/5'
                    : 'border-gray-200 hover:border-gray-300'
                )}
              >
                <p className="font-semibold">Fersk levering</p>
                <p className="text-sm text-gray-600">Kr 200 ekstra</p>
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={saving}
            >
              Avbryt
            </Button>
            <Button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </Button>
          </div>

          {!hasChanges && (
            <p className="text-sm text-gray-500 text-center">Ingen endringer gjort</p>
          )}
        </div>
      </Card>
    </div>
  );
}
