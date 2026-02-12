'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DollarSign, Calendar, Mail, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConfigData {
  pricing: {
    box_8kg: number;
    box_12kg: number;
    box_8kg_deposit_percentage: number;
    box_12kg_deposit_percentage: number;
    delivery_fee_pickup_e6: number;
    delivery_fee_trondheim: number;
    fresh_delivery_fee: number;
  };
  cutoff: {
    year: number;
    week: number;
  };
  contact: {
    email: string;
    phone: string;
  };
}

export function ConfigurationManagement() {
  const { toast } = useToast();
  const { t, lang } = useLanguage();
  const copy = t.configurationManagement;
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';
  const currency = t.common.currency;

  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [box8kgPrice, setBox8kgPrice] = useState(0);
  const [box12kgPrice, setBox12kgPrice] = useState(0);
  const [box8kgDepositPercentage, setBox8kgDepositPercentage] = useState(50);
  const [box12kgDepositPercentage, setBox12kgDepositPercentage] = useState(50);
  const [deliveryFeeE6, setDeliveryFeeE6] = useState(300);
  const [deliveryFeeTrondheim, setDeliveryFeeTrondheim] = useState(200);
  const [freshFee, setFreshFee] = useState(500);

  const [cutoffYear, setCutoffYear] = useState(2026);
  const [cutoffWeek, setCutoffWeek] = useState(46);

  const [contactEmail, setContactEmail] = useState('post@tinglum.no');
  const [contactPhone, setContactPhone] = useState('+47 123 45 678');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/configuration');
      const data = await response.json();

      setConfig(data.config);
      setBox8kgPrice(data.config.pricing.box_8kg);
      setBox12kgPrice(data.config.pricing.box_12kg);
      setBox8kgDepositPercentage(data.config.pricing.box_8kg_deposit_percentage || 50);
      setBox12kgDepositPercentage(data.config.pricing.box_12kg_deposit_percentage || 50);
      setDeliveryFeeE6(data.config.pricing.delivery_fee_pickup_e6 || 300);
      setDeliveryFeeTrondheim(data.config.pricing.delivery_fee_trondheim || 200);
      setFreshFee(data.config.pricing.fresh_delivery_fee);
      setCutoffYear(data.config.cutoff.year);
      setCutoffWeek(data.config.cutoff.week);
      setContactEmail(data.config.contact.email);
      setContactPhone(data.config.contact.phone);
    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: {
            box_8kg: box8kgPrice,
            box_12kg: box12kgPrice,
            box_8kg_deposit_percentage: box8kgDepositPercentage,
            box_12kg_deposit_percentage: box12kgDepositPercentage,
            delivery_fee_pickup_e6: deliveryFeeE6,
            delivery_fee_trondheim: deliveryFeeTrondheim,
            fresh_delivery_fee: freshFee,
          },
          cutoff: {
            year: cutoffYear,
            week: cutoffWeek,
          },
          contact: {
            email: contactEmail,
            phone: contactPhone,
          },
        }),
      });

      if (response.ok) {
        await loadConfig();
        toast({
          title: copy.savedTitle,
          description: copy.savedDescription,
        });
      } else {
        toast({
          title: copy.errorTitle,
          description: copy.saveError,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: copy.errorTitle,
        description: copy.saveError,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{copy.title}</h2>
          <p className="text-gray-600">{copy.subtitle}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadConfig} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            {copy.refreshButton}
          </Button>
          <Button onClick={saveConfig} disabled={saving} className="bg-[#2C1810] hover:bg-[#2C1810]/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? copy.savingButton : copy.saveAllButton}
          </Button>
        </div>
      </div>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          {copy.pricingTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>{copy.box8PriceLabel.replace('{currency}', currency)}</Label>
            <Input
              type="number"
              value={box8kgPrice}
              onChange={(e) => setBox8kgPrice(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="10"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.box8PriceHint}</p>
          </div>

          <div>
            <Label>{copy.box12PriceLabel.replace('{currency}', currency)}</Label>
            <Input
              type="number"
              value={box12kgPrice}
              onChange={(e) => setBox12kgPrice(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="10"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.box12PriceHint}</p>
          </div>

          <div>
            <Label>{copy.box8DepositLabel}</Label>
            <Input
              type="number"
              value={box8kgDepositPercentage}
              onChange={(e) => setBox8kgDepositPercentage(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              max="100"
              step="1"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.box8DepositHint}</p>
          </div>

          <div>
            <Label>{copy.box12DepositLabel}</Label>
            <Input
              type="number"
              value={box12kgDepositPercentage}
              onChange={(e) => setBox12kgDepositPercentage(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              max="100"
              step="1"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.box12DepositHint}</p>
          </div>

          <div>
            <Label>{copy.e6FeeLabel.replace('{currency}', currency)}</Label>
            <Input
              type="number"
              value={deliveryFeeE6}
              onChange={(e) => setDeliveryFeeE6(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.e6FeeHint}</p>
          </div>

          <div>
            <Label>{copy.trondheimFeeLabel.replace('{currency}', currency)}</Label>
            <Input
              type="number"
              value={deliveryFeeTrondheim}
              onChange={(e) => setDeliveryFeeTrondheim(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.trondheimFeeHint}</p>
          </div>

          <div>
            <Label>{copy.freshFeeLabel.replace('{currency}', currency)}</Label>
            <Input
              type="number"
              value={freshFee}
              onChange={(e) => setFreshFee(parseInt(e.target.value, 10) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.freshFeeHint}</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900 font-medium mb-2">{copy.priceExampleTitle}</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
            <div>{copy.example8Deposit.replace('{percent}', String(box8kgDepositPercentage))}</div>
            <div className="font-bold">
              {currency} {Math.floor(box8kgPrice * (box8kgDepositPercentage / 100)).toLocaleString(locale)}
            </div>
            <div>{copy.example12Deposit.replace('{percent}', String(box12kgDepositPercentage))}</div>
            <div className="font-bold">
              {currency} {Math.floor(box12kgPrice * (box12kgDepositPercentage / 100)).toLocaleString(locale)}
            </div>
            <div>{copy.example8TotalE6Fresh}</div>
            <div className="font-bold">
              {currency} {(box8kgPrice + deliveryFeeE6 + freshFee).toLocaleString(locale)}
            </div>
            <div>{copy.example12TotalTrondheim}</div>
            <div className="font-bold">
              {currency} {(box12kgPrice + deliveryFeeTrondheim).toLocaleString(locale)}
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          {copy.cutoffTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>{copy.yearLabel}</Label>
            <Input
              type="number"
              value={cutoffYear}
              onChange={(e) => setCutoffYear(parseInt(e.target.value, 10) || 2026)}
              className="mt-2"
              min="2026"
              max="2030"
            />
          </div>

          <div>
            <Label>{copy.weekLabel}</Label>
            <Input
              type="number"
              value={cutoffWeek}
              onChange={(e) => setCutoffWeek(parseInt(e.target.value, 10) || 1)}
              className="mt-2"
              min="1"
              max="52"
            />
          </div>
        </div>

        <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-900">
            <strong>{copy.activeCutoffPrefix}</strong>{' '}
            {copy.activeCutoffValue.replace('{week}', String(cutoffWeek)).replace('{year}', String(cutoffYear))}
          </p>
          <p className="text-xs text-amber-700 mt-1">{copy.activeCutoffHint}</p>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          {copy.contactTitle}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>{copy.contactEmailLabel}</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.contactHint}</p>
          </div>

          <div>
            <Label>{copy.contactPhoneLabel}</Label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">{copy.contactHint}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900">{copy.readyToSaveTitle}</p>
            <p className="text-sm text-green-700">{copy.readyToSaveSubtitle}</p>
          </div>
          <Button onClick={saveConfig} disabled={saving} size="lg" className="bg-green-600 hover:bg-green-700">
            <Save className="w-5 h-5 mr-2" />
            {saving ? copy.savingButton : copy.saveConfigButton}
          </Button>
        </div>
      </Card>

      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">{copy.upcomingTitle}</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          {copy.upcomingItems.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
