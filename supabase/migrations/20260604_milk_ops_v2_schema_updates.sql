-- Milk Ops V2: grams instead of liters, milking method, expanded product types

-- Add milking_method and grams columns to sessions
ALTER TABLE milk_daily_sessions ADD COLUMN IF NOT EXISTS milking_method TEXT NOT NULL DEFAULT 'hand' CHECK (milking_method IN ('machine','hand'));
ALTER TABLE milk_daily_sessions ADD COLUMN IF NOT EXISTS gross_weight_grams INT NOT NULL DEFAULT 0;
ALTER TABLE milk_daily_sessions ADD COLUMN IF NOT EXISTS bottle_count INT NOT NULL DEFAULT 0;
ALTER TABLE milk_daily_sessions ADD COLUMN IF NOT EXISTS custom_tare_grams INT NOT NULL DEFAULT 0;
ALTER TABLE milk_daily_sessions RENAME COLUMN total_liters TO total_grams;
-- Change default to 0 (was decimal, now integer grams)
ALTER TABLE milk_daily_sessions ALTER COLUMN total_grams TYPE INT USING COALESCE(ROUND(total_grams * 1000)::INT, 0);

-- Rename session entry liters to grams
ALTER TABLE milk_session_entries RENAME COLUMN liters TO grams;
ALTER TABLE milk_session_entries ALTER COLUMN grams TYPE INT USING COALESCE(ROUND(grams * 1000)::INT, 0);

-- Day states: rename liters to grams
ALTER TABLE milk_ops_day_states RENAME COLUMN morning_liters TO morning_grams;
ALTER TABLE milk_ops_day_states RENAME COLUMN evening_liters TO evening_grams;
ALTER TABLE milk_ops_day_states ALTER COLUMN morning_grams TYPE INT USING COALESCE(ROUND(morning_grams * 1000)::INT, 0);
ALTER TABLE milk_ops_day_states ALTER COLUMN evening_grams TYPE INT USING COALESCE(ROUND(evening_grams * 1000)::INT, 0);

-- Expand product_type check constraints
ALTER TABLE dairy_recipes DROP CONSTRAINT IF EXISTS dairy_recipes_product_type_check;
ALTER TABLE dairy_recipes ADD CONSTRAINT dairy_recipes_product_type_check
  CHECK (product_type IN ('fresh_cheese','cottage_cheese','brown_cheese','hard_cheese','semi_hard_cheese','soft_cheese','blue_cheese','chevre','cream_cheese','washed_rind','yoghurt','butter','cream','kefir','skyr','other'));

ALTER TABLE dairy_production_batches DROP CONSTRAINT IF EXISTS dairy_production_batches_product_type_check;
ALTER TABLE dairy_production_batches ADD CONSTRAINT dairy_production_batches_product_type_check
  CHECK (product_type IN ('fresh_cheese','cottage_cheese','brown_cheese','hard_cheese','semi_hard_cheese','soft_cheese','blue_cheese','chevre','cream_cheese','washed_rind','yoghurt','butter','cream','kefir','skyr','other'));
