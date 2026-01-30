'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users,
  Gift,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Share2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { nb } from 'date-fns/locale';

interface ReferralStats {
  totalReferrals: number;
  creditsEarned: number;
  creditsAvailable: number;
  creditsUsed: number;
  maxUses: number;
  currentUses: number;
  unusedBonusCount: number;
}

interface Referral {
  id: string;
  name: string;
  date: string;
  orderNumber: string;
  discountAmount: number;
  creditAmount: number;
  creditApplied: boolean;
}

export function ReferralDashboard() {
  const [loading, setLoading] = useState(true);
  const [hasCode, setHasCode] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  const [creatingCode, setCreatingCode] = useState(false);
  const [newCodeInput, setNewCodeInput] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadReferralData();
  }, []);

  async function loadReferralData() {
    try {
      const response = await fetch('/api/referrals');
      const data = await response.json();

      setHasCode(data.hasCode);
      setCode(data.code);
      setStats(data.stats);
      setReferrals(data.referrals || []);
    } catch (error) {
      console.error('Error loading referral data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCode() {
    if (!newCodeInput.trim()) {
      setCreateError('Vennligst skriv inn en kode');
      return;
    }

    setCreatingCode(true);
    setCreateError(null);

    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          code: newCodeInput.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setCreateError(data.error || 'Kunne ikke opprette kode');
        return;
      }

      // Reload data to show new code
      await loadReferralData();
      setNewCodeInput('');
    } catch (error) {
      console.error('Error creating code:', error);
      setCreateError('Kunne ikke opprette kode');
    } finally {
      setCreatingCode(false);
    }
  }

  function handleCopyCode() {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function handleShareCode() {
    if (code) {
      const shareText = `Bestill ullgris fra Tinglum Gård og få 20% rabatt på forskuddet med min vennerabattkode: ${code}\n\n${window.location.origin}/bestill`;

      if (navigator.share) {
        navigator.share({
          title: 'Tinglum Gård - Vennerabatt',
          text: shareText,
        });
      } else {
        navigator.clipboard.writeText(shareText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  }

  if (loading) {
    return (
      <Card className="p-12 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto text-gray-400" />
      </Card>
    );
  }

  if (!hasCode) {
    return (
      <Card className="p-8">
        <div className="max-w-xl mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Gift className="h-8 w-8 text-green-600" />
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Opprett vennerabattkode</h2>
              <p className="text-gray-600">
                Få 10% kreditt for hver venn som bruker din kode
              </p>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="font-semibold text-green-900 mb-3">Slik fungerer det:</h3>
            <ul className="space-y-2 text-sm text-green-800">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>Dine venner får <strong>20% rabatt</strong> på forskuddet</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>Du får <strong>10% kreditt</strong> som kan brukes på restbeløpet</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>Du kan gi rabatt til <strong>5 venner per kasse</strong> du bestiller</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <span>Kreditten din kan brukes senere eller på neste ordre</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Velg din unike kode (4-20 tegn, kun bokstaver og tall)
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="f.eks. KENNETH2026"
                  value={newCodeInput}
                  onChange={(e) => {
                    setNewCodeInput(e.target.value.toUpperCase());
                    setCreateError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreateCode();
                    }
                  }}
                  className="flex-1 uppercase"
                  maxLength={20}
                  disabled={creatingCode}
                />
                <Button
                  onClick={handleCreateCode}
                  disabled={creatingCode || !newCodeInput.trim()}
                  className="px-6"
                >
                  {creatingCode ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Oppretter...
                    </>
                  ) : (
                    'Opprett kode'
                  )}
                </Button>
              </div>
              {createError && (
                <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  {createError}
                </p>
              )}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Code Display Card */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Din vennerabattkode</h2>
            <p className="text-sm text-gray-600">Del denne koden med venner og familie</p>
          </div>
          <Gift className="h-8 w-8 text-green-600" />
        </div>

        <div className="bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200 rounded-lg p-6 mb-4">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-2">Din kode:</p>
            <p className="text-4xl font-bold text-gray-900 tracking-wider mb-4">{code}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={handleCopyCode} variant="outline" size="sm">
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="mr-2 h-4 w-4" />
                    Kopier kode
                  </>
                )}
              </Button>
              <Button onClick={handleShareCode} variant="outline" size="sm">
                <Share2 className="mr-2 h-4 w-4" />
                Del kode
              </Button>
            </div>
          </div>
        </div>

        <p className="text-sm text-gray-600 text-center">
          Venner får 20% rabatt på forskuddet • Du får 10% kreditt per henvisning
        </p>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Totale henvisninger</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.totalReferrals || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Tilgjengelig kreditt</p>
              <p className="text-3xl font-bold text-green-600">
                {stats?.creditsAvailable.toLocaleString('nb-NO')} kr
              </p>
            </div>
            <Gift className="h-8 w-8 text-green-600" />
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Kredittering igjen</p>
              <p className="text-3xl font-bold text-gray-900">
                {stats ? stats.maxUses - stats.currentUses : 0}
              </p>
              <p className="text-xs text-gray-500">av {stats?.maxUses || 5}</p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-purple-600" />
          </div>
        </Card>
      </div>

      {/* Unused Bonus Alert */}
      {stats && stats.unusedBonusCount > 0 && (
        <Card className="p-6 bg-yellow-50 border-yellow-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-yellow-900 mb-1">
                Du har {stats.unusedBonusCount} ubrukte bonuser!
              </h3>
              <p className="text-sm text-yellow-800 mb-3">
                Du har henvist flere venner enn du kan få kreditt for med din nåværende bestilling.
                Bestill en ekstra kasse for å få 5 flere kredittering.
              </p>
              <Button size="sm" variant="outline" className="bg-white">
                Bestill ny kasse
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Referrals List */}
      {referrals.length > 0 && (
        <Card className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Dine henvisninger</h3>
          <div className="space-y-3">
            {referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{referral.name}</p>
                  <p className="text-sm text-gray-600">
                    {format(new Date(referral.date), 'dd. MMM yyyy', { locale: nb })} • Ordre{' '}
                    {referral.orderNumber}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-green-600">
                    +{referral.creditAmount.toLocaleString('nb-NO')} kr
                  </p>
                  <p className="text-xs text-gray-500">
                    {referral.creditApplied ? 'Brukt' : 'Tilgjengelig'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
