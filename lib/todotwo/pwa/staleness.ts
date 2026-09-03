import { FARM_TZ, formatFarm, toFarmDate } from '@/lib/todotwo/time'

/**
 * Turning a cache timestamp into something a person standing in a barn can act
 * on. Pure, so it can be tested without a browser.
 *
 * The rule this file exists to enforce: never let cached data look live. Every
 * label says when the data was taken, and anything older than
 * STALE_AFTER_MINUTES is called out rather than quietly shown.
 */

/** Beyond this, the cached view is described as old rather than just cached. */
export const STALE_AFTER_MINUTES = 60

export interface CacheAge {
  /** Whole minutes between the cache write and now. Never negative. */
  minutes: number
  /** True once the data is old enough that acting on it could mislead. */
  stale: boolean
  /** Human label, e.g. "4 minutes ago" or "yesterday at 18:40". */
  label: string
}

function pluralise(count: number, unit: string): string {
  return `${count} ${unit}${count === 1 ? '' : 's'} ago`
}

/**
 * @param cachedAt when the worker stored the response
 * @param now      injected so tests do not depend on the wall clock
 * @returns null when the timestamp is missing or unparseable — the caller then
 *          says nothing rather than inventing a freshness claim.
 */
export function describeCacheAge(
  cachedAt: string | null | undefined,
  now: Date = new Date()
): CacheAge | null {
  if (!cachedAt) return null

  const at = new Date(cachedAt)
  if (Number.isNaN(at.getTime())) return null

  // A clock that has moved backwards (device time changed, or the cache was
  // written on another device) must not produce "in 3 minutes".
  const minutes = Math.max(0, Math.floor((now.getTime() - at.getTime()) / 60_000))

  let label: string
  if (minutes < 1) {
    label = 'less than a minute ago'
  } else if (minutes < 60) {
    label = pluralise(minutes, 'minute')
  } else if (minutes < 60 * 24 && toFarmDate(at) === toFarmDate(now)) {
    label = `${pluralise(Math.floor(minutes / 60), 'hour')} at ${formatFarm(at, 'HH:mm')}`
  } else if (daysApart(at, now) === 1) {
    label = `yesterday at ${formatFarm(at, 'HH:mm')}`
  } else {
    label = formatFarm(at, "d MMM 'at' HH:mm")
  }

  return { minutes, stale: minutes >= STALE_AFTER_MINUTES, label }
}

/** Calendar days apart in FARM_TZ, not 24-hour blocks. */
function daysApart(from: Date, to: Date): number {
  const a = Date.UTC(...ymd(from))
  const b = Date.UTC(...ymd(to))
  return Math.round((b - a) / 86_400_000)
}

function ymd(instant: Date): [number, number, number] {
  const [y, m, d] = toFarmDate(instant).split('-').map(Number)
  return [y, m - 1, d]
}

/** Exported for the banner's aria-label; keeps the timezone in one place. */
export function farmTimezoneLabel(): string {
  return FARM_TZ
}
