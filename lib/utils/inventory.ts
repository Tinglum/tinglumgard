import { supabaseAdmin } from '@/lib/supabase/server';

export async function deductInventory(orderId: string, boxSize: number): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('inventory_deducted, id')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return { success: false, error: 'Order not found' };
    }

    if (order.inventory_deducted) {
      return { success: true };
    }

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('season', process.env.CURRENT_SEASON || 'høst_2024')
      .eq('active', true)
      .single();

    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    if (inventory.kg_remaining < boxSize) {
      return { success: false, error: 'Insufficient inventory' };
    }

    const { error: updateInventoryError } = await supabaseAdmin
      .from('inventory')
      .update({ kg_remaining: inventory.kg_remaining - boxSize })
      .eq('id', inventory.id);

    if (updateInventoryError) {
      return { success: false, error: 'Failed to update inventory' };
    }

    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({
        inventory_deducted: true,
        inventory_deduction_kg: boxSize,
      })
      .eq('id', orderId);

    if (updateOrderError) {
      await supabaseAdmin
        .from('inventory')
        .update({ kg_remaining: inventory.kg_remaining })
        .eq('id', inventory.id);

      return { success: false, error: 'Failed to mark order as deducted' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error deducting inventory:', error);
    return { success: false, error: 'Internal error' };
  }
}

export async function restoreInventory(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('inventory_deducted, inventory_deduction_kg')
      .eq('id', orderId)
      .single();

    if (orderError) {
      return { success: false, error: 'Order not found' };
    }

    if (!order.inventory_deducted || !order.inventory_deduction_kg) {
      return { success: true };
    }

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('inventory')
      .select('*')
      .eq('season', process.env.CURRENT_SEASON || 'høst_2024')
      .eq('active', true)
      .single();

    if (inventoryError || !inventory) {
      return { success: false, error: 'Inventory not found' };
    }

    const { error: updateInventoryError } = await supabaseAdmin
      .from('inventory')
      .update({ kg_remaining: inventory.kg_remaining + order.inventory_deduction_kg })
      .eq('id', inventory.id);

    if (updateInventoryError) {
      return { success: false, error: 'Failed to restore inventory' };
    }

    const { error: updateOrderError } = await supabaseAdmin
      .from('orders')
      .update({
        inventory_deducted: false,
        inventory_deduction_kg: 0,
      })
      .eq('id', orderId);

    if (updateOrderError) {
      return { success: false, error: 'Failed to update order' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error restoring inventory:', error);
    return { success: false, error: 'Internal error' };
  }
}

export async function getInventory() {
  const { data, error } = await supabaseAdmin
    .from('inventory')
    .select('*')
    .eq('season', process.env.CURRENT_SEASON || 'høst_2024')
    .eq('active', true)
    .single();

  if (error) {
    return { kgRemaining: 0, boxesRemaining: 0 };
  }

  const boxesRemaining = Math.floor(data.kg_remaining / 10);

  return {
    kgRemaining: data.kg_remaining,
    boxesRemaining,
  };
}
