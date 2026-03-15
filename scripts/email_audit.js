// Email audit: find orders that should have received emails but didn't.
// Usage: node scripts/email_audit.js

const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

function loadEnv(path) {
  const content = fs.readFileSync(path, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([^#=\s]+)=([\s\S]*)$/);
    if (!m) continue;
    env[m[1]] = m[2];
  }
  return env;
}

const env = loadEnv('.env.local');
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const TEMPLATE_KEYS = {
  egg_deposit:    'egg.order.deposit.confirmed.customer',
  egg_remainder:  'egg.order.remainder.confirmed.customer',
  pig_deposit:    'pig.order.deposit.confirmed.customer',
  pig_remainder:  'pig.order.remainder.confirmed.customer',
  chicken_deposit: 'chicken.order.deposit.confirmed.customer',
  chicken_remainder: 'chicken.order.remainder.confirmed.customer',
};

async function fetchEmailsSent(templateKey) {
  // Returns set of order IDs that had this template dispatched (any status except cancelled)
  const { data, error } = await supabase
    .from('email_dispatch_queue')
    .select('egg_order_id, order_id, chicken_order_id, status, to_email, created_at')
    .eq('template_key', templateKey)
    .neq('status', 'cancelled');

  if (error && error.code !== 'PGRST116') {
    console.error('  Error fetching dispatch queue for', templateKey, error.message);
    return { byEgg: new Set(), byPig: new Set(), byChicken: new Set(), rows: [] };
  }
  const rows = data || [];
  return {
    byEgg:     new Set(rows.filter(r => r.egg_order_id).map(r => r.egg_order_id)),
    byPig:     new Set(rows.filter(r => r.order_id).map(r => r.order_id)),
    byChicken: new Set(rows.filter(r => r.chicken_order_id).map(r => r.chicken_order_id)),
    rows,
  };
}

async function main() {
  console.log('=== EMAIL AUDIT ===\n');

  // --- Check email_templates table for missing/inactive templates ---
  console.log('1. CHECKING EMAIL TEMPLATES IN DB');
  const { data: templates, error: tmplErr } = await supabase
    .from('email_templates')
    .select('template_key, active')
    .in('template_key', Object.values(TEMPLATE_KEYS));

  if (tmplErr) {
    console.log('  Could not query email_templates table:', tmplErr.message);
  } else {
    const activeKeys = new Set((templates || []).filter(t => t.active).map(t => t.template_key));
    for (const [label, key] of Object.entries(TEMPLATE_KEYS)) {
      const found = (templates || []).find(t => t.template_key === key);
      const status = !found ? '❌ MISSING' : found.active ? '✅ active' : '⚠️  INACTIVE';
      console.log(`  ${status}  ${key}`);
    }
  }

  // --- Check dispatch mode ---
  console.log('\n2. EMAIL DISPATCH MODE');
  const { data: config } = await supabase
    .from('system_config')
    .select('key, value')
    .eq('key', 'email_dispatch_mode')
    .maybeSingle();
  if (config) {
    const mode = config.value;
    const warn = (mode === 'shadow' || mode === 'paused') ? ' ⚠️  EMAILS NOT ACTUALLY SENT' : '';
    console.log(`  email_dispatch_mode = ${mode}${warn}`);
  } else {
    console.log('  email_dispatch_mode not found in system_config (defaults to legacy)');
  }

  // --- EGG ORDERS ---
  console.log('\n3. EGG ORDERS WITH MISSING DEPOSIT EMAIL');
  const { data: eggOrders, error: eggErr } = await supabase
    .from('egg_orders')
    .select('id, order_number, customer_email, customer_name, status, created_at, week_number')
    .in('status', ['deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (eggErr) {
    console.log('  Error fetching egg_orders:', eggErr.message);
  } else {
    const depositEmails = await fetchEmailsSent(TEMPLATE_KEYS.egg_deposit);
    const missing = (eggOrders || []).filter(o => !depositEmails.byEgg.has(o.id));
    const pendingEmail = missing.filter(o => (o.customer_email || '').includes('pending@vipps'));
    const realEmail = missing.filter(o => !(o.customer_email || '').includes('pending@vipps'));

    console.log(`  Total paid egg orders: ${(eggOrders||[]).length}`);
    console.log(`  Missing deposit confirmation email: ${missing.length}`);
    if (pendingEmail.length > 0) {
      console.log(`  └── ${pendingEmail.length} still have pending@vipps.no (no real email)`);
    }
    if (realEmail.length > 0) {
      console.log(`  └── ${realEmail.length} have a real email but no dispatch record:`);
      for (const o of realEmail) {
        console.log(`      ${o.order_number}  ${o.customer_email}  status=${o.status}  created=${o.created_at?.slice(0,10)}  week=${o.week_number}`);
      }
    }
  }

  // --- EGG REMAINDER ---
  console.log('\n4. EGG ORDERS WITH MISSING REMAINDER EMAIL');
  const { data: eggFullyPaid } = await supabase
    .from('egg_orders')
    .select('id, order_number, customer_email, status, created_at, week_number')
    .in('status', ['fully_paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(200);

  const remEmailsEgg = await fetchEmailsSent(TEMPLATE_KEYS.egg_remainder);
  const missingRemainder = (eggFullyPaid || []).filter(o => !remEmailsEgg.byEgg.has(o.id));
  const missingRemRealEmail = missingRemainder.filter(o => !(o.customer_email || '').includes('pending@vipps'));
  console.log(`  Fully paid egg orders: ${(eggFullyPaid||[]).length}`);
  console.log(`  Missing remainder email: ${missingRemainder.length}`);
  if (missingRemRealEmail.length > 0) {
    console.log(`  └── ${missingRemRealEmail.length} have a real email but no dispatch record:`);
    for (const o of missingRemRealEmail) {
      console.log(`      ${o.order_number}  ${o.customer_email}  status=${o.status}  created=${o.created_at?.slice(0,10)}`);
    }
  }

  // --- PIG ORDERS ---
  console.log('\n5. PIG ORDERS WITH MISSING DEPOSIT EMAIL');
  const { data: pigOrders, error: pigErr } = await supabase
    .from('orders')
    .select('id, order_number, customer_email, customer_name, status, created_at')
    .in('status', ['deposit_paid', 'fully_paid', 'paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (pigErr) {
    console.log('  Error fetching orders:', pigErr.message);
  } else {
    const pigDepositEmails = await fetchEmailsSent(TEMPLATE_KEYS.pig_deposit);
    const missingPig = (pigOrders || []).filter(o => !pigDepositEmails.byPig.has(o.id));
    const missingPigReal = missingPig.filter(o => !(o.customer_email || '').includes('pending@vipps'));
    console.log(`  Total paid pig orders: ${(pigOrders||[]).length}`);
    console.log(`  Missing deposit email: ${missingPig.length}`);
    if (missingPigReal.length > 0) {
      console.log(`  └── ${missingPigReal.length} have real email but no dispatch record:`);
      for (const o of missingPigReal) {
        console.log(`      ${o.order_number}  ${o.customer_email}  status=${o.status}  created=${o.created_at?.slice(0,10)}`);
      }
    }
  }

  // --- CHICKEN ORDERS ---
  console.log('\n6. CHICKEN ORDERS WITH MISSING DEPOSIT EMAIL');
  const { data: chickenOrders, error: chickenErr } = await supabase
    .from('chicken_orders')
    .select('id, order_number, customer_email, customer_name, status, created_at')
    .in('status', ['deposit_paid', 'fully_paid', 'preparing', 'shipped', 'delivered'])
    .order('created_at', { ascending: false })
    .limit(200);

  if (chickenErr) {
    console.log('  Error fetching chicken_orders:', chickenErr.message);
  } else {
    const chickenDepositEmails = await fetchEmailsSent(TEMPLATE_KEYS.chicken_deposit);
    const missingChicken = (chickenOrders || []).filter(o => !chickenDepositEmails.byChicken.has(o.id));
    const missingChickenReal = missingChicken.filter(o => !(o.customer_email || '').includes('pending@vipps'));
    console.log(`  Total paid chicken orders: ${(chickenOrders||[]).length}`);
    console.log(`  Missing deposit email: ${missingChicken.length}`);
    if (missingChickenReal.length > 0) {
      console.log(`  └── ${missingChickenReal.length} have real email but no dispatch record:`);
      for (const o of missingChickenReal) {
        console.log(`      ${o.order_number}  ${o.customer_email}  status=${o.status}  created=${o.created_at?.slice(0,10)}`);
      }
    }
  }

  // --- FAILED / STUCK QUEUE ENTRIES ---
  console.log('\n7. FAILED OR STUCK EMAILS IN DISPATCH QUEUE');
  const { data: failed } = await supabase
    .from('email_dispatch_queue')
    .select('id, template_key, to_email, status, last_error, created_at, egg_order_id, order_id, chicken_order_id')
    .in('status', ['failed', 'processing'])
    .order('created_at', { ascending: false })
    .limit(50);

  if (!failed || failed.length === 0) {
    console.log('  No failed or stuck entries.');
  } else {
    console.log(`  ${failed.length} failed/stuck entries:`);
    for (const e of failed) {
      const ref = e.egg_order_id ? `egg:${e.egg_order_id}` : e.chicken_order_id ? `chicken:${e.chicken_order_id}` : `pig:${e.order_id}`;
      console.log(`  [${e.status}] ${e.template_key}  to=${e.to_email}  ref=${ref}  created=${e.created_at?.slice(0,10)}`);
      if (e.last_error) console.log(`          error: ${e.last_error}`);
    }
  }

  // --- ORDERS WITH pending@vipps.no THAT ARE PAID ---
  console.log('\n8. PAID ORDERS STILL STUCK WITH pending@vipps.no EMAIL');
  const tables = [
    { name: 'egg_orders', paidStatuses: ['deposit_paid','fully_paid','preparing','shipped','delivered'] },
    { name: 'orders',     paidStatuses: ['deposit_paid','paid','fully_paid','preparing','shipped','delivered'] },
    { name: 'chicken_orders', paidStatuses: ['deposit_paid','fully_paid','preparing','shipped','delivered'] },
  ];
  for (const { name, paidStatuses } of tables) {
    const { data: stuck } = await supabase
      .from(name)
      .select('id, order_number, customer_email, status, created_at')
      .in('status', paidStatuses)
      .ilike('customer_email', '%pending@vipps%')
      .order('created_at', { ascending: false })
      .limit(50);
    if (stuck && stuck.length > 0) {
      console.log(`  ${name}: ${stuck.length} paid orders with pending@vipps.no:`);
      for (const o of stuck) {
        console.log(`    ${o.order_number}  status=${o.status}  created=${o.created_at?.slice(0,10)}`);
      }
    } else {
      console.log(`  ${name}: none ✅`);
    }
  }

  console.log('\n=== DONE ===');
}

main().catch(err => { console.error(err); process.exit(1); });
