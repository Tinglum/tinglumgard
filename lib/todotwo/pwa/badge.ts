/**
 * The number on the installed app icon.
 *
 * This is the closest a web app gets to a home-screen widget. It is NOT a
 * widget: see docs/todotwo/PWA.md. It is the Badging API, which Android Chrome
 * and iOS 16.4+ show on the installed icon.
 *
 * Where the count comes from: the rendered Today view. TodoTwo has no count
 * endpoint, and Phase 7 is not allowed to add one, so the badge reads the same
 * rows the person is looking at. That keeps the badge and the screen incapable
 * of disagreeing, at the cost of only being able to update while Today is open.
 * A `/api/todotwo/today/count` route would lift that limit later.
 */

/**
 * An open task row. `TaskRow` renders its toggle as a button carrying
 * aria-pressed, false while the task is still to do. Completed and verified
 * rows render aria-pressed="true" and are therefore not counted.
 */
export const OPEN_TASK_SELECTOR = 'button[aria-pressed="false"]'

/** Only the Today view is counted; Upcoming lists days that are not today. */
export const BADGE_PATHNAMES = ['/todotwo'] as const

export function isBadgePathname(pathname: string): boolean {
  return (BADGE_PATHNAMES as readonly string[]).includes(pathname)
}

export function countOpenTasks(root: ParentNode | null | undefined): number {
  if (!root) return 0
  return root.querySelectorAll(OPEN_TASK_SELECTOR).length
}

/** The slice of Navigator the Badging API adds. Absent almost everywhere. */
export interface BadgingNavigator {
  setAppBadge?: (contents?: number) => Promise<void>
  clearAppBadge?: () => Promise<void>
}

export function supportsBadging(nav: BadgingNavigator | undefined | null): boolean {
  return !!nav && typeof nav.setAppBadge === 'function' && typeof nav.clearAppBadge === 'function'
}

/**
 * Set or clear the badge. Zero clears rather than showing a "0", which on
 * Android renders as a dot and reads as "something is waiting".
 *
 * Rejections are swallowed: iOS rejects when the user has denied notifications,
 * and there is nothing useful to say about that inside the app.
 *
 * @returns what was actually done, so the unit test can assert it without a
 *          browser.
 */
export async function applyAppBadge(
  count: number,
  nav: BadgingNavigator | undefined | null
): Promise<'set' | 'cleared' | 'unsupported'> {
  if (!supportsBadging(nav)) return 'unsupported'

  const safe = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0

  try {
    if (safe === 0) {
      await nav!.clearAppBadge!()
      return 'cleared'
    }
    await nav!.setAppBadge!(safe)
    return 'set'
  } catch {
    return 'unsupported'
  }
}
