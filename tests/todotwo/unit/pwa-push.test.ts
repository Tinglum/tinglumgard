import { describe, expect, it, vi } from 'vitest'

import {
  enablePush,
  findTodoTwoRegistration,
  getPushStatus,
  isTodoTwoRegistration,
  type PushEnv,
} from '@/lib/todotwo/pwa/push'
import { isSnoozed, snoozeUntil } from '@/lib/todotwo/pwa/prompt-snooze'

// Any valid base64url P-256 key shape will do; only equality matters here.
const VAPID = 'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8U'
const OTHER_VAPID = 'BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'

function keyBytes(key: string): ArrayBuffer {
  const padded = (key + '='.repeat((4 - (key.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(Buffer.from(padded, 'base64')).buffer
}

function fakeSubscription(endpoint: string, key: string | null = VAPID) {
  return {
    endpoint,
    options: { applicationServerKey: key ? keyBytes(key) : null },
    toJSON: () => ({ endpoint, keys: { p256dh: 'p', auth: 'a' } }),
    unsubscribe: vi.fn(async () => true),
  } as unknown as PushSubscription & { unsubscribe: ReturnType<typeof vi.fn> }
}

function fakeRegistration(script: string, subscription: PushSubscription | null = null) {
  let current = subscription
  return {
    scope: script === '/eggops-sw.js' ? 'https://x.no/' : 'https://x.no/todotwo/',
    active: { scriptURL: `https://x.no${script}` },
    waiting: null,
    installing: null,
    pushManager: {
      getSubscription: vi.fn(async () => current),
      subscribe: vi.fn(async () => {
        current = fakeSubscription(`https://push.example/${script}/new`)
        return current
      }),
    },
  } as unknown as ServiceWorkerRegistration & {
    pushManager: { subscribe: ReturnType<typeof vi.fn> }
  }
}

function env(opts: {
  registrations: ServiceWorkerRegistration[]
  register?: ServiceWorkerRegistration
  permission?: NotificationPermission
  status?: number
}) {
  const fetch = vi.fn(async () => new Response('{}', { status: opts.status ?? 200 }))
  const e: PushEnv = {
    serviceWorker: {
      getRegistrations: vi.fn(async () => opts.registrations),
      register: vi.fn(async () => opts.register ?? opts.registrations[0]),
    } as unknown as PushEnv['serviceWorker'],
    fetch: fetch as unknown as typeof globalThis.fetch,
    permission: () => opts.permission ?? 'granted',
    requestPermission: vi.fn(async () => opts.permission ?? 'granted'),
  }
  return { env: e, fetch }
}

describe('registration lookup', () => {
  it('recognises TodoTwo by script URL, never the storefront root worker', async () => {
    const egg = fakeRegistration('/eggops-sw.js')
    const tt = fakeRegistration('/todotwo/sw.js')
    expect(isTodoTwoRegistration(egg)).toBe(false)
    expect(isTodoTwoRegistration(tt)).toBe(true)
    const { env: e } = env({ registrations: [egg, tt] })
    expect(await findTodoTwoRegistration(e)).toBe(tt)
  })

  it('returns null rather than a foreign registration', async () => {
    const { env: e } = env({ registrations: [fakeRegistration('/eggops-sw.js')] })
    expect(await findTodoTwoRegistration(e)).toBeNull()
  })
})

describe('getPushStatus', () => {
  it('ignores a subscription on the storefront worker (the old bug)', async () => {
    const egg = fakeRegistration('/eggops-sw.js', fakeSubscription('https://push/egg'))
    const tt = fakeRegistration('/todotwo/sw.js')
    const { env: e } = env({ registrations: [egg, tt] })
    expect(await getPushStatus(e)).toBe('disabled')
  })

  it('is enabled with a TodoTwo subscription, and re-syncs it to the server', async () => {
    const tt = fakeRegistration('/todotwo/sw.js', fakeSubscription('https://push/tt'))
    const { env: e, fetch } = env({ registrations: [tt] })
    expect(await getPushStatus(e)).toBe('enabled')
    expect(fetch).toHaveBeenCalledWith('/api/todotwo/push/subscribe', expect.anything())
  })

  it('reports denied and unsupported', async () => {
    expect(await getPushStatus(null)).toBe('unsupported')
    const { env: e } = env({ registrations: [], permission: 'denied' })
    expect(await getPushStatus(e)).toBe('denied')
  })
})

describe('enablePush', () => {
  it('subscribes on the TodoTwo registration even when the storefront worker exists', async () => {
    const egg = fakeRegistration('/eggops-sw.js')
    const tt = fakeRegistration('/todotwo/sw.js')
    const { env: e, fetch } = env({ registrations: [egg, tt], register: tt })
    expect(await enablePush(e, VAPID)).toEqual({ ok: true })
    expect(tt.pushManager.subscribe).toHaveBeenCalledOnce()
    expect(egg.pushManager.subscribe).not.toHaveBeenCalled()
    const body = JSON.parse((fetch.mock.calls.at(-1) as unknown as [string, RequestInit])[1].body as string)
    expect(body.endpoint).toContain('/todotwo/sw.js/new')
  })

  it('removes a misplaced subscription with our key from the storefront worker', async () => {
    const stray = fakeSubscription('https://push/stray')
    const egg = fakeRegistration('/eggops-sw.js', stray)
    const tt = fakeRegistration('/todotwo/sw.js')
    const { env: e, fetch } = env({ registrations: [egg, tt], register: tt })
    await enablePush(e, VAPID)
    expect(stray.unsubscribe).toHaveBeenCalled()
    expect(fetch).toHaveBeenCalledWith('/api/todotwo/push/unsubscribe', expect.objectContaining({
      body: JSON.stringify({ endpoint: 'https://push/stray' }),
    }))
  })

  it('leaves a foreign subscription with a different key alone', async () => {
    const theirs = fakeSubscription('https://push/theirs', OTHER_VAPID)
    const egg = fakeRegistration('/eggops-sw.js', theirs)
    const tt = fakeRegistration('/todotwo/sw.js')
    const { env: e } = env({ registrations: [egg, tt], register: tt })
    await enablePush(e, VAPID)
    expect(theirs.unsubscribe).not.toHaveBeenCalled()
  })

  it('replaces a subscription made with an old VAPID key', async () => {
    const old = fakeSubscription('https://push/old', OTHER_VAPID)
    const tt = fakeRegistration('/todotwo/sw.js', old)
    const { env: e } = env({ registrations: [tt], register: tt })
    expect(await enablePush(e, VAPID)).toEqual({ ok: true })
    expect(old.unsubscribe).toHaveBeenCalled()
    expect(tt.pushManager.subscribe).toHaveBeenCalledOnce()
  })

  it('reports each failure with a reason instead of failing silently', async () => {
    const tt = fakeRegistration('/todotwo/sw.js')
    expect(await enablePush(null, VAPID)).toMatchObject({ ok: false, reason: 'unsupported' })
    expect(await enablePush(env({ registrations: [tt] }).env, null)).toMatchObject({ reason: 'not_configured' })
    expect(await enablePush(env({ registrations: [tt], permission: 'denied' }).env, VAPID)).toMatchObject({ reason: 'denied' })
    expect(await enablePush(env({ registrations: [tt], status: 401 }).env, VAPID)).toMatchObject({ reason: 'signed_out' })
    expect(await enablePush(env({ registrations: [tt], status: 500 }).env, VAPID)).toMatchObject({ reason: 'failed' })
  })

  it('falls back to the /todotwo/ scope when the wide scope is refused', async () => {
    const tt = fakeRegistration('/todotwo/sw.js')
    const { env: e } = env({ registrations: [tt] })
    const register = e.serviceWorker.register as ReturnType<typeof vi.fn>
    register.mockRejectedValueOnce(new Error('not under max scope')).mockResolvedValueOnce(tt)
    expect(await enablePush(e, VAPID)).toEqual({ ok: true })
    expect(register.mock.calls[1][1]).toEqual({ scope: '/todotwo/' })
  })
})

describe('prompt snooze', () => {
  function store(initial: Record<string, string> = {}) {
    const data = { ...initial }
    return { getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => void (data[k] = v) }
  }

  it('snoozes for the given days and then expires', () => {
    const s = store()
    const now = new Date('2026-09-26T10:00:00Z')
    snoozeUntil(s, 'k', 14, now)
    expect(isSnoozed(s, 'k', new Date('2026-10-09T10:00:00Z'))).toBe(true)
    expect(isSnoozed(s, 'k', new Date('2026-10-11T10:00:00Z'))).toBe(false)
  })

  it('treats garbage or throwing storage as not snoozed', () => {
    expect(isSnoozed(store({ k: '1' }), 'k')).toBe(false)
    const throwing = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
    expect(isSnoozed(throwing, 'k')).toBe(false)
    expect(() => snoozeUntil(throwing, 'k', 3)).not.toThrow()
  })
})
