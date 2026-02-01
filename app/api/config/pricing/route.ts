import { NextResponse } from 'next/server';
import { getPricingConfig } from '@/lib/config/pricing';
import { logError } from '@/lib/logger';

export async function GET() {
  try {
    const pricing = await getPricingConfig();

    return NextResponse.json({
      box_8kg_price: pricing.box_8kg_price,
      box_12kg_price: pricing.box_12kg_price,
      box_8kg_deposit_percentage: pricing.box_8kg_deposit_percentage,
      box_12kg_deposit_percentage: pricing.box_12kg_deposit_percentage,
      deposit_percentage: pricing.box_8kg_deposit_percentage, // For homepage compatibility
      delivery_fee_pickup_e6: pricing.delivery_fee_pickup_e6,
      delivery_fee_trondheim: pricing.delivery_fee_trondheim,
      fresh_delivery_fee: pricing.fresh_delivery_fee,
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
