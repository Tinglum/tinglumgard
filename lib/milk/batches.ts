import { supabaseAdmin } from '@/lib/supabase/server'
import type { SessionData } from '@/lib/auth/session'
import type { MilkBatch, PipelineStatus } from './types'
import { PIPELINE_NEXT } from './types'

export class MilkBatchError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'MilkBatchError'
    this.status = status
  }
}

function generateBatchCode(date: string): string {
  const d = date.replace(/-/g, '')
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `MLK-${d}-${rand}`
}

export async function getMilkBatches(filters?: {
  status?: PipelineStatus | PipelineStatus[]
  date?: string
  limit?: number
}): Promise<MilkBatch[]> {
  let query = supabaseAdmin
    .from('milk_batches')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.status) {
    if (Array.isArray(filters.status)) {
      query = query.in('pipeline_status', filters.status)
    } else {
      query = query.eq('pipeline_status', filters.status)
    }
  }
  if (filters?.date) query = query.eq('source_date', filters.date)
  if (filters?.limit) query = query.limit(filters.limit)

  const { data, error } = await query
  if (error) throw new MilkBatchError(`Failed to fetch batches: ${error.message}`, 500)
  return data || []
}

export async function createMilkBatch(
  body: {
    source_date: string
    source_session_ids?: string[]
    liters_raw: number
    notes?: string
  },
  session: SessionData | null
): Promise<MilkBatch> {
  if (!body.source_date) throw new MilkBatchError('source_date is required')
  if (!body.liters_raw || body.liters_raw <= 0) throw new MilkBatchError('liters_raw must be > 0')

  const actor = session?.name || 'anonymous'
  const batchCode = generateBatchCode(body.source_date)

  const { data, error } = await supabaseAdmin
    .from('milk_batches')
    .insert({
      batch_code: batchCode,
      source_date: body.source_date,
      source_session_ids: body.source_session_ids || [],
      liters_raw: body.liters_raw,
      liters_remaining: body.liters_raw,
      pipeline_status: 'raw',
      notes: body.notes?.trim() || null,
      created_by: actor,
      updated_by: actor,
    })
    .select()
    .single()

  if (error) throw new MilkBatchError(`Failed to create batch: ${error.message}`, 500)
  return data
}

export async function updateMilkBatch(
  id: string,
  body: Partial<MilkBatch>,
  session: SessionData | null
): Promise<MilkBatch> {
  const actor = session?.name || 'anonymous'
  const { data, error } = await supabaseAdmin
    .from('milk_batches')
    .update({ ...body, updated_by: actor })
    .eq('id', id)
    .select()
    .single()

  if (error) throw new MilkBatchError(`Failed to update batch: ${error.message}`, 500)
  return data
}

export async function advanceBatchStatus(
  id: string,
  body: {
    pasteurize_temp?: number
    pasteurize_minutes?: number
    bottle_count?: number
    bottle_size_ml?: number
    discard_reason?: string
  },
  session: SessionData | null
): Promise<MilkBatch> {
  const actor = session?.name || 'anonymous'

  const { data: current, error: fetchError } = await supabaseAdmin
    .from('milk_batches')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchError || !current) throw new MilkBatchError('Batch not found', 404)

  const previousStatus = current.pipeline_status as PipelineStatus
  const nextStatus = body.discard_reason ? 'discarded' : PIPELINE_NEXT[previousStatus]
  if (!nextStatus) throw new MilkBatchError(`Cannot advance from ${previousStatus}`)

  const updates: Record<string, unknown> = {
    pipeline_status: nextStatus,
    updated_by: actor,
  }

  if (nextStatus === 'pasteurized' || nextStatus === 'pasteurizing') {
    updates.pasteurize_temp = body.pasteurize_temp ?? current.pasteurize_temp
    updates.pasteurize_minutes = body.pasteurize_minutes ?? current.pasteurize_minutes
  }
  if (nextStatus === 'pasteurized') {
    updates.pasteurized_at = new Date().toISOString()
  }
  if (nextStatus === 'bottled') {
    updates.bottled_at = new Date().toISOString()
    updates.bottle_count = body.bottle_count ?? current.bottle_count
    updates.bottle_size_ml = body.bottle_size_ml ?? current.bottle_size_ml ?? 1000
  }
  if (nextStatus === 'fridged') {
    updates.fridged_at = new Date().toISOString()
  }
  if (nextStatus === 'discarded') {
    updates.discarded_at = new Date().toISOString()
    updates.discard_reason = body.discard_reason || null
  }

  const { data, error } = await supabaseAdmin
    .from('milk_batches')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new MilkBatchError(`Failed to advance batch: ${error.message}`, 500)

  // Audit
  await supabaseAdmin.from('milk_batch_audit').insert({
    batch_id: id,
    previous_status: previousStatus,
    new_status: nextStatus,
    changed_by: actor,
    metadata: body,
  })

  return data
}

export async function getBatchAudit(batchId: string) {
  const { data, error } = await supabaseAdmin
    .from('milk_batch_audit')
    .select('*')
    .eq('batch_id', batchId)
    .order('changed_at', { ascending: false })

  if (error) throw new MilkBatchError(`Failed to fetch audit: ${error.message}`, 500)
  return data || []
}
