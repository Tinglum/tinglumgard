'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { X, Package, Truck, Snowflake, Save, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ExtraProductsSelector } from '@/components/ExtraProductsSelector';

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
  const [pricing, setPricing] = useState<any>(null);

  // Extras management
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    if (isOpen) {
      setBoxSize(order.box_size);
      setRibbeChoice(order.ribbe_choice);
      setDeliveryType(order.delivery_type);
      setFreshDelivery(order.fresh_delivery);

      // Initialize selected quantities from existing extras
      if (order.extra_products) {
        const quantities: Record<string, number> = {};
        order.extra_products.forEach((ep: any) => {
          quantities[ep.slug] = ep.quantity;
        });
        setSelectedQuantities(quantities);
      } else {
        setSelectedQuantities({});
      }
    }
  }, [isOpen, order]);

  useEffect(() => {
    if (deliveryType !== 'pickup_farm' && freshDelivery) {
      setFreshDelivery(false);
    }
  }, [deliveryType, freshDelivery]);

  useEffect(() => {
    const fetchPricing = async () => {
      try {
        const response = await fetch('/api/config/pricing');
        const data = await response.json();
        setPricing(data || null);
      } catch (error) {
        console.error('Failed to fetch pricing:', error);
      }
    };
    fetchPricing();
  }, []);

  // Load available extras catalog
  useEffect(() => {
    if (isOpen) {
      const loadExtras = async () => {
        setExtrasLoading(true);
        try {
          const response = await fetch('/api/extras');
          const data = await response.json();
          if (response.ok) {
            setAvailableExtras(data.extras || []);
          }
        } catch (err) {
          console.error('Failed to load extras:', err);
        } finally {
          setExtrasLoading(false);
        }
      };
      loadExtras();
    }
  }, [isOpen]);

  const isFreshAllowed = deliveryType === 'pickup_farm';
  const freshFee = pricing?.fresh_delivery_fee;
  const boxPrice8 = pricing?.box_8kg_price;
  const boxPrice12 = pricing?.box_12kg_price;
  const pickupE6Fee = pricing?.delivery_fee_pickup_e6 ?? pricing?.delivery_fee_e6;
  const trondheimFee = pricing?.delivery_fee_trondheim;

  // Check if extras have changed from saved state
  const hasExtrasChanges = useMemo(() => {
    const savedExtras = order?.extra_products || [];
    const selectedEntries = Object.entries(selectedQuantities).filter(([_, qty]) => qty > 0);

    // Different count?
    if (savedExtras.length !== selectedEntries.length) return true;

    // Different items or quantities?
    for (const [slug, qty] of selectedEntries) {
      const saved = savedExtras.find((e: any) => e.slug === slug);
      if (!saved || saved.quantity !== qty) return true;
    }

    return false;
  }, [selectedQuantities, order]);

  const hasChanges =
    boxSize !== order.box_size ||
    ribbeChoice !== order.ribbe_choice ||
    deliveryType !== order.delivery_type ||
    freshDelivery !== order.fresh_delivery ||
    hasExtrasChanges;

  function handleQuantityChange(slug: string, quantity: number) {
    setSelectedQuantities(prev => {
      // If quantity is 0 or less, remove the item entirely (deselect)
      if (quantity <= 0) {
        const newQuantities = { ...prev };
        delete newQuantities[slug];
        return newQuantities;
      }

      return {
        ...prev,
        [slug]: quantity
      };
    });
  }

  function getSelectedExtras() {
    return Object.entries(selectedQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([slug, quantity]) => ({ slug, quantity }));
  }

  function handleSaveClick() {
    if (hasChanges) {
      setShowConfirmation(true);
    }
  }

  async function confirmSave() {
    setShowConfirmation(false);
    setSaving(true);
    try {
      // Save order modifications
      await onSave({
        box_size: boxSize,
        ribbe_choice: ribbeChoice,
        delivery_type: deliveryType,
        fresh_delivery: freshDelivery,
      });

      // Save extras if they've changed
      if (hasExtrasChanges) {
        const extrasResponse = await fetch(`/api/orders/${order.id}/add-extras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extras: getSelectedExtras() }),
        });

        if (!extrasResponse.ok) {
          const extrasData = await extrasResponse.json().catch(() => null);
          throw new Error(extrasData?.error || 'Kunne ikke oppdatere ekstra produkter');
        }
      }

      toast({
        title: 'Endringer lagret',
        description: 'Ordren din har blitt oppdatert'
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save modifications:', error);
      toast({
        title: 'Feil',
        description: error.message || 'Kunne ikke lagre endringer. Prøv igjen.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white text-gray-900 border border-gray-200 shadow-2xl">
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
                <p className="text-sm text-gray-700">
                  {boxPrice8 ? `kr ${boxPrice8.toLocaleString('nb-NO')}` : 'Pris fra admin-innstillinger'}
                </p>
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
                <p className="text-sm text-gray-700">
                  {boxPrice12 ? `kr ${boxPrice12.toLocaleString('nb-NO')}` : 'Pris fra admin-innstillinger'}
                </p>
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
              Hentemåte
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDeliveryType('pickup_farm')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'pickup_farm'
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Henting på gården</p>
                <p className="text-sm text-gray-700">Ingen ekstra kostnad</p>
              </button>
              <button
                onClick={() => setDeliveryType('pickup_e6')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'pickup_e6'
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Henting langs E6</p>
                <p className="text-sm text-gray-700">
                  {pickupE6Fee ? `kr ${pickupE6Fee.toLocaleString('nb-NO')} · Hentedag avtales` : 'Hentedag avtales'}
                </p>
              </button>
              <button
                onClick={() => setDeliveryType('delivery_trondheim')}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  deliveryType === 'delivery_trondheim'
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900'
                )}
              >
                <p className="font-semibold text-gray-900">Henting i Trondheim</p>
                <p className="text-sm text-gray-700">
                  {trondheimFee ? `kr ${trondheimFee.toLocaleString('nb-NO')} · Hentedag den uken` : 'Hentedag den uken'}
                </p>
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
                <p className="font-semibold text-gray-900">Frossen henting</p>
                <p className="text-sm text-gray-700">Standard henting</p>
              </button>
              <button
                onClick={() => {
                  if (isFreshAllowed) {
                    setFreshDelivery(true);
                  }
                }}
                disabled={!isFreshAllowed}
                className={cn(
                  'p-4 rounded-xl border-2 transition-all text-left',
                  freshDelivery
                    ? 'border-[#2C1810] bg-[#2C1810]/10 text-gray-900'
                    : 'border-gray-300 hover:border-gray-400 text-gray-900',
                  !isFreshAllowed && 'opacity-50 cursor-not-allowed'
                )}
              >
                <p className="font-semibold text-gray-900">Fersk henting</p>
                <p className="text-sm text-gray-700">
                  {freshFee ? `kr ${freshFee.toLocaleString('nb-NO')} · Henting på gården uke 50/51` : 'Henting på gården uke 50/51'}
                </p>
                {!isFreshAllowed && (
                  <p className="text-xs text-gray-600 mt-1">Kun tilgjengelig ved henting på gården</p>
                )}
              </button>
            </div>
          </div>

          {/* Extras Section */}
          {!extrasLoading && availableExtras.length > 0 && (
            <div>
              <Label className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <ShoppingCart className="w-5 h-5" />
                Legg til ekstra produkter (valgfritt)
              </Label>

              <ExtraProductsSelector
                availableExtras={availableExtras}
                selectedQuantities={selectedQuantities}
                onQuantityChange={handleQuantityChange}
                disabled={saving}
                translations={{
                  quantity: 'Antall',
                  kg: 'kg',
                  stk: 'stk'
                }}
              />

              {hasExtrasChanges && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">
                    ⚠️ Du har endret ekstra produkter. Endringene vil bli lagret når du klikker &quot;Lagre endringer&quot;.
                  </p>
                </div>
              )}
            </div>
          )}

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
