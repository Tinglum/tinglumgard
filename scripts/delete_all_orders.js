const { createClient } = require('@supabase/supabase-js');

async function main() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in environment');
    process.exit(1);
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log('Fetching all orders...');
  const { data: orders, error: ordersError } = await supabase.from('orders').select('id');
  if (ordersError) {
    console.error('Failed to fetch orders:', ordersError);
    process.exit(1);
  }

  if (!orders || orders.length === 0) {
    console.log('No orders found. Nothing to delete.');
    return;
  }

  const ids = orders.map(o => o.id);
  console.log(`Found ${ids.length} orders. Deleting related rows...`);

  const dependentTables = ['order_extras', 'payments', 'order_history'];

  for (const table of dependentTables) {
    try {
      // check existence by attempting a lightweight select
      const { error: selErr } = await supabase.from(table).select('id').limit(1);
      if (selErr) {
        console.log(`Skipping ${table} (does not exist or not accessible).`);
        continue;
      }

      // delete rows referencing the orders
      console.log(`Deleting from ${table}...`);
      const { error: delErr } = await supabase.from(table).delete().in('order_id', ids);
      if (delErr) {
        console.error(`Failed to delete from ${table}:`, delErr);
      } else {
        console.log(`Deleted rows from ${table} (if any).`);
      }
    } catch (e) {
      console.error(`Error processing table ${table}:`, e.message || e);
    }
  }

  // finally delete orders
  try {
    console.log('Deleting orders...');
    const { error: delOrdersErr } = await supabase.from('orders').delete().in('id', ids);
    if (delOrdersErr) {
      console.error('Failed to delete orders:', delOrdersErr);
      process.exit(1);
    }
    console.log('Deleted orders.');
  } catch (e) {
    console.error('Error deleting orders:', e.message || e);
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Unhandled error:', e);
  process.exit(1);
});
