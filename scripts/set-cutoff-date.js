/**
 * Script to set the order modification cutoff date in the database
 *
 * Run with:
 * NEXT_PUBLIC_SUPABASE_URL=your_url SUPABASE_SERVICE_ROLE_KEY=your_key node scripts/set-cutoff-date.js
 *
 * Or set them in your terminal first, then run: node scripts/set-cutoff-date.js
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing environment variables:');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_KEY ? '✓' : '✗');
  console.error('\nPlease set these environment variables and try again.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function setCutoffDate() {
  console.log('Setting order modification cutoff date...');

  const cutoffData = {
    year: 2026,
    week: 46
  };

  // Upsert the cutoff configuration
  const { data, error } = await supabase
    .from('app_config')
    .upsert({
      key: 'order_modification_cutoff',
      value: cutoffData,
      description: 'Order modification cutoff date (year and ISO week number)',
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'key'
    })
    .select();

  if (error) {
    console.error('Error setting cutoff date:', error);
    process.exit(1);
  }

  console.log('✅ Cutoff date set successfully:');
  console.log('   Year:', cutoffData.year);
  console.log('   Week:', cutoffData.week);
  console.log('   Data:', data);
}

setCutoffDate();
