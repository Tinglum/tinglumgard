'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tag,
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Package,
} from 'lucide-react';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface RebateCode {
  id: string;
  code: string;
  discount_type: 'percentage' | 'fixed_amount';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  max_uses_per_customer: number;
  valid_from: string | null;
  valid_until: string | null;
  min_order_amount: number | null;
  applicable_to: string[];
  is_active: boolean;
  description: string;
  created_at: string;
}

export function RebateCodesManager() {
  const [codes, setCodes] = useState<RebateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState('1');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [applicable8kg, setApplicable8kg] = useState(true);
  const [applicable12kg, setApplicable12kg] = useState(true);
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCodes();
  }, []);

  async function loadCodes() {
    try {
      const response = await fetch('/api/admin/rebate-codes');
      const data = await response.json();
      setCodes(data.codes || []);
    } catch (err) {
      console.error('Error loading codes:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setCreating(true);
    setError(null);

    try {
      const applicableTo = [];
      if (applicable8kg) applicableTo.push('8kg');
      if (applicable12kg) applicableTo.push('12kg');

      const response = await fetch('/api/admin/rebate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          discountType,
          discountValue: parseFloat(discountValue),
          maxUses: maxUses ? parseInt(maxUses) : null,
          maxUsesPerCustomer: parseInt(maxUsesPerCustomer),
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          applicableTo,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create code');
        return;
      }

      // Reset form
      setNewCode('');
      setDiscountValue('');
      setMaxUses('');
      setMaxUsesPerCustomer('1');
      setValidFrom('');
      setValidUntil('');
      setMinOrderAmount('');
      setApplicable8kg(true);
      setApplicable12kg(true);
      setDescription('');
      setShowCreateForm(false);

      // Reload codes
      await loadCodes();
    } catch (err) {
      console.error('Error creating code:', err);
      setError('Failed to create code');
    } finally {
      setCreating(false);
    }
  }

  async function handleToggleActive(id: string, currentActive: boolean) {
    try {
      await fetch('/api/admin/rebate-codes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          isActive: !currentActive,
        }),
      });

      await loadCodes();
    } catch (err) {
      console.error('Error toggling code:', err);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Er du sikker på at du vil slette denne koden?')) return;

    try {
      await fetch(`/api/admin/rebate-codes?id=${id}`, {
        method: 'DELETE',
      });

      await loadCodes();
    } catch (err) {
      console.error('Error deleting code:', err);
    }
  }

  if (loading) {
    return <div className="text-center py-8">Laster...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Rabattkoder</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Ny rabattkode
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Opprett rabattkode</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kode *</Label>
              <Input
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="SOMMER2026"
                maxLength={20}
                className="uppercase"
              />
            </div>

            <div>
              <Label htmlFor="discountType">Rabatttype *</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Prosent (%)</SelectItem>
                  <SelectItem value="fixed_amount">Fast beløp (kr)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discountValue">
                Rabattverdi * {discountType === 'percentage' ? '(%)' : '(kr)'}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={discountType === 'percentage' ? '10' : '500'}
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>

            <div>
              <Label htmlFor="description">Beskrivelse</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Sommerrabatt 2026"
              />
            </div>

            <div>
              <Label htmlFor="maxUses">Maks antall bruk (totalt)</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Ubegrenset"
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="maxUsesPerCustomer">Maks bruk per kunde</Label>
              <Input
                id="maxUsesPerCustomer"
                type="number"
                value={maxUsesPerCustomer}
                onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
                placeholder="1"
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="validFrom">Gyldig fra</Label>
              <Input
                id="validFrom"
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="validUntil">Gyldig til</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="minOrderAmount">Minimumsbeløp (kr)</Label>
              <Input
                id="minOrderAmount"
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder="Ingen minimum"
                min="0"
              />
            </div>

            <div>
              <Label className="mb-2 block">Gjelder for</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="8kg"
                    checked={applicable8kg}
                    onCheckedChange={(checked) => setApplicable8kg(checked as boolean)}
                  />
                  <Label htmlFor="8kg" className="cursor-pointer">8kg kasser</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="12kg"
                    checked={applicable12kg}
                    onCheckedChange={(checked) => setApplicable12kg(checked as boolean)}
                  />
                  <Label htmlFor="12kg" className="cursor-pointer">12kg kasser</Label>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={handleCreate} disabled={creating || !newCode || !discountValue}>
              {creating ? 'Oppretter...' : 'Opprett kode'}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              Avbryt
            </Button>
          </div>
        </Card>
      )}

      {/* Codes List */}
      <div className="space-y-4">
        {codes.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Ingen rabattkoder opprettet ennå</p>
          </Card>
        ) : (
          codes.map((code) => (
            <Card key={code.id} className={`p-6 ${!code.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold font-mono">{code.code}</h3>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        code.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {code.is_active ? 'Aktiv' : 'Inaktiv'}
                    </span>
                  </div>

                  {code.description && (
                    <p className="text-gray-600 mb-3">{code.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {code.discount_type === 'percentage' ? (
                        <Percent className="h-4 w-4 text-blue-600" />
                      ) : (
                        <DollarSign className="h-4 w-4 text-green-600" />
                      )}
                      <span>
                        {code.discount_type === 'percentage'
                          ? `${code.discount_value}% rabatt`
                          : `${code.discount_value} kr rabatt`}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span>
                        {code.current_uses}/{code.max_uses || '∞'} brukt
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-orange-600" />
                      <span>{code.applicable_to.join(', ')}</span>
                    </div>

                    {code.valid_until && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-red-600" />
                        <span>
                          Til {format(new Date(code.valid_until), 'dd.MM.yyyy', { locale: nb })}
                        </span>
                      </div>
                    )}
                  </div>

                  {code.min_order_amount && (
                    <p className="text-xs text-gray-500 mt-2">
                      Minimum: {code.min_order_amount} kr
                    </p>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleToggleActive(code.id, code.is_active)}
                  >
                    {code.is_active ? (
                      <ToggleRight className="h-4 w-4" />
                    ) : (
                      <ToggleLeft className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(code.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-600" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
