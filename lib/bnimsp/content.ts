import 'server-only'
import { supabaseAdmin } from '@/lib/supabase/server'
import seed from '@/app/bnimsp/_data/seed-content.json'
import { LAYER_KEYS } from './types'
import type { BnimspContent, Slide, SlideLayers, AppendixPage, ModuleDef } from './types'

function emptyLayers(): SlideLayers {
  return Object.fromEntries(LAYER_KEYS.map((k) => [k, ''])) as unknown as SlideLayers
}

/** The committed master content — also used to seed the DB and as offline fallback. */
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
    ...pickLayers(blob),
  }
}

/**
 * Load content. Prefers the DB; falls back to the committed seed if the tables
 * are absent or empty (e.g. before the migration/seed has been applied).
 * `mode: 'draft'` returns pending edits for admin preview.
 */
export async function loadContent(mode: 'published' | 'draft' = 'published'): Promise<{
  content: BnimspContent
  source: 'db' | 'seed'
}> {
  try {
    const [slidesRes, modulesRes, appendixRes] = await Promise.all([
      supabaseAdmin.from('bnimsp_slides').select('*').order('n'),
      supabaseAdmin.from('bnimsp_modules').select('*').order('sort_order'),
      supabaseAdmin.from('bnimsp_appendix').select('*').order('sort_order'),
    ])
    if (slidesRes.error || !slidesRes.data || slidesRes.data.length === 0) {
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
  } catch {
    return { content: seedContent(), source: 'seed' }
  }
}

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
