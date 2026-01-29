/*
  # Add Vipps Checkout API v3 Support

  1. Schema Changes
    - Add `vipps_session_id` column to payments table for Checkout v3 sessions
    - Keep `vipps_order_id` for backward compatibility with ePayment API
    - Add index on `vipps_session_id` for faster lookups

  2. Notes
    - Both `vipps_order_id` (ePayment reference) and `vipps_session_id` (Checkout session) can coexist
    - New payments will use `vipps_session_id` from Checkout API v3
    - Legacy payments will continue to use `vipps_order_id`
    - No data loss - existing payments unchanged
*/

-- Add vipps_session_id column to payments table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payments' AND column_name = 'vipps_session_id'
  ) THEN
    ALTER TABLE payments ADD COLUMN vipps_session_id text;
  END IF;
END $$;

-- Add index for faster session lookups
CREATE INDEX IF NOT EXISTS idx_payments_vipps_session_id ON payments(vipps_session_id);

-- Add comment to document the column purpose
COMMENT ON COLUMN payments.vipps_session_id IS 'Vipps Checkout API v3 session ID';
COMMENT ON COLUMN payments.vipps_order_id IS 'Vipps ePayment API v1 reference (legacy)';/*
  # Add More Extras Products to Catalog

  1. New Extras
    - Add more traditional pig products
    - Kjøttdeig (ground pork)
    - Pølser (sausages)
    - Medisterpølse (traditional sausage)
    - Kamsteik (neck roast)
    - Kjøttbiter (meat cubes)
    - Svinekam (pork loin)
    - Pinnekjøtt (salted and dried ribs)

  2. Updates
    - Set proper display order
    - Add descriptions

  3. Security
    - No changes needed, existing RLS policies apply
*/

-- Add new extras to catalog
INSERT INTO extras_catalog (slug, name_no, name_en, description_no, description_en, price_nok, pricing_type, active, display_order)
VALUES
  ('kjottdeig', 'Kjøttdeig', 'Ground Pork', 'Hjemmelaget kjøttdeig', 'Homemade ground pork', 180, 'per_kg', true, 9),
  ('polser', 'Pølser', 'Sausages', 'Grillpølser og kokepolser', 'Grilling and cooking sausages', 220, 'per_kg', true, 10),
  ('medisterpølse', 'Medisterpølse', 'Traditional Norwegian Sausage', 'Klassisk medisterpølse', 'Classic medister sausage', 260, 'per_kg', true, 11),
  ('kamsteik', 'Kamsteik/Svinesteik', 'Neck Roast/Pork Roast', 'Saftig steik', 'Juicy roast', 270, 'per_kg', true, 12),
  ('kjottbiter', 'Kjøttbiter til gryteretter', 'Meat Cubes for Stews', 'Perfekt til gryte og wok', 'Perfect for stews and wok', 240, 'per_kg', true, 13),
  ('svinekam', 'Hel svinekam', 'Whole Pork Loin', 'Perfekt til julemiddag', 'Perfect for Christmas dinner', 350, 'per_kg', true, 14),
  ('pinnekjøtt', 'Pinnekjøtt', 'Salted and Dried Ribs', 'Tradisjonell julemat', 'Traditional Christmas food', 380, 'per_kg', true, 15)
ON CONFLICT (slug) DO UPDATE SET
  name_no = EXCLUDED.name_no,
  name_en = EXCLUDED.name_en,
  description_no = EXCLUDED.description_no,
  description_en = EXCLUDED.description_en,
  price_nok = EXCLUDED.price_nok,
  pricing_type = EXCLUDED.pricing_type,
  display_order = EXCLUDED.display_order,
  active = EXCLUDED.active;
