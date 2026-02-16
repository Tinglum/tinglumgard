import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { getEffectiveBoxSize } from '@/lib/orders/display';

function asNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

async function getAppConfigValue(key: string): Promise<unknown> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.value ?? null;
}

async function upsertAppConfigValue(key: string, value: unknown, description: string) {
  let { error } = await supabaseAdmin
    .from('app_config')
    .upsert([{ key, value, description }], { onConflict: 'key' });

  const message = String(error?.message || '').toLowerCase();
  const details = String(error?.details || '').toLowerCase();
  const hint = String(error?.hint || '').toLowerCase();
  const missingDescription =
    message.includes('description') ||
    details.includes('description') ||
    hint.includes('description');

  if (error && missingDescription) {
    const fallback = await supabaseAdmin
      .from('app_config')
      .upsert([{ key, value }], { onConflict: 'key' });
    error = fallback.error;
  }

  if (error) {
    throw error;
  }
}

async function getLegacyConfigValue(key: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('key', key)
    .maybeSingle();

  if (error) return null;
  return data?.value ?? null;
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'status') {
      return await getInventoryStatus();
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action } = body || {};

    if (action === 'update_max') {
      return await updateMaxKg(body.max_kg);
    }

    if (action === 'update_extras_stock') {
      return await updateExtraStock(body.extra_id, body.stock_quantity);
    }

    if (action === 'update_preset_limit') {
      return await updatePresetLimit(body.preset_slug, body.limit);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}

async function getInventoryStatus() {
  const appMaxKg = await getAppConfigValue('max_kg_available');
  const legacyMaxKg = await getLegacyConfigValue('max_kg_available');
  const maxKg = asNumber(appMaxKg ?? legacyMaxKg, 0);

  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status, box_size, mangalitsa_preset:mangalitsa_box_presets(id, slug, name_no, target_weight_kg)')
    .not('status', 'in', '(cancelled,forfeited)');

  const safeOrders = orders || [];
  const allocatedKg = safeOrders.reduce((sum, order) => sum + getEffectiveBoxSize(order), 0);
  const remainingKg = maxKg - allocatedKg;
  const utilizationRate = maxKg > 0 ? (allocatedKg / maxKg) * 100 : 0;

  const boxCounts = safeOrders.reduce((acc, order) => {
    const size = getEffectiveBoxSize(order);
    if (!size) return acc;
    const key = `${size}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const { data: presets } = await supabaseAdmin
    .from('mangalitsa_box_presets')
    .select('id, slug, name_no, target_weight_kg, active, display_order')
    .order('display_order', { ascending: true });

  const presetOrderCounts = safeOrders.reduce((acc, order: any) => {
    const preset = Array.isArray(order.mangalitsa_preset) ? order.mangalitsa_preset[0] : order.mangalitsa_preset;
    const slug = preset?.slug;
    if (!slug) return acc;
    acc[slug] = (acc[slug] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const presetLimitsValue = await getAppConfigValue('mangalitsa_box_limits');
  const presetLimits =
    presetLimitsValue && typeof presetLimitsValue === 'object' && !Array.isArray(presetLimitsValue)
      ? (presetLimitsValue as Record<string, unknown>)
      : {};

  const presetStock = (presets || []).map((preset) => {
    const limitRaw = presetLimits[preset.slug];
    const limit = limitRaw === null || limitRaw === undefined ? null : asNumber(limitRaw, 0);
    const used = presetOrderCounts[preset.slug] || 0;
    return {
      id: preset.id,
      slug: preset.slug,
      name_no: preset.name_no,
      target_weight_kg: preset.target_weight_kg,
      active: preset.active,
      order_count: used,
      limit,
      remaining: limit === null ? null : Math.max(limit - used, 0),
    };
  });

  const { data: extras } = await supabaseAdmin
    .from('extras_catalog')
    .select('id, slug, name_no, price_nok, pricing_type, stock_quantity, active, updated_at')
    .order('display_order', { ascending: true });

  const { data: eggInventory } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, eggs_available, eggs_allocated, eggs_remaining, status, delivery_monday')
    .gte('delivery_monday', new Date().toISOString().split('T')[0]);

  const eggRows = eggInventory || [];
  const eggSummary = eggRows.reduce(
    (acc, row) => {
      const available = row.eggs_available || 0;
      const allocated = row.eggs_allocated || 0;
      const remaining =
        row.eggs_remaining !== null && row.eggs_remaining !== undefined
          ? row.eggs_remaining
          : Math.max(available - allocated, 0);

      acc.total_available += available;
      acc.total_allocated += allocated;
      acc.total_remaining += remaining;
      if (row.status === 'open') acc.open_weeks += 1;
      if (row.status === 'locked') acc.locked_weeks += 1;
      if (row.status === 'closed') acc.closed_weeks += 1;
      return acc;
    },
    {
      upcoming_weeks: eggRows.length,
      open_weeks: 0,
      locked_weeks: 0,
      closed_weeks: 0,
      total_available: 0,
      total_allocated: 0,
      total_remaining: 0,
    }
  );

  return NextResponse.json({
    inventory: {
      max_kg: maxKg,
      allocated_kg: allocatedKg,
      remaining_kg: remainingKg,
      utilization_rate: Math.round(utilizationRate * 10) / 10,
      box_counts: boxCounts,
      total_orders: safeOrders.length,
      preset_stock: presetStock,
      extras_stock: extras || [],
      egg_inventory_summary: eggSummary,
    },
  });
}

async function updateMaxKg(maxKg: number) {
  const numericValue = asNumber(maxKg, NaN);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return NextResponse.json({ error: 'Invalid max_kg value' }, { status: 400 });
  }

  await upsertAppConfigValue('max_kg_available', numericValue, 'Maximum pig kg available for sales');
  await supabaseAdmin.from('config').upsert([{ key: 'max_kg_available', value: String(numericValue) }], {
    onConflict: 'key',
  });

  return NextResponse.json({ success: true });
}

async function updateExtraStock(extraId: string, stockQuantity: number | null) {
  if (!extraId) {
    return NextResponse.json({ error: 'Missing extra_id' }, { status: 400 });
  }

  const parsedQuantity =
    stockQuantity === null || stockQuantity === undefined ? null : asNumber(stockQuantity, NaN);
  if (parsedQuantity !== null && (!Number.isFinite(parsedQuantity) || parsedQuantity < 0)) {
    return NextResponse.json({ error: 'Invalid stock quantity' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('extras_catalog')
    .update({ stock_quantity: parsedQuantity })
    .eq('id', extraId);

  if (error) {
    throw error;
  }

  return NextResponse.json({ success: true });
}

async function updatePresetLimit(presetSlug: string, limit: number | null) {
  if (!presetSlug) {
    return NextResponse.json({ error: 'Missing preset_slug' }, { status: 400 });
  }

  const parsedLimit = limit === null || limit === undefined ? null : asNumber(limit, NaN);
  if (parsedLimit !== null && (!Number.isFinite(parsedLimit) || parsedLimit < 0)) {
    return NextResponse.json({ error: 'Invalid limit' }, { status: 400 });
  }

  const limitsValue = await getAppConfigValue('mangalitsa_box_limits');
  const limits =
    limitsValue && typeof limitsValue === 'object' && !Array.isArray(limitsValue)
      ? ({ ...(limitsValue as Record<string, unknown>) } as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  limits[presetSlug] = parsedLimit;

  await upsertAppConfigValue(
    'mangalitsa_box_limits',
    limits,
    'Per-box seasonal stock limits for Mangalitsa presets'
  );

  return NextResponse.json({ success: true });
}
