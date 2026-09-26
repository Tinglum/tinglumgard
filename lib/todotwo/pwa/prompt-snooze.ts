/**
 * A dated "not now". Stored as an ISO timestamp so an old build's value, a
 * garbage value, or a storage that throws (private mode, blocked site data)
 * all read as "not snoozed" rather than "snoozed for ever".
 */

type Store = Pick<Storage, 'getItem' | 'setItem'>

export function isSnoozed(store: Store, key: string, now: Date = new Date()): boolean {
  try {
    const raw = store.getItem(key)
    if (!raw) return false
    const until = Date.parse(raw)
    return Number.isFinite(until) && until > now.getTime()
  } catch {
    return false
  }
}

export function snoozeUntil(store: Store, key: string, days: number, now: Date = new Date()): void {
  try {
    store.setItem(key, new Date(now.getTime() + days * 86_400_000).toISOString())
  } catch {
    // Nothing to do: without storage the prompt simply asks again next visit.
  }
}
