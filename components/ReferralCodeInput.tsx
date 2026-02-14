'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tag, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';

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
  initialCode?: string | null;
  autoApplyInitialCode?: boolean;
}

export function ReferralCodeInput({
  onCodeApplied,
  onCodeRemoved,
  depositAmount,
  className,
  initialCode,
  autoApplyInitialCode = false,
}: ReferralCodeInputProps) {
  const { t, lang } = useLanguage();
  const locale = lang === 'en' ? 'en-US' : 'nb-NO';

  const [code, setCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [appliedCode, setAppliedCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleValidate = useCallback(async (incomingCode?: string) => {
    const codeValue = (incomingCode ?? code).trim();
    if (!codeValue) {
      setError(t.referrals.pleaseEnterCode);
      return;
    }

    setIsValidating(true);
    setError(null);

    try {
      const response = await fetch('/api/referrals/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: codeValue }),
      });

      const data = await response.json();

      if (!response.ok || !data.valid) {
        setError(data.error || t.referrals.invalidCode);
        return;
      }

      const discountAmount = Math.round(depositAmount * 0.20);
      const normalizedCode = codeValue.toUpperCase();

      setAppliedCode(normalizedCode);
      onCodeApplied({
        code: normalizedCode,
        discountPercentage: data.discount_percentage,
        discountAmount,
        referrerUserId: data.referrer_user_id,
      });
    } catch (err) {
      console.error('Error validating code:', err);
      setError(t.referrals.couldNotValidate);
    } finally {
      setIsValidating(false);
    }
  }, [code, depositAmount, onCodeApplied, t.referrals]);

  useEffect(() => {
    const normalized = (initialCode || '').trim().toUpperCase();
    if (!normalized || appliedCode) return;
    setCode(normalized);
    setError(null);
    if (autoApplyInitialCode) {
      void handleValidate(normalized);
    }
  }, [appliedCode, autoApplyInitialCode, handleValidate, initialCode]);

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
              <p className="font-semibold text-green-900">
                {t.referrals.codeActivated.replace('{code}', appliedCode)}
              </p>
              <p className="text-sm text-green-700">
                {t.referrals.youGet20Off.replace('{amount}', Math.round(depositAmount * 0.20).toLocaleString(locale))}
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
    <div className={cn('space-y-3 rounded-lg border-2 border-amber-200 bg-amber-50 p-4', className)}>
      <div className="flex items-center gap-2">
        <Tag className="h-5 w-5 text-amber-600" />
        <label className="text-base font-semibold text-amber-900">
          {t.referrals.haveCode}
        </label>
      </div>
      <p className="text-sm text-amber-700">
        {t.referrals.youGet20Off.replace('{amount}', Math.round(depositAmount * 0.20).toLocaleString(locale))}
      </p>

      <div className="flex gap-2">
        <Input
          type="text"
          placeholder={t.referrals.enterCode}
          value={code}
          onChange={(event) => {
            setCode(event.target.value.toUpperCase());
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
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
          onClick={() => {
            void handleValidate();
          }}
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

      <p className="text-xs text-gray-500">
        {t.referrals.newCustomersGet20}
      </p>
    </div>
  );
}
