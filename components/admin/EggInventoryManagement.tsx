'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
          <Button size="sm">
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
              onUpdate={loadData}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InventoryCard({ item, onUpdate }: { item: InventoryItem; onUpdate: () => void }) {
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
          onClick={() => {
            // TODO: Open edit modal
            console.log('Edit', item.id);
          }}
        >
          <Edit className="w-3.5 h-3.5 mr-1.5" />
          Rediger
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="flex-1"
          onClick={() => {
            // TODO: Toggle status
            console.log('Toggle status', item.id);
          }}
        >
          {item.status === 'open' ? 'Steng' : 'Åpne'}
        </Button>
      </div>
    </Card>
  );
}
