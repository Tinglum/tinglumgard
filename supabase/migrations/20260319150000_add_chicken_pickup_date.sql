-- Allow customers to choose a specific pickup day within their pickup week
ALTER TABLE chicken_orders ADD COLUMN IF NOT EXISTS pickup_date DATE;
