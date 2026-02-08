-- Add shipping/contact details captured from Vipps Checkout

alter table orders
  add column if not exists shipping_name text,
  add column if not exists shipping_email text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_city text,
  add column if not exists shipping_country text;

alter table egg_orders
  add column if not exists shipping_name text,
  add column if not exists shipping_email text,
  add column if not exists shipping_phone text,
  add column if not exists shipping_address text,
  add column if not exists shipping_postal_code text,
  add column if not exists shipping_city text,
  add column if not exists shipping_country text;
