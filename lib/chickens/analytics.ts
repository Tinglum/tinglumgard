export type ChickenFunnelEvent =
  | 'week_selected'
  | 'breed_selected'
  | 'hatch_selected'
  | 'checkout_started'
  | 'checkout_completed'

export function trackChickenFunnel(event: ChickenFunnelEvent, payload: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return

  const detail = {
    event,
    ...payload,
    timestamp: new Date().toISOString(),
  }

  window.dispatchEvent(new CustomEvent('chicken-funnel', { detail }))

  const win = window as Window & { dataLayer?: Array<Record<string, unknown>> }
  if (Array.isArray(win.dataLayer)) {
    win.dataLayer.push({
      event: `chicken_${event}`,
      ...payload,
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.debug('[chicken-funnel]', detail)
  }
}

