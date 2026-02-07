'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Calendar, Edit, RefreshCw } from 'lucide-react';

interface Breed {
  id: string;
  name: string;
  slug: string;
  accent_color: string;
}

interface InventoryItem {
  id: string;
  breed_id: string;
  year: number;
  week_number: number;
  delivery_monday: string;
  eggs_available: number;
  eggs_allocated: number;
  eggs_remaining: number;
  status: string;
  egg_breeds: Breed;
}

export function EggInventoryManagement() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [selectedBreed, setSelectedBreed] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [formData, setFormData] = useState({
    breed_id: '',
    year: new Date().getFullYear(),
    week_number: '',
    delivery_monday: '',
    eggs_available: 0,
    status: 'open',
  });

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load breeds
      const breedsRes = await fetch('/api/eggs/breeds');
      if (breedsRes.ok) {
        const breedsData = await breedsRes.json();
        setBreeds(breedsData);
      }

      // Load inventory
      const invRes = await fetch('/api/eggs/inventory');
      if (invRes.ok) {
        const invData = await invRes.json();
        setInventory(invData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredInventory = selectedBreed === 'all'
    ? inventory
    : inventory.filter(item => item.breed_id === selectedBreed);

  function resetForm() {
    setFormData({
      breed_id: breeds[0]?.id || '',
      year: new Date().getFullYear(),
      week_number: '',
      delivery_monday: '',
      eggs_available: 0,
      status: 'open',
    });
    setEditingItem(null);
    setShowForm(false);
  }

  function openCreate() {
    setEditingItem(null);
    setFormData({
      breed_id: breeds[0]?.id || '',
      year: new Date().getFullYear(),
      week_number: '',
      delivery_monday: '',
      eggs_available: 0,
      status: 'open',
    });
    setShowForm(true);
  }

  function openEdit(item: InventoryItem) {
    setEditingItem(item);
    setFormData({
      breed_id: item.breed_id,
      year: item.year,
      week_number: String(item.week_number),
      delivery_monday: item.delivery_monday?.slice(0, 10) || '',
      eggs_available: item.eggs_available,
      status: item.status,
    });
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      if (editingItem) {
        const response = await fetch(`/api/admin/eggs/inventory/${editingItem.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eggs_available: Number(formData.eggs_available),
            status: formData.status,
            delivery_monday: formData.delivery_monday,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to update inventory');
        }
      } else {
        const response = await fetch('/api/admin/eggs/inventory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            breed_id: formData.breed_id,
            year: Number(formData.year),
            week_number: Number(formData.week_number),
            delivery_monday: formData.delivery_monday,
            eggs_available: Number(formData.eggs_available),
            status: formData.status,
          }),
        });
        if (!response.ok) {
          throw new Error('Failed to create inventory');
        }
      }

      await loadData();
      resetForm();
    } catch (error) {
      console.error('Failed to save inventory:', error);
    }
  }

  async function handleToggleStatus(item: InventoryItem) {
    const nextStatus = item.status === 'open' ? 'closed' : 'open';
    try {
      const response = await fetch(`/api/admin/eggs/inventory/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (response.ok) {
        await loadData();
      }
    } catch (error) {
      console.error('Failed to toggle status:', error);
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Egg Lager</h2>
          <p className="text-sm text-gray-600 mt-1">Ukesbasert lagerstyring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Oppdater
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4 mr-2" />
            Legg til uke
          </Button>
        </div>
      </div>

      {/* Breed Filter */}
      <div className="flex items-center gap-4">
        <label className="text-sm font-semibold text-gray-700">Filtrer rase:</label>
        <select
          value={selectedBreed}
          onChange={(e) => setSelectedBreed(e.target.value)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm"
        >
          <option value="all">Alle raser</option>
          {breeds.map(breed => (
            <option key={breed.id} value={breed.id}>
              {breed.name}
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-600">
          {filteredInventory.length} uker
        </span>
      </div>

      {showForm && (
        <Card className="p-6 border border-gray-200 bg-gray-50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Rediger uke' : 'Legg til uke'}
              </h3>
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Avbryt
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="breed">Rase</Label>
                <select
                  id="breed"
                  value={formData.breed_id}
                  onChange={(e) => setFormData({ ...formData, breed_id: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                  disabled={!!editingItem}
                >
                  {breeds.map((breed) => (
                    <option key={breed.id} value={breed.id}>
                      {breed.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="week_number">Ukenummer</Label>
                <Input
                  id="week_number"
                  type="number"
                  value={formData.week_number}
                  onChange={(e) => setFormData({ ...formData, week_number: e.target.value })}
                  disabled={!!editingItem}
                />
              </div>

              <div>
                <Label htmlFor="year">År</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: Number(e.target.value) })}
                  disabled={!!editingItem}
                />
              </div>

              <div>
                <Label htmlFor="delivery_monday">Leveringsmandag</Label>
                <Input
                  id="delivery_monday"
                  type="date"
                  value={formData.delivery_monday}
                  onChange={(e) => setFormData({ ...formData, delivery_monday: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="eggs_available">Tilgjengelige egg</Label>
                <Input
                  id="eggs_available"
                  type="number"
                  value={formData.eggs_available}
                  onChange={(e) => setFormData({ ...formData, eggs_available: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="open">Åpen</option>
                  <option value="closed">Stengt</option>
                  <option value="locked">Låst</option>
                  <option value="sold_out">Utsolgt</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={resetForm}>
                Avbryt
              </Button>
              <Button type="submit">
                {editingItem ? 'Lagre endringer' : 'Opprett uke'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Inventory Grid */}
      {filteredInventory.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-900 mb-2">Ingen lager funnet</p>
          <p className="text-sm text-gray-600 mb-4">
            Legg til lagerbeholdning for å begynne å ta imot bestillinger
          </p>
          <Button size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Legg til første uke
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInventory.map(item => (
            <InventoryCard
              key={item.id}
              item={item}
              onEdit={() => openEdit(item)}
              onToggleStatus={() => handleToggleStatus(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryCard({
  item,
  onEdit,
  onToggleStatus,
}: {
  item: InventoryItem;
  onEdit: () => void;
  onToggleStatus: () => void;
}) {
  const percentage = item.eggs_available > 0
    ? (item.eggs_allocated / item.eggs_available) * 100
    : 0;

  const statusColors = {
    open: 'bg-green-100 text-green-800',
    sold_out: 'bg-red-100 text-red-800',
    closed: 'bg-gray-100 text-gray-800',
    locked: 'bg-orange-100 text-orange-800',
  };

  const statusLabels = {
    open: 'Åpen',
    sold_out: 'Utsolgt',
    closed: 'Stengt',
    locked: 'Låst',
  };

  return (
    <Card className="p-5 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
            style={{ backgroundColor: item.egg_breeds.accent_color }}
          >
            {item.egg_breeds.name.charAt(0)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{item.egg_breeds.name}</h3>
            <p className="text-sm text-gray-600">
              Uke {item.week_number}, {item.year}
            </p>
          </div>
        </div>
        <span className={cn(
          'px-2 py-1 rounded-full text-xs font-medium',
          statusColors[item.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'
        )}>
          {statusLabels[item.status as keyof typeof statusLabels] || item.status}
        </span>
      </div>

      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-1">
          Leveringsdato: {new Date(item.delivery_monday).toLocaleDateString('nb-NO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
          })}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600">Allokert</span>
          <span className="font-semibold text-gray-900">
            {item.eggs_allocated} / {item.eggs_available}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className={cn(
              "h-2.5 rounded-full transition-all",
              percentage >= 90 ? "bg-red-500" :
              percentage >= 70 ? "bg-yellow-500" :
              "bg-green-500"
            )}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-600 mt-1.5">
          {item.eggs_remaining} egg gjenværende
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onEdit}
        >
          <Edit className="w-3.5 h-3.5 mr-1.5" />
          Rediger
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={onToggleStatus}
        >
          {item.status === 'open' ? 'Steng' : 'Åpne'}
        </Button>
      </div>
    </Card>
  );
}
