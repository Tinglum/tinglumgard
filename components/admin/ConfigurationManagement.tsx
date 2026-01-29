'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Settings, DollarSign, Calendar, Package, Mail, Save, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Pricing state
  const [box8kgPrice, setBox8kgPrice] = useState(3500);
  const [box12kgPrice, setBox12kgPrice] = useState(4800);
  const [box8kgDepositPercentage, setBox8kgDepositPercentage] = useState(50);
  const [box12kgDepositPercentage, setBox12kgDepositPercentage] = useState(50);
  const [deliveryFeeE6, setDeliveryFeeE6] = useState(300);
  const [deliveryFeeTrondheim, setDeliveryFeeTrondheim] = useState(200);
  const [freshFee, setFreshFee] = useState(500);

  // Cutoff state
  const [cutoffYear, setCutoffYear] = useState(2026);
  const [cutoffWeek, setCutoffWeek] = useState(46);

  // Contact state
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

      // Set pricing
      setBox8kgPrice(data.config.pricing.box_8kg);
      setBox12kgPrice(data.config.pricing.box_12kg);
      setBox8kgDepositPercentage(data.config.pricing.box_8kg_deposit_percentage || 50);
      setBox12kgDepositPercentage(data.config.pricing.box_12kg_deposit_percentage || 50);
      setDeliveryFeeE6(data.config.pricing.delivery_fee_pickup_e6 || 300);
      setDeliveryFeeTrondheim(data.config.pricing.delivery_fee_trondheim || 200);
      setFreshFee(data.config.pricing.fresh_delivery_fee);

      // Set cutoff
      setCutoffYear(data.config.cutoff.year);
      setCutoffWeek(data.config.cutoff.week);

      // Set contact
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
        alert('Konfigurasjon lagret!');
      } else {
        alert('Kunne ikke lagre konfigurasjon');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Kunne ikke lagre konfigurasjon');
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
          <h2 className="text-2xl font-bold">Konfigurasjon</h2>
          <p className="text-gray-600">Administrer systeminnstillinger</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadConfig} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Oppdater
          </Button>
          <Button onClick={saveConfig} disabled={saving} className="bg-[#2C1810] hover:bg-[#2C1810]/90">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Lagrer...' : 'Lagre alle endringer'}
          </Button>
        </div>
      </div>

      {/* Pricing Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          Prissetting
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>8 kg boks pris (NOK)</Label>
            <Input
              type="number"
              value={box8kgPrice}
              onChange={(e) => setBox8kgPrice(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              step="10"
            />
            <p className="text-sm text-gray-600 mt-1">Grunnpris for 8 kg okseboks</p>
          </div>

          <div>
            <Label>12 kg boks pris (NOK)</Label>
            <Input
              type="number"
              value={box12kgPrice}
              onChange={(e) => setBox12kgPrice(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              step="10"
            />
            <p className="text-sm text-gray-600 mt-1">Grunnpris for 12 kg okseboks</p>
          </div>

          <div>
            <Label>8 kg depositum (%)</Label>
            <Input
              type="number"
              value={box8kgDepositPercentage}
              onChange={(e) => setBox8kgDepositPercentage(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              max="100"
              step="1"
            />
            <p className="text-sm text-gray-600 mt-1">Prosent av grunnpris for 8 kg boks</p>
          </div>

          <div>
            <Label>12 kg depositum (%)</Label>
            <Input
              type="number"
              value={box12kgDepositPercentage}
              onChange={(e) => setBox12kgDepositPercentage(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              max="100"
              step="1"
            />
            <p className="text-sm text-gray-600 mt-1">Prosent av grunnpris for 12 kg boks</p>
          </div>

          <div>
            <Label>Henting E6 gebyr (NOK)</Label>
            <Input
              type="number"
              value={deliveryFeeE6}
              onChange={(e) => setDeliveryFeeE6(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">Kostnad for henting ved E6</p>
          </div>

          <div>
            <Label>Levering Trondheim gebyr (NOK)</Label>
            <Input
              type="number"
              value={deliveryFeeTrondheim}
              onChange={(e) => setDeliveryFeeTrondheim(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">Kostnad for levering i Trondheim</p>
          </div>

          <div>
            <Label>Fersk levering tillegg (NOK)</Label>
            <Input
              type="number"
              value={freshFee}
              onChange={(e) => setFreshFee(parseInt(e.target.value) || 0)}
              className="mt-2"
              min="0"
              step="50"
            />
            <p className="text-sm text-gray-600 mt-1">Ekstrakostnad for fersk levering</p>
          </div>
        </div>

        <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-200">
          <p className="text-sm text-blue-900 font-medium mb-2">Priseksempel:</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
            <div>8 kg depositum ({box8kgDepositPercentage}%):</div>
            <div className="font-bold">kr {Math.floor(box8kgPrice * (box8kgDepositPercentage / 100)).toLocaleString('nb-NO')}</div>
            <div>12 kg depositum ({box12kgDepositPercentage}%):</div>
            <div className="font-bold">kr {Math.floor(box12kgPrice * (box12kgDepositPercentage / 100)).toLocaleString('nb-NO')}</div>
            <div>8 kg total + E6 + fersk:</div>
            <div className="font-bold">kr {(box8kgPrice + deliveryFeeE6 + freshFee).toLocaleString('nb-NO')}</div>
            <div>12 kg total + Trondheim:</div>
            <div className="font-bold">kr {(box12kgPrice + deliveryFeeTrondheim).toLocaleString('nb-NO')}</div>
          </div>
        </div>
      </Card>

      {/* Cutoff Date Configuration */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Bestillingsfrist (Cutoff)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>År</Label>
            <Input
              type="number"
              value={cutoffYear}
              onChange={(e) => setCutoffYear(parseInt(e.target.value) || 2026)}
              className="mt-2"
              min="2026"
              max="2030"
            />
          </div>

          <div>
            <Label>Uke</Label>
            <Input
              type="number"
              value={cutoffWeek}
              onChange={(e) => setCutoffWeek(parseInt(e.target.value) || 1)}
              className="mt-2"
              min="1"
              max="52"
            />
          </div>
        </div>

        <div className="mt-4 p-4 rounded-lg bg-amber-50 border border-amber-200">
          <p className="text-sm text-amber-900">
            <strong>Aktiv frist:</strong> Uke {cutoffWeek}, {cutoffYear}
          </p>
          <p className="text-xs text-amber-700 mt-1">
            Etter denne datoen kan kunder ikke lenger endre eller kansellere bestillinger
          </p>
        </div>
      </Card>

      {/* Contact Information */}
      <Card className="p-6">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Kontaktinformasjon
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>E-postadresse</Label>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">Vises til kunder i support-seksjonen</p>
          </div>

          <div>
            <Label>Telefonnummer</Label>
            <Input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-2"
            />
            <p className="text-sm text-gray-600 mt-1">Vises til kunder i support-seksjonen</p>
          </div>
        </div>
      </Card>

      {/* Save Button */}
      <Card className="p-6 bg-gradient-to-r from-green-50 to-green-100 border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-900">Klar til å lagre endringer?</p>
            <p className="text-sm text-green-700">Alle oppdateringer vil tre i kraft umiddelbart</p>
          </div>
          <Button
            onClick={saveConfig}
            disabled={saving}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            <Save className="w-5 h-5 mr-2" />
            {saving ? 'Lagrer...' : 'Lagre konfigurasjon'}
          </Button>
        </div>
      </Card>

      {/* Additional Settings Placeholder */}
      <Card className="p-6 bg-gray-50">
        <h3 className="font-semibold text-lg mb-2">Kommende innstillinger</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
          <li>E-postmal redigering</li>
          <li>Automatiske varsler</li>
          <li>Ekstraprodukter katalog</li>
          <li>Sesonginnstillinger</li>
        </ul>
      </Card>
    </div>
  );
}
