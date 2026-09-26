import {
  TODOTWO_SW_FALLBACK_SCOPE,
  TODOTWO_SW_SCOPE,
  TODOTWO_SW_URL,
} from '@/lib/todotwo/pwa/constants'

/**
 * The one way TodoTwo gets at its own service worker and push subscription.
 *
 * WHY this exists: the same origin also hosts the egg storefront, whose
 * `/eggops-sw.js` is registered at the ROOT scope `/` from /egg. Anyone who has
 * visited /egg on their phone (the farm owner, obviously) has that worker, and
 * because production cannot serve `Service-Worker-Allowed` for a static file
 * on Netlify, TodoTwo's own worker only ever gets scope `/todotwo/` — which
 * does not cover `/todotwo` itself, the Today page and the PWA's start_url.
 * So on Today the page is controlled by the STOREFRONT worker, and:
 *
 *   - `navigator.serviceWorker.ready` resolves to the storefront registration.
 *     Subscribing through it sent every push to a worker with no `push`
 *     handler: nothing was ever shown, and browsers penalise silent pushes.
 *   - `getRegistration('/todotwo/sw.js')` is a *client URL* lookup (longest
 *     matching scope), not a script lookup — with no TodoTwo registration it
 *     happily returns the storefront one too.
 *   - the prompt checked one registration and subscribed on another, so it
 *     never saw the subscription it had just made and asked again, for ever.
 *
 * Push does not need the page to be controlled by the worker: a subscription
 * belongs to a registration, and the push event is delivered to that
 * registration's worker whatever tab is open. So everything here finds the
 * registration by its SCRIPT URL, registers it if missing, and never uses
 * `ready` or the page's controller. That keeps TodoTwo out of the storefront's
 * files and out of netlify.toml.
 *
 * Browser APIs are passed in (defaulting to the real ones) so the logic can be
 * unit-tested without a browser.
 */

export interface PushEnv {
  serviceWorker: Pick<ServiceWorkerContainer, 'getRegistrations' | 'register'>
  fetch: typeof fetch
  permission: () => NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
}

export function defaultPushEnv(): PushEnv | null {
  if (
    typeof window === 'undefined' ||
    typeof navigator === 'undefined' ||
    !('serviceWorker' in navigator) ||
    !('PushManager' in window) ||
    typeof Notification === 'undefined'
  ) {
    return null
  }
  return {
    serviceWorker: navigator.serviceWorker,
    fetch: window.fetch.bind(window),
    permission: () => Notification.permission,
    requestPermission: () => Notification.requestPermission(),
  }
}

function scriptPath(worker: ServiceWorker | null | undefined): string | null {
  if (!worker?.scriptURL) return null
  try {
    return new URL(worker.scriptURL, 'https://placeholder.invalid').pathname
  } catch {
    return null
  }
}

/** True only for a registration running TodoTwo's own worker script. */
export function isTodoTwoRegistration(registration: ServiceWorkerRegistration): boolean {
  return [registration.active, registration.waiting, registration.installing].some(
    (worker) => scriptPath(worker) === TODOTWO_SW_URL
  )
}

/** Existing TodoTwo registration, or null. Never a foreign one. */
export async function findTodoTwoRegistration(
  env: Pick<PushEnv, 'serviceWorker'>
): Promise<ServiceWorkerRegistration | null> {
  const registrations = await env.serviceWorker.getRegistrations()
  return registrations.find(isTodoTwoRegistration) ?? null
}

/**
 * Registers the TodoTwo worker (or returns the existing registration — calling
 * register() again for the same scope is how browsers expect an update check).
 * The wide scope is tried first for environments that do send the header
 * (next dev); production falls back to `/todotwo/`, which is fine for push.
 */
export async function ensureTodoTwoRegistration(
  env: Pick<PushEnv, 'serviceWorker'>
): Promise<ServiceWorkerRegistration> {
  try {
    return await env.serviceWorker.register(TODOTWO_SW_URL, { scope: TODOTWO_SW_SCOPE })
  } catch {
    return env.serviceWorker.register(TODOTWO_SW_URL, { scope: TODOTWO_SW_FALLBACK_SCOPE })
  }
}

/** pushManager.subscribe() rejects until the registration has an active worker. */
export function waitForActive(
  registration: ServiceWorkerRegistration,
  timeoutMs = 15000
): Promise<ServiceWorkerRegistration> {
  if (registration.active) return Promise.resolve(registration)
  const worker = registration.installing ?? registration.waiting
  if (!worker) return Promise.reject(new Error('sw_not_installing'))

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.removeEventListener('statechange', onChange)
      reject(new Error('sw_activation_timeout'))
    }, timeoutMs)
    function onChange() {
      if (worker!.state === 'activated') {
        clearTimeout(timer)
        worker!.removeEventListener('statechange', onChange)
        resolve(registration)
      } else if (worker!.state === 'redundant') {
        clearTimeout(timer)
        worker!.removeEventListener('statechange', onChange)
        reject(new Error('sw_redundant'))
      }
    }
    worker.addEventListener('statechange', onChange)
  })
}

export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(base64Safe)
  const output = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i)
  return output
}

function sameKey(subscription: PushSubscription, vapidPublicKey: string): boolean {
  const current = subscription.options?.applicationServerKey
  // Browsers that do not expose the key: assume it matches rather than churn.
  if (!current) return true
  const a = new Uint8Array(current)
  const b = urlBase64ToUint8Array(vapidPublicKey)
  return a.length === b.length && a.every((value, i) => value === b[i])
}

/** The subscription on TodoTwo's own registration, or null. */
export async function getTodoTwoSubscription(
  env: Pick<PushEnv, 'serviceWorker'>
): Promise<PushSubscription | null> {
  const registration = await findTodoTwoRegistration(env)
  if (!registration) return null
  return registration.pushManager.getSubscription()
}

export type SaveResult = 'ok' | 'signed_out' | 'failed'

/** Idempotent on the server: same endpoint for the same person is replaced. */
export async function saveSubscription(
  env: Pick<PushEnv, 'fetch'>,
  subscription: PushSubscription
): Promise<SaveResult> {
  const json = subscription.toJSON()
  try {
    const response = await env.fetch('/api/todotwo/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
    })
    if (response.status === 401) return 'signed_out'
    return response.ok ? 'ok' : 'failed'
  } catch {
    return 'failed'
  }
}

export type EnableResult =
  | { ok: true }
  | { ok: false; reason: 'unsupported' | 'not_configured' | 'denied' | 'dismissed' | 'signed_out' | 'failed'; message: string }

/**
 * Permission → TodoTwo registration → subscription → server. Every failure is
 * returned with a sentence a person can act on; nothing is swallowed.
 */
export async function enablePush(
  env: PushEnv | null,
  vapidPublicKey: string | null
): Promise<EnableResult> {
  if (!env) {
    return {
      ok: false,
      reason: 'unsupported',
      message: 'This browser cannot receive notifications. On iPhone, open TodoTwo from the Home Screen icon.',
    }
  }
  if (!vapidPublicKey) {
    return { ok: false, reason: 'not_configured', message: 'Notifications are not configured on the server yet.' }
  }

  const permission = await env.requestPermission()
  if (permission === 'denied') {
    return { ok: false, reason: 'denied', message: 'Notifications are blocked for this site.' }
  }
  if (permission !== 'granted') {
    return { ok: false, reason: 'dismissed', message: 'Notifications were not allowed.' }
  }

  let subscription: PushSubscription
  try {
    const registration = await waitForActive(await ensureTodoTwoRegistration(env))
    const existing = await registration.pushManager.getSubscription()
    // A subscription made with a different VAPID key can never be delivered
    // to by the current server; replace it rather than re-saving a dud.
    if (existing && !sameKey(existing, vapidPublicKey)) await existing.unsubscribe()
    subscription =
      existing && sameKey(existing, vapidPublicKey)
        ? existing
        : await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          })
  } catch (error) {
    return {
      ok: false,
      reason: 'failed',
      message: `The phone would not set up notifications (${error instanceof Error ? error.message : 'unknown error'}). Close TodoTwo completely, open it again and retry.`,
    }
  }

  await removeMisplacedSubscriptions(env, vapidPublicKey)

  const saved = await saveSubscription(env, subscription)
  if (saved === 'signed_out') {
    return { ok: false, reason: 'signed_out', message: 'Sign in first, then turn notifications on.' }
  }
  if (saved === 'failed') {
    return { ok: false, reason: 'failed', message: 'Could not save notifications on the server. Check your connection and try again.' }
  }
  return { ok: true }
}

/**
 * Earlier builds subscribed through whatever registration controlled the page
 * — on Today, the storefront's root worker. Those subscriptions still sit on
 * the server, and every push to them wakes a worker that shows nothing. The
 * storefront never uses push, so a subscription on its registration carrying
 * OUR key can only be one TodoTwo made by mistake: drop it here and on the
 * server. Strict key match — anything we cannot prove is ours is left alone.
 */
export async function removeMisplacedSubscriptions(
  env: Pick<PushEnv, 'serviceWorker' | 'fetch'>,
  vapidPublicKey: string
): Promise<number> {
  let removed = 0
  try {
    const registrations = await env.serviceWorker.getRegistrations()
    for (const registration of registrations) {
      if (isTodoTwoRegistration(registration)) continue
      const subscription = await registration.pushManager.getSubscription().catch(() => null)
      if (!subscription || !subscription.options?.applicationServerKey) continue
      if (!sameKey(subscription, vapidPublicKey)) continue
      const endpoint = subscription.endpoint
      await subscription.unsubscribe().catch(() => false)
      await env
        .fetch('/api/todotwo/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint }),
        })
        .catch(() => undefined)
      removed += 1
    }
  } catch {
    // Housekeeping only; never a reason to fail turning notifications on.
  }
  return removed
}

export async function disablePush(env: PushEnv | null): Promise<void> {
  if (!env) return
  const subscription = await getTodoTwoSubscription(env)
  if (!subscription) return
  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  await env
    .fetch('/api/todotwo/push/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint }),
    })
    .catch(() => undefined)
}

export type PushStatus = 'unsupported' | 'denied' | 'enabled' | 'disabled'

/**
 * What the browser really has. When it is enabled the subscription is quietly
 * re-sent to the server as well: the server prunes rows the push service
 * reports gone, and re-saving is idempotent, so this heals a device the server
 * forgot without asking the person anything.
 */
export async function getPushStatus(env: PushEnv | null): Promise<PushStatus> {
  if (!env) return 'unsupported'
  if (env.permission() === 'denied') return 'denied'
  try {
    const subscription = await getTodoTwoSubscription(env)
    if (!subscription || env.permission() !== 'granted') return 'disabled'
    void saveSubscription(env, subscription)
    return 'enabled'
  } catch {
    return 'disabled'
  }
}
