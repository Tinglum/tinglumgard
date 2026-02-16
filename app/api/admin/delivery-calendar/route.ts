import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/server';
import { getEffectiveBoxSize } from '@/lib/orders/display';

function isoWeekMonday(year: number, week: number): string {
  const januaryFourth = new Date(Date.UTC(year, 0, 4));
  const januaryFourthDay = januaryFourth.getUTCDay() || 7;
  const mondayOfWeekOne = new Date(januaryFourth);
  mondayOfWeekOne.setUTCDate(januaryFourth.getUTCDate() - januaryFourthDay + 1);
  const result = new Date(mondayOfWeekOne);
  result.setUTCDate(mondayOfWeekOne.getUTCDate() + (week - 1) * 7);
  return result.toISOString().split('T')[0];
}

type DeliveryGroup = {
  date: string;
  delivery_type: 'pickup' | 'delivery';
  location?: string;
  orders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    product_type: 'pig_box' | 'egg';
    display_name: string;
    quantity: number;
    quantity_unit: 'kg' | 'egg';
    fresh_delivery: boolean;
    marked_collected: boolean;
  }>;
};

function normalizePigDelivery(deliveryType?: string | null): {
  delivery_type: 'pickup' | 'delivery';
  location?: string;
} {
  switch (deliveryType) {
    case 'pickup_e6':
      return { delivery_type: 'pickup', location: 'E6 Melhus' };
    case 'delivery_trondheim':
      return { delivery_type: 'delivery', location: 'Trondheim' };
    case 'pickup_farm':
    default:
      return { delivery_type: 'pickup', location: 'Tinglum gård' };
  }
}

function normalizeEggDelivery(deliveryMethod?: string | null): {
  delivery_type: 'pickup' | 'delivery';
  location?: string;
} {
  if (deliveryMethod === 'posten') {
    return { delivery_type: 'delivery', location: 'Posten' };
  }

  if (deliveryMethod === 'pickup_e6') {
    return { delivery_type: 'pickup', location: 'E6 Melhus' };
  }

  return { delivery_type: 'pickup', location: 'Tinglum gård' };
}

export async function GET(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    let pigOrders: any[] = [];
    let pigError: any = null;

    const pigPrimary = await supabaseAdmin
      .from('orders')
      .select(
        'id, order_number, customer_name, delivery_type, status, created_at, marked_delivered_at, fresh_delivery, display_box_name_no, display_box_name_en, box_size, mangalitsa_preset:mangalitsa_box_presets(target_weight_kg)'
      )
      .not('status', 'in', '(cancelled,forfeited,draft,pending)');

    pigOrders = pigPrimary.data || [];
    pigError = pigPrimary.error;

    if (pigError) {
      console.warn('Delivery calendar pig query fallback:', pigError);
      const pigFallback = await supabaseAdmin
        .from('orders')
        .select('id, order_number, customer_name, delivery_type, status, created_at, marked_delivered_at, fresh_delivery, box_size')
        .not('status', 'in', '(cancelled,forfeited,draft,pending)');

      pigOrders = pigFallback.data || [];
      pigError = pigFallback.error;
    }

    if (pigError) throw pigError;

    let eggOrders: any[] = [];
    let eggError: any = null;

    const eggPrimary = await supabaseAdmin
      .from('egg_orders')
      .select('id, order_number, customer_name, delivery_method, status, delivery_monday, marked_delivered_at, quantity, egg_breeds(name)')
      .not('status', 'in', '(cancelled,forfeited,pending)');

    eggOrders = eggPrimary.data || [];
    eggError = eggPrimary.error;

    if (eggError) {
      console.warn('Delivery calendar egg query fallback:', eggError);
      const eggFallback = await supabaseAdmin
        .from('egg_orders')
        .select('id, order_number, customer_name, delivery_method, status, delivery_monday, quantity')
        .not('status', 'in', '(cancelled,forfeited,pending)');

      eggOrders = eggFallback.data || [];
      eggError = eggFallback.error;
    }

    if (eggError) throw eggError;

    const groups: Record<string, DeliveryGroup> = {};

    for (const order of pigOrders || []) {
      const createdYear = new Date(order.created_at || new Date().toISOString()).getUTCFullYear();
      const plannedDate =
        order.marked_delivered_at?.split('T')[0] ||
        isoWeekMonday(createdYear, order.fresh_delivery ? 50 : 48);
      const normalizedDelivery = normalizePigDelivery(order.delivery_type);
      const key = `${plannedDate}-${normalizedDelivery.delivery_type}-${normalizedDelivery.location || ''}`;
      if (!groups[key]) {
        groups[key] = {
          date: plannedDate,
          delivery_type: normalizedDelivery.delivery_type,
          location: normalizedDelivery.location,
          orders: [],
        };
      }

      const displayName =
        order.display_box_name_no ||
        order.display_box_name_en ||
        (order.fresh_delivery ? 'Mangalitsa (fersk)' : 'Mangalitsa');

      groups[key].orders.push({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        product_type: 'pig_box',
        display_name: displayName,
        quantity: getEffectiveBoxSize(order),
        quantity_unit: 'kg',
        fresh_delivery: !!order.fresh_delivery,
        marked_collected: !!order.marked_delivered_at,
      });
    }

    for (const order of eggOrders || []) {
      const plannedDate =
        order.marked_delivered_at?.split('T')[0] || order.delivery_monday || new Date().toISOString().split('T')[0];
      const normalizedDelivery = normalizeEggDelivery(order.delivery_method);
      const key = `${plannedDate}-${normalizedDelivery.delivery_type}-${normalizedDelivery.location || ''}`;
      if (!groups[key]) {
        groups[key] = {
          date: plannedDate,
          delivery_type: normalizedDelivery.delivery_type,
          location: normalizedDelivery.location,
          orders: [],
        };
      }

      const breedRelation = order.egg_breeds as { name?: string } | { name?: string }[] | null;
      const breedName = (Array.isArray(breedRelation) ? breedRelation[0]?.name : breedRelation?.name) || 'Rugeegg';

      groups[key].orders.push({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer_name,
        product_type: 'egg',
        display_name: breedName,
        quantity: order.quantity || 0,
        quantity_unit: 'egg',
        fresh_delivery: false,
        marked_collected: !!order.marked_delivered_at,
      });
    }

    const groupsArray = Object.values(groups).sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({ groups: groupsArray });
  } catch (error) {
    console.error('Delivery calendar error:', error);
    return NextResponse.json({ error: 'Failed to fetch delivery calendar' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();

  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { action, order_number, product_type } = body || {};

    if (action !== 'mark_collected') {
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    if (!order_number) {
      return NextResponse.json({ error: 'Missing order_number' }, { status: 400 });
    }

    if (product_type === 'egg') {
      const { error } = await supabaseAdmin
        .from('egg_orders')
        .update({
          marked_delivered_at: new Date().toISOString(),
          status: 'delivered',
        })
        .eq('order_number', order_number);

      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    const { error } = await supabaseAdmin
      .from('orders')
      .update({
        marked_delivered_at: new Date().toISOString(),
        status: 'completed',
      })
      .eq('order_number', order_number);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delivery calendar POST error:', error);
    return NextResponse.json({ error: 'Failed to update delivery' }, { status: 500 });
  }
}
