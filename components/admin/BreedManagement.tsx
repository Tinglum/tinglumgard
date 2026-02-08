'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Plus, Edit, Trash2, Save, X, RefreshCw, Eye, EyeOff } from 'lucide-react';

interface Breed {
  id: string;
  name: string;
  slug: string;
  description: string;
  image_url: string;
  price_per_egg: number;
  accent_color: string;
  active: boolean;
  display_order: number;
  created_at: string;
}

export function BreedManagement() {
  const [breeds, setBreeds] = useState<Breed[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingBreed, setEditingBreed] = useState<Breed | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Breed>>({
    name: '',
    slug: '',
    description: '',
    image_url: '',
    price_per_egg: 0,
    accent_color: '#000000',
    active: true,
    display_order: 0,
  });

  useEffect(() => {
    loadBreeds();
  }, []);

  async function loadBreeds() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/eggs/breeds');
      if (response.ok) {
        const data = await response.json();
        setBreeds(data);
      }
    } catch (error) {
      console.error('Failed to load breeds:', error);
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setFormData({
      name: '',
      slug: '',
      description: '',
      image_url: '',
      price_per_egg: 0,
      accent_color: '#000000',
      active: true,
      display_order: 0,
    });
    setEditingBreed(null);
    setShowAddForm(false);
  }

  function handleEdit(breed: Breed) {
    setEditingBreed(breed);
    setFormData(breed);
    setShowAddForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      const url = editingBreed
        ? `/api/admin/eggs/breeds/${editingBreed.id}`
        : '/api/admin/eggs/breeds';

      const method = editingBreed ? 'PATCH' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await loadBreeds();
        resetForm();
      } else {
        console.error('Failed to save breed');
      }
    } catch (error) {
      console.error('Error saving breed:', error);
    }
  }

  async function handleDelete(breedId: string) {
    if (!window.confirm('Er du sikker på at du vil slette denne rasen? Dette kan ikke angres.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/eggs/breeds/${breedId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadBreeds();
      } else {
        console.error('Failed to delete breed');
      }
    } catch (error) {
      console.error('Error deleting breed:', error);
    }
  }

  async function handleToggleActive(breed: Breed) {
    try {
      const response = await fetch(`/api/admin/eggs/breeds/${breed.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !breed.active }),
      });

      if (response.ok) {
        await loadBreeds();
      }
    } catch (error) {
      console.error('Error toggling breed active status:', error);
    }
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/æ/g, 'ae')
      .replace(/ø/g, 'o')
      .replace(/å/g, 'a')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
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
          <h2 className="text-2xl font-bold text-gray-900">Rasehåndtering</h2>
          <p className="text-sm text-gray-600 mt-1">Administrer eggraser og priser</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={loadBreeds} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Oppdater
          </Button>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Ny rase
          </Button>
        </div>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <Card className="p-6 border-2 border-blue-200 bg-blue-50/50">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingBreed ? 'Rediger rase' : 'Legg til ny rase'}
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetForm}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Rasenavn *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setFormData({
                      ...formData,
                      name,
                      slug: generateSlug(name),
                    });
                  }}
                  required
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug (auto-generert)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
              </div>

              <div>
                <Label htmlFor="price">Pris per egg (øre) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price_per_egg}
                  onChange={(e) =>
                    setFormData({ ...formData, price_per_egg: parseInt(e.target.value) })
                  }
                  required
                />
                <p className="text-xs text-gray-600 mt-1">
                  {((formData.price_per_egg || 0) / 100).toFixed(2)} kr
                </p>
              </div>

              <div>
                <Label htmlFor="color">Aksentfarge</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) =>
                      setFormData({ ...formData, accent_color: e.target.value })
                    }
                    className="w-20 h-10"
                  />
                  <Input
                    type="text"
                    value={formData.accent_color}
                    onChange={(e) =>
                      setFormData({ ...formData, accent_color: e.target.value })
                    }
                    className="flex-1"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="image_url">Bilde URL</Label>
                <Input
                  id="image_url"
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                />
              </div>

              <div>
                <Label htmlFor="display_order">Visningsrekkefølge</Label>
                <Input
                  id="display_order"
                  type="number"
                  value={formData.display_order}
                  onChange={(e) =>
                    setFormData({ ...formData, display_order: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Beskrivelse</Label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-xl min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="active"
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="active" className="mb-0">Aktiv (synlig for kunder)</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={resetForm}>
                Avbryt
              </Button>
              <Button type="submit">
                <Save className="w-4 h-4 mr-2" />
                {editingBreed ? 'Lagre endringer' : 'Legg til rase'}
              </Button>
            </div>
          </form>
        </Card>
      )}

      {/* Breeds List */}
      {breeds.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-lg font-semibold text-gray-900 mb-2">Ingen raser funnet</p>
          <p className="text-sm text-gray-600 mb-4">Legg til din første rase for å begynne</p>
          <Button onClick={() => setShowAddForm(true)} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Legg til rase
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {breeds.map((breed) => (
            <Card
              key={breed.id}
              className={cn(
                'p-5 border transition-all',
                breed.active
                  ? 'border-gray-200 hover:shadow-lg'
                  : 'border-gray-300 bg-gray-50 opacity-60'
              )}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ backgroundColor: breed.accent_color }}
                  >
                    {breed.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{breed.name}</h3>
                    <p className="text-sm text-gray-600">{breed.slug}</p>
                  </div>
                </div>
                <span
                  className={cn(
                    'px-2 py-1 rounded-full text-xs font-medium',
                    breed.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-100 text-gray-800'
                  )}
                >
                  {breed.active ? 'Aktiv' : 'Inaktiv'}
                </span>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-700 line-clamp-3">{breed.description}</p>
                <p className="text-lg font-bold text-gray-900">
                  {(breed.price_per_egg / 100).toFixed(2)} kr per egg
                </p>
                <p className="text-xs text-gray-600">Rekkefølge: {breed.display_order}</p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleEdit(breed)}
                >
                  <Edit className="w-3.5 h-3.5 mr-1.5" />
                  Rediger
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleActive(breed)}
                >
                  {breed.active ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDelete(breed.id)}
                  className="text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
