-- Analytics & Communication Features Migration
-- Adds tables for: analytics events, notifications, customer messages, support tickets

-- ================================================
-- 1. ANALYTICS_EVENTS (Track user actions for insights)
-- ================================================
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT,
  customer_email TEXT,
  event_type TEXT NOT NULL, -- 'page_view', 'order_viewed', 'extras_selected', 'checkout_started', 'checkout_completed'
  event_data JSONB, -- Context-specific data (page, item_id, amount, etc)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_events_phone ON analytics_events(customer_phone);
CREATE INDEX idx_analytics_events_created ON analytics_events(created_at);
CREATE INDEX idx_analytics_events_type ON analytics_events(event_type);

-- ================================================
-- 2. NOTIFICATIONS (In-app and system notifications)
-- ================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL,
  type TEXT NOT NULL, -- 'order_update', 'delivery_reminder', 'referral_reward', 'promo', 'support_response'
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- Link to related page/order
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ, -- Auto-expire old notifications
  
  CONSTRAINT notifications_customer_fk FOREIGN KEY (customer_phone) REFERENCES vipps_users(phone_number) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_phone ON notifications(customer_phone);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);

-- ================================================
-- 3. NOTIFICATION_PREFERENCES (Customer opt-in/out)
-- ================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  sms_enabled BOOLEAN DEFAULT FALSE,
  order_updates_enabled BOOLEAN DEFAULT TRUE,
  delivery_reminders_enabled BOOLEAN DEFAULT TRUE,
  referral_notifications_enabled BOOLEAN DEFAULT TRUE,
  promotional_enabled BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT pref_customer_fk FOREIGN KEY (customer_phone) REFERENCES vipps_users(phone_number) ON DELETE CASCADE
);

CREATE INDEX idx_notification_preferences_phone ON notification_preferences(customer_phone);

-- ================================================
-- 4. CUSTOMER_MESSAGES (Support/inquiry messages from customers)
-- ================================================
CREATE TABLE IF NOT EXISTS customer_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  customer_phone TEXT NOT NULL,
  customer_name TEXT,
  customer_email TEXT,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  message_type TEXT NOT NULL, -- 'support', 'inquiry', 'complaint', 'feedback', 'referral_question'
  status TEXT DEFAULT 'open', -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  
  CONSTRAINT msg_customer_fk FOREIGN KEY (customer_phone) REFERENCES vipps_users(phone_number) ON DELETE CASCADE
);

CREATE INDEX idx_customer_messages_phone ON customer_messages(customer_phone);
CREATE INDEX idx_customer_messages_status ON customer_messages(status);
CREATE INDEX idx_customer_messages_created ON customer_messages(created_at DESC);
CREATE INDEX idx_customer_messages_order ON customer_messages(order_id);

-- ================================================
-- 5. MESSAGE_REPLIES (Admin responses to customer messages)
-- ================================================
CREATE TABLE IF NOT EXISTS message_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES customer_messages(id) ON DELETE CASCADE,
  admin_name TEXT,
  reply_text TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE, -- Internal notes not sent to customer
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_message_replies_message ON message_replies(message_id);

-- ================================================
-- 6. ANALYTICS_SNAPSHOTS (Daily aggregated metrics)
-- ================================================
CREATE TABLE IF NOT EXISTS analytics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_date DATE NOT NULL UNIQUE,
  
  -- Sales metrics
  total_orders INTEGER DEFAULT 0,
  total_revenue_nok DECIMAL DEFAULT 0,
  avg_order_value_nok DECIMAL DEFAULT 0,
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,
  
  -- Referral metrics
  referrals_used INTEGER DEFAULT 0,
  referral_revenue_nok DECIMAL DEFAULT 0,
  top_referrer_phone TEXT,
  
  -- Inventory metrics
  inventory_level_kg DECIMAL DEFAULT 0,
  low_stock_alerts INTEGER DEFAULT 0,
  
  -- Page metrics
  website_visitors INTEGER DEFAULT 0,
  checkout_abandonment_rate DECIMAL DEFAULT 0, -- 0-100
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_analytics_snapshots_date ON analytics_snapshots(snapshot_date DESC);

-- ================================================
-- 7. CUSTOMER_INSIGHTS (Derived customer data for segmentation)
-- ================================================
CREATE TABLE IF NOT EXISTS customer_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone TEXT NOT NULL UNIQUE,
  
  -- Behavior
  total_orders INTEGER DEFAULT 0,
  lifetime_value_nok DECIMAL DEFAULT 0,
  avg_days_between_orders DECIMAL,
  last_order_date TIMESTAMPTZ,
  days_since_last_order INTEGER,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  is_new_customer BOOLEAN DEFAULT TRUE,
  is_loyal BOOLEAN DEFAULT FALSE, -- 3+ orders
  is_at_risk BOOLEAN DEFAULT FALSE, -- 60+ days no order
  
  -- Referral
  has_referral_code BOOLEAN DEFAULT FALSE,
  referral_count INTEGER DEFAULT 0,
  referral_revenue_nok DECIMAL DEFAULT 0,
  
  -- Preferences
  preferred_box_size TEXT, -- '8kg' or '12kg'
  preferred_extras TEXT[], -- Array of frequently ordered extras
  
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT insights_customer_fk FOREIGN KEY (customer_phone) REFERENCES vipps_users(phone_number) ON DELETE CASCADE
);

CREATE INDEX idx_customer_insights_phone ON customer_insights(customer_phone);
CREATE INDEX idx_customer_insights_at_risk ON customer_insights(is_at_risk);
CREATE INDEX idx_customer_insights_loyalty ON customer_insights(is_loyal);

-- ================================================
-- Grant permissions for analytics functions
-- ================================================
GRANT SELECT ON analytics_events TO authenticated;
GRANT SELECT ON notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE ON notification_preferences TO authenticated;
GRANT SELECT, INSERT ON customer_messages TO authenticated;
GRANT SELECT ON message_replies TO authenticated;
GRANT SELECT ON customer_insights TO authenticated;
