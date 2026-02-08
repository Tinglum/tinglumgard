'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Package, Plus, Trash2, Save, Edit3, Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface BoxItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  description?: string;
}

interface BoxConfig {
  box_size: number;
  price: number;
  items: BoxItem[];
  description: string;
}

export function BoxConfiguration() {
  const { toast } = useToast();
  const [boxes, setBoxes] = useState<BoxConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingBox, setEditingBox] = useState<number | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);

  // Form state for new items
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemDescription, setNewItemDescription] = useState('');

  useEffect(() => {
    loadBoxConfigs();
  }, []);

  async function loadBoxConfigs() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/box-config');
      const data = await response.json();
      setBoxes(data.boxes || []);
    } catch (error) {
      console.error('Error loading box configs:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveBoxConfig(boxSize: number) {
    setSaving(true);
    try {
      const box = boxes.find(b => b.box_size === boxSize);
      if (!box) return;

      const response = await fetch('/api/admin/box-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          box_size: boxSize,
          price: box.price,
          items: box.items,
          description: box.description,
        }),
      });

      if (response.ok) {
        await loadBoxConfigs();
        setEditingBox(null);
        toast({
          title: 'Lagret',
          description: 'Bokskonfigurasjon ble lagret'
        });
      } else {
        toast({
          title: 'Feil',
          description: 'Kunne ikke lagre bokskonfigurasjon',
          variant: 'destructive'
        });
      }
    } catch (error) {
      console.error('Error saving box config:', error);
      toast({
        title: 'Feil',
        description: 'Kunne ikke lagre bokskonfigurasjon',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  }

  function updateBoxPrice(boxSize: number, price: number) {
    setBoxes(boxes.map(box =>
      box.box_size === boxSize ? { ...box, price } : box
    ));
  }

  function updateBoxDescription(boxSize: number, description: string) {
    setBoxes(boxes.map(box =>
      box.box_size === boxSize ? { ...box, description } : box
    ));
  }

  function addItemToBox(boxSize: number) {
    if (!newItemName || !newItemQuantity) {
      toast({
        title: 'Manglende informasjon',
        description: 'Vennligst fyll ut navn og mengde',
        variant: 'destructive'
      });
      return;
    }

    const newItem: BoxItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newItemName,
      quantity: parseFloat(newItemQuantity),
      unit: newItemUnit,
      description: newItemDescription,
    };

    setBoxes(boxes.map(box =>
      box.box_size === boxSize
        ? { ...box, items: [...box.items, newItem] }
        : box
    ));

    // Reset form
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemUnit('kg');
    setNewItemDescription('');
  }

  function removeItemFromBox(boxSize: number, itemId: string) {
    setBoxes(boxes.map(box =>
      box.box_size === boxSize
        ? { ...box, items: box.items.filter(item => item.id !== itemId) }
        : box
    ));
  }

  function updateItemInBox(boxSize: number, itemId: string, updates: Partial<BoxItem>) {
    setBoxes(boxes.map(box =>
      box.box_size === boxSize
        ? {
            ...box,
            items: box.items.map(item =>
              item.id === itemId ? { ...item, ...updates } : item
            )
          }
        : box
    ));
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
        <h2 className="text-2xl font-bold">Bokskonfigurasjon</h2>
        <p className="text-gray-600">Administrer innhold og priser for hver boksstørrelse</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {boxes.map((box) => (
          <Card key={box.box_size} className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Package className="w-8 h-8 text-[#2C1810]" />
                <div>
                  <h3 className="text-xl font-bold">{box.box_size} kg Boks</h3>
                  <p className="text-sm text-gray-600">
                    {box.items.length} produkter
                  </p>
                </div>
              </div>
              {editingBox === box.box_size ? (
                <div className="flex gap-2">
                  <Button
                    onClick={() => saveBoxConfig(box.box_size)}
                    disabled={saving}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Lagre
                  </Button>
                  <Button
                    onClick={() => {
                      loadBoxConfigs();
                      setEditingBox(null);
                    }}
                    size="sm"
                    variant="outline"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Avbryt
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setEditingBox(box.box_size)}
                  size="sm"
                  variant="outline"
                >
                  <Edit3 className="w-4 h-4 mr-1" />
                  Rediger
                </Button>
              )}
            </div>

            {/* Price */}
            <div className="mb-4">
              <Label>Pris (NOK)</Label>
              <Input
                type="number"
                value={box.price}
                onChange={(e) => updateBoxPrice(box.box_size, parseInt(e.target.value) || 0)}
                disabled={editingBox !== box.box_size}
                className="mt-2"
                min="0"
                step="10"
              />
            </div>

            {/* Description */}
            <div className="mb-4">
              <Label>Beskrivelse</Label>
              <Textarea
                value={box.description}
                onChange={(e) => updateBoxDescription(box.box_size, e.target.value)}
                disabled={editingBox !== box.box_size}
                className="mt-2"
                placeholder="Kort beskrivelse av boksen..."
                rows={2}
              />
            </div>

            {/* Items List */}
            <div className="mb-4">
              <Label className="mb-3 block">Innhold</Label>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {box.items.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Ingen produkter lagt til ennå
                  </p>
                ) : (
                  box.items.map((item) => (
                    <div
                      key={item.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-xl border',
                        editingBox === box.box_size ? 'bg-gray-50' : 'bg-white'
                      )}
                    >
                      <div className="flex-1">
                        {editingItem === item.id && editingBox === box.box_size ? (
                          <div className="space-y-2">
                            <Input
                              value={item.name}
                              onChange={(e) => updateItemInBox(box.box_size, item.id, { name: e.target.value })}
                              placeholder="Produktnavn"
                              className="text-sm"
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateItemInBox(box.box_size, item.id, { quantity: parseFloat(e.target.value) })}
                                placeholder="Mengde"
                                className="text-sm w-24"
                                step="0.1"
                              />
                              <Input
                                value={item.unit}
                                onChange={(e) => updateItemInBox(box.box_size, item.id, { unit: e.target.value })}
                                placeholder="Enhet"
                                className="text-sm w-20"
                              />
                            </div>
                            <Button
                              onClick={() => setEditingItem(null)}
                              size="sm"
                              variant="outline"
                            >
                              Ferdig
                            </Button>
                          </div>
                        ) : (
                          <>
                            <p className="font-medium text-sm">{item.name}</p>
                            <p className="text-xs text-gray-600">
                              {item.quantity} {item.unit}
                            </p>
                            {item.description && (
                              <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                            )}
                          </>
                        )}
                      </div>
                      {editingBox === box.box_size && editingItem !== item.id && (
                        <div className="flex gap-2 ml-3">
                          <Button
                            onClick={() => setEditingItem(item.id)}
                            size="sm"
                            variant="ghost"
                          >
                            <Edit3 className="w-3 h-3" />
                          </Button>
                          <Button
                            onClick={() => removeItemFromBox(box.box_size, item.id)}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Item Form */}
            {editingBox === box.box_size && (
              <div className="mt-4 p-4 rounded-xl bg-green-50 border border-green-200">
                <Label className="mb-2 block text-sm font-semibold">Legg til produkt</Label>
                <div className="space-y-2">
                  <Input
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="Produktnavn (f.eks. Entrecôte)"
                    className="text-sm"
                  />
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      placeholder="Mengde"
                      className="text-sm flex-1"
                      step="0.1"
                    />
                    <select
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="text-sm px-3 py-2 border rounded-xl w-24"
                    >
                      <option value="kg">kg</option>
                      <option value="g">g</option>
                      <option value="stk">stk</option>
                      <option value="pakke">pakke</option>
                    </select>
                  </div>
                  <Input
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="Beskrivelse (valgfritt)"
                    className="text-sm"
                  />
                  <Button
                    onClick={() => addItemToBox(box.box_size)}
                    size="sm"
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Legg til produkt
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      {/* Summary Card */}
      <Card className="p-6 bg-blue-50 border-blue-200">
        <h3 className="font-semibold text-blue-900 mb-2">Administrasjon av boksinnhold</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
          <li>Klikk &quot;Rediger&quot; for å endre innhold og pris for en boks</li>
          <li>Legg til produkter med navn, mengde og enhet</li>
          <li>Produkter kan redigeres eller slettes etter de er lagt til</li>
          <li>Husk å lagre endringer før du går videre til neste boks</li>
          <li>Priser og innhold vises automatisk til kundene når de bestiller</li>
        </ul>
      </Card>
    </div>
  );
}
