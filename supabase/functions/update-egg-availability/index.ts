import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const END_DATE = new Date('2026-08-01');
const NEAR_WEEKS = 6;
const MID_WEEKS = 8;
const NEAR_MIN = 10;
const NEAR_MAX = 20;
const MID_MIN = 6;
const MID_MAX = 14;
const MID_URGENCY_CHANCE = 0.4;
const FAR_MIN = 1;
const FAR_MAX = 6;
const FAR_ZERO_CHANCE = 0.6;
const FAR_URGENCY_CHANCE = 0.6;

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: breeds, error: breedsError } = await supabase
      .from('egg_breeds')
      .select('id')
      .eq('active', true);

    if (breedsError) throw breedsError;

    const breedIds = (breeds || []).map((b: { id: string }) => b.id);
    if (breedIds.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No active breeds found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date();
    const endDate = new Date(END_DATE);
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;
    const weeksAhead = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / msPerWeek));

    const { data: existingInventory, error: inventoryError } = await supabase
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, eggs_allocated, status, delivery_monday')
      .in('breed_id', breedIds)
      .gte('delivery_monday', now.toISOString().slice(0, 10))
      .lte('delivery_monday', endDate.toISOString().slice(0, 10));

    if (inventoryError) throw inventoryError;

    const inventoryMap = new Map<string, {
      eggs_allocated: number;
      status: string;
    }>();

    (existingInventory || []).forEach((row: any) => {
      const key = `${row.breed_id}-${row.year}-${row.week_number}`;
      inventoryMap.set(key, {
        eggs_allocated: row.eggs_allocated || 0,
        status: row.status || 'open',
      });
    });

    const upserts: any[] = [];

    for (let i = 1; i <= weeksAhead; i++) {
      const { year, week } = addWeeksToIsoWeek(now, i);
      const deliveryMonday = getMondayOfIsoWeek(year, week);

      for (const breedId of breedIds) {
        const key = `${breedId}-${year}-${week}`;
        const existing = inventoryMap.get(key);

        if (existing && (existing.status === 'locked' || existing.status === 'closed')) {
          continue;
        }

        const targetRemaining = getTargetRemaining(i);
        const allocated = existing?.eggs_allocated || 0;
        const eggsAvailable = Math.max(allocated, allocated + targetRemaining);

        upserts.push({
          breed_id: breedId,
          year,
          week_number: week,
          delivery_monday: deliveryMonday.toISOString().slice(0, 10),
          eggs_available: eggsAvailable,
          status: 'open',
        });
      }
    }

    if (upserts.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No inventory updates needed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { error: upsertError } = await supabase
      .from('egg_inventory')
      .upsert(upserts, { onConflict: 'breed_id,year,week_number' });

    if (upsertError) throw upsertError;

    return new Response(
      JSON.stringify({
        message: 'Egg availability updated',
        updatedCount: upserts.length,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getTargetRemaining(weeksAhead: number): number {
  if (weeksAhead <= NEAR_WEEKS) {
    return randomInt(NEAR_MIN, NEAR_MAX);
  }
  if (weeksAhead <= MID_WEEKS) {
    if (Math.random() < MID_URGENCY_CHANCE) {
      return Math.random() < 0.4 ? 0 : randomInt(FAR_MIN, FAR_MAX);
    }
    return randomInt(NEAR_MIN, NEAR_MAX);
  }
  if (Math.random() < FAR_URGENCY_CHANCE) {
    return Math.random() < FAR_ZERO_CHANCE ? 0 : randomInt(FAR_MIN, FAR_MAX);
  }
  return randomInt(NEAR_MIN, NEAR_MAX);
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addWeeksToIsoWeek(date: Date, weeksToAdd: number): { year: number; week: number } {
  const base = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  base.setUTCDate(base.getUTCDate() + weeksToAdd * 7);
  return { year: base.getUTCFullYear(), week: getWeekNumber(base) };
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getMondayOfIsoWeek(year: number, week: number): Date {
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const dow = simple.getUTCDay();
  const isoWeekStart = new Date(simple);
  const diff = dow <= 4 ? 1 - (dow || 7) : 8 - dow;
  isoWeekStart.setUTCDate(simple.getUTCDate() + diff);
  return isoWeekStart;
}
