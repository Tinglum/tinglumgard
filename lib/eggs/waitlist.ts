import { dispatchEmail } from '@/lib/email/dispatch'
import { renderManagedTemplate } from '@/lib/email/render'
import { logError } from '@/lib/logger'
import { supabaseAdmin } from '@/lib/supabase/server'
import { getSingleBreedMinimumEggs } from './minimums'

const WAITLIST_EMAIL_INTERVAL_MINUTES = 10

type WaitlistQueueStatus = 'queued' | 'notified' | 'paused'

type WaitlistEntry = {
  id: string
  email: string
  name: string | null
  notify_attempts: number | null
  created_at: string
  reservation_expires_at: string | null
}

type BreedRelation = {
  name: string
  slug: string
  min_order_quantity: number
}

type InventoryWithBreed = {
  id: string
  year: number
  week_number: number
  delivery_monday: string
  eggs_available: number
  eggs_allocated: number
  status: string
  egg_breeds: BreedRelation | BreedRelation[] | null
}

export type EggWaitlistProcessSummary = {
  scannedInventories: number
  notified: number
  expired: number
  waitingWindowOpen: number
  skippedLowStock: number
  skippedClosed: number
  skippedNoQueue: number
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000)
}

function toDateLabel(dateValue: string): string {
  const date = new Date(`${dateValue}T00:00:00`)
  return date.toLocaleDateString('nb-NO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function toSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] || null
  }
  return value || null
}

export function normalizeWaitlistEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function reactivatePausedWaitlistEntries(inventoryId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .update({
      status: 'queued',
      notified_at: null,
      reservation_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('inventory_id', inventoryId)
    .eq('status', 'paused')
    .select('id')

  if (error) {
    logError('egg-waitlist-reactivate-paused', error, { inventoryId })
    return 0
  }

  return data?.length || 0
}

export async function markWaitlistPurchase(params: {
  inventoryId: string
  email: string
  orderId?: string
}) {
  const normalizedEmail = normalizeWaitlistEmail(params.email)
  if (!normalizedEmail) {
    return { converted: false }
  }

  const { data: entries, error } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .select('id, status, notified_at, created_at')
    .eq('inventory_id', params.inventoryId)
    .eq('email', normalizedEmail)
    .in('status', ['queued', 'notified', 'paused'])
    .order('created_at', { ascending: true })

  if (error) {
    logError('egg-waitlist-mark-purchase-fetch', error, {
      inventoryId: params.inventoryId,
      email: normalizedEmail,
    })
    return { converted: false }
  }

  if (!entries || entries.length === 0) {
    return { converted: false }
  }

  const notifiedEntries = entries
    .filter((entry) => entry.status === 'notified')
    .sort((a, b) => {
      const aMs = a.notified_at ? new Date(a.notified_at).getTime() : 0
      const bMs = b.notified_at ? new Date(b.notified_at).getTime() : 0
      return bMs - aMs
    })

  const winner = notifiedEntries[0] || entries[0]
  const nowIso = new Date().toISOString()

  const { error: winnerError } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .update({
      status: 'purchased',
      purchased_at: nowIso,
      purchase_order_id: params.orderId || null,
      reservation_expires_at: null,
      updated_at: nowIso,
    })
    .eq('id', winner.id)

  if (winnerError) {
    logError('egg-waitlist-mark-purchase-update-winner', winnerError, {
      inventoryId: params.inventoryId,
      waitlistEntryId: winner.id,
    })
    return { converted: false }
  }

  const { error: pauseError } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .update({
      status: 'paused',
      reservation_expires_at: null,
      updated_at: nowIso,
    })
    .eq('inventory_id', params.inventoryId)
    .in('status', ['queued', 'notified'])
    .neq('id', winner.id)

  if (pauseError) {
    logError('egg-waitlist-mark-purchase-pause-rest', pauseError, {
      inventoryId: params.inventoryId,
      waitlistEntryId: winner.id,
    })
  }

  return { converted: true, waitlistEntryId: winner.id }
}

async function fetchNextQueuedEntry(inventoryId: string): Promise<WaitlistEntry | null> {
  const { data, error } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .select('id, email, name, notify_attempts, created_at, reservation_expires_at')
    .eq('inventory_id', inventoryId)
    .eq('status', 'queued')
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) {
    logError('egg-waitlist-fetch-next', error, { inventoryId })
    return null
  }

  return data?.[0] || null
}

async function fetchOldestNotifiedEntry(inventoryId: string): Promise<WaitlistEntry | null> {
  const { data, error } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .select('id, email, name, notify_attempts, created_at, reservation_expires_at')
    .eq('inventory_id', inventoryId)
    .eq('status', 'notified')
    .order('notified_at', { ascending: true })
    .limit(1)

  if (error) {
    logError('egg-waitlist-fetch-notified', error, { inventoryId })
    return null
  }

  return data?.[0] || null
}

async function expireEntryIfNeeded(entry: WaitlistEntry, now: Date): Promise<boolean> {
  if (!entry.reservation_expires_at) {
    return true
  }

  const expiresAt = new Date(entry.reservation_expires_at)
  if (Number.isNaN(expiresAt.getTime())) {
    return true
  }

  if (expiresAt > now) {
    return false
  }

  const { error } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .update({
      status: 'expired',
      updated_at: now.toISOString(),
    })
    .eq('id', entry.id)

  if (error) {
    logError('egg-waitlist-expire-entry', error, { waitlistEntryId: entry.id })
    return false
  }

  return true
}

function getInventoryMinimum(inventory: InventoryWithBreed): number {
  const breed = toSingleRelation(inventory.egg_breeds)
  return getSingleBreedMinimumEggs({
    slug: breed?.slug,
    min_order_quantity: breed?.min_order_quantity || 0,
  })
}

async function notifyNextInQueue(inventory: InventoryWithBreed, now: Date, appUrl: string) {
  let expiredCount = 0

  const notifiedEntry = await fetchOldestNotifiedEntry(inventory.id)
  if (notifiedEntry) {
    const canContinue = await expireEntryIfNeeded(notifiedEntry, now)
    if (!canContinue) {
      return { notified: 0, expired: 0, waitingWindowOpen: 1, noQueue: 0 }
    }
    expiredCount = 1
  }

  const next = await fetchNextQueuedEntry(inventory.id)
  if (!next) {
    return { notified: 0, expired: expiredCount, waitingWindowOpen: 0, noQueue: 1 }
  }

  const breed = toSingleRelation(inventory.egg_breeds)
  const breedName = breed?.name || 'Rugeegg'
  const slug = breed?.slug
  const inventoryUrl = slug ? `${appUrl}/rugeegg/raser/${slug}` : `${appUrl}/rugeegg/raser`
  const customerName = next.name?.trim() || 'der'
  const rendered = await renderManagedTemplate({
    templateKey: 'egg.waitlist.available',
    locale: 'no',
    variables: {
      customer_name: customerName,
      breed_name: breedName,
      week_number: inventory.week_number,
      delivery_date: toDateLabel(inventory.delivery_monday),
      reservation_window_minutes: WAITLIST_EMAIL_INTERVAL_MINUTES,
      inventory_url: inventoryUrl,
    },
  })

  if (!rendered) {
    logError('egg-waitlist-template-missing', { templateKey: 'egg.waitlist.available' })
    return { notified: 0, expired: expiredCount, waitingWindowOpen: 0, noQueue: 0 }
  }

  const sendResult = await dispatchEmail({
    to: next.email,
    subject: rendered.subject,
    html: rendered.html,
    classification: 'transactional',
    templateKey: rendered.templateKey,
    sourcePath: 'lib/eggs/waitlist',
    metadata: {
      inventory_id: inventory.id,
      waitlist_entry_id: next.id,
    },
    idempotency: {
      source: 'egg.waitlist',
      entity: 'waitlist_entry',
      id: next.id,
      template: 'egg_waitlist_release',
    },
  })

  const nextAttempt = (next.notify_attempts || 0) + 1

  if (!sendResult.success) {
    logError('egg-waitlist-email-send-failed', { inventoryId: inventory.id, email: next.email })

    const { error: attemptError } = await supabaseAdmin
      .from('egg_waitlist_entries')
      .update({
        notify_attempts: nextAttempt,
        updated_at: now.toISOString(),
      })
      .eq('id', next.id)

    if (attemptError) {
      logError('egg-waitlist-email-attempt-update', attemptError, { waitlistEntryId: next.id })
    }

    return { notified: 0, expired: expiredCount, waitingWindowOpen: 0, noQueue: 0 }
  }

  const expiresAt = addMinutes(now, WAITLIST_EMAIL_INTERVAL_MINUTES)

  const { error: markError } = await supabaseAdmin
    .from('egg_waitlist_entries')
    .update({
      status: 'notified',
      notify_attempts: nextAttempt,
      notified_at: now.toISOString(),
      reservation_expires_at: expiresAt.toISOString(),
      last_email_message_id: sendResult.id || sendResult.queueId || null,
      updated_at: now.toISOString(),
    })
    .eq('id', next.id)

  if (markError) {
    logError('egg-waitlist-mark-notified', markError, { waitlistEntryId: next.id })
    return { notified: 0, expired: expiredCount, waitingWindowOpen: 0, noQueue: 0 }
  }

  return { notified: 1, expired: expiredCount, waitingWindowOpen: 0, noQueue: 0 }
}

export async function processEggWaitlistQueue(options?: { inventoryIds?: string[] }): Promise<EggWaitlistProcessSummary> {
  const summary: EggWaitlistProcessSummary = {
    scannedInventories: 0,
    notified: 0,
    expired: 0,
    waitingWindowOpen: 0,
    skippedLowStock: 0,
    skippedClosed: 0,
    skippedNoQueue: 0,
  }

  const explicitInventoryIds = (options?.inventoryIds || []).filter(Boolean)
  const inventoryIds = explicitInventoryIds.length > 0
    ? Array.from(new Set(explicitInventoryIds))
    : []

  if (inventoryIds.length === 0) {
    const { data: queuedRows, error: queueError } = await supabaseAdmin
      .from('egg_waitlist_entries')
      .select('inventory_id')
      .in('status', ['queued', 'notified'])

    if (queueError) {
      logError('egg-waitlist-fetch-queues', queueError)
      return summary
    }

    for (const row of queuedRows || []) {
      if (row.inventory_id && !inventoryIds.includes(row.inventory_id)) {
        inventoryIds.push(row.inventory_id)
      }
    }
  }

  if (inventoryIds.length === 0) {
    return summary
  }

  const { data: inventories, error: inventoriesError } = await supabaseAdmin
    .from('egg_inventory')
    .select('id, year, week_number, delivery_monday, eggs_available, eggs_allocated, status, egg_breeds(name, slug, min_order_quantity)')
    .in('id', inventoryIds)

  if (inventoriesError) {
    logError('egg-waitlist-fetch-inventories', inventoriesError, { inventoryIds })
    return summary
  }

  const now = new Date()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://xn--tinglumgrd-85a.no'
  const inventoryRows = (inventories || []) as unknown as InventoryWithBreed[]

  for (const inventory of inventoryRows) {
    summary.scannedInventories += 1

    if (!['open', 'sold_out'].includes(inventory.status)) {
      summary.skippedClosed += 1
      continue
    }

    const eggsRemaining = Math.max(0, (inventory.eggs_available || 0) - (inventory.eggs_allocated || 0))
    const minimum = getInventoryMinimum(inventory)

    if (eggsRemaining < minimum) {
      summary.skippedLowStock += 1
      continue
    }

    const result = await notifyNextInQueue(inventory, now, appUrl)
    summary.notified += result.notified
    summary.expired += result.expired
    summary.waitingWindowOpen += result.waitingWindowOpen
    summary.skippedNoQueue += result.noQueue
  }

  return summary
}

export const EGG_WAITLIST_ACTIVE_STATUSES: WaitlistQueueStatus[] = ['queued', 'notified', 'paused']
export const EGG_WAITLIST_INTERVAL_MINUTES = WAITLIST_EMAIL_INTERVAL_MINUTES
