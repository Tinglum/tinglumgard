-- =============================================================================
-- Egg wishlist v2 (order-linked and standalone requests)
-- =============================================================================

BEGIN;

DO $$
BEGIN
  CREATE TYPE egg_wishlist_source AS ENUM ('order_addon', 'standalone');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE egg_wishlist_status AS ENUM (
    'open',
    'partially_allocated',
    'allocated',
    'closed',
    'cancelled',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE egg_wishlist_priority AS ENUM ('order_linked', 'standalone');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS egg_wishlist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT,
  customer_phone TEXT,
  order_id UUID REFERENCES egg_orders(id) ON DELETE SET NULL,
  source egg_wishlist_source NOT NULL,
  year INTEGER NOT NULL,
  week_number INTEGER NOT NULL,
  delivery_monday DATE NOT NULL,
  status egg_wishlist_status NOT NULL DEFAULT 'open',
  priority egg_wishlist_priority NOT NULL DEFAULT 'standalone',
  notes TEXT,
  closed_reason TEXT,
  legacy_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_wishlist_requests_week_status
  ON egg_wishlist_requests(year, week_number, status, priority, created_at);

CREATE INDEX IF NOT EXISTS idx_egg_wishlist_requests_customer_email
  ON egg_wishlist_requests(LOWER(customer_email), created_at DESC);

CREATE INDEX IF NOT EXISTS idx_egg_wishlist_requests_order
  ON egg_wishlist_requests(order_id, created_at DESC);

CREATE TABLE IF NOT EXISTS egg_wishlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES egg_wishlist_requests(id) ON DELETE CASCADE,
  breed_id UUID NOT NULL REFERENCES egg_breeds(id) ON DELETE RESTRICT,
  qty_requested INTEGER NOT NULL CHECK (qty_requested > 0),
  qty_allocated INTEGER NOT NULL DEFAULT 0 CHECK (qty_allocated >= 0),
  qty_remaining INTEGER NOT NULL DEFAULT 0 CHECK (qty_remaining >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(request_id, breed_id)
);

CREATE INDEX IF NOT EXISTS idx_egg_wishlist_items_breed
  ON egg_wishlist_items(breed_id, created_at DESC);

CREATE TABLE IF NOT EXISTS egg_wishlist_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES egg_wishlist_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_egg_wishlist_events_request
  ON egg_wishlist_events(request_id, created_at DESC);

DROP TRIGGER IF EXISTS update_egg_wishlist_requests_updated_at ON egg_wishlist_requests;
CREATE TRIGGER update_egg_wishlist_requests_updated_at
  BEFORE UPDATE ON egg_wishlist_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_egg_wishlist_items_updated_at ON egg_wishlist_items;
CREATE TRIGGER update_egg_wishlist_items_updated_at
  BEFORE UPDATE ON egg_wishlist_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- -----------------------------------------------------------------------------
-- Backfill legacy queue entries (one request per legacy row, one item per row)
-- -----------------------------------------------------------------------------
WITH legacy_rows AS (
  SELECT
    e.id AS legacy_id,
    e.inventory_id,
    e.breed_id,
    e.year,
    e.week_number,
    e.delivery_monday::date AS delivery_monday,
    LOWER(TRIM(e.email)) AS email_normalized,
    NULLIF(TRIM(COALESCE(e.name, '')), '') AS customer_name,
    NULLIF(TRIM(COALESCE(e.phone, '')), '') AS customer_phone,
    e.requested_quantity,
    e.status AS legacy_status,
    e.purchase_order_id,
    e.created_at,
    e.updated_at
  FROM egg_waitlist_entries e
),
inserted_requests AS (
  INSERT INTO egg_wishlist_requests (
    customer_id,
    customer_email,
    customer_name,
    customer_phone,
    order_id,
    source,
    year,
    week_number,
    delivery_monday,
    status,
    priority,
    notes,
    closed_reason,
    legacy_key,
    created_at,
    updated_at
  )
  SELECT
    COALESCE(NULLIF('legacy:' || email_normalized, 'legacy:'), 'legacy:' || legacy_id::text),
    COALESCE(NULLIF(email_normalized, ''), 'legacy+' || legacy_id::text || '@unknown.invalid'),
    customer_name,
    customer_phone,
    purchase_order_id,
    'standalone'::egg_wishlist_source,
    year,
    week_number,
    delivery_monday,
    CASE
      WHEN legacy_status = 'purchased' THEN 'allocated'::egg_wishlist_status
      WHEN legacy_status = 'expired' THEN 'expired'::egg_wishlist_status
      WHEN legacy_status = 'cancelled' THEN 'cancelled'::egg_wishlist_status
      ELSE 'open'::egg_wishlist_status
    END,
    CASE
      WHEN purchase_order_id IS NOT NULL THEN 'order_linked'::egg_wishlist_priority
      ELSE 'standalone'::egg_wishlist_priority
    END,
    'Backfilled from egg_waitlist_entries',
    CASE
      WHEN legacy_status IN ('expired', 'cancelled', 'purchased') THEN legacy_status
      ELSE NULL
    END,
    'legacy:' || legacy_id::text,
    created_at,
    updated_at
  FROM legacy_rows
  ON CONFLICT (legacy_key) DO NOTHING
  RETURNING id, legacy_key
)
INSERT INTO egg_wishlist_items (
  request_id,
  breed_id,
  qty_requested,
  qty_allocated,
  qty_remaining,
  created_at,
  updated_at
)
SELECT
  r.id,
  l.breed_id,
  GREATEST(COALESCE(l.requested_quantity, 1), 1),
  CASE
    WHEN l.legacy_status = 'purchased' THEN GREATEST(COALESCE(l.requested_quantity, 1), 1)
    ELSE 0
  END,
  CASE
    WHEN l.legacy_status = 'purchased' THEN 0
    ELSE GREATEST(COALESCE(l.requested_quantity, 1), 1)
  END,
  l.created_at,
  l.updated_at
FROM inserted_requests r
JOIN legacy_rows l ON r.legacy_key = 'legacy:' || l.legacy_id::text
ON CONFLICT (request_id, breed_id) DO NOTHING;

INSERT INTO egg_wishlist_events (request_id, event_type, payload, created_by, created_at)
SELECT
  r.id,
  'backfilled_legacy',
  jsonb_build_object(
    'legacy_key', r.legacy_key,
    'source_table', 'egg_waitlist_entries'
  ),
  'migration',
  NOW()
FROM egg_wishlist_requests r
WHERE r.legacy_key IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM egg_wishlist_events e
    WHERE e.request_id = r.id
      AND e.event_type = 'backfilled_legacy'
  );

COMMIT;

