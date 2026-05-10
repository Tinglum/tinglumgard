/**
 * inventory-sync.ts — legacy shim
 *
 * The forecast v2 system writes inventory directly inside forecast.ts.
 * This file is kept only for any external callers that imported from here.
 * All logic has moved to lib/eggs/forecast.ts.
 */

export interface SyncForecastInput {
  breedId: string
  year: number
  weekNumber: number
  deliveryMonday: string
  forecastEggs: number
  lowStock: boolean
  threshold: number
}

export interface InventorySyncResult {
  ok: boolean
  skipped: boolean
  reason?: 'fetch_failed' | 'insert_failed' | 'update_failed' | 'upsert_failed'
  inventoryId?: string
}

// No-op shim — forecast v2 writes inventory itself
export async function syncForecastBatchToInventory(
  _inputs: SyncForecastInput[]
): Promise<Map<string, InventorySyncResult>> {
  return new Map()
}

export async function syncForecastToInventory(
  _input: SyncForecastInput
): Promise<InventorySyncResult> {
  return { ok: true, skipped: true }
}
