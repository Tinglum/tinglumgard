import 'server-only'
import { cache } from 'react'
import { supabaseAdmin } from '@/lib/supabase/server'
import seed from '@/app/bnimsp/_data/seed-content.json'
import { LAYER_KEYS } from './types'
import type { BnimspContent, Slide, SlideLayers, AppendixPage, ModuleDef } from './types'

function emptyLayers(): SlideLayers {
  return Object.fromEntries(LAYER_KEYS.map((k) => [k, ''])) as unknown as SlideLayers
}

/** The committed master content - also used to seed the DB and as offline fallback. */
export function seedContent(): BnimspContent {
  return seed as unknown as BnimspContent
}

/** Pull only the layer fields out of a slide-shaped object. */
export function pickLayers(src: Partial<SlideLayers>): SlideLayers {
  const out = emptyLayers()
  for (const k of LAYER_KEYS) out[k] = typeof src[k] === 'string' ? (src[k] as string) : ''
  return out
}

function rowToSlide(row: any, useDraft: boolean): Slide {
  const blob = (useDraft && row.draft ? row.draft : row.published) || {}
  return {
    n: row.n,
    moduleId: row.module_id,
    title: row.title || '',
    image: row.image || `/bnimsp/slides/slide-${String(row.n).padStart(2, '0')}.png`,
    timing: row.timing || '',
    formats: blob.formats && typeof blob.formats === 'object' ? blob.formats : {},
    updated_at: row.updated_at,
    ...pickLayers(blob),
  }
}

/**
 * Load content. Prefers the DB; falls back to the committed seed if the tables
 * are absent or empty (e.g. before the migration/seed has been applied).
 * `mode: 'draft'` returns pending edits for admin preview.
 * Note: distinguished between "table not yet seeded" (expected fallback to seed)
 * vs "actual query error" (logs and falls back, but this is abnormal).
 * Memoized per request to avoid duplicate queries within the same render.
 */
async function loadContentImpl(mode: 'published' | 'draft' = 'published'): Promise<{
  content: BnimspContent
  source: 'db' | 'seed'
}> {
  try {
    const [slidesRes, modulesRes, appendixRes] = await Promise.all([
      supabaseAdmin.from('bnimsp_slides').select('*').order('n'),
      supabaseAdmin.from('bnimsp_modules').select('*').order('sort_order'),
      supabaseAdmin.from('bnimsp_appendix').select('*').order('sort_order'),
    ])

    // Distinguish: tables missing/empty (ok, use seed) vs query error (log it).
    if (slidesRes.error) {
      if (slidesRes.error.code === 'PGRST116') {
        // Table does not exist yet (expected before migration).
        return { content: seedContent(), source: 'seed' }
      }
      // Actual error, not a missing-table: log it.
      console.error('[bnimsp-content] Slides query failed:', slidesRes.error)
      return { content: seedContent(), source: 'seed' }
    }

    if (!slidesRes.data || slidesRes.data.length === 0) {
      // Tables exist but empty (before seeding), expected fallback.
      return { content: seedContent(), source: 'seed' }
    }

    const slides = slidesRes.data.map((r) => rowToSlide(r, mode === 'draft'))
    const modules: ModuleDef[] = (modulesRes.data || []).map((m) => ({
      id: m.id, title: m.title, range: [m.slide_from, m.slide_to],
    }))
    const appendix: AppendixPage[] = (appendixRes.data || []).map((a) => ({
      slug: a.slug, title: a.title,
      body: (mode === 'draft' && a.draft != null ? a.draft : a.published) || '',
    }))
    return {
      content: {
        program: seedContent().program,
        modules: modules.length ? modules : seedContent().modules,
        slides,
        appendix: appendix.length ? appendix : seedContent().appendix,
        // Breaks are program structure, not per-slide DB content.
        breaks: seedContent().breaks,
      },
      source: 'db',
    }
  } catch (err) {
    console.error('[bnimsp-content] Unexpected error:', err)
    return { content: seedContent(), source: 'seed' }
  }
}

// Memoized per-request cache: avoids duplicate DB queries when the same content
// is loaded multiple times in a single request/render cycle.
export const loadContent = cache(loadContentImpl)

/** True when at least one draft differs from published (used to show "unpublished changes"). */
export async function hasUnpublishedChanges(): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin
      .from('bnimsp_slides')
      .select('n')
      .not('draft', 'is', null)
      .limit(1)
    if (error) return false
    return (data?.length || 0) > 0
  } catch {
    return false
  }
}
