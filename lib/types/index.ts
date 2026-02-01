/**
 * Core domain types for Tinglum Gård application
 */

export interface Extra {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description_no?: string | null;
  description_en?: string | null;
  price_nok: number;
  pricing_type: 'per_unit' | 'per_kg';
  default_quantity?: number | null;
  active: boolean;
  display_order?: number;
  created_at?: string;
  updated_at?: string;
}

export interface BoxContents {
  inBox: string[];
  canOrder?: string[];
}

export interface ConfigResponse {
  cutoff?: {
    year: number;
    week: number;
  };
  box_contents?: BoxContents | null;
  pricing: {
    box_8kg_price: number;
    box_12kg_price: number;
    box_8kg_deposit_percentage: number;
    box_12kg_deposit_percentage: number;
    delivery_fee_pickup_e6: number;
    delivery_fee_trondheim: number;
    fresh_delivery_fee: number;
  };
}

export interface ExtrasResponse {
  extras: Extra[];
}
