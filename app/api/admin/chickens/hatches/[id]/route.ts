import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

const ALLOWED_FIELDS = [
  'breed_id', 'hatch_date', 'initial_count', 'estimated_hens', 'estimated_roosters',
  'available_hens', 'available_roosters', 'mortality_override', 'notes', 'active',
  'eggs_set_count', 'expected_hatch_count', 'actual_hatched_count', 'incubation_batch_id',
]

function toNonNegativeInt(value: unknown, fallback: number = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const updates: Record<string, any> = {}
    const explicitFields = new Set<string>(Object.keys(body))

    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) {
        updates[field] = body[field]
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

    const { data: existing, error: existingError } = await supabaseAdmin
      .from('chicken_hatches')
      .select('id, estimated_hens, estimated_roosters, available_hens, available_roosters')
      .eq('id', params.id)
      .single()

    if (existingError || !existing) {
      logError('admin-chicken-hatch-update-existing', existingError)
      return NextResponse.json({ error: existingError?.message || 'Hatch not found' }, { status: 404 })
    }

    // Keep field values consistent when admin enters actual hatch counts.
    if (explicitFields.has('actual_hatched_count')) {
      const actual = body.actual_hatched_count === null ? null : toNonNegativeInt(body.actual_hatched_count)
      updates.actual_hatched_count = actual

      if (actual !== null) {
        const derivedHens = Math.round(actual * 0.5)
        const derivedRoosters = Math.max(actual - derivedHens, 0)

        if (!explicitFields.has('expected_hatch_count')) updates.expected_hatch_count = actual
        if (!explicitFields.has('initial_count')) updates.initial_count = actual
        if (!explicitFields.has('estimated_hens')) updates.estimated_hens = derivedHens
        if (!explicitFields.has('estimated_roosters')) updates.estimated_roosters = derivedRoosters

        const alreadyAllocatedHens = Math.max(Number(existing.estimated_hens || 0) - Number(existing.available_hens || 0), 0)
        const alreadyAllocatedRoosters = Math.max(Number(existing.estimated_roosters || 0) - Number(existing.available_roosters || 0), 0)

        if (!explicitFields.has('available_hens')) {
          updates.available_hens = Math.max(derivedHens - alreadyAllocatedHens, 0)
        }
        if (!explicitFields.has('available_roosters')) {
          updates.available_roosters = Math.max(derivedRoosters - alreadyAllocatedRoosters, 0)
        }
      }
    }

    // If eggs set changes and expected hatch is not explicitly set, keep 50% estimate.
    if (explicitFields.has('eggs_set_count') && !explicitFields.has('expected_hatch_count')) {
      updates.expected_hatch_count = Math.round(toNonNegativeInt(body.eggs_set_count) * 0.5)
    }

    if (updates.eggs_set_count !== undefined) updates.eggs_set_count = toNonNegativeInt(updates.eggs_set_count)
    if (updates.expected_hatch_count !== undefined) updates.expected_hatch_count = toNonNegativeInt(updates.expected_hatch_count)
    if (updates.initial_count !== undefined) updates.initial_count = toNonNegativeInt(updates.initial_count)
    if (updates.estimated_hens !== undefined) updates.estimated_hens = toNonNegativeInt(updates.estimated_hens)
    if (updates.estimated_roosters !== undefined) updates.estimated_roosters = toNonNegativeInt(updates.estimated_roosters)
    if (updates.available_hens !== undefined) updates.available_hens = toNonNegativeInt(updates.available_hens)
    if (updates.available_roosters !== undefined) updates.available_roosters = toNonNegativeInt(updates.available_roosters)

    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .update(updates)
      .eq('id', params.id)
      .select(`
        *,
        chicken_breeds(name, slug, accent_color),
        chicken_incubation_batches(id, batch_code, eggs_set_date, lock_down_date, hatch_due_date, total_eggs_set, notes, active)
      `)
      .single()

    if (error) {
      logError('admin-chicken-hatch-update', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-chicken-hatch-update-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { error } = await supabaseAdmin
      .from('chicken_hatches')
      .update({ active: false })
      .eq('id', params.id)

    if (error) {
      logError('admin-chicken-hatch-delete', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    logError('admin-chicken-hatch-delete-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
