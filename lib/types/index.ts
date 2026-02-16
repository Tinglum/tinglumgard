/**
 * Core domain types for Tinglum Gard application
 */

export interface Extra {
  id: string;
  slug: string;
  name_no: string;
  name_en: string;
  description_no?: string | null;
  description_en?: string | null;

  // Optional canonical cut enrichment (when extras are linked to cuts_catalog)
  cut_id?: string | null;
  cut_slug?: string | null;
  part_key?: string | null;
  part_name_no?: string | null;
  part_name_en?: string | null;
  cut_description_no?: string | null;
  cut_description_en?: string | null;
  cut_size_from_kg?: number | null;
  cut_size_to_kg?: number | null;

  // Premium storytelling fields (used for Mangalitsa upsell UI)
  description_premium_no?: string | null;
  description_premium_en?: string | null;
  chef_term_no?: string | null;
  chef_term_en?: string | null;
  recipe_suggestions?: any[] | null;
  preparation_tips_no?: string | null;
  preparation_tips_en?: string | null;

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
    deposit_percentage: number;
    delivery_fee_pickup_e6: number;
    delivery_fee_trondheim: number;
    fresh_delivery_fee: number;
  };
}

export interface ExtrasResponse {
  extras: Extra[];
}

// ================================================
// ANALYTICS & COMMUNICATION TYPES
// ================================================

export interface Notification {
  id: string;
  customer_phone: string;
  type: 'order_update' | 'delivery_reminder' | 'referral_reward' | 'promo' | 'support_response';
  title: string;
  message: string;
  action_url?: string | null;
  is_read: boolean;
  read_at?: string | null;
  created_at: string;
  expires_at?: string | null;
}

export interface NotificationPreferences {
  id: string;
  customer_phone: string;
  email_enabled: boolean;
  sms_enabled: boolean;
  order_updates_enabled: boolean;
  delivery_reminders_enabled: boolean;
  referral_notifications_enabled: boolean;
  promotional_enabled: boolean;
  updated_at: string;
}

export interface CustomerMessage {
  id: string;
  order_id?: string | null;
  customer_phone: string;
  customer_name?: string | null;
  customer_email?: string | null;
  subject: string;
  message: string;
  message_type: 'support' | 'inquiry' | 'complaint' | 'feedback' | 'referral_question';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
}

export interface MessageReply {
  id: string;
  message_id: string;
  admin_name?: string | null;
  reply_text: string;
  is_internal: boolean;
  created_at: string;
}

export interface AnalyticsSnapshot {
  id: string;
  snapshot_date: string;
  total_orders: number;
  total_revenue_nok: number;
  avg_order_value_nok: number;
  new_customers: number;
  repeat_customers: number;
  referrals_used: number;
  referral_revenue_nok: number;
  top_referrer_phone?: string | null;
  inventory_level_kg: number;
  low_stock_alerts: number;
  website_visitors: number;
  checkout_abandonment_rate: number;
  created_at: string;
}

export interface CustomerInsight {
  id: string;
  customer_phone: string;
  total_orders: number;
  lifetime_value_nok: number;
  avg_days_between_orders?: number | null;
  last_order_date?: string | null;
  days_since_last_order?: number | null;
  is_active: boolean;
  is_new_customer: boolean;
  is_loyal: boolean;
  is_at_risk: boolean;
  has_referral_code: boolean;
  referral_count: number;
  referral_revenue_nok: number;
  preferred_box_size?: string | null;
  preferred_extras?: string[] | null;
  updated_at: string;
}

export interface AnalyticsEvent {
  id: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  event_type: string;
  event_data?: Record<string, any> | null;
  created_at: string;
}
