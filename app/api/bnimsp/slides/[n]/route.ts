import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { loadContent, pickLayers } from '@/lib/bnimsp/content'
import { logError } from '@/lib/logger'
import type { SlideLayers } from '@/lib/bnimsp/types'

export const dynamic = 'force-dynamic'

const EDITABLE: (keyof SlideLayers | 'title' | 'timing')[] = [
  'title', 'timing', 'goal', 'outcome', 'sayThis', 'doThis', 'askGroup', 'transition',
  'understand', 'participant', 'ninjaTip', 'example', 'teamAnchor', 'notes',
]

// Save edits to a slide's DRAFT. Falls back to seeding the row from current
// content if it does not exist yet, so the first edit after migration works.
export async function PATCH(request: NextRequest, { params }: { params: { n: string } }) {
  try {
    const session = await getSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const n = Number(params.n)
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: 'Invalid slide' }, { status: 400 })
    }
    const body = await request.json().catch(() => ({}))
    const patch: Record<string, string> = {}
    for (const key of EDITABLE) {
      if (typeof body[key] === 'string') patch[key] = body[key]
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: 'No editable fields provided' }, { status: 400 })
    }

    // Current row (or current content as the base) → new draft blob.
    const { data: row } = await supabaseAdmin
      .from('bnimsp_slides')
      .select('*')
      .eq('n', n)
      .maybeSingle()

    let base: any
    if (row) {
      base = { ...(row.draft || row.published || {}) }
    } else {
      const { content } = await loadContent('published')
      const slide = content.slides.find((s) => s.n === n)
      if (!slide) return NextResponse.json({ error: 'Slide not found' }, { status: 404 })
      base = pickLayers(slide)
    }

    const title = patch.title ?? row?.title ?? ''
    const timing = patch.timing ?? row?.timing ?? ''
    for (const key of EDITABLE) {
      if (key === 'title' || key === 'timing') continue
      if (key in patch) base[key] = patch[key]
    }

    const moduleId = row?.module_id
      ?? (await loadContent('published')).content.slides.find((s) => s.n === n)?.moduleId
      ?? 'm1'
    const image = row?.image || `/bnimsp/slides/slide-${String(n).padStart(2, '0')}.png`

    const { error } = await supabaseAdmin.from('bnimsp_slides').upsert({
      n,
      module_id: moduleId,
      title,
      image,
      timing,
      published: row?.published || base,
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
