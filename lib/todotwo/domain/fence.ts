/**
 * Which jobs carry a fence reading.
 *
 * This lived as a regex inline on the task detail page, and the tick box on
 * the Today list — which is how people actually finish work, standing in the
 * barn — never knew about it at all. Six months of morning goat rounds were
 * completed without a single reading being recorded, and nothing anywhere said
 * so. One function, used by both, so the two cannot drift apart again.
 *
 * Matching on the title is admittedly fragile: rename the routine and fence
 * logging silently stops, which is the same class of failure as the one this
 * fixes. The durable version is a flag on the series, like requires_feed_check
 * already is. Worth doing next; not worth blocking the readings on now.
 */
export function taskNeedsFenceReading(title: string | null | undefined): boolean {
  if (!title) return false
  return /goats \(morning\)/i.test(title)
}
