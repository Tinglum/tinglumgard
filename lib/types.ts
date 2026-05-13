/**
 * Shared domain types used across multiple pages/components.
 * Keep this file focused — only add types that are genuinely shared.
 */

export type Extra = {
  id: string;
  slug: string;
  name_no: string;
  name_en?: string | null;
  description_no?: string | null;
  description_en?: string | null;
  description_premium_no?: string | null;
  description_premium_en?: string | null;
  preparation_tips_no?: string | null;
  preparation_tips_en?: string | null;
  chef_term_no?: string | null;
  chef_term_en?: string | null;
  price_nok: number;
  pricing_type?: 'per_kg' | 'fixed' | string | null;
  active: boolean;
  cut_id?: string | null;
  cut_slug?: string | null;
  part_key?: string | null;
  default_quantity?: number | null;
  fixed_quantity?: number | null;
  cut_size_from_kg?: number | null;
  cut_size_to_kg?: number | null;
  display_order?: number | null;
  recipe_suggestions?: unknown;
  [key: string]: unknown;
};
