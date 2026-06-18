// Sanitizes a director's personal script HTML before storing/rendering.
// The script is private to one director, but we still strip everything to a
// tiny allowlist so nothing executable can ever round-trip. All attributes are
// removed; <mark> is forced to a single safe class used for highlights.

const ALLOWED = new Set(['p', 'br', 'div', 'span', 'mark', 'strong', 'b', 'em', 'i', 'u'])

export function sanitizeScriptHtml(input: string): string {
  let html = String(input || '').slice(0, 20000)
  // Drop comments and any embedded executable/structural blocks entirely.
  html = html.replace(/<!--[\s\S]*?-->/g, '')
  html = html.replace(/<(script|style|iframe|object|embed|link|meta|svg)[\s\S]*?<\/\1>/gi, '')
  html = html.replace(/<(script|style|iframe|object|embed|link|meta|svg)\b[^>]*>/gi, '')
  // Rebuild every remaining tag: allowlist names, strip ALL attributes.
  html = html.replace(/<(\/?)([a-zA-Z0-9]+)\b[^>]*>/g, (_m, slash: string, tag: string) => {
    const t = tag.toLowerCase()
    if (!ALLOWED.has(t)) return '' // remove disallowed tag, keep its inner text
    if (slash) return `</${t}>`
    if (t === 'br') return '<br>'
    if (t === 'mark') return '<mark class="bni-hl">'
    return `<${t}>`
  })
  return html.trim()
}
