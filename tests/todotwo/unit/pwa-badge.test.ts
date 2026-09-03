/** @vitest-environment jsdom */
import { describe, expect, it, vi } from 'vitest'

import {
  applyAppBadge,
  countOpenTasks,
  isBadgePathname,
  supportsBadging,
  type BadgingNavigator,
} from '@/lib/todotwo/pwa/badge'

function fixture(html: string): HTMLElement {
  const root = document.createElement('main')
  root.innerHTML = html
  return root
}

describe('countOpenTasks', () => {
  it('counts only rows that are still to do', () => {
    const root = fixture(`
      <ul>
        <li><button aria-pressed="false">a</button></li>
        <li><button aria-pressed="false">b</button></li>
        <li><button aria-pressed="true">done</button></li>
        <li><button>not a task toggle</button></li>
      </ul>
    `)
    expect(countOpenTasks(root)).toBe(2)
  })

  it('is zero for an empty day', () => {
    expect(countOpenTasks(fixture('<p>Nothing left today.</p>'))).toBe(0)
  })

  it('is zero rather than throwing when the view is not mounted', () => {
    expect(countOpenTasks(null)).toBe(0)
  })
})

describe('isBadgePathname', () => {
  it('badges the Today view only', () => {
    expect(isBadgePathname('/todotwo')).toBe(true)
    expect(isBadgePathname('/todotwo/upcoming')).toBe(false)
    expect(isBadgePathname('/todotwo/people')).toBe(false)
  })
})

describe('supportsBadging', () => {
  it('requires both halves of the API', () => {
    expect(supportsBadging(undefined)).toBe(false)
    expect(supportsBadging({})).toBe(false)
    expect(supportsBadging({ setAppBadge: async () => {} })).toBe(false)
    expect(supportsBadging({ setAppBadge: async () => {}, clearAppBadge: async () => {} })).toBe(
      true
    )
  })
})

describe('applyAppBadge', () => {
  function stub(): BadgingNavigator & { set: ReturnType<typeof vi.fn>; clear: ReturnType<typeof vi.fn> } {
    const set = vi.fn(async () => {})
    const clear = vi.fn(async () => {})
    return { set, clear, setAppBadge: set, clearAppBadge: clear }
  }

  it('does nothing at all where the API is absent', async () => {
    expect(await applyAppBadge(3, {})).toBe('unsupported')
  })

  it('sets the count', async () => {
    const nav = stub()
    expect(await applyAppBadge(3, nav)).toBe('set')
    expect(nav.set).toHaveBeenCalledWith(3)
  })

  it('clears rather than showing a zero', async () => {
    const nav = stub()
    expect(await applyAppBadge(0, nav)).toBe('cleared')
    expect(nav.clear).toHaveBeenCalled()
    expect(nav.set).not.toHaveBeenCalled()
  })

  it('never asks for a negative or fractional badge', async () => {
    const nav = stub()
    await applyAppBadge(-4, nav)
    expect(nav.clear).toHaveBeenCalled()

    await applyAppBadge(2.7, nav)
    expect(nav.set).toHaveBeenCalledWith(2)

    await applyAppBadge(Number.NaN, nav)
    expect(nav.clear).toHaveBeenCalledTimes(2)
  })

  it('swallows a rejection — iOS refuses when notifications are denied', async () => {
    const nav: BadgingNavigator = {
      setAppBadge: async () => {
        throw new Error('NotAllowedError')
      },
      clearAppBadge: async () => {},
    }
    expect(await applyAppBadge(5, nav)).toBe('unsupported')
  })
})
