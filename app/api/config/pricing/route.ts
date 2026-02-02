import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    // Fetch prices from box_configurations table (set in Admin -> Boksinnhold)
    const { data: boxConfigs, error: boxError } = await supabaseAdmin
      .from('box_configurations')
      .select('box_size, price')
      .in('box_size', [8, 12]);

    if (boxError) throw boxError;

    const box8kg = boxConfigs?.find(b => b.box_size === 8);
    const box12kg = boxConfigs?.find(b => b.box_size === 12);

    // Fetch other config from app_config
    const { data: appConfigs, error: configError } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', [
        'box_8kg_deposit_percentage',
        'box_12kg_deposit_percentage',
        'delivery_fee_pickup_e6',
        'delivery_fee_trondheim',
        'fresh_delivery_fee',
      ]);

    if (configError) throw configError;

    const configMap = new Map(appConfigs?.map(c => [c.key, c.value]) || []);

    return NextResponse.json({
      box_8kg_price: box8kg?.price || 0,
      box_12kg_price: box12kg?.price || 0,
      box_8kg_deposit_percentage: parseInt(configMap.get('box_8kg_deposit_percentage') || '50'),
      box_12kg_deposit_percentage: parseInt(configMap.get('box_12kg_deposit_percentage') || '50'),
      deposit_percentage: parseInt(configMap.get('box_8kg_deposit_percentage') || '50'),
      delivery_fee_pickup_e6: parseInt(configMap.get('delivery_fee_pickup_e6') || '300'),
      delivery_fee_trondheim: parseInt(configMap.get('delivery_fee_trondheim') || '200'),
      fresh_delivery_fee: parseInt(configMap.get('fresh_delivery_fee') || '500'),
    }, {
      headers: {
        'Cache-Control': 'no-store, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    logError('config-pricing-route', error);
    return NextResponse.json(
      { error: 'Failed to fetch pricing configuration' },
      { status: 500 }
    );
  }
}
