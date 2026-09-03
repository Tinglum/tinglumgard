import webpush from 'web-push'

/**
 * TodoTwo's outbound Web Push.
 *
 * Mirrors mailer.ts: a thin wrapper that the dispatcher injects, so the
 * dispatch loop stays testable without a network and without real keys. This
 * one is read only from cron context (see push_dispatch below and
 * dispatch.ts) — it takes the privileged client explicitly rather than
 * importing db-privileged.ts itself, so the isolation guard's "db-privileged
 * reached a request path" check has nothing to trip on if this file is ever
 * imported somewhere unexpected.
 */

export interface PushConfig {
  publicKey: string
  privateKey: string
}

/** Null when VAPID keys are not configured, so callers can stay inert. */
export function getPushConfig(): PushConfig | null {
  const publicKey = process.env.NEXT_PUBLIC_TODOTWO_VAPID_PUBLIC_KEY
  const privateKey = process.env.TODOTWO_VAPID_PRIVATE_KEY
  if (!publicKey || !privateKey) return null
  return { publicKey, privateKey }
}

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth_key: string
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

/** Minimal shape so this works with any Supabase client bound to `todotwo`. */
type Db = { from: (table: string) => any }

export interface PushSendSummary {
  configured: boolean
  attempted: number
  sent: number
  /** Subscriptions removed because the push service reported them gone. */
  pruned: number
}

/**
 * Sends one notification to every subscription a person has registered.
 *
 * Best-effort and additive: a person with no subscriptions is a silent no-op,
 * not an error, because most people will never enable push and email remains
 * the channel of record. A 404 or 410 from the push service means the
 * endpoint is gone — the browser uninstalled, the OS revoked it, or the user
 * cleared site data — so that row is deleted rather than retried forever.
 */
export async function sendPushToPerson(
  db: Db,
  personId: string,
  payload: PushPayload
): Promise<PushSendSummary> {
  const config = getPushConfig()
  if (!config) return { configured: false, attempted: 0, sent: 0, pruned: 0 }

  webpush.setVapidDetails('mailto:kenneth@tinglum.com', config.publicKey, config.privateKey)

  const { data, error } = await db
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth_key')
    .eq('person_id', personId)

  if (error || !data || data.length === 0) {
    return { configured: true, attempted: 0, sent: 0, pruned: 0 }
  }

  const rows = data as PushSubscriptionRow[]
  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url,
  })

  let sent = 0
  let pruned = 0

  for (const row of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: row.endpoint,
          keys: { p256dh: row.p256dh, auth: row.auth_key },
        },
        body
      )
      sent += 1
      await db
        .from('push_subscriptions')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', row.id)
    } catch (err) {
      const statusCode = (err as { statusCode?: number } | undefined)?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('id', row.id)
        pruned += 1
      }
      // Any other error (network blip, 5xx from the push service) is left
      // alone: this is a best-effort second channel, not the record of
      // truth, so there is nothing here worth retrying or logging beyond
      // what the caller already does for the outbox row itself.
    }
  }

  return { configured: true, attempted: rows.length, sent, pruned }
}
