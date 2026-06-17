import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { loadContent } from '@/lib/bnimsp/content'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Save an appendix page's DRAFT body (admin). Seeds the row from current content
// if it does not exist yet.
export async function PATCH(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const session = await getSession()
    if (!canEditBnimsp(session)) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const body = await request.json().catch(() => ({}))
    if (typeof body.body !== 'string') {
      return NextResponse.json({ error: 'Missing body' }, { status: 400 })
    }

    const { data: row } = await supabaseAdmin
      .from('bnimsp_appendix')
      .select('slug, title, published, sort_order')
      .eq('slug', params.slug)
      .maybeSingle()

    let title = row?.title
    let published = row?.published ?? ''
    let sort_order = row?.sort_order ?? 0
    if (!row) {
      const { content } = await loadContent('published')
      const page = content.appendix.find((a) => a.slug === params.slug)
      if (!page) return NextResponse.json({ error: 'Not found' }, { status: 404 })
      title = page.title
      published = page.body
      sort_order = content.appendix.findIndex((a) => a.slug === params.slug)
    }

    const { error } = await supabaseAdmin.from('bnimsp_appendix').upsert({
      slug: params.slug,
      title,
      published,
      draft: body.body,
      sort_order,
      updated_at: new Date().toISOString(),
    })
    if (error) {
      logError('bnimsp-appendix-patch', error)
      return NextResponse.json({ error: 'Lagring feilet. Er migrasjonen kjørt?' }, { status: 500 })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    logError('bnimsp-appendix-patch', err)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
