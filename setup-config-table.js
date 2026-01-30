const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dofhlyvexecwlqmrzutd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvZmhseXZleGVjd2xxbXJ6dXRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTYzMDA0MywiZXhwIjoyMDg1MjA2MDQzfQ.CplDeotcFj3glXPYIRiKg1HosgjVNYRZwtSd9TI0m1o';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setupConfigTable() {
  console.log('Setting up config table...\n');

  // Insert config values
  const configValues = [
    { key: 'box_8kg_price', value: '3500', description: '8kg box base price in NOK' },
    { key: 'box_12kg_price', value: '4800', description: '12kg box base price in NOK' },
    { key: 'box_8kg_deposit_percentage', value: '1', description: 'Deposit percentage for 8kg box (1% = 35kr for testing)' },
    { key: 'box_12kg_deposit_percentage', value: '1', description: 'Deposit percentage for 12kg box' },
    { key: 'delivery_fee_pickup_e6', value: '300', description: 'Pickup fee at E6 location' },
    { key: 'delivery_fee_trondheim', value: '200', description: 'Delivery fee in Trondheim' },
    { key: 'fresh_delivery_fee', value: '500', description: 'Fresh delivery upgrade fee' },
    { key: 'cutoff_year', value: '2026', description: 'Order cutoff year' },
    { key: 'cutoff_week', value: '46', description: 'Order cutoff week' },
    { key: 'contact_email', value: 'post@tinglum.no', description: 'Contact email' },
    { key: 'contact_phone', value: '+47 123 45 678', description: 'Contact phone' },
  ];

  const { data, error } = await supabase
    .from('config')
    .upsert(configValues, { onConflict: 'key' });

  if (error) {
    console.error('❌ Error inserting config values:', error);
    console.error('\nThe config table might not exist yet.');
    console.error('Please run this SQL in Supabase SQL Editor first:\n');
    console.error(`
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
    `);
    return;
  }

  console.log('✅ Config table populated successfully!\n');

  // Verify and display
  const { data: allConfig } = await supabase
    .from('config')
    .select('*')
    .order('key');

  console.log('Current configuration:');
  console.log('=====================\n');

  allConfig?.forEach(item => {
    console.log(`${item.key}: ${item.value}`);
    if (item.description) {
      console.log(`  → ${item.description}`);
    }
  });

  console.log('\n✅ Setup complete!');
  console.log('\nIMPORTANT: Deposit is set to 1% (35 kr) for testing.');
  console.log('Change to 50% in the admin panel when ready for production.');
}

setupConfigTable();
