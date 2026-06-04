import { supabaseAdmin } from '@/lib/supabase/server'
import type { SessionData } from '@/lib/auth/session'
import type { DairyProductionBatch, ProductionStatus, ProductType, ProcessLogEntry } from './types'
import { PRODUCTION_TRANSITIONS } from './types'

export class ProductionError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ProductionError'
    this.status = status
  }
}

function generateProductionCode(type: string): string {
  const prefix = type.slice(0, 3).toUpperCase()
  const d = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' }).replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase()
  return `${prefix}-${d}-${rand}`
}

export async function getProductionBatches(filters?: {
  status?: ProductionStatus | ProductionStatus[]
  product_type?: ProductType
  limit?: number
}): Promise<DairyProductionBatch[]> {
  let query = supabaseAdmin
    .from('dairy_production_batches')
    .select('*')
    .order('started_at', { ascending: false })

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('status', filters.status)
    } else {
      query = query.eq('status', filters.status)
    }
  }
  if (filters?.product_type) query = query.eq('product_type', filters.product_type)
  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new ProductionError(`Failed to fetch production: ${error.message}`, 500)
  return data || []
}

export async function getProductionById(id: string): Promise<DairyProductionBatch> {
  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) throw new ProductionError('Production batch not found', 404)
  return data
}

export async function createProductionBatch(
  body: {
    recipe_id?: string
    product_type: ProductType
    milk_batch_ids?: string[]
    milk_liters_used: number
    aging_location?: string
    aging_start?: string
    aging_target_date?: string
    aging_temp?: number
    aging_humidity?: number
  },
  session: SessionData | null
): Promise<DairyProductionBatch> {
  if (!body.product_type) throw new ProductionError('product_type is required')
  if (!body.milk_liters_used || body.milk_liters_used <= 0) throw new ProductionError('milk_liters_used must be > 0')

  const actor = session?.name || 'anonymous'
  const batchCode = generateProductionCode(body.product_type)

  // Deduct from milk batches
  if (body.milk_batch_ids && body.milk_batch_ids.length > 0) {
    for (const mbId of body.milk_batch_ids) {
      const { data: mb } = await supabaseAdmin
        .from('milk_batches')
        .select('liters_remaining')
        .eq('id', mbId)
        .single()
      if (mb) {
        await supabaseAdmin
          .from('milk_batches')
          .update({
            liters_remaining: Math.max(0, Number(mb.liters_remaining) - body.milk_liters_used / body.milk_batch_ids.length),
            pipeline_status: 'allocated',
            updated_by: actor,
          })
          .eq('id', mbId)
      }
    }
  }

  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .insert({
      batch_code: batchCode,
      recipe_id: body.recipe_id || null,
      product_type: body.product_type,
      status: 'in_progress',
      milk_batch_ids: body.milk_batch_ids || [],
      milk_liters_used: body.milk_liters_used,
      aging_location: body.aging_location || null,
      aging_start: body.aging_start || null,
      aging_target_date: body.aging_target_date || null,
      aging_temp: body.aging_temp ?? null,
      aging_humidity: body.aging_humidity ?? null,
      created_by: actor,
      updated_by: actor,
    })
    .select()
    .single()

  if (error) throw new ProductionError(`Failed to create production: ${error.message}`, 500)
  return data
}

export async function updateProductionBatch(
  id: string,
  body: Partial<DairyProductionBatch>,
  session: SessionData | null
): Promise<DairyProductionBatch> {
  const actor = session?.name || 'anonymous'
  const allowed = [
    'yield_kg', 'aging_location', 'aging_start', 'aging_target_date',
    'aging_temp', 'aging_humidity', 'quality_score', 'tasting_notes',
    'consumed_notes', 'sold_price_nok', 'sold_to', 'discard_reason',
  ] as const

  const updates: Record<string, unknown> = { updated_by: actor }
  for (const key of allowed) {
    if ((body as any)[key] !== undefined) updates[key] = (body as any)[key]
  }

  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ProductionError(`Failed to update production: ${error.message}`, 500)
  return data
}

export async function advanceProductionStatus(
  id: string,
  body: { status: ProductionStatus; discard_reason?: string },
  session: SessionData | null
): Promise<DairyProductionBatch> {
  const actor = session?.name || 'anonymous'
  const current = await getProductionById(id)

  // Validate transition using PRODUCTION_TRANSITIONS map
  const allowed = PRODUCTION_TRANSITIONS[current.status]
  if (!allowed || !allowed.includes(body.status)) {
    throw new ProductionError(
      `Cannot transition from '${current.status}' to '${body.status}'`,
      400
    )
  }

  const updates: Record<string, unknown> = {
    status: body.status,
    updated_by: actor,
  }

  // Forward transitions — set timestamps
  if (body.status === 'aging') updates.aging_start = updates.aging_start || new Date().toISOString().slice(0, 10)
  if (body.status === 'ready') updates.completed_at = new Date().toISOString()
  if (body.status === 'consumed') updates.consumed_at = new Date().toISOString()
  if (body.status === 'sold') updates.sold_at = new Date().toISOString()
  if (body.status === 'discarded') {
    updates.discarded_at = new Date().toISOString()
    updates.discard_reason = body.discard_reason || null
  }

  // Revert transitions — clear timestamps that were set by the status we're leaving
  if (current.status === 'ready' && body.status === 'aging') {
    updates.completed_at = null
  }
  if (current.status === 'consumed' && body.status === 'ready') {
    updates.consumed_at = null
    updates.consumed_notes = null
  }
  if (current.status === 'sold' && body.status === 'ready') {
    updates.sold_at = null
    updates.sold_price_nok = null
    updates.sold_to = null
  }
  if (current.status === 'discarded' && body.status === 'in_progress') {
    updates.discarded_at = null
    updates.discard_reason = null
  }
  if (current.status === 'aging' && body.status === 'in_progress') {
    updates.aging_start = null
  }

  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ProductionError(`Failed to update status: ${error.message}`, 500)

  // Audit — always log every transition
  await supabaseAdmin.from('dairy_production_audit').insert({
    production_id: id,
    previous_status: current.status,
    new_status: body.status,
    changed_by: actor,
    metadata: body,
  })

  return data
}

export async function appendProcessLog(
  id: string,
  entry: Omit<ProcessLogEntry, 'timestamp'>,
  session: SessionData | null
): Promise<DairyProductionBatch> {
  const current = await getProductionById(id)
  const actor = session?.name || 'anonymous'

  const logEntry: ProcessLogEntry = {
    timestamp: new Date().toISOString(),
    ...entry,
  }

  const updatedLog = [...(current.process_log || []), logEntry]

  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .update({ process_log: updatedLog, updated_by: actor })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ProductionError(`Failed to append log: ${error.message}`, 500)
  return data
}

export async function addTastingNotes(
  id: string,
  body: { quality_score?: number; tasting_notes?: string },
  session: SessionData | null
): Promise<DairyProductionBatch> {
  const actor = session?.name || 'anonymous'

  const { data, error } = await supabaseAdmin
    .from('dairy_production_batches')
    .update({
      quality_score: body.quality_score ?? null,
      tasting_notes: body.tasting_notes || null,
      updated_by: actor,
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new ProductionError(`Failed to add tasting notes: ${error.message}`, 500)
  return data
}
