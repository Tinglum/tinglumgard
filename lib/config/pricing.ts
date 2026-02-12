import { supabaseAdmin } from '@/lib/supabase/server';
import { getCachedPricing } from './cache';

export interface PricingConfig {
  delivery_fee_pickup_e6: number;
  delivery_fee_trondheim: number;
  fresh_delivery_fee: number;
}

/**
 * Fetch all pricing configuration from database (internal, uncached)
 * Delivery fee config comes from app_config table
 */
async function fetchPricingConfigFromDB(): Promise<PricingConfig> {
  try {
    // Fetch delivery fee config from app_config
    const { data: appConfigs, error: configError } = await supabaseAdmin
      .from('app_config')
      .select('key, value')
      .in('key', [
        'delivery_fee_pickup_e6',
        'delivery_fee_trondheim',
        'fresh_delivery_fee',
      ]);

    if (configError) {
      console.error('Error fetching app config:', configError);
      throw configError;
    }

    const configMap = new Map(appConfigs?.map(c => [c.key, c.value]) || []);

    // Validate all required config exists
    const requiredKeys = [
      'delivery_fee_pickup_e6',
      'delivery_fee_trondheim',
      'fresh_delivery_fee',
    ];

    const missingKeys = requiredKeys.filter(key => !configMap.has(key));
    if (missingKeys.length > 0) {
      throw new Error(`Missing required config keys in app_config: ${missingKeys.join(', ')}`);
    }

    return {
      delivery_fee_pickup_e6: parseInt(configMap.get('delivery_fee_pickup_e6')!),
      delivery_fee_trondheim: parseInt(configMap.get('delivery_fee_trondheim')!),
      fresh_delivery_fee: parseInt(configMap.get('fresh_delivery_fee')!),
    };
  } catch (error) {
    console.error('Failed to fetch pricing config:', error);
    // Re-throw error - do not hide database issues with fallback values
    throw new Error('Unable to fetch pricing configuration from database');
  }
}

/**
 * Get pricing configuration with caching (10 minute TTL)
 * Use this function in API routes for better performance
 */
export async function getPricingConfig(): Promise<PricingConfig> {
  return getCachedPricing(fetchPricingConfigFromDB);
}
