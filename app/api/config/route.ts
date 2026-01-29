import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getPricingConfig } from '@/lib/config/pricing';

export async function GET() {
  try {
    const { data: config, error } = await supabaseAdmin
      .from('app_config')
      .select('*')
      .eq('key', 'order_modification_cutoff')
      .maybeSingle();

    if (error) throw error;

    // Fetch pricing configuration
    const pricing = await getPricingConfig();

    return NextResponse.json({
      cutoff: config?.value || { year: 2026, week: 46 },
      pricing: {
        box_8kg_price: pricing.box_8kg_price,
        box_12kg_price: pricing.box_12kg_price,
        box_8kg_deposit_percentage: pricing.box_8kg_deposit_percentage,
        box_12kg_deposit_percentage: pricing.box_12kg_deposit_percentage,
        delivery_fee_pickup_e6: pricing.delivery_fee_pickup_e6,
        delivery_fee_trondheim: pricing.delivery_fee_trondheim,
        fresh_delivery_fee: pricing.fresh_delivery_fee,
      },
    });
  } catch (error) {
    console.error('Error fetching config:', error);
    return NextResponse.json(
      { error: 'Failed to fetch configuration' },
      { status: 500 }
    );
  }
}
