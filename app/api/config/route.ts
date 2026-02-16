import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/config/pricing';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('key', 'order_modification_cutoff')
      .maybeSingle();

    // Try to fetch optional box_contents stored in app_config as JSON
    const { data: boxCfg } = await supabaseAdmin
      .from('app_config')
      .select('value')
      .eq('key', 'box_contents')
      .maybeSingle();

    const { data: contactRows } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone']);

    const { data: legacyContactRows } = await supabaseAdmin
      .from('config')
      .select('key, value')
      .in('key', ['contact_email', 'contact_phone']);

    if (error) throw error;

    // Fetch pricing configuration
    const pricing = await getPricingConfig();

    // parse optional box_contents value (stored as jsonb in app_config)
    let box_contents = null;
    try {
      if (boxCfg && boxCfg.value) {
        box_contents = typeof boxCfg.value === 'string' ? JSON.parse(boxCfg.value) : boxCfg.value;
      }
    } catch (err) {
      console.warn('Failed to parse box_contents config', err);
      box_contents = null;
    }

    const contactMap = (contactRows || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);

    const legacyContactMap = (legacyContactRows || []).reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, unknown>);

    const contactEmail =
      (typeof contactMap.contact_email === 'string' && contactMap.contact_email.trim()) ||
      (typeof legacyContactMap.contact_email === 'string' && legacyContactMap.contact_email.trim()) ||
      'post@tinglum.no';

    const contactPhone =
      (typeof contactMap.contact_phone === 'string' && contactMap.contact_phone.trim()) ||
      (typeof legacyContactMap.contact_phone === 'string' && legacyContactMap.contact_phone.trim()) ||
      '+47 123 45 678';

    return NextResponse.json({
      cutoff: config?.value || { year: 2026, week: 46 },
      box_contents,
      contact: {
        email: contactEmail,
        phone: contactPhone,
      },
      pricing: {
        deposit_percentage: 50,
        delivery_fee_pickup_e6: pricing.delivery_fee_pickup_e6,
        delivery_fee_trondheim: pricing.delivery_fee_trondheim,
        fresh_delivery_fee: pricing.fresh_delivery_fee,
      },
    });
  } catch (error) {
    logError('config-route', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
