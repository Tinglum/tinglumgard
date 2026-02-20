/**
 * Run chicken tables migration against Supabase.
 *
 * Usage:
 *   DB_PASSWORD=your_db_password node scripts/run-chicken-migration.js
 *
 * Find your database password at:
 *   https://supabase.com/dashboard/project/dofhlyvexecwlqmrzutd/settings/database
 *
 * OR: Copy the SQL file contents into the Supabase SQL Editor:
 *   https://supabase.com/dashboard/project/dofhlyvexecwlqmrzutd/sql/new
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Read .env.local manually
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      envVars[trimmed.substring(0, eqIdx)] = trimmed.substring(eqIdx + 1);
    }
  }
}

// Extract project ref from Supabase URL
const SUPABASE_URL = envVars.NEXT_PUBLIC_SUPABASE_URL;
const match = SUPABASE_URL && SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/);
const PROJECT_REF = match ? match[1] : null;
const DB_PASSWORD = process.env.DB_PASSWORD;

if (!PROJECT_REF) {
  console.error('Could not extract project ref from NEXT_PUBLIC_SUPABASE_URL in .env.local');
  process.exit(1);
}

if (!DB_PASSWORD) {
  console.error('Missing DB_PASSWORD environment variable.');
  console.error('');
  console.error('Usage:  DB_PASSWORD=your_db_password node scripts/run-chicken-migration.js');
  console.error('');
  console.error('Find your database password at:');
  console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
  console.error('');
  console.error('Alternative: Copy the SQL into the Supabase SQL Editor:');
  console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`);
  process.exit(1);
}

async function run() {
  const sqlFile = path.join(__dirname, '..', 'supabase', 'migrations', '20260220_create_chicken_tables.sql');
  const fullSql = fs.readFileSync(sqlFile, 'utf8');

  console.log(`Project ref: ${PROJECT_REF}`);
  console.log(`SQL file: ${sqlFile} (${fullSql.length} bytes)`);
  console.log('');

  // Connect to Supabase Postgres directly
  const client = new Client({
    host: `db.${PROJECT_REF}.supabase.co`,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
  });

  try {
    console.log('Connecting to database...');
    await client.connect();
    console.log('Connected!');
    console.log('');

    console.log('Running migration...');
    await client.query(fullSql);
    console.log('Migration completed successfully!');
    console.log('');

    // Verify tables
    console.log('Verifying tables...');
    const tables = ['chicken_breeds', 'chicken_hatches', 'chicken_orders', 'chicken_order_additions', 'chicken_payments'];
    for (const table of tables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ${table}: OK (${result.rows[0].count} rows)`);
      } catch (e) {
        console.log(`  ${table}: ERROR - ${e.message}`);
      }
    }
  } catch (err) {
    console.error('Migration failed:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('');
      console.error('The database password is incorrect.');
      console.error('Find/reset it at:');
      console.error(`  https://supabase.com/dashboard/project/${PROJECT_REF}/settings/database`);
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
