'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Package, Truck, Snowflake, Save } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface OrderModificationModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (modifications: any) => Promise<void>;
}

export function OrderModificationModal({ order, isOpen, onClose, onSave }: OrderModificationModalProps) {
  const { toast } = useToast();
  const [boxSize, setBoxSize] = useState(order.box_size);
  const [ribbeChoice, setRibbeChoice] = useState(order.ribbe_choice);
  const [deliveryType, setDeliveryType] = useState(order.delivery_type);
  const [freshDelivery, setFreshDelivery] = useState(order.fresh_delivery);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setBoxSize(order.box_size);
      setRibbeChoice(order.ribbe_choice);
      setDeliveryType(order.delivery_type);
      setFreshDelivery(order.fresh_delivery);
    }
  }, [isOpen, order]);

  const hasChanges =
    boxSize !== order.box_size ||
    ribbeChoice !== order.ribbe_choice ||
    deliveryType !== order.delivery_type ||
    freshDelivery !== order.fresh_delivery;

  function handleSaveClick() {
    if (hasChanges) {
      setShowConfirmation(true);
    }
  }

  async function confirmSave() {
    setShowConfirmation(false);
    setSaving(true);
    try {
      await onSave({
        box_size: boxSize,
        ribbe_choice: ribbeChoice,
        delivery_type: deliveryType,
        fresh_delivery: freshDelivery,
      });
      toast({
        title: 'Endringer lagret',
        description: 'Ordren din har blitt oppdatert'
      });
      onClose();
    } catch (error) {
      console.error('Failed to save modifications:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre endringer. Prøv igjen.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 bg-white text-gray-900 border border-gray-200 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Endre bestilling</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Box Size */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Package className="w-5 h-5" />
              Boksstørrelse
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setBoxSize(8)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  boxSize === 8
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="text-2xl font-bold text-gray-900">8 kg</p>
                <p className="text-sm text-gray-700">Kr 6490</p>
              </button>
              <button
                onClick={() => setBoxSize(12)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  boxSize === 12
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="text-2xl font-bold text-gray-900">12 kg</p>
                <p className="text-sm text-gray-700">Kr 8990</p>
              </button>
            </div>
          </div>

          {/* Ribbe Choice */}
          <div>
            <Label className="text-lg font-semibold mb-3 text-gray-900">Ribbevalg</Label>
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
                      ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                      : 'border-gray-300 hover:border-gray-400 text-gray-900'
                  )}
                >
                  <p className="font-semibold text-gray-900">{option.label}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Delivery Type */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Truck className="w-5 h-5" />
              Leveringsmåte
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeliveryType('pickup')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'pickup'
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Henting på gården</p>
                <p className="text-sm text-gray-700">Gratis</p>
              </button>
              <button
                onClick={() => setDeliveryType('delivery')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'delivery'
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Levering</p>
                <p className="text-sm text-gray-700">Kr 500</p>
              </button>
            </div>
          </div>

          {/* Fresh Delivery */}
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Snowflake className="w-5 h-5" />
              Type levering
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFreshDelivery(false)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  !freshDelivery
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Frossen levering</p>
                <p className="text-sm text-gray-700">Standard</p>
              </button>
              <button
                onClick={() => setFreshDelivery(true)}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  freshDelivery
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Fersk levering</p>
                <p className="text-sm text-gray-700">Kr 200 ekstra</p>
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
              onClick={handleSaveClick}
              disabled={!hasChanges || saving}
              className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Lagrer...' : 'Lagre endringer'}
            </Button>
          </div>

          {!hasChanges && (
            <p className="text-sm text-gray-600 text-center">Ingen endringer gjort</p>
          )}
        </div>
      </Card>

      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">Bekreft endringer</h3>
            <p className="text-gray-600 mb-4">
              Er du sikker på at du vil endre ordren? Dette kan påvirke prisen.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirmation(false)}
                className="flex-1"
              >
                Avbryt
              </Button>
              <Button
                onClick={confirmSave}
                className="flex-1 bg-[#2C1810] hover:bg-[#2C1810]/90"
              >
                Bekreft
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
