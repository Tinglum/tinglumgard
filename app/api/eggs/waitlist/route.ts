import { NextRequest, NextResponse } from 'next/server'
import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSingleBreedMinimumEggs } from '@/lib/eggs/minimums'
import { EGG_WAITLIST_ACTIVE_STATUSES, normalizeWaitlistEmail } from '@/lib/eggs/waitlist'

type WaitlistRequest = {
  inventoryId?: string
  email?: string
  name?: string
  phone?: string
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function toSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }
  return value || null
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as WaitlistRequest
    const inventoryId = body.inventoryId?.trim()
    const email = normalizeWaitlistEmail(body.email || '')
    const name = body.name?.trim() || null
    const phone = body.phone?.trim() || null

    if (!inventoryId) {
      return NextResponse.json({ error: 'Inventory is required' }, { status: 400 })
    }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 })
    }

    const { data: inventory, error: inventoryError } = await supabaseAdmin
      .from('egg_inventory')
      .select('id, breed_id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status, egg_breeds(id, name, slug, min_order_quantity)')
      .eq('id', inventoryId)
      .single()

    if (inventoryError || !inventory) {
      return NextResponse.json({ error: 'Inventory not found' }, { status: 404 })
    }

    if (!['open', 'sold_out', 'locked'].includes(inventory.status)) {
      return NextResponse.json({ error: 'This week is not open for waitlist' }, { status: 400 })
    }

    const breed = toSingleRelation(inventory.egg_breeds)
    const minimum = getSingleBreedMinimumEggs({
      slug: breed?.slug,
      min_order_quantity: breed?.min_order_quantity || 0,
    })
    const eggsRemaining = Math.max(0, (inventory.eggs_available || 0) - (inventory.eggs_allocated || 0))

    if (eggsRemaining >= minimum) {
      return NextResponse.json({ error: 'Stock available now' }, { status: 409 })
    }

    const { data: existingEntry, error: existingError } = await supabaseAdmin
      .from('egg_waitlist_entries')
      .select('id')
      .eq('inventory_id', inventoryId)
      .eq('email', email)
      .in('status', EGG_WAITLIST_ACTIVE_STATUSES)
      .limit(1)

    if (existingError) {
      logError('egg-waitlist-existing-check', existingError, { inventoryId, email })
      return NextResponse.json({ error: 'Failed to check waitlist' }, { status: 500 })
    }

    if ((existingEntry || []).length > 0) {
      return NextResponse.json({ error: 'Already on waitlist' }, { status: 409 })
    }

    const { data: createdEntry, error: createError } = await supabaseAdmin
      .from('egg_waitlist_entries')
      .insert({
        inventory_id: inventory.id,
        breed_id: inventory.breed_id,
        year: inventory.year,
        week_number: inventory.week_number,
        delivery_monday: inventory.delivery_monday,
        email,
        name,
        phone,
        status: 'queued',
      })
      .select('id')
      .single()

    if (createError || !createdEntry) {
      if (createError?.code === '23505') {
        return NextResponse.json({ error: 'Already on waitlist' }, { status: 409 })
      }
      logError('egg-waitlist-create', createError, { inventoryId, email })
      return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
    }

    const { count } = await supabaseAdmin
      .from('egg_waitlist_entries')
      .select('*', { count: 'exact', head: true })
      .eq('inventory_id', inventoryId)
      .in('status', ['queued', 'notified', 'paused'])

    return NextResponse.json({
      success: true,
      queuePosition: count || 1,
    })
  } catch (error) {
    logError('egg-waitlist-post', error)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}
