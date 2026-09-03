/** @vitest-environment jsdom */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ConnectionBanner } from '@/components/todotwo/pwa/connection-banner'

/**
 * The banner is the one piece of Phase 7 that can actively mislead someone, so
 * it gets tested rather than eyeballed. The rule under test: a cached document
 * always says so, and a live document never claims to be cached.
 */

function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { value, configurable: true })
}

beforeEach(() => {
  setOnline(true)
  delete (window as { __TODOTWO_CACHED_AT__?: string }).__TODOTWO_CACHED_AT__
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('ConnectionBanner', () => {
  it('says nothing at all when the page is live and the network is up', () => {
    const { container } = render(<ConnectionBanner />)
    expect(container).toBeEmptyDOMElement()
  })

  it('warns that nothing will save when the network drops on a live page', () => {
    setOnline(false)
    render(<ConnectionBanner />)

    expect(screen.getByRole('status')).toHaveTextContent('No connection')
    expect(screen.getByRole('status')).toHaveTextContent(/Nothing you change will save/)
    // A live page that lost the network is not a cached page.
    expect(screen.queryByText(/Last refreshed/)).toBeNull()
  })

  it('announces a cached document and when it was taken', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    window.__TODOTWO_CACHED_AT__ = '2026-06-15T11:56:00Z'

    render(<ConnectionBanner />)

    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('Saved copy')
    expect(status).toHaveTextContent('Last refreshed 4 minutes ago.')
  })

  it('escalates the wording once the copy is genuinely old', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    window.__TODOTWO_CACHED_AT__ = '2026-06-15T08:00:00Z'

    render(<ConnectionBanner />)

    expect(screen.getByRole('status')).toHaveTextContent('Saved copy, and not a recent one')
  })

  it('offers a refresh only when there is a network to refresh from', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
    window.__TODOTWO_CACHED_AT__ = '2026-06-15T11:56:00Z'

    const { unmount } = render(<ConnectionBanner />)
    expect(screen.getByRole('button', { name: /Refresh/ })).toBeInTheDocument()
    unmount()

    setOnline(false)
    render(<ConnectionBanner />)
    expect(screen.queryByRole('button', { name: /Refresh/ })).toBeNull()
    expect(screen.getByRole('status')).toHaveTextContent('You are offline.')
  })

  it('is announced politely rather than interrupting', () => {
    setOnline(false)
    render(<ConnectionBanner />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite')
  })
})
