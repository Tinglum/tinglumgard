// lib/quest/fasting-content.ts — server-side content for fasting-challenge reminder
// emails (app/api/cron/fasting-reminders/route.ts).
//
// This cohort is English-only / Europe-London, so unlike components/quest/
// FastingChallenge.tsx (which stays bilingual for the general site UI) these
// strings are English-only by design. The plan-text copy below is duplicated
// from FastingChallenge.tsx's `advancedPlan` / `standardPlan` / `veryAdvancedPlan`
// on purpose rather than imported, so editing the on-site wording can't
// accidentally change a already-scheduled reminder's wording (and vice versa) —
// if the two ever need to move together, promote this into a shared import.

export type FastingTrack = 'standard' | 'advanced' | 'very_advanced'

export type FastOccurrence = {
  track: FastingTrack
  /** 1-based position within the track's own list of fasts. */
  index: number
  /** Total fasts this track has, for "Fast 2 of 3" style copy. */
  total: number
  /** Europe/London calendar date (YYYY-MM-DD) of the dinner the fast starts at. */
  startDate: string
  /** Human label for the start anchor, e.g. "dinner on Sunday, September 6". */
  startLabel: string
  /** Human label for the end anchor, e.g. "dinner on Monday, September 7". */
  endLabel: string
}

// Dates as published on /quest (components/quest/FastingChallenge.tsx). Keep
// these two in sync manually if the retreat schedule ever changes.
export const FAST_OCCURRENCES: FastOccurrence[] = [
  {
    track: 'standard', index: 1, total: 3,
    startDate: '2026-09-06',
    startLabel: 'dinner on Sunday, September 6',
    endLabel: 'dinner on Monday, September 7',
  },
  {
    track: 'standard', index: 2, total: 3,
    startDate: '2026-09-13',
    startLabel: 'dinner on Sunday, September 13',
    endLabel: 'dinner on Monday, September 14',
  },
  {
    track: 'standard', index: 3, total: 3,
    startDate: '2026-09-21',
    startLabel: 'dinner on Monday, September 21',
    endLabel: 'the retreat dinner on Tuesday, September 22',
  },
  {
    track: 'advanced', index: 1, total: 1,
    startDate: '2026-09-20',
    startLabel: 'dinner on Sunday, September 20',
    endLabel: 'the retreat dinner on Tuesday, September 22',
  },
  {
    track: 'very_advanced', index: 1, total: 1,
    startDate: '2026-09-19',
    startLabel: 'dinner on Saturday, September 19',
    endLabel: 'the retreat dinner on Tuesday, September 22',
  },
]

export const FASTING_TRACK_LABEL: Record<FastingTrack, string> = {
  standard: 'Standard track',
  advanced: 'Advanced track (extended fasting)',
  very_advanced: 'Very advanced track (~72 hours)',
}

// Same plan copy shown on /quest once someone joins a track, English only.
export const FASTING_TRACK_PLAN: Record<FastingTrack, string> = {
  standard:
    'Follow the 16:8 preparation and the three dinner-to-dinner fasts on September 6–7, 13–14 and 21–22. Record your signals without chasing a target number of hours.',
  advanced:
    'Plan from Sunday dinner to Tuesday dinner and do not extend the duration. Share your plan with Kenneth before starting.',
  very_advanced:
    'Plan from Saturday dinner to Tuesday dinner and do not extend the duration. Share your plan with Kenneth before starting.',
}

export const FASTING_BOOKING_URL =
  process.env.NEXT_PUBLIC_QUEST_BOOKING_URL || 'https://calendly.com/ktinglum/mastermind30'

export type FastingReminderOffset = 3 | 1 | 0
export const FASTING_REMINDER_OFFSETS: FastingReminderOffset[] = [3, 1, 0]

export function fastingReminderCopy(offset: FastingReminderOffset) {
  if (offset === 3) return { tag: 'prep', subjectLead: 'Your fast starts in 3 days', lede: 'Your next fast starts in three days.' }
  if (offset === 1) return { tag: 'day_before', subjectLead: 'Starts tomorrow evening', lede: 'Your fast starts tomorrow evening.' }
  return { tag: 'same_day', subjectLead: 'Starts tonight', lede: 'Your fast starts tonight.' }
}

/** Europe/London calendar date (YYYY-MM-DD) for an arbitrary instant. */
export function londonDateOnly(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/London',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

/** Whole-day difference between two YYYY-MM-DD dates (future minus today). */
export function daysBetweenDates(futureYMD: string, todayYMD: string): number {
  const [fy, fm, fd] = futureYMD.split('-').map(Number)
  const [ty, tm, td] = todayYMD.split('-').map(Number)
  const diffMs = Date.UTC(fy, fm - 1, fd) - Date.UTC(ty, tm - 1, td)
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}
