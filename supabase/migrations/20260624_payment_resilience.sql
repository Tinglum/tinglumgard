-- Payment resilience: Vipps retry/manual-confirmation, order flagging, and
-- confirmation-email tracking across all three product lines.
--
-- Adds the columns used by:
--   - the Vipps retry/failure UX (payment_attempts)
--   - the 2nd-failure "manually confirmed, payment owed" flow (manual_confirmation,
--     manual_confirmed_at, flagged_for_review, flag_reason)
--   - the daily confirmation-email audit (confirmation_email_sent_at)
--
-- Idempotent: safe to run multiple times.

-- ── Pig orders ──────────────────────────────────────────────────────────────
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS manual_confirmed_at timestamptz;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

-- ── Egg orders ──────────────────────────────────────────────────────────────
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS payment_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS manual_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS manual_confirmed_at timestamptz;
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false;
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE egg_orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

-- ── Chicken orders ──────────────────────────────────────────────────────────
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS payment_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS manual_confirmation boolean NOT NULL DEFAULT false;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS manual_confirmed_at timestamptz;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS flagged_for_review boolean NOT NULL DEFAULT false;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS flag_reason text;
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS confirmation_email_sent_at timestamptz;

-- Partial indexes so the admin panel + daily audit can cheaply find work items.
CREATE INDEX IF NOT EXISTS idx_orders_flagged ON orders (flagged_for_review) WHERE flagged_for_review;
CREATE INDEX IF NOT EXISTS idx_egg_orders_flagged ON egg_orders (flagged_for_review) WHERE flagged_for_review;
CREATE INDEX IF NOT EXISTS idx_chicken_orders_flagged ON chicken_orders (flagged_for_review) WHERE flagged_for_review;

-- Email templates for the new flows are seeded by scripts/seed_resilience_templates.js
-- (kept out of SQL to avoid large escaped HTML blobs and to allow idempotent upserts).
