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
import { nb, enUS } from 'date-fns/locale';
import { useLanguage } from '@/contexts/LanguageContext';

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
  const { t, lang } = useLanguage();
  const copy = t.rebateCodesManager;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const dateLocale = lang === 'en' ? enUS : nb;
  const currency = t.common.currency;

  const [codes, setCodes] = useState<RebateCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [newCode, setNewCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed_amount'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [maxUsesPerCustomer, setMaxUsesPerCustomer] = useState('1');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [applicable8kg, setApplicable8kg] = useState(true);
  const [applicable9kg, setApplicable9kg] = useState(true);
  const [applicable10kg, setApplicable10kg] = useState(true);
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
      if (applicable9kg) applicableTo.push('9kg');
      if (applicable10kg) applicableTo.push('10kg');
      if (applicable12kg) applicableTo.push('12kg');

      const response = await fetch('/api/admin/rebate-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          discountType,
          discountValue: parseFloat(discountValue),
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          maxUsesPerCustomer: parseInt(maxUsesPerCustomer, 10),
          validFrom: validFrom || null,
          validUntil: validUntil || null,
          minOrderAmount: minOrderAmount ? parseFloat(minOrderAmount) : null,
          applicableTo,
          description,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || copy.createFailed);
        return;
      }

      setNewCode('');
      setDiscountValue('');
      setMaxUses('');
      setMaxUsesPerCustomer('1');
      setValidFrom('');
      setValidUntil('');
      setMinOrderAmount('');
      setApplicable8kg(true);
      setApplicable9kg(true);
      setApplicable10kg(true);
      setApplicable12kg(true);
      setDescription('');
      setShowCreateForm(false);

      await loadCodes();
    } catch (err) {
      console.error('Error creating code:', err);
      setError(copy.createFailed);
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
    if (!window.confirm(copy.confirmDelete)) return;

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
    return <div className="text-center py-8">{copy.loading}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{copy.title}</h2>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {copy.newCodeButton}
        </Button>
      </div>

      {showCreateForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">{copy.createTitle}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">{copy.codeLabel}</Label>
              <Input
                id="code"
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder={copy.codePlaceholder}
                maxLength={20}
                className="uppercase"
              />
            </div>

            <div>
              <Label htmlFor="discountType">{copy.discountTypeLabel}</Label>
              <Select value={discountType} onValueChange={(v: any) => setDiscountType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">{copy.discountTypePercentage}</SelectItem>
                  <SelectItem value="fixed_amount">{copy.discountTypeFixed}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="discountValue">
                {copy.discountValueLabel} {discountType === 'percentage' ? '(%)' : `(${currency})`}
              </Label>
              <Input
                id="discountValue"
                type="number"
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                placeholder={
                  discountType === 'percentage'
                    ? copy.discountValuePercentagePlaceholder
                    : copy.discountValueFixedPlaceholder
                }
                min="0"
                max={discountType === 'percentage' ? '100' : undefined}
              />
            </div>

            <div>
              <Label htmlFor="description">{copy.descriptionLabel}</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={copy.descriptionPlaceholder}
              />
            </div>

            <div>
              <Label htmlFor="maxUses">{copy.maxUsesLabel}</Label>
              <Input
                id="maxUses"
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder={copy.unlimitedPlaceholder}
                min="0"
              />
            </div>

            <div>
              <Label htmlFor="maxUsesPerCustomer">{copy.maxUsesPerCustomerLabel}</Label>
              <Input
                id="maxUsesPerCustomer"
                type="number"
                value={maxUsesPerCustomer}
                onChange={(e) => setMaxUsesPerCustomer(e.target.value)}
                placeholder={copy.maxUsesPerCustomerPlaceholder}
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="validFrom">{copy.validFromLabel}</Label>
              <Input
                id="validFrom"
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="validUntil">{copy.validUntilLabel}</Label>
              <Input
                id="validUntil"
                type="datetime-local"
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="minOrderAmount">{copy.minOrderAmountLabel}</Label>
              <Input
                id="minOrderAmount"
                type="number"
                value={minOrderAmount}
                onChange={(e) => setMinOrderAmount(e.target.value)}
                placeholder={copy.noMinimumPlaceholder}
                min="0"
              />
            </div>

            <div>
              <Label className="mb-2 block">{copy.appliesToLabel}</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="8kg"
                    checked={applicable8kg}
                    onCheckedChange={(checked) => setApplicable8kg(checked as boolean)}
                  />
                  <Label htmlFor="8kg" className="cursor-pointer">{copy.applies8kg}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="12kg"
                    checked={applicable12kg}
                    onCheckedChange={(checked) => setApplicable12kg(checked as boolean)}
                  />
                  <Label htmlFor="12kg" className="cursor-pointer">{copy.applies12kg}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="9kg"
                    checked={applicable9kg}
                    onCheckedChange={(checked) => setApplicable9kg(checked as boolean)}
                  />
                  <Label htmlFor="9kg" className="cursor-pointer">9kg</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="10kg"
                    checked={applicable10kg}
                    onCheckedChange={(checked) => setApplicable10kg(checked as boolean)}
                  />
                  <Label htmlFor="10kg" className="cursor-pointer">10kg</Label>
                </div>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-6">
            <Button onClick={handleCreate} disabled={creating || !newCode || !discountValue}>
              {creating ? copy.creating : copy.createButton}
            </Button>
            <Button variant="outline" onClick={() => setShowCreateForm(false)}>
              {t.common.cancel}
            </Button>
          </div>
        </Card>
      )}

      <div className="space-y-4">
        {codes.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">
            <Tag className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{copy.empty}</p>
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
                      {code.is_active ? copy.activeStatus : copy.inactiveStatus}
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
                          ? copy.discountPercentageValue.replace('{value}', String(code.discount_value))
                          : copy.discountFixedValue
                            .replace('{value}', String(code.discount_value))
                            .replace('{currency}', currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-purple-600" />
                      <span>
                        {copy.usesValue
                          .replace('{current}', String(code.current_uses))
                          .replace('{max}', code.max_uses ? String(code.max_uses) : copy.infinity)}
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
                          {copy.validUntilPrefix} {format(new Date(code.valid_until), 'dd.MM.yyyy', { locale: dateLocale })}
                        </span>
                      </div>
                    )}
                  </div>

                  {code.min_order_amount && (
                    <p className="text-xs text-gray-500 mt-2">
                      {copy.minimumPrefix} {code.min_order_amount.toLocaleString(locale)} {currency}
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
