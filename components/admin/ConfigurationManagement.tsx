'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Truck, Calendar, Mail, Save, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useLanguage } from '@/contexts/LanguageContext';

interface ConfigData {
  pricing: {
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
  const currency = t.common.currency;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deliveryFeeE6, setDeliveryFeeE6] = useState(300);
  const [deliveryFeeTrondheim, setDeliveryFeeTrondheim] = useState(200);
  const [freshFee, setFreshFee] = useState(500);

  const [cutoffYear, setCutoffYear] = useState(2026);
  const [cutoffWeek, setCutoffWeek] = useState(46);

  const [contactEmail, setContactEmail] = useState('post@tinglum.no');
  const [contactPhone, setContactPhone] = useState('+47 123 45 678');

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/configuration');
      const data = await response.json();

      const config: ConfigData | undefined = data?.config;
      if (!config) {
        throw new Error('Missing configuration payload');
      }

      setDeliveryFeeE6(config.pricing.delivery_fee_pickup_e6 || 300);
      setDeliveryFeeTrondheim(config.pricing.delivery_fee_trondheim || 200);
      setFreshFee(config.pricing.fresh_delivery_fee || 500);
      setCutoffYear(config.cutoff.year);
      setCutoffWeek(config.cutoff.week);
      setContactEmail(config.contact.email);
      setContactPhone(config.contact.phone);
    } catch (error) {
      console.error('Error loading config:', error);
      toast({
        title: copy.errorTitle,
        description: copy.saveError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [copy.errorTitle, copy.saveError, toast]);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/configuration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pricing: {
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

  const depositInfo =
    lang === 'no'
      ? 'Innskudd er fast 50% av valgt Mangalitsa-bokspris.'
      : 'Deposit is fixed at 50% of the selected Mangalitsa box price.';

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
          <Truck className="w-5 h-5" />
          {copy.pricingTitle}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

        <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-900">
          {depositInfo}
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
              max="2035"
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
              max="53"
            />
          </div>
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
    </div>
  );
}
