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
 * Falls back to defaults only if database is completely unavailable
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  try {
    const { data: configs, error } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', [
        'box_8kg_price',
        'box_12kg_price',
        'box_8kg_deposit_percentage',
        'box_12kg_deposit_percentage',
        'delivery_fee_pickup_e6',
        'delivery_fee_trondheim',
        'fresh_delivery_fee',
      ]);

    if (error) {
      console.error('Error fetching pricing config:', error);
      throw error;
    }

    const configMap = new Map<string, string>();
    configs?.forEach((c) => {
      configMap.set(c.key, c.value);
    });

    return {
      box_8kg_price: parseInt(configMap.get('box_8kg_price') || '3500'),
      box_12kg_price: parseInt(configMap.get('box_12kg_price') || '4800'),
      box_8kg_deposit_percentage: parseInt(configMap.get('box_8kg_deposit_percentage') || '50'),
      box_12kg_deposit_percentage: parseInt(configMap.get('box_12kg_deposit_percentage') || '50'),
      delivery_fee_pickup_e6: parseInt(configMap.get('delivery_fee_pickup_e6') || '300'),
      delivery_fee_trondheim: parseInt(configMap.get('delivery_fee_trondheim') || '200'),
      fresh_delivery_fee: parseInt(configMap.get('fresh_delivery_fee') || '500'),
    };
  } catch (error) {
    console.error('Failed to fetch pricing config:', error);
    // Return defaults only if database is unavailable
    return {
      box_8kg_price: 3500,
      box_12kg_price: 4800,
      box_8kg_deposit_percentage: 50,
      box_12kg_deposit_percentage: 50,
      delivery_fee_pickup_e6: 300,
      delivery_fee_trondheim: 200,
      fresh_delivery_fee: 500,
    };
  }
}
