/*
  # Update Inventory Tracking and Pricing

  1. Changes to orders table
    - Add `inventory_deducted` (boolean) - tracks if inventory was deducted
    - Add `inventory_deduction_kg` (numeric) - tracks how many kg were deducted
    - Add `add_ons_json` if not exists - for storing add-on selections

  2. Update inventory
    - Increase initial inventory to realistic amount (1200 kg)
    - Update kg_remaining to 1200

  3. Update extras catalog
    - Fix delivery pricing to match spec:
      - E6 delivery: +250 NOK
      - Trondheim delivery: +300 NOK  
      - Fresh delivery: +500 NOK

  4. Add indexes for performance
*/

-- Add inventory tracking fields to orders
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inventory_deducted'
  ) THEN
    ALTER TABLE orders ADD COLUMN inventory_deducted boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'inventory_deduction_kg'
  ) THEN
    ALTER TABLE orders ADD COLUMN inventory_deduction_kg numeric DEFAULT 0;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'add_ons_json'
  ) THEN
    ALTER TABLE orders ADD COLUMN add_ons_json jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Update inventory to realistic amount
UPDATE inventory
SET kg_remaining = 1200
WHERE season = 'høst_2024' AND kg_remaining < 1200;

-- Update delivery pricing to match specification
UPDATE extras_catalog
SET price_nok = 250, name_no = 'Levering E6 (Levanger-Namsos)', name_en = 'E6 Delivery (Levanger-Namsos)'
WHERE slug = 'pickup_e6';

UPDATE extras_catalog
SET price_nok = 300
WHERE slug = 'delivery_trondheim';

UPDATE extras_catalog
SET price_nok = 500
WHERE slug = 'fresh_delivery';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_inventory_deducted ON orders(inventory_deducted) WHERE inventory_deducted = false;
CREATE INDEX IF NOT EXISTS idx_inventory_season_active ON inventory(season, active) WHERE active = true;
