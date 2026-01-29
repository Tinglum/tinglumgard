import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    // Fetch all config values
    const { data: configData } = await supabaseAdmin
      .from('config')
      .select('key, value');

    const configMap = configData?.reduce((acc, item) => {
      acc[item.key] = item.value;
      return acc;
    }, {} as Record<string, any>) || {};

    const config = {
      pricing: {
        box_8kg: parseInt(configMap['box_8kg_price'] || '3500'),
        box_12kg: parseInt(configMap['box_12kg_price'] || '4800'),
        box_8kg_deposit_percentage: parseInt(configMap['box_8kg_deposit_percentage'] || '50'),
        box_12kg_deposit_percentage: parseInt(configMap['box_12kg_deposit_percentage'] || '50'),
        delivery_fee_pickup_e6: parseInt(configMap['delivery_fee_pickup_e6'] || '300'),
        delivery_fee_trondheim: parseInt(configMap['delivery_fee_trondheim'] || '200'),
        fresh_delivery_fee: parseInt(configMap['fresh_delivery_fee'] || '500'),
      },
      cutoff: {
        year: parseInt(configMap['cutoff_year'] || '2026'),
        week: parseInt(configMap['cutoff_week'] || '46'),
      },
      contact: {
        email: configMap['contact_email'] || 'post@tinglum.no',
        phone: configMap['contact_phone'] || '+47 123 45 678',
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
    const { pricing, cutoff, contact } = body;

    // Update pricing
    if (pricing) {
      await supabaseAdmin.from('config').upsert([
        { key: 'box_8kg_price', value: pricing.box_8kg.toString() },
        { key: 'box_12kg_price', value: pricing.box_12kg.toString() },
        { key: 'box_8kg_deposit_percentage', value: pricing.box_8kg_deposit_percentage.toString() },
        { key: 'box_12kg_deposit_percentage', value: pricing.box_12kg_deposit_percentage.toString() },
        { key: 'delivery_fee_pickup_e6', value: pricing.delivery_fee_pickup_e6.toString() },
        { key: 'delivery_fee_trondheim', value: pricing.delivery_fee_trondheim.toString() },
        { key: 'fresh_delivery_fee', value: pricing.fresh_delivery_fee.toString() },
      ]);
    }

    // Update cutoff
    if (cutoff) {
      await supabaseAdmin.from('config').upsert([
        { key: 'cutoff_year', value: cutoff.year.toString() },
        { key: 'cutoff_week', value: cutoff.week.toString() },
      ]);
    }

    // Update contact
    if (contact) {
      await supabaseAdmin.from('config').upsert([
        { key: 'contact_email', value: contact.email },
        { key: 'contact_phone', value: contact.phone },
      ]);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Configuration POST error:', error);
    return NextResponse.json({ error: 'Failed to update configuration' }, { status: 500 });
  }
}
