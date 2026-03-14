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

(async () => {
  const inv = await supabase
    .from('egg_inventory')
    .select('delivery_monday,year,week_number,eggs_available,eggs_allocated,eggs_remaining,egg_breeds(name,slug)')
    .order('delivery_monday', { ascending: false })
    .limit(50);

  const fcast = await supabase
    .from('egg_weekly_forecasts')
    .select('delivery_monday,breed_id,forecast_eggs,low_stock')
    .order('delivery_monday', { ascending: false })
    .limit(50);

  console.log('inventory rows:', inv.data?.length, 'forecast rows:', fcast.data?.length);
  console.log(JSON.stringify({ inventory: inv.data, forecast: fcast.data }, null, 2));
})();
