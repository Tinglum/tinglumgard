// lib/quest/reminder-log.ts — an append-only record of the fasting-challenge
// reminder emails the hourly cron (app/api/cron/fasting-reminders/route.ts)
// attempts to send.
//
// Before this existed the cron sent silently: nothing on the admin side could
// distinguish "no reminders were due" from "the cron never fired". The log is
// the evidence trail for that question, so it records failures and skips too,
// not just successes.
//
// Storage follows the same generic key/value pattern as lib/quest/live-store.ts
// — one `app_config` row whose `value` is a JSON string. No new table, no
// migration.

import { supabaseAdmin } from '@/lib/supabase/server'

const REMINDER_LOG_KEY = 'nutrition_reminder_log'
/** Most recent entries kept; older ones are dropped on append. */
const MAX_ENTRIES = 500

export type ReminderLogEntry = {
  /** ISO instant the attempt was made. */
  at: string
  user_id: string
  display_name: string
  email: string
  track: string
  /** 1-based occurrence index within the track. */
  occurrence: number
  /** 'prep' | 'day_before' | 'same_day', from fastingReminderCopy(). */
  tag: string
  /** Europe/London YYYY-MM-DD the fast starts. */
  startDate: string
  result: 'sent' | 'failed' | 'skipped'
  detail?: string
}

async function readLog(): Promise<ReminderLogEntry[]> {
  const { data, error } = await supabaseAdmin
    .from('app_config')
    .select('value')
    .eq('key', REMINDER_LOG_KEY)
    .maybeSingle()
  if (error) throw error
  if (!data?.value) return []
  const parsed = typeof data.value === 'string' ? JSON.parse(data.value) : data.value
  return Array.isArray(parsed) ? (parsed as ReminderLogEntry[]) : []
}

/**
 * Append one attempt to the log. Deliberately never throws: a reminder that
 * was genuinely emailed must not be turned into a cron failure (and possibly a
 * duplicate send on retry) just because the bookkeeping write failed. Storage
 * errors are swallowed and reported to the console.
 */
export async function appendReminderLog(entry: ReminderLogEntry): Promise<void> {
  try {
    // Stored oldest-first; the newest entry goes on the end and the overflow
    // comes off the front.
    const existing = await readLog()
    const next = [...existing, entry].slice(-MAX_ENTRIES)
    const { error } = await supabaseAdmin
      .from('app_config')
      .upsert({ key: REMINDER_LOG_KEY, value: JSON.stringify(next) }, { onConflict: 'key' })
    if (error) throw error
  } catch (error) {
    console.error('[reminder-log] failed to append reminder log entry', { entry, error })
  }
}

/** Newest first. Returns an empty list rather than throwing on a read failure. */
export async function listReminderLog(): Promise<ReminderLogEntry[]> {
  try {
    const entries = await readLog()
    return [...entries].reverse()
  } catch (error) {
    console.error('[reminder-log] failed to read reminder log', error)
    return []
  }
}
