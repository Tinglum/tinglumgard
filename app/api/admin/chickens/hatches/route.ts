import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

type HatchLineInput = {
  breed_id: string
  eggs_set_count?: number
  expected_hatch_count?: number
  actual_hatched_count?: number | null
  estimated_hens?: number
  estimated_roosters?: number
  notes?: string
  active?: boolean
}

function toNonNegativeInt(value: unknown, fallback: number = 0): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.max(0, Math.round(parsed))
}

function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const date = new Date(Date.UTC(year, (month || 1) - 1, day || 1))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().split('T')[0]
}

function splitEstimatedSex(totalChicks: number): { hens: number; roosters: number } {
  const hens = Math.round(totalChicks * 0.5)
  return {
    hens,
    roosters: Math.max(totalChicks - hens, 0),
  }
}

function makeBatchCode(eggsSetDate: string): string {
  const compactDate = eggsSetDate.replace(/-/g, '')
  const randomSuffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `KULL-${compactDate}-${randomSuffix}`
}

export async function GET() {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .select(`
        *,
        chicken_breeds(
          name,
          slug,
          accent_color,
          start_price_nok,
          weekly_increase_nok,
          adult_price_nok,
          mortality_rate_early_pct,
          mortality_rate_late_pct
        ),
        chicken_incubation_batches(
          id,
          batch_code,
          eggs_set_date,
          lock_down_date,
          hatch_due_date,
          total_eggs_set,
          notes,
          active
        )
      `)
      .order('hatch_date', { ascending: false })

    if (error) {
      logError('admin-chicken-hatches-get', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    logError('admin-chicken-hatches-get-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session?.isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()

    // New payload: one incubation batch with multiple breed rows.
    if (Array.isArray(body.lines)) {
      if (!body.eggs_set_date) {
        return NextResponse.json({ error: 'eggs_set_date is required' }, { status: 400 })
      }

      const lines: HatchLineInput[] = body.lines
        .filter((line: HatchLineInput) => line?.breed_id)
        .filter((line: HatchLineInput) => toNonNegativeInt(line.eggs_set_count) > 0)

      if (lines.length === 0) {
        return NextResponse.json({ error: 'At least one breed line with eggs_set_count > 0 is required' }, { status: 400 })
      }

      const eggsSetDate = String(body.eggs_set_date)
      const lockDownDate = body.lock_down_date || addDaysIso(eggsSetDate, 18)
      const hatchDueDate = body.hatch_due_date || addDaysIso(eggsSetDate, 21)
      const totalEggsSet = lines.reduce((sum, line) => sum + toNonNegativeInt(line.eggs_set_count), 0)

      const { data: batch, error: batchError } = await supabaseAdmin
        .from('chicken_incubation_batches')
        .insert({
          batch_code: body.batch_code || makeBatchCode(eggsSetDate),
          eggs_set_date: eggsSetDate,
          lock_down_date: lockDownDate,
          hatch_due_date: hatchDueDate,
          total_eggs_set: totalEggsSet,
          notes: body.notes || '',
          active: body.active !== false,
        })
        .select()
        .single()

      if (batchError || !batch) {
        logError('admin-chicken-hatches-create-batch', batchError)
        return NextResponse.json({ error: batchError?.message || 'Failed to create batch' }, { status: 500 })
      }

      const hatchRows = lines.map((line: HatchLineInput) => {
        const eggsSetCount = toNonNegativeInt(line.eggs_set_count)
        const expectedHatchCount = line.expected_hatch_count !== undefined
          ? toNonNegativeInt(line.expected_hatch_count)
          : Math.round(eggsSetCount * 0.5)

        const actualHatchedCount = line.actual_hatched_count === null || line.actual_hatched_count === undefined
          ? null
          : toNonNegativeInt(line.actual_hatched_count)

        const chicksForInventory = actualHatchedCount ?? expectedHatchCount
        const split = splitEstimatedSex(chicksForInventory)
        const estimatedHens = line.estimated_hens !== undefined ? toNonNegativeInt(line.estimated_hens) : split.hens
        const estimatedRoosters = line.estimated_roosters !== undefined ? toNonNegativeInt(line.estimated_roosters) : split.roosters

        return {
          incubation_batch_id: batch.id,
          breed_id: line.breed_id,
          hatch_date: hatchDueDate,
          initial_count: chicksForInventory,
          eggs_set_count: eggsSetCount,
          expected_hatch_count: expectedHatchCount,
          actual_hatched_count: actualHatchedCount,
          estimated_hens: estimatedHens,
          estimated_roosters: estimatedRoosters,
          available_hens: estimatedHens,
          available_roosters: estimatedRoosters,
          mortality_override: null,
          notes: line.notes || '',
          active: line.active !== false,
        }
      })

      const { data: createdRows, error: hatchError } = await supabaseAdmin
        .from('chicken_hatches')
        .insert(hatchRows)
        .select(`
          *,
          chicken_breeds(name, slug, accent_color),
          chicken_incubation_batches(id, batch_code, eggs_set_date, lock_down_date, hatch_due_date, total_eggs_set, notes, active)
        `)

      if (hatchError) {
        logError('admin-chicken-hatches-create-batch-lines', hatchError)
        return NextResponse.json({ error: hatchError.message }, { status: 500 })
      }

      return NextResponse.json({ batch, hatches: createdRows }, { status: 201 })
    }

    // Backward-compatible payload: one row (legacy form)
    if (!body.breed_id || !body.hatch_date || !body.initial_count) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const initialCount = toNonNegativeInt(body.initial_count)
    const eggsSetCount = body.eggs_set_count !== undefined ? toNonNegativeInt(body.eggs_set_count) : initialCount
    const expectedHatchCount = body.expected_hatch_count !== undefined
      ? toNonNegativeInt(body.expected_hatch_count)
      : initialCount
    const actualHatchedCount = body.actual_hatched_count === null || body.actual_hatched_count === undefined
      ? null
      : toNonNegativeInt(body.actual_hatched_count)
    const split = splitEstimatedSex(actualHatchedCount ?? expectedHatchCount)

    const { data, error } = await supabaseAdmin
      .from('chicken_hatches')
      .insert({
        breed_id: body.breed_id,
        hatch_date: body.hatch_date,
        initial_count: initialCount,
        eggs_set_count: eggsSetCount,
        expected_hatch_count: expectedHatchCount,
        actual_hatched_count: actualHatchedCount,
        estimated_hens: body.estimated_hens ?? split.hens,
        estimated_roosters: body.estimated_roosters ?? split.roosters,
        available_hens: body.available_hens ?? body.estimated_hens ?? split.hens,
        available_roosters: body.available_roosters ?? body.estimated_roosters ?? split.roosters,
        incubation_batch_id: body.incubation_batch_id || null,
        mortality_override: body.mortality_override || null,
        notes: body.notes || '',
        active: body.active !== false,
      })
      .select(`
        *,
        chicken_breeds(name, slug, accent_color),
        chicken_incubation_batches(id, batch_code, eggs_set_date, lock_down_date, hatch_due_date, total_eggs_set, notes, active)
      `)
      .single()

    if (error) {
      logError('admin-chicken-hatches-create', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    logError('admin-chicken-hatches-create-unexpected', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
