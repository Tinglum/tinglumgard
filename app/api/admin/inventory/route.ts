import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getSession } from '@/lib/auth/session';
import { getEffectiveBoxSize } from '@/lib/orders/display';

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
    const { action, max_kg } = body;

    if (action === 'update_max') {
      return await updateMaxKg(max_kg);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('Inventory POST error:', error);
    return NextResponse.json({ error: 'Failed to update inventory' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { season, kgRemaining } = await request.json();

  const { data, error } = await supabaseAdmin
    .from('inventory')
    .update({ kg_remaining: kgRemaining })
    .eq('season', season)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, data });
}

async function getInventoryStatus() {
  // Get max kg from config
  const { data: configData } = await supabaseAdmin
    .from('config')
    .select('value')
    .eq('key', 'max_kg_available')
    .single();

  const maxKg = parseInt(configData?.value || '0');

  // Get all active orders
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('box_size, status, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)')
    .not('status', 'eq', 'cancelled');

  const allocatedKg = orders?.reduce((sum, o) => sum + getEffectiveBoxSize(o), 0) || 0;
  const remainingKg = maxKg - allocatedKg;
  const utilizationRate = maxKg > 0 ? (allocatedKg / maxKg) * 100 : 0;

  const boxCounts = (orders || []).reduce((acc, order) => {
    const size = getEffectiveBoxSize(order);
    if (!size) return acc;
    const key = `${size}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const box8kgCount = boxCounts['8'] || 0;
  const box12kgCount = boxCounts['12'] || 0;

  return NextResponse.json({
    inventory: {
      max_kg: maxKg,
      allocated_kg: allocatedKg,
      remaining_kg: remainingKg,
      utilization_rate: Math.round(utilizationRate * 10) / 10,
      box_8kg_count: box8kgCount,
      box_12kg_count: box12kgCount,
      box_counts: boxCounts,
      total_orders: orders?.length || 0,
    },
  });
}

async function updateMaxKg(maxKg: number) {
  const { error } = await supabaseAdmin
    .from('config')
    .update({ value: maxKg.toString() })
    .eq('key', 'max_kg_available');

  if (error) throw error;

  return NextResponse.json({ success: true });
}
