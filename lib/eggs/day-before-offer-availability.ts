import { getEggAdditionOfferState } from '@/lib/eggs/addition-offer'
import { supabaseAdmin } from '@/lib/supabase/server'

export type DayBeforeOfferStockSource = 'actual_collected'

export interface DayBeforeOfferInventoryRow {
  id: string
  breed_id: string
  eggs_allocated?: number | null
  eggs_available?: number | null
  delivery_monday?: string | null
  egg_breeds?: { name?: string | null } | Array<{ name?: string | null }> | null
}

export interface DayBeforeOfferAvailability {
  inventoryId: string
  breedId: string
  eggsAllocated: number
  actualCollected: number
  collectionDaysRecorded: number
  remaining: number
  source: DayBeforeOfferStockSource
  collectionStart: string | null
  collectionEnd: string | null
  cutoffAt: string | null
  cutoffDate: string | null
  cutoffHour: number | null
  cutoffMinute: number | null
}

export interface DayBeforeOfferWeekAvailabilityRow extends DayBeforeOfferAvailability {
  breedName: string
}

export interface DayBeforeOfferWeekAvailability {
  totalAvailable: number
  rows: DayBeforeOfferWeekAvailabilityRow[]
  collectionStart: string | null
  collectionEnd: string | null
  cutoffAt: string | null
  cutoffDate: string | null
  cutoffHour: number | null
  cutoffMinute: number | null
}

type CollectionRow = {
  id: string
  breed_id: string
  collection_date: string
  sellable_standard: number | null
  created_at?: string | null
  updated_at?: string | null
}

type CollectionAuditRow = {
  collection_id: string
  changed_at: string
  before_payload?: Record<string, unknown> | null
}

function numberOrZero(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value)
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10)
    if (Number.isFinite(parsed)) return parsed
  }
  return 0
}

function getBreedName(value: DayBeforeOfferInventoryRow['egg_breeds']): string {
  if (Array.isArray(value)) {
    return String(value[0]?.name || 'Rugeegg').trim() || 'Rugeegg'
  }
  return String(value?.name || 'Rugeegg').trim() || 'Rugeegg'
}

function isRowBeforeOrAtCutoff(row: CollectionRow, cutoffAtIso: string): boolean {
  const updatedAt = String(row.updated_at || row.created_at || '').trim()
  if (!updatedAt) return true
  return new Date(updatedAt).getTime() <= new Date(cutoffAtIso).getTime()
}

function getSellableAtCutoff(
  row: CollectionRow,
  cutoffAtIso: string,
  audits: CollectionAuditRow[]
): number {
  if (isRowBeforeOrAtCutoff(row, cutoffAtIso)) {
    return Math.max(0, numberOrZero(row.sellable_standard))
  }

  const cutoffTime = new Date(cutoffAtIso).getTime()
  const earliestAuditAfterCutoff = audits.find((audit) => {
    return new Date(audit.changed_at).getTime() > cutoffTime
  })

  if (!earliestAuditAfterCutoff) {
    return Math.max(0, numberOrZero(row.sellable_standard))
  }

  return Math.max(
    0,
    numberOrZero(earliestAuditAfterCutoff.before_payload?.sellable_standard)
  )
}

export async function getDayBeforeOfferAvailabilityForInventoryRows(
  rows: DayBeforeOfferInventoryRow[],
  options?: { now?: Date }
): Promise<Map<string, DayBeforeOfferAvailability>> {
  const now = options?.now || new Date()
  const inventoryRows = Array.from(
    new Map(
      (rows || [])
        .filter((row) => row?.id && row?.breed_id && row?.delivery_monday)
        .map((row) => [String(row.id), row])
    ).values()
  )

  if (inventoryRows.length === 0) {
    return new Map()
  }

  const rowStates = inventoryRows
    .map((row) => ({
      row,
      offerState: getEggAdditionOfferState(row.delivery_monday, now),
    }))
    .filter(({ offerState }) => offerState.useActualCollectedStock && offerState.actualCutoffIso)

  if (rowStates.length === 0) {
    return new Map()
  }

  const breedIds = Array.from(new Set(rowStates.map(({ row }) => String(row.breed_id))))
  const collectionStart = rowStates
    .map(({ offerState }) => offerState.collectionStart || '')
    .filter(Boolean)
    .sort()[0]
  const collectionEnd = rowStates
    .map(({ offerState }) => offerState.collectionEnd || '')
    .filter(Boolean)
    .sort()
    .slice(-1)[0]
  const earliestCutoffIso = rowStates
    .map(({ offerState }) => offerState.actualCutoffIso || '')
    .filter(Boolean)
    .sort()[0]

  const { data: collectionRows, error: collectionError } = await supabaseAdmin
    .from('egg_daily_collections')
    .select('id, breed_id, collection_date, sellable_standard, created_at, updated_at')
    .in('breed_id', breedIds)
    .gte('collection_date', collectionStart)
    .lte('collection_date', collectionEnd)

  if (collectionError) {
    throw collectionError
  }

  const collections = (collectionRows || []) as CollectionRow[]
  const collectionsByBreed = new Map<string, CollectionRow[]>()

  for (const row of collections) {
    const breedId = String(row.breed_id || '')
    const list = collectionsByBreed.get(breedId) || []
    list.push(row)
    collectionsByBreed.set(breedId, list)
  }

  const collectionIds = collections.map((row) => String(row.id)).filter(Boolean)
  const auditsByCollectionId = new Map<string, CollectionAuditRow[]>()

  if (collectionIds.length > 0) {
    const { data: auditRows, error: auditError } = await supabaseAdmin
      .from('egg_daily_collection_audit')
      .select('collection_id, changed_at, before_payload')
      .in('collection_id', collectionIds)
      .gt('changed_at', earliestCutoffIso)
      .order('changed_at', { ascending: true })

    if (auditError) {
      throw auditError
    }

    for (const row of (auditRows || []) as CollectionAuditRow[]) {
      const collectionId = String(row.collection_id || '')
      const list = auditsByCollectionId.get(collectionId) || []
      list.push(row)
      auditsByCollectionId.set(collectionId, list)
    }
  }

  const availabilityMap = new Map<string, DayBeforeOfferAvailability>()

  for (const { row, offerState } of rowStates) {
    const breedCollections = (collectionsByBreed.get(String(row.breed_id)) || []).filter((collectionRow) => {
      return (
        collectionRow.collection_date >= String(offerState.collectionStart) &&
        collectionRow.collection_date <= String(offerState.collectionEnd)
      )
    })

    let actualCollected = 0
    const collectionDays = new Set<string>()

    for (const collectionRow of breedCollections) {
      const effectiveSellable = getSellableAtCutoff(
        collectionRow,
        String(offerState.actualCutoffIso),
        auditsByCollectionId.get(String(collectionRow.id)) || []
      )
      actualCollected += effectiveSellable
      if (effectiveSellable > 0) {
        collectionDays.add(collectionRow.collection_date)
      }
    }

    const eggsAllocated = Math.max(0, numberOrZero(row.eggs_allocated))
    availabilityMap.set(String(row.id), {
      inventoryId: String(row.id),
      breedId: String(row.breed_id),
      eggsAllocated,
      actualCollected,
      collectionDaysRecorded: collectionDays.size,
      remaining: Math.max(0, actualCollected - eggsAllocated),
      source: 'actual_collected',
      collectionStart: offerState.collectionStart,
      collectionEnd: offerState.collectionEnd,
      cutoffAt: offerState.actualCutoffIso,
      cutoffDate: offerState.actualCutoffDate,
      cutoffHour: offerState.actualCutoffHour,
      cutoffMinute: offerState.actualCutoffMinute,
    })
  }

  return availabilityMap
}

export async function getDayBeforeOfferAvailabilityForWeek(params: {
  year: number
  weekNumber: number
  deliveryMonday: string
  inventoryStatuses?: string[]
  now?: Date
}): Promise<DayBeforeOfferWeekAvailability> {
  const inventoryStatuses = (params.inventoryStatuses || ['open', 'sold_out', 'locked']).filter(Boolean)
  let query = supabaseAdmin
    .from('egg_inventory')
    .select('id, breed_id, eggs_allocated, eggs_available, delivery_monday, status, egg_breeds(name)')
    .eq('year', params.year)
    .eq('week_number', params.weekNumber)

  if (inventoryStatuses.length > 0) {
    query = query.in('status', inventoryStatuses)
  }

  const { data, error } = await query

  if (error) {
    throw error
  }

  const rows = ((data || []) as DayBeforeOfferInventoryRow[]).map((row) => ({
    ...row,
    delivery_monday: row.delivery_monday || params.deliveryMonday,
  }))

  const offerState = getEggAdditionOfferState(params.deliveryMonday, params.now)
  const availabilityMap = await getDayBeforeOfferAvailabilityForInventoryRows(rows, {
    now: params.now,
  })

  const availabilityRows = rows
    .map((row) => {
      const availability = availabilityMap.get(String(row.id))
      if (!availability) return null
      return {
        ...availability,
        breedName: getBreedName(row.egg_breeds),
      } satisfies DayBeforeOfferWeekAvailabilityRow
    })
    .filter((row): row is DayBeforeOfferWeekAvailabilityRow => Boolean(row && row.remaining > 0))

  return {
    totalAvailable: availabilityRows.reduce((sum, row) => sum + row.remaining, 0),
    rows: availabilityRows,
    collectionStart: offerState.collectionStart,
    collectionEnd: offerState.collectionEnd,
    cutoffAt: offerState.actualCutoffIso,
    cutoffDate: offerState.actualCutoffDate,
    cutoffHour: offerState.actualCutoffHour,
    cutoffMinute: offerState.actualCutoffMinute,
  }
}
