/*
Local test script to simulate adding extras to an order using Supabase service role key.

Usage (run locally):

SUPABASE_URL=https://your-project.supabase.co \
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key \
node scripts/add_extras_test.js <ORDER_ID> '[{"slug":"indrefilet","quantity":1}]'

This script will:
- Lookup extras in `extras_catalog` by slug
- Delete existing order_extras for the order and insert new ones
- Recalculate order totals and update `orders` table

Do NOT commit your service role key.
*/

const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 1 && !process.env.EXTRAS_JSON && !process.env.EXTRAS_B64) {
    console.error('Usage: node scripts/add_extras_test.js <ORDER_ID> <EXTRAS_JSON>');
    console.error('Or set EXTRAS_JSON env var to avoid shell quoting issues.');
    process.exit(1);
  }

  const orderId = args[0];
  let extras;

  // Prefer environment variable to avoid shell quoting issues
  if (process.env.EXTRAS_JSON) {
    try {
      extras = JSON.parse(process.env.EXTRAS_JSON);
    } catch (err) {
      console.error('Failed to parse EXTRAS_JSON env var:', err.message);
      process.exit(1);
    }
  } else if (process.env.EXTRAS_B64) {
    try {
      const decoded = Buffer.from(process.env.EXTRAS_B64, 'base64').toString('utf8');
      extras = JSON.parse(decoded);
    } catch (err) {
      console.error('Failed to parse EXTRAS_B64 env var:', err.message);
      process.exit(1);
    }
  } else {
    try {
      extras = JSON.parse(args[1]);
    } catch (err) {
      console.error('Failed to parse EXTRAS_JSON:', err.message);
      process.exit(1);
    }
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    // Fetch order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      console.error('Order not found', orderErr);
      process.exit(1);
    }

    // Fetch catalog items
    const slugs = extras.map(e => e.slug);
    const { data: catalogItems, error: catalogErr } = await supabase
      .from('extras_catalog')
      .select('*')
      .in('slug', slugs);

    if (catalogErr) throw catalogErr;

    // Prefer updating orders.extra_products JSONB if present (avoids schema mismatch)
    if (order.extra_products !== undefined) {
      const existingExtras = Array.isArray(order.extra_products) ? order.extra_products : [];
      const newExtras = [];
      let extrasTotal = 0;

      for (const e of extras) {
        const catalog = catalogItems.find(c => c.slug === e.slug);
        if (!catalog) continue;
        const quantity = Number(e.quantity) || 0;
        if (quantity <= 0) continue;
        const unit_price = catalog.price_nok;
        const total_price = Math.round(unit_price * quantity);
        extrasTotal += total_price;
        newExtras.push({
          slug: e.slug,
          name_no: catalog.name_no,
          name_en: catalog.name_en,
          quantity,
          unit_type: catalog.pricing_type === 'per_kg' ? 'kg' : 'unit',
          price_per_unit: unit_price,
          total_price,
        });
      }

      // Replace existing extras with new set
      const mergedExtras = [
        ...existingExtras.filter((ex) => !newExtras.some((n) => n.slug === ex.slug)),
        ...newExtras,
      ];

      const existingExtrasTotal = Array.isArray(existingExtras)
        ? existingExtras.reduce((s, ex) => s + (ex.total_price || 0), 0)
        : 0;

      let newTotalAmount = (order.total_amount || 0) - existingExtrasTotal + extrasTotal;
      newTotalAmount = Math.round(newTotalAmount);
      let newRemainder = newTotalAmount - (order.deposit_amount || 0);
      newRemainder = Math.round(newRemainder);

      const { error: updErr } = await supabase
        .from('orders')
        .update({
          extra_products: mergedExtras,
          total_amount: newTotalAmount,
          remainder_amount: newRemainder,
          last_modified_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updErr) throw updErr;

      console.log('Successfully applied extras test via orders.extra_products. Inserted:', newExtras.length);
      console.log('New total:', newTotalAmount, 'New remainder:', newRemainder);
    } else {
      // Fallback: try inserting into order_extras table with compatible columns
      // Fetch existing order_extras rows to compute totals
      const { data: existingRows, error: existingErr } = await supabase
        .from('order_extras')
        .select('*')
        .eq('order_id', orderId);
      if (existingErr) throw existingErr;

      const existingExtrasTotal = Array.isArray(existingRows)
        ? existingRows.reduce((s, ex) => s + ((ex.total_price || ex.price_nok || 0) * (ex.quantity || 1)), 0)
        : 0;

      // Build compatible insert objects (use price_nok and quantity if available)
      const toInsert = [];
      for (const e of extras) {
        const catalog = catalogItems.find(c => c.slug === e.slug);
        if (!catalog) continue;
        const quantity = Number(e.quantity) || 0;
        if (quantity <= 0) continue;
        const unit_price = catalog.price_nok;
        const total_price = Math.round(unit_price * quantity);
        // Prefer columns price_nok and quantity (safe)
        toInsert.push({
          order_id: orderId,
          extra_id: catalog.id,
          price_nok: unit_price,
          quantity,
          created_at: new Date().toISOString(),
        });
      }

      const { error: delErr } = await supabase.from('order_extras').delete().eq('order_id', orderId);
      if (delErr) throw delErr;

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('order_extras').insert(toInsert);
        if (insErr) throw insErr;
      }

      const extrasTotal = toInsert.reduce((s, x) => s + ((x.price_nok || 0) * (x.quantity || 1)), 0);
      let newTotalAmount = (order.total_amount || 0) - existingExtrasTotal + extrasTotal;
      newTotalAmount = Math.round(newTotalAmount);
      let newRemainder = newTotalAmount - (order.deposit_amount || 0);
      newRemainder = Math.round(newRemainder);

      const { error: updErr } = await supabase
        .from('orders')
        .update({
          total_amount: newTotalAmount,
          remainder_amount: newRemainder,
          last_modified_at: new Date().toISOString(),
        })
        .eq('id', orderId);

      if (updErr) throw updErr;

      console.log('Successfully applied extras test via order_extras. Inserted:', toInsert.length);
      console.log('New total:', newTotalAmount, 'New remainder:', newRemainder);
    }
  } catch (err) {
    console.error('Error during test:', err.message || err);
    process.exit(1);
  }
}

main();
