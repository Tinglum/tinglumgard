import { supabaseAdmin } from '@/lib/supabase/server';
import type { EmailClassification } from '@/lib/email/types';

export interface ConsentDecision {
  allowed: boolean;
  reason?: string;
  preferenceFound?: boolean;
  suppressionReason?: string;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function normalizePhone(value?: string | null): string {
  return (value || '').replace(/\D/g, '');
}

export async function evaluateEmailConsent(params: {
  toEmail: string;
  toPhone?: string | null;
  classification: EmailClassification;
}): Promise<ConsentDecision> {
  const email = normalizeEmail(params.toEmail);
  const phone = normalizePhone(params.toPhone);

  const { data: suppression } = await supabaseAdmin
    .from('email_suppression_list')
    .select('reason')
    .ilike('email', email)
    .maybeSingle();

  if (suppression?.reason) {
    const suppressionReason = String(suppression.reason);
    if (params.classification === 'promotional') {
      return {
        allowed: false,
        reason: 'suppressed_promotional',
        suppressionReason,
      };
    }

    if (suppressionReason === 'bounced' || suppressionReason === 'complaint') {
      return {
        allowed: false,
        reason: 'suppressed_hard',
        suppressionReason,
      };
    }
  }

  if (params.classification !== 'promotional') {
    return { allowed: true };
  }

  let lookupPhone = phone;

  if (!lookupPhone && email) {
    const { data: userByEmail } = await supabaseAdmin
      .from('vipps_users')
      .select('phone_number')
      .ilike('email', email)
      .limit(1)
      .maybeSingle();

    lookupPhone = normalizePhone(userByEmail?.phone_number);
  }

  if (!lookupPhone) {
    return {
      allowed: true,
      preferenceFound: false,
    };
  }

  const { data: pref } = await supabaseAdmin
    .from('notification_preferences')
    .select('email_enabled, promotional_enabled')
    .eq('customer_phone', lookupPhone)
    .maybeSingle();

  if (!pref) {
    return {
      allowed: true,
      preferenceFound: false,
    };
  }

  const emailEnabled = pref.email_enabled !== false;
  const promotionalEnabled = pref.promotional_enabled !== false;

  if (!emailEnabled || !promotionalEnabled) {
    return {
      allowed: false,
      reason: 'promotional_opt_out',
      preferenceFound: true,
    };
  }

  return {
    allowed: true,
    preferenceFound: true,
  };
}
