import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Create new egg order
export async function POST(request: Request) {
  try {
    const body = await request.json()

    // Generate order number
    const orderNumber = `EGG${Date.now().toString().slice(-8)}`

    const orderData = {
      user_id: body.user_id || null,
      order_number: orderNumber,
      customer_name: body.customer_name,
      customer_email: body.customer_email,
      customer_phone: body.customer_phone || null,
      breed_id: body.breed_id,
      inventory_id: body.inventory_id,
      quantity: body.quantity,
      price_per_egg: body.price_per_egg,
      subtotal: body.subtotal,
      delivery_fee: body.delivery_fee,
      total_amount: body.total_amount,
      deposit_amount: body.deposit_amount,
      remainder_amount: body.remainder_amount,
      delivery_method: body.delivery_method,
      year: body.year,
      week_number: body.week_number,
      delivery_monday: body.delivery_monday,
      remainder_due_date: body.remainder_due_date,
      notes: body.notes || null,
      status: 'deposit_paid',
      policy_version: 'v1-2026',
    }

    const { data, error } = await supabaseAdmin
      .from('egg_orders')
      .insert(orderData)
      .select()
      .single()

    if (error) {
      console.error('Error creating egg order:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Update inventory allocation (simple increment for now)
    const { data: inventoryRow, error: inventoryFetchError } = await supabaseAdmin
      .from('egg_inventory')
      .select('eggs_allocated')
      .eq('id', body.inventory_id)
      .single()

    if (inventoryFetchError) {
      console.error('Error fetching inventory for update:', inventoryFetchError)
    } else {
      const currentAllocated = inventoryRow?.eggs_allocated ?? 0
      const nextAllocated = currentAllocated + Number(body.quantity || 0)

      const { error: inventoryError } = await supabaseAdmin
        .from('egg_inventory')
        .update({
          eggs_allocated: nextAllocated
        })
        .eq('id', body.inventory_id)

      if (inventoryError) {
        console.error('Error updating inventory:', inventoryError)
        // Note: Order was created but inventory not updated - may need manual fix
      }
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Get all egg orders (for admin)
export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from('egg_orders')
      .select('*, egg_breeds(*), egg_inventory(*)')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching egg orders:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error: any) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
