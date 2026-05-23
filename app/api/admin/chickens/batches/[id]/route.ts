import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

function toNonNegativeInt(value: unknown, fallback: number = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

function toNumericOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

function makeBatchCode(eggsSetDate: string): string {
  const compactDate = eggsSetDate.replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `KULL-${compactDate}-${randomSuffix}`
}

async function logBatchEvent(batchId: string, eventType: string, description: string, metadata: Record<string, any> = {}) {
  await supabaseAdmin
    .from('chicken_batch_events')
    .insert({ batch_id: batchId, event_type: eventType, description, metadata })
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
    const batchId = params.id

    const { data: existing, error: fetchError } = await supabaseAdmin
      .from('chicken_incubation_batches')
      .select('id')
      .eq('id', batchId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
    }

    const batchUpdates: Record<string, any> = {}
    if (body.eggs_set_date) {
      batchUpdates.eggs_set_date = body.eggs_set_date
      batchUpdates.lock_down_date = body.lock_down_date || addDaysIso(body.eggs_set_date, 18)
      batchUpdates.hatch_due_date = body.hatch_due_date || addDaysIso(body.eggs_set_date, 21)
    }
    if (body.notes !== undefined) batchUpdates.notes = body.notes
    if (body.target_temperature !== undefined) batchUpdates.target_temperature = toNumericOrNull(body.target_temperature)
    if (body.target_humidity !== undefined) batchUpdates.target_humidity = toNumericOrNull(body.target_humidity)

    if (Object.keys(batchUpdates).length > 0) {
      const { error: batchError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .update(batchUpdates)
        .eq('id', batchId)

      if (batchError) {
        logError('admin-batch-update', batchError)
        return NextResponse.json({ error: batchError.message }, { status: 500 })
      }

      await logBatchEvent(batchId, 'edited', 'Kull oppdatert', { fields: Object.keys(batchUpdates) })
    }

    if (Array.isArray(body.rows)) {
      const hatchDueDate = batchUpdates.hatch_due_date || body.hatch_due_date

      for (const row of body.rows) {
        if (!row.id) continue

        const updates: Record<string, any> = {}
        if (row.eggs_set_count !== undefined) {
          updates.eggs_set_count = toNonNegativeInt(row.eggs_set_count)
          updates.expected_hatch_count = Math.round(toNonNegativeInt(row.eggs_set_count) * 0.5)
        }
        if (row.expected_hatch_count !== undefined) {
          updates.expected_hatch_count = toNonNegativeInt(row.expected_hatch_count)
        }
        if (row.actual_hatched_count !== undefined) {
          const actual = row.actual_hatched_count === null || row.actual_hatched_count === ''
            ? null
            : toNonNegativeInt(row.actual_hatched_count)
          updates.actual_hatched_count = actual

          if (actual !== null) {
            const derivedHens = Math.round(actual * 0.5)
            const derivedRoosters = Math.max(actual - derivedHens, 0)
            if (row.estimated_hens === undefined) updates.estimated_hens = derivedHens
            if (row.estimated_roosters === undefined) updates.estimated_roosters = derivedRoosters
            if (row.available_hens === undefined) updates.available_hens = derivedHens
            if (row.available_roosters === undefined) updates.available_roosters = derivedRoosters
            updates.initial_count = actual
            updates.expected_hatch_count = actual
          }
        }
        if (row.available_hens !== undefined) updates.available_hens = toNonNegativeInt(row.available_hens)
        if (row.available_roosters !== undefined) updates.available_roosters = toNonNegativeInt(row.available_roosters)
        if (row.notes !== undefined) updates.notes = row.notes
        if (hatchDueDate) updates.hatch_date = hatchDueDate

        // Candling fields
        if (row.candling_date !== undefined) updates.candling_date = row.candling_date || null
        if (row.candling_fertile_count !== undefined) {
          updates.candling_fertile_count = row.candling_fertile_count === null ? null : toNonNegativeInt(row.candling_fertile_count)
        }
        if (row.candling_removed_count !== undefined) {
          updates.candling_removed_count = row.candling_removed_count === null ? null : toNonNegativeInt(row.candling_removed_count)
        }

        if (row.candling_fertile_count !== undefined && row.candling_fertile_count !== null) {
          updates.expected_hatch_count = Math.round(toNonNegativeInt(row.candling_fertile_count) * 0.5)
        }

        if (Object.keys(updates).length > 0) {
          const { error: rowError } = await supabaseAdmin
            .from('chicken_hatches')
            .update(updates)
            .eq('id', row.id)
            .eq('incubation_batch_id', batchId)

          if (rowError) {
            logError('admin-batch-row-update', rowError)
          }
        }
      }

      if (body.rows.some((r: any) => r.eggs_set_count !== undefined)) {
        const { data: allRows } = await supabaseAdmin
          .from('chicken_hatches')
          .select('eggs_set_count')
          .eq('incubation_batch_id', batchId)

        if (allRows) {
          const totalEggs = allRows.reduce((sum, r) => sum + toNonNegativeInt(r.eggs_set_count), 0)
          await supabaseAdmin
            .from('chicken_incubation_batches')
            .update({ total_eggs_set: totalEggs })
            .eq('id', batchId)
        }
      }
    }

    const { data: updatedBatch } = await supabaseAdmin
      .from('chicken_incubation_batches')
      .select('*')
      .eq('id', batchId)
      .single()

    const { data: updatedRows } = await supabaseAdmin
      .from('chicken_hatches')
      .select(`
        *,
        chicken_breeds(name, slug, accent_color, start_price_nok, weekly_increase_nok, adult_price_nok),
        chicken_incubation_batches(id, batch_code, eggs_set_date, lock_down_date, hatch_due_date, total_eggs_set, notes, active, target_temperature, target_humidity)
      `)
      .eq('incubation_batch_id', batchId)

    return NextResponse.json({ batch: updatedBatch, hatches: updatedRows || [] })
  } catch (error) {
    logError('admin-batch-update-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const batchId = params.id

    // Toggle active/inactive
    if (body.action === 'toggle_active') {
      const { data: batch, error: fetchError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .select('active, batch_code')
        .eq('id', batchId)
        .single()

      if (fetchError || !batch) {
        return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
      }

      const newActive = !batch.active

      const { error: batchError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .update({ active: newActive })
        .eq('id', batchId)

      if (batchError) {
        logError('admin-batch-toggle-active', batchError)
        return NextResponse.json({ error: batchError.message }, { status: 500 })
      }

      const { error: rowsError } = await supabaseAdmin
        .from('chicken_hatches')
        .update({ active: newActive })
        .eq('incubation_batch_id', batchId)

      if (rowsError) {
        logError('admin-batch-toggle-active-rows', rowsError)
      }

      await logBatchEvent(batchId, newActive ? 'activated' : 'deactivated', newActive ? 'Kull aktivert' : 'Kull deaktivert')

      return NextResponse.json({ success: true, active: newActive })
    }

    // Duplicate batch as template
    if (body.action === 'duplicate') {
      const { data: sourceBatch, error: fetchError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .select('*')
        .eq('id', batchId)
        .single()

      if (fetchError || !sourceBatch) {
        return NextResponse.json({ error: 'Source batch not found' }, { status: 404 })
      }

      const { data: sourceRows, error: rowsError } = await supabaseAdmin
        .from('chicken_hatches')
        .select('breed_id, eggs_set_count')
        .eq('incubation_batch_id', batchId)

      if (rowsError) {
        return NextResponse.json({ error: rowsError.message }, { status: 500 })
      }

      const newEggsSetDate = body.eggs_set_date || new Date().toISOString().split('T')[0]
      const newLockDown = addDaysIso(newEggsSetDate, 18)
      const newHatchDue = addDaysIso(newEggsSetDate, 21)
      const totalEggs = (sourceRows || []).reduce((sum, r) => sum + toNonNegativeInt(r.eggs_set_count), 0)

      const { data: newBatch, error: createError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .insert({
          batch_code: makeBatchCode(newEggsSetDate),
          eggs_set_date: newEggsSetDate,
          lock_down_date: newLockDown,
          hatch_due_date: newHatchDue,
          total_eggs_set: totalEggs,
          notes: body.notes || sourceBatch.notes || '',
          target_temperature: sourceBatch.target_temperature,
          target_humidity: sourceBatch.target_humidity,
          active: true,
        })
        .select()
        .single()

      if (createError || !newBatch) {
        logError('admin-batch-duplicate-batch', createError)
        return NextResponse.json({ error: createError?.message || 'Failed to duplicate batch' }, { status: 500 })
      }

      const newRows = (sourceRows || [])
        .filter(r => toNonNegativeInt(r.eggs_set_count) > 0)
        .map(r => {
          const eggs = toNonNegativeInt(r.eggs_set_count)
          const expected = Math.round(eggs * 0.5)
          const hens = Math.round(expected * 0.5)
          const roosters = Math.max(expected - hens, 0)
          return {
            incubation_batch_id: newBatch.id,
            breed_id: r.breed_id,
            hatch_date: newHatchDue,
            initial_count: expected,
            eggs_set_count: eggs,
            expected_hatch_count: expected,
            actual_hatched_count: null,
            estimated_hens: hens,
            estimated_roosters: roosters,
            available_hens: hens,
            available_roosters: roosters,
            mortality_override: null,
            notes: '',
            active: true,
          }
        })

      if (newRows.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from('chicken_hatches')
          .insert(newRows)

        if (insertError) {
          logError('admin-batch-duplicate-rows', insertError)
        }
      }

      await logBatchEvent(newBatch.id, 'created', `Kull duplisert fra ${sourceBatch.batch_code}`, { source_batch_id: batchId })

      return NextResponse.json({ success: true, batch: newBatch }, { status: 201 })
    }

    // Quick hatch registration
    if (body.action === 'register_hatch') {
      if (!Array.isArray(body.results) || body.results.length === 0) {
        return NextResponse.json({ error: 'results array is required' }, { status: 400 })
      }

      for (const result of body.results) {
        if (!result.id) continue
        const actual = toNonNegativeInt(result.actual_hatched_count)
        const derivedHens = Math.round(actual * 0.5)
        const derivedRoosters = Math.max(actual - derivedHens, 0)

        const { error } = await supabaseAdmin
          .from('chicken_hatches')
          .update({
            actual_hatched_count: actual,
            initial_count: actual,
            expected_hatch_count: actual,
            estimated_hens: derivedHens,
            estimated_roosters: derivedRoosters,
            available_hens: derivedHens,
            available_roosters: derivedRoosters,
          })
          .eq('id', result.id)
          .eq('incubation_batch_id', batchId)

        if (error) {
          logError('admin-batch-register-hatch-row', error)
        }
      }

      await logBatchEvent(batchId, 'hatched', 'Klekkeresultater registrert', {
        results: body.results.map((r: any) => ({ id: r.id, count: r.actual_hatched_count })),
      })

      return NextResponse.json({ success: true })
    }

    // Candling registration
    if (body.action === 'register_candling') {
      if (!Array.isArray(body.results) || body.results.length === 0) {
        return NextResponse.json({ error: 'results array is required' }, { status: 400 })
      }

      const candlingDate = body.candling_date || new Date().toISOString().split('T')[0]

      for (const result of body.results) {
        if (!result.id) continue
        const fertileCount = toNonNegativeInt(result.candling_fertile_count)
        const removedCount = toNonNegativeInt(result.candling_removed_count)

        const { error } = await supabaseAdmin
          .from('chicken_hatches')
          .update({
            candling_date: candlingDate,
            candling_fertile_count: fertileCount,
            candling_removed_count: removedCount,
            expected_hatch_count: Math.round(fertileCount * 0.5),
          })
          .eq('id', result.id)
          .eq('incubation_batch_id', batchId)

        if (error) {
          logError('admin-batch-register-candling-row', error)
        }
      }

      await logBatchEvent(batchId, 'candled', `Lysing utført ${candlingDate}`, {
        candling_date: candlingDate,
        results: body.results.map((r: any) => ({ id: r.id, fertile: r.candling_fertile_count, removed: r.candling_removed_count })),
      })

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    logError('admin-batch-action-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
