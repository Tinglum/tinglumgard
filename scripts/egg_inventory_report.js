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

function startOfIsoWeek(date) {
  const next = new Date(date);
  const day = next.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  next.setDate(next.getDate() + diff);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toDateString(d) {
  return d.toISOString().slice(0, 10);
}

(async () => {
  const sunday8 = new Date('2026-03-08');
  const mondayForSunday8 = startOfIsoWeek(sunday8);
  const mondayForSunday8Str = toDateString(mondayForSunday8);

  const today = new Date();
  const nextMonday = startOfIsoWeek(today);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const nextMondayStr = toDateString(nextMonday);

  const inventoryForSundayWeek = await supabase
    .from('egg_inventory')
    .select('*, egg_breeds(name,slug)')
    .eq('delivery_monday', mondayForSunday8Str);

  const inventoryForNextMonday = await supabase
    .from('egg_inventory')
    .select('*, egg_breeds(name,slug)')
    .eq('delivery_monday', nextMondayStr);

  const forecastForNextMonday = await supabase
    .from('egg_weekly_forecasts')
    .select('*')
    .eq('delivery_monday', nextMondayStr);

  console.log(JSON.stringify({
    sunday8: { monday: mondayForSunday8Str, inventory: inventoryForSundayWeek.data },
    nextMonday: { monday: nextMondayStr, inventory: inventoryForNextMonday.data, forecast: forecastForNextMonday.data },
  }, null, 2));
})();
