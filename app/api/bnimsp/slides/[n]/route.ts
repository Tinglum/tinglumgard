import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { loadContent, pickLayers } from '@/lib/bnimsp/content'
import { logError } from '@/lib/logger'
import {
  EDITABLE_SLIDE_FIELDS, FIELD_LIMITS, FORMAT_OVERRIDE_FIELDS, SHORT_FORMATS,
} from '@/lib/bnimsp/types'
import type { ShortFormat, SlideFormatOverride } from '@/lib/bnimsp/types'

export const dynamic = 'force-dynamic'

// Save edits to a slide's DRAFT. Falls back to seeding the row from current
// content if it does not exist yet, so the first edit after migration works.
// Supports optimistic concurrency: if client provides updatedAt, we check it
// against the server version and reject on mismatch.
//
// Two edit scopes:
//  - Master ("full"): edits the top-level layer fields (default).
//  - Format ("120min"/"90min"): when `format` is set, edits land in
//    base.formats[format] (trimmed sayThis/askGroup/timing, include flag).
export async function PATCH(request: NextRequest, { params }: { params: { n: string } }) {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const n = Number(params.n)
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: 'Invalid slide' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const clientUpdatedAt = body.updatedAt ? String(body.updatedAt) : null

    const format: ShortFormat | null =
      typeof body.format === 'string' && (SHORT_FORMATS as readonly string[]).includes(body.format)
        ? (body.format as ShortFormat)
        : null

    // Collect the edits relevant to the scope.
    const patch: Record<string, string> = {}
    const fields = format ? FORMAT_OVERRIDE_FIELDS : EDITABLE_SLIDE_FIELDS
    for (const key of fields) {
      if (typeof body[key] === 'string') {
        const val = body[key]
        const limit = FIELD_LIMITS[key as string] || 0
        if (limit > 0 && val.length > limit) {
          return NextResponse.json(
            { error: `Field ${key} exceeds ${limit} characters` },
            { status: 400 },
          )
        }
        patch[key] = val
      }
    }
    // `include` is a format-only boolean (toggle a slide in/out of a format).
    const hasInclude = format !== null && typeof body.include === 'boolean'
    if (Object.keys(patch).length === 0 && !hasInclude) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    // Current row (or current content as the base) → new draft blob.
    const { data: row } = await supabaseAdmin
      .from('bnimsp_slides')
      .select('*')
      .eq('n', n)
      .maybeSingle()

    // Optimistic concurrency check: if client has a stale version, reject.
    if (clientUpdatedAt && row && row.updated_at !== clientUpdatedAt) {
      return NextResponse.json(
        { error: 'This slide was edited elsewhere. Please reload.' },
        { status: 409 },
      )
    }

    let base: any
    if (row) {
      base = { ...(row.draft || row.published || {}) }
    } else {
      const { content } = await loadContent('published')
      const slide = content.slides.find((s) => s.n === n)
      if (!slide) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })
      base = pickLayers(slide)
      if (slide.formats) base.formats = slide.formats
    }

    let title = row?.title ?? ''
    let timing = row?.timing ?? ''

    if (format) {
      // Format-scoped edit: merge into base.formats[format].
      const formats = { ...(base.formats || {}) }
      const current: SlideFormatOverride = { ...(formats[format] || {}) }
      for (const key of FORMAT_OVERRIDE_FIELDS) {
        if (key in patch) current[key] = patch[key]
      }
      if (hasInclude) current.include = body.include
      formats[format] = current
      base.formats = formats
    } else {
      // Master edit: top-level layers + title/timing.
      title = patch.title ?? title
      timing = patch.timing ?? timing
      for (const key of EDITABLE_SLIDE_FIELDS) {
        if (key === 'title' || key === 'timing') continue
        if (key in patch) base[key] = patch[key]
      }
    }

    const moduleId = row?.module_id
      ?? (await loadContent('published')).content.slides.find((s) => s.n === n)?.moduleId
      ?? 'm1'
    const image = row?.image || `/bnimsp/slides/slide-${String(n).padStart(2, '0')}.png`

    // FIX #8: never overwrite published with draft. Keep published as-is until explicit publish.
    const { error } = await supabaseAdmin.from('bnimsp_slides').upsert({
      n,
      module_id: moduleId,
      title,
      image,
      timing,
      published: row?.published || null,
      draft: base,
      updated_at: new Date().toISOString(),
      updated_by: session?.email || session?.name || 'admin',
    })
    if (error) {
      logError('bnimsp-slide-patch', error)
      return NextResponse.json(
        { error: 'Lagring feilet. Er migrasjonen kjørt?' },
        { status: 500 },
      )
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('bnimsp-slide-patch', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}
