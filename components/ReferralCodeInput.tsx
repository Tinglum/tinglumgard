'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReferralCodeInputProps {
  onCodeApplied: (codeData: {
    code: string;
    discountPercentage: number;
    discountAmount: number;
    referrerUserId: string;
  }) => void;
  onCodeRemoved: () => void;
  depositAmount: number;
  className?: string;
}

export function ReferralCodeInput({
  onCodeApplied,
  onCodeRemoved,
  depositAmount,
  className,
}: ReferralCodeInputProps) {
  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError('Vennligst skriv inn en kode');
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.trim() }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || 'Ugyldig kode');
        return;
      }

      // Calculate discount amount (20% of deposit)
      const discountAmount = Math.round(depositAmount * 0.20);

      setAppliedCode(code.toUpperCase().trim());
      onCodeApplied({
        code: code.toUpperCase().trim(),
        discountPercentage: data.discount_percentage,
        discountAmount,
        referrerUserId: data.referrer_user_id,
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setError('Kunne ikke validere koden');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setAppliedCode(null);
    setCode('');
    setError(null);
    onCodeRemoved();
  };

  if (appliedCode) {
    return (
      <div className={cn('rounded-lg border-2 border-green-200 bg-green-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <div>
              <p className="font-semibold text-green-900">Kode aktivert: {appliedCode}</p>
              <p className="text-sm text-green-700">
                Du får 20% rabatt på forskuddet ({Math.round(depositAmount * 0.20)} kr)
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            Fjern
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-gray-500" />
        <label className="text-sm font-medium text-gray-700">
          Har du en vennerabattkode?
        </label>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="Skriv inn kode"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleValidate();
            }
          }}
          className={cn(
            'flex-1 uppercase',
            error && 'border-red-300 focus:border-red-500'
          )}
          disabled={isValidating}
          maxLength={20}
        />
        <Button
          type="button"
          onClick={handleValidate}
          disabled={isValidating || !code.trim()}
          className="px-6"
        >
          {isValidating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sjekker...
            </>
          ) : (
            'Bruk kode'
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <p className="text-xs text-gray-500">
        Nye kunder får 20% rabatt på forskuddet ved bruk av vennerabattkode
      </p>
    </div>
  );
}
