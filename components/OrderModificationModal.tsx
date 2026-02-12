'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useLanguage } from '@/contexts/LanguageContext';
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
  const { lang, t } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const copy = t.orderModificationModal;

  const [boxSize, setBoxSize] = useState(order.box_size);
  const [ribbeChoice, setRibbeChoice] = useState(order.ribbe_choice);
  const [deliveryType, setDeliveryType] = useState(order.delivery_type);
  const [freshDelivery, setFreshDelivery] = useState(order.fresh_delivery);
  const [saving, setSaving] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pricing, setPricing] = useState<any>(null);
  const [availableExtras, setAvailableExtras] = useState<any[]>([]);
  const [extrasLoading, setExtrasLoading] = useState(true);
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const isMangalitsaOrder = Boolean(order?.is_mangalitsa || order?.mangalitsa_preset_id || order?.display_box_name_no || order?.display_box_name_en);

  useEffect(() => {
    if (isOpen) {
      setBoxSize(order.box_size);
      setRibbeChoice(order.ribbe_choice);
      setDeliveryType(order.delivery_type);
      setFreshDelivery(order.fresh_delivery);

      if (order.extra_products) {
        const quantities: Record<string, number> = {};
        order.extra_products.forEach((extraProduct: any) => {
          quantities[extraProduct.slug] = extraProduct.quantity;
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

  useEffect(() => {
    if (!isOpen) return;

    const loadExtras = async () => {
      setExtrasLoading(true);
      try {
        const response = await fetch('/api/extras');
        const data = await response.json();
        if (response.ok) {
          setAvailableExtras(data.extras || []);
        }
      } catch (error) {
        console.error('Failed to load extras:', error);
      } finally {
        setExtrasLoading(false);
      }
    };

    loadExtras();
  }, [isOpen]);

  const isFreshAllowed = deliveryType === 'pickup_farm';
  const freshFee = pricing?.fresh_delivery_fee;
  const boxPrice8 = pricing?.box_8kg_price;
  const boxPrice12 = pricing?.box_12kg_price;
  const pickupE6Fee = pricing?.delivery_fee_pickup_e6 ?? pricing?.delivery_fee_e6;
  const trondheimFee = pricing?.delivery_fee_trondheim;

  const hasExtrasChanges = useMemo(() => {
    const savedExtras = order?.extra_products || [];
    const selectedEntries = Object.entries(selectedQuantities).filter(([_, qty]) => qty > 0);

    if (savedExtras.length !== selectedEntries.length) return true;

    for (const [slug, qty] of selectedEntries) {
      const saved = savedExtras.find((savedExtra: any) => savedExtra.slug === slug);
      if (!saved || saved.quantity !== qty) return true;
    }

    return false;
  }, [selectedQuantities, order]);

  const hasChanges =
    (!isMangalitsaOrder && boxSize !== order.box_size) ||
    ribbeChoice !== order.ribbe_choice ||
    deliveryType !== order.delivery_type ||
    freshDelivery !== order.fresh_delivery ||
    hasExtrasChanges;

  function handleQuantityChange(slug: string, quantity: number) {
    setSelectedQuantities((prev) => {
      if (quantity <= 0) {
        const next = { ...prev };
        delete next[slug];
        return next;
      }

      return {
        ...prev,
        [slug]: quantity,
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
      const payload: Record<string, unknown> = {
        ribbe_choice: ribbeChoice,
        delivery_type: deliveryType,
        fresh_delivery: freshDelivery,
      };
      if (!isMangalitsaOrder) {
        payload.box_size = boxSize;
      }

      await onSave(payload);

      if (hasExtrasChanges) {
        const extrasResponse = await fetch(`/api/orders/${order.id}/add-extras`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ extras: getSelectedExtras() }),
        });

        if (!extrasResponse.ok) {
          const extrasData = await extrasResponse.json().catch(() => null);
          throw new Error(extrasData?.error || copy.extrasError);
        }
      }

      toast({
        title: copy.saveSuccessTitle,
        description: copy.saveSuccessDescription,
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save modifications:', error);
      toast({
        title: copy.saveErrorTitle,
        description: error.message || copy.saveErrorDescription,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!isOpen) return null;

  const ribOptions = [
    { value: 'tynnribbe', label: copy.ribOptionTynnribbe },
    { value: 'familieribbe', label: copy.ribOptionFamilieribbe },
    { value: 'porchetta', label: copy.ribOptionPorchetta },
    { value: 'butchers_choice', label: copy.ribOptionButchersChoice },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <Card className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-white text-gray-900 border border-gray-200 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{copy.title}</h2>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-700">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-6">
          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Package className="w-5 h-5" />
              {copy.boxSize}
            </Label>
            {isMangalitsaOrder ? (
              <div className="p-4 rounded-xl border border-gray-300 bg-gray-50">
                <p className="font-semibold text-gray-900">
                  {lang === 'no' ? order.display_box_name_no : order.display_box_name_en}
                  {(order.box_size || order.effective_box_size) ? ` (${order.box_size || order.effective_box_size} kg)` : ''}
                </p>
                <p className="text-sm text-gray-600 mt-1">Mangalitsa-boks er laast etter reservasjon.</p>
              </div>
            ) : (
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
                    {boxPrice8 ? `${t.common.currency} ${boxPrice8.toLocaleString(locale)}` : copy.priceFromAdmin}
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
                    {boxPrice12 ? `${t.common.currency} ${boxPrice12.toLocaleString(locale)}` : copy.priceFromAdmin}
                  </p>
                </button>
              </div>
            )}
          </div>

          <div>
            <Label className="text-lg font-semibold mb-3 text-gray-900">{copy.ribChoice}</Label>
            <div className="grid grid-cols-2 gap-4">
              {ribOptions.map((option) => (
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

          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Truck className="w-5 h-5" />
              {copy.deliveryMethod}
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
                <p className="font-semibold text-gray-900">{copy.pickupFarm}</p>
                <p className="text-sm text-gray-700">{copy.pickupFarmFee}</p>
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
                <p className="font-semibold text-gray-900">{copy.pickupE6}</p>
                <p className="text-sm text-gray-700">
                  {pickupE6Fee ? `${t.common.currency} ${pickupE6Fee.toLocaleString(locale)} - ${copy.pickupE6Note}` : copy.pickupE6Note}
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
                <p className="font-semibold text-gray-900">{copy.trondheimPickup}</p>
                <p className="text-sm text-gray-700">
                  {trondheimFee
                    ? `${t.common.currency} ${trondheimFee.toLocaleString(locale)} - ${copy.trondheimNote}`
                    : copy.trondheimNote}
                </p>
              </button>
            </div>
          </div>

          <div>
            <Label className="text-lg font-semibold mb-3 flex items-center gap-2 text-gray-900">
              <Snowflake className="w-5 h-5" />
              {copy.deliveryType}
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
                <p className="font-semibold text-gray-900">{copy.frozenPickup}</p>
                <p className="text-sm text-gray-700">{copy.frozenStandard}</p>
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
                <p className="font-semibold text-gray-900">{copy.freshPickup}</p>
                <p className="text-sm text-gray-700">
                  {freshFee ? `${t.common.currency} ${freshFee.toLocaleString(locale)} - ${copy.freshPickupNote}` : copy.freshPickupNote}
                </p>
                {!isFreshAllowed && <p className="text-xs text-gray-600 mt-1">{copy.freshOnlyFarm}</p>}
              </button>
            </div>
          </div>

          {!extrasLoading && availableExtras.length > 0 && (
            <div>
              <Label className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <ShoppingCart className="w-5 h-5" />
                {copy.extrasTitle}
              </Label>

              <ExtraProductsSelector
                availableExtras={availableExtras}
                selectedQuantities={selectedQuantities}
                onQuantityChange={handleQuantityChange}
                disabled={saving}
                translations={{
                  quantity: copy.quantity,
                  kg: 'kg',
                  stk: copy.unitPieces,
                }}
              />

              {hasExtrasChanges && (
                <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-sm text-amber-800">{copy.extrasWarning}</p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-4 border-t">
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={saving}>
              {copy.cancel}
            </Button>
            <Button
              onClick={handleSaveClick}
              disabled={!hasChanges || saving}
              className="flex-1 bg-[#2C1810] text-white hover:bg-[#2C1810]/90 disabled:bg-[#2C1810]/40 disabled:text-white/70"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? copy.saving : copy.saveChanges}
            </Button>
          </div>

          {!hasChanges && <p className="text-sm text-gray-600 text-center">{copy.noChanges}</p>}
        </div>
      </Card>

      {showConfirmation && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-lg">
          <Card className="p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-2">{copy.confirmChanges}</h3>
            <p className="text-gray-600 mb-4">{copy.confirmDescription}</p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowConfirmation(false)} className="flex-1">
                {copy.cancel}
              </Button>
              <Button
                onClick={confirmSave}
                className="flex-1 bg-[#2C1810] text-white hover:bg-[#2C1810]/90 disabled:bg-[#2C1810]/40 disabled:text-white/70"
              >
                {copy.confirm}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
