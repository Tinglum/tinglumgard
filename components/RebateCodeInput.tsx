'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

interface RebateCodeInputProps {
  onCodeApplied: (codeData: {
    code: string;
    discountAmount: number;
    description: string;
  }) => void;
  onCodeRemoved: () => void;
  depositAmount: number;
  boxSize: number;
  customerPhone?: string;
  customerEmail?: string;
  className?: string;
}

export function RebateCodeInput({
  onCodeApplied,
  onCodeRemoved,
  depositAmount,
  boxSize,
  customerPhone,
  customerEmail,
  className,
}: RebateCodeInputProps) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [appliedDescription, setAppliedDescription] = useState<string | null>(null);
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!code.trim()) {
      setError(t.referrals.pleaseEnterCode);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/rebate-codes/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.trim(),
          boxSize,
          depositAmount,
          customerPhone: customerPhone || '',
          customerEmail: customerEmail || '',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || t.referrals.invalidCode);
        return;
      }

      setAppliedCode(code.toUpperCase().trim());
      setAppliedDescription(data.description);
      setAppliedDiscount(data.discount_amount);
      onCodeApplied({
        code: code.toUpperCase().trim(),
        discountAmount: data.discount_amount,
        description: data.description,
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setError(t.referrals.couldNotValidate);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemove = () => {
    setAppliedCode(null);
    setAppliedDescription(null);
    setAppliedDiscount(0);
    setCode('');
    setError(null);
    onCodeRemoved();
  };

  if (appliedCode) {
    return (
      <div className={cn('rounded-lg border-2 border-blue-200 bg-blue-50 p-4', className)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-blue-600" />
            <div>
              <p className="font-semibold text-blue-900">
                {t.referrals.codeActivated.replace('{code}', appliedCode)}
              </p>
              <p className="text-sm text-blue-700">
                {appliedDescription && `${appliedDescription} - `}
                {t.referrals.youSave
                  .replace('{amount}', appliedDiscount.toLocaleString(locale))
                  .replace('NOK', t.common.currency)}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleRemove}>
            {t.referrals.remove}
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
          {t.referrals.haveRebateCode}
        </label>
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={t.referrals.enterCode}
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
              {t.referrals.checking}
            </>
          ) : (
            t.referrals.useCode
          )}
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 p-3 text-sm text-red-700">
          <XCircle className="h-4 w-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
