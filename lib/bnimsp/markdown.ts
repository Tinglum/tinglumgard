// Lightweight markdown helpers (no dependency). Shared by the renderer and the
// table-of-contents builder.

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[æ]/g, 'ae').replace(/[ø]/g, 'o').replace(/[å]/g, 'a')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 60)
}

export interface Heading {
  level: number
  text: string
  id: string
}

/** Extract H2/H3 headings for an in-page table of contents. */
export function extractHeadings(md: string): Heading[] {
  const out: Heading[] = []
  for (const raw of md.split('\n')) {
    const m = /^(#{2,3})\s+(.*)$/.exec(raw.trim())
    if (m) {
      const text = m[2].replace(/[*`]/g, '').trim()
      out.push({ level: m[1].length, text, id: slugify(text) })
    }
  }
  return out
}

/** Rough read-time estimate in minutes. */
export function readMinutes(md: string): number {
  const words = md.trim().split(/\s+/).filter(Boolean).length
  return Math.max(1, Math.round(words / 200))
}
