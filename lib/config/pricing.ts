import { supabaseAdmin } from '@/lib/supabase/server';

export interface PricingConfig {
  box_8kg_price: number;
  box_12kg_price: number;
  box_8kg_deposit_percentage: number;
  box_12kg_deposit_percentage: number;
  delivery_fee_pickup_e6: number;
  delivery_fee_trondheim: number;
  fresh_delivery_fee: number;
}

/**
 * Fetch all pricing configuration from database
 * Box prices come from box_configurations table (set in Admin Panel)
 * Other config comes from app_config table
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    // Fetch box prices from box_configurations table (set in Admin -> Boksinnhold)
    const { data: boxConfigs, error: boxError } = await supabaseAdmin
      .from('box_configurations')
      .select('box_size, price')
      .in('box_size', [8, 12]);

    if (boxError) {
      console.error('Error fetching box configurations:', boxError);
      throw boxError;
    }

    const box8kg = boxConfigs?.find(b => b.box_size === 8);
    const box12kg = boxConfigs?.find(b => b.box_size === 12);

    if (!box8kg || !box12kg) {
      throw new Error('Critical pricing configuration missing: box prices not found in box_configurations table');
    }

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

    if (configError) {
      console.error('Error fetching app config:', configError);
      throw configError;
    }

    const configMap = new Map(appConfigs?.map(c => [c.key, c.value]) || []);

    return {
      box_8kg_price: box8kg.price,
      box_12kg_price: box12kg.price,
      box_8kg_deposit_percentage: parseInt(configMap.get('box_8kg_deposit_percentage') || '50'),
      box_12kg_deposit_percentage: parseInt(configMap.get('box_12kg_deposit_percentage') || '50'),
      delivery_fee_pickup_e6: parseInt(configMap.get('delivery_fee_pickup_e6') || '300'),
      delivery_fee_trondheim: parseInt(configMap.get('delivery_fee_trondheim') || '200'),
      fresh_delivery_fee: parseInt(configMap.get('fresh_delivery_fee') || '500'),
    };
  } catch (error) {
    console.error('Failed to fetch pricing config:', error);
    // Re-throw error - do not hide database issues with fallback values
    throw new Error('Unable to fetch pricing configuration from database');
  }
}
