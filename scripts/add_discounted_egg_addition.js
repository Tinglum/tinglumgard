/*
Add a discounted batch of eggs to an existing egg order.

Use case: a customer's fresh order gets extra eggs from last week's stock at a
reduced flat price. Creates one `egg_order_additions` row and bumps the order's
total + remainder by the flat surcharge.

Prices are stored in ØRE (1 NOK = 100 øre).

Usage:
  SUPABASE_URL=https://<proj>.supabase.co \
  SUPABASE_SERVICE_ROLE_KEY=<service_role_key> \
  node scripts/add_discounted_egg_addition.js

Options (env vars):
  BREED_SLUG        breed slug            (default: jersey-giant)
  MATCH_QUANTITY    original order size to match when auto-finding (default: 10)
  ORDER_NUMBER      target an exact order; skips auto-find (recommended once known)
  ADD_QUANTITY      extra eggs to add     (default: 10)
  SURCHARGE_NOK     flat extra to charge  (default: 300)
  APPLY=1           actually write. Without it the script runs a DRY RUN.

Do NOT commit your service role key.
*/

const { createClient } = require('@supabase/supabase-js');

const BREED_SLUG = process.env.BREED_SLUG || 'jersey-giant';
const MATCH_QUANTITY = Number(process.env.MATCH_QUANTITY || 10);
const ADD_QUANTITY = Number(process.env.ADD_QUANTITY || 10);
const SURCHARGE_NOK = Number(process.env.SURCHARGE_NOK || 300);
const APPLY = process.env.APPLY === '1';

const surchargeOre = Math.round(SURCHARGE_NOK * 100);
const pricePerEggOre = Math.round(surchargeOre / ADD_QUANTITY);

async function main() {
  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Resolve breed
  const { data: breed, error: breedErr } = await supabase
    .from('egg_breeds')
    .select('id, slug, name')
    .eq('slug', BREED_SLUG)
    .single();
  if (breedErr || !breed) {
    console.error(`Breed "${BREED_SLUG}" not found`, breedErr);
    process.exit(1);
  }

  // 2. Find the order
  let query = supabase
    .from('egg_orders')
    .select('id, order_number, customer_name, breed_id, inventory_id, quantity, total_amount, remainder_amount, created_at')
    .eq('breed_id', breed.id)
    .order('created_at', { ascending: false });

  if (process.env.ORDER_NUMBER) {
    query = query.eq('order_number', process.env.ORDER_NUMBER);
  } else {
    query = query.eq('quantity', MATCH_QUANTITY).limit(5);
  }

  const { data: orders, error: ordErr } = await query;
  if (ordErr) { console.error('Order lookup failed', ordErr); process.exit(1); }
  if (!orders || orders.length === 0) {
    console.error('No matching order found. Set ORDER_NUMBER to target one explicitly.');
    process.exit(1);
  }
  if (!process.env.ORDER_NUMBER && orders.length > 1) {
    console.error(`Ambiguous: ${orders.length} ${breed.name} orders of ${MATCH_QUANTITY} eggs found.`);
    console.error('Pick one and re-run with ORDER_NUMBER=<order_number>:');
    orders.forEach(o => console.error(`  ${o.order_number}  ${o.customer_name}  ${o.created_at}`));
    process.exit(1);
  }

  const order = orders[0];
  const newTotal = order.total_amount + surchargeOre;
  const newRemainder = order.remainder_amount + surchargeOre;

  console.log('Target order :', order.order_number, '/', order.customer_name);
  console.log('Breed        :', breed.name, `(${breed.slug})`);
  console.log('Adding       :', ADD_QUANTITY, 'eggs @', pricePerEggOre / 100, 'kr =', SURCHARGE_NOK, 'kr');
  console.log('Total        :', order.total_amount / 100, 'kr ->', newTotal / 100, 'kr');
  console.log('Remainder    :', order.remainder_amount / 100, 'kr ->', newRemainder / 100, 'kr');

  if (!APPLY) {
    console.log('\nDRY RUN. Re-run with APPLY=1 to write.');
    return;
  }

  // 3. Insert the discounted addition
  const { error: addErr } = await supabase.from('egg_order_additions').insert({
    egg_order_id: order.id,
    breed_id: order.breed_id,
    inventory_id: order.inventory_id,
    quantity: ADD_QUANTITY,
    price_per_egg: pricePerEggOre,
    subtotal: surchargeOre,
  });
  if (addErr) { console.error('Insert addition failed', addErr); process.exit(1); }

  // 4. Bump order totals
  const { error: updErr } = await supabase
    .from('egg_orders')
    .update({ total_amount: newTotal, remainder_amount: newRemainder, updated_at: new Date().toISOString() })
    .eq('id', order.id);
  if (updErr) { console.error('Order update failed', updErr); process.exit(1); }

  console.log('\nDone. Added', ADD_QUANTITY, 'discounted eggs to', order.order_number);
}

main();
