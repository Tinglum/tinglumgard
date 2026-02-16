import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asString(value: unknown, fallback: string): string {
  if (typeof value === 'string' && value.trim().length > 0) return value;
  return fallback;
}

function isMissingColumnError(error: any, columnName: string): boolean {
  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const needle = columnName.toLowerCase();
  return (
    message.includes(needle) ||
    details.includes(needle) ||
    hint.includes(needle)
  );
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { data: appConfigRows } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', [
        'delivery_fee_pickup_e6',
        'delivery_fee_trondheim',
        'fresh_delivery_fee',
        'order_modification_cutoff',
        'contact_email',
        'contact_phone',
      ]);

    const appConfigMap = (appConfigRows || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);

    // Backward-compatibility: pull from legacy config table if needed.
    const { data: legacyConfigRows } = await supabaseAdmin
      .from('config')
      .select('key, value')
      .in('key', [
        'delivery_fee_pickup_e6',
        'delivery_fee_trondheim',
        'fresh_delivery_fee',
        'cutoff_year',
        'cutoff_week',
        'contact_email',
        'contact_phone',
      ]);

    const legacyMap = (legacyConfigRows || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);

    const cutoffValue =
      (appConfigMap.order_modification_cutoff as { year?: number; week?: number } | null) || null;

    const config = {
      pricing: {
        delivery_fee_pickup_e6: asNumber(
          appConfigMap.delivery_fee_pickup_e6 ?? legacyMap.delivery_fee_pickup_e6,
          300
        ),
        delivery_fee_trondheim: asNumber(
          appConfigMap.delivery_fee_trondheim ?? legacyMap.delivery_fee_trondheim,
          200
        ),
        fresh_delivery_fee: asNumber(
          appConfigMap.fresh_delivery_fee ?? legacyMap.fresh_delivery_fee,
          500
        ),
      },
      cutoff: {
        year: asNumber(cutoffValue?.year ?? legacyMap.cutoff_year, 2026),
        week: asNumber(cutoffValue?.week ?? legacyMap.cutoff_week, 46),
      },
      contact: {
        email: asString(appConfigMap.contact_email ?? legacyMap.contact_email, 'post@tinglum.no'),
        phone: asString(appConfigMap.contact_phone ?? legacyMap.contact_phone, '+47 123 45 678'),
      },
    };

    return NextResponse.json({ config });
  } catch (error) {
    console.error('Configuration GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch configuration' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { pricing, cutoff, contact } = body || {};

    const appConfigUpdates: Array<{ key: string; value: unknown; description: string }> = [];

    if (pricing) {
      appConfigUpdates.push(
        {
          key: 'delivery_fee_pickup_e6',
          value: Number(pricing.delivery_fee_pickup_e6),
          description: 'Pickup fee at E6 location in NOK',
        },
        {
          key: 'delivery_fee_trondheim',
          value: Number(pricing.delivery_fee_trondheim),
          description: 'Delivery fee in Trondheim in NOK',
        },
        {
          key: 'fresh_delivery_fee',
          value: Number(pricing.fresh_delivery_fee),
          description: 'Fresh delivery upgrade fee in NOK',
        }
      );
    }

    if (cutoff) {
      appConfigUpdates.push({
        key: 'order_modification_cutoff',
        value: {
          year: Number(cutoff.year),
          week: Number(cutoff.week),
          reason: 'Admin updated cutoff',
        },
        description: 'Week number after which orders cannot be modified',
      });
    }

    if (contact) {
      appConfigUpdates.push(
        {
          key: 'contact_email',
          value: String(contact.email || ''),
          description: 'Contact email shown in customer support areas',
        },
        {
          key: 'contact_phone',
          value: String(contact.phone || ''),
          description: 'Contact phone shown in customer support areas',
        }
      );
    }

    if (appConfigUpdates.length > 0) {
      let { error: appConfigError } = await supabaseAdmin
        .from('app_config')
        .upsert(appConfigUpdates, { onConflict: 'key' });

      // Some environments do not have app_config.description yet.
      if (appConfigError && isMissingColumnError(appConfigError, 'description')) {
        const fallbackUpdates = appConfigUpdates.map(({ key, value }) => ({ key, value }));
        const fallback = await supabaseAdmin
          .from('app_config')
          .upsert(fallbackUpdates, { onConflict: 'key' });
        appConfigError = fallback.error;
      }

      if (appConfigError) {
        throw appConfigError;
      }
    }

    // Backward-compatibility write to legacy config if table is still in use.
    const legacyUpdates: Array<{ key: string; value: string }> = [];
    if (pricing) {
      legacyUpdates.push(
        { key: 'delivery_fee_pickup_e6', value: String(pricing.delivery_fee_pickup_e6) },
        { key: 'delivery_fee_trondheim', value: String(pricing.delivery_fee_trondheim) },
        { key: 'fresh_delivery_fee', value: String(pricing.fresh_delivery_fee) }
      );
    }
    if (cutoff) {
      legacyUpdates.push(
        { key: 'cutoff_year', value: String(cutoff.year) },
        { key: 'cutoff_week', value: String(cutoff.week) }
      );
    }
    if (contact) {
      legacyUpdates.push(
        { key: 'contact_email', value: String(contact.email || '') },
        { key: 'contact_phone', value: String(contact.phone || '') }
      );
    }

    if (legacyUpdates.length > 0) {
      const legacyResult = await supabaseAdmin.from('config').upsert(legacyUpdates, { onConflict: 'key' });
      if (legacyResult.error) {
        // Legacy table is optional in newer deployments.
        console.warn('Legacy config upsert skipped:', legacyResult.error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Configuration POST error:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
