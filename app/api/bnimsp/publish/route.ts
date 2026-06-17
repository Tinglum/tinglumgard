import { NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Publish: copy every pending draft into published, then clear the drafts.
export async function POST() {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: slides, error } = await supabaseAdmin
      .from('bnimsp_slides')
      .select('n, draft')
      .not('draft', 'is', null)
    if (error) {
      return NextResponse.json({ error: 'Publisering feilet. Er migrasjonen kjørt?' }, { status: 500 })
    }

    let published = 0
    for (const row of slides || []) {
      const { error: upErr } = await supabaseAdmin
        .from('bnimsp_slides')
        .update({ published: row.draft, draft: null, updated_at: new Date().toISOString() })
        .eq('n', row.n)
      if (upErr) { logError('bnimsp-publish-slide', upErr); continue }
      published++
    }

    const { data: apps } = await supabaseAdmin
      .from('bnimsp_appendix')
      .select('slug, draft')
      .not('draft', 'is', null)
    for (const a of apps || []) {
      await supabaseAdmin
        .from('bnimsp_appendix')
        .update({ published: a.draft, draft: null, updated_at: new Date().toISOString() })
        .eq('slug', a.slug)
    }

    return NextResponse.json({ ok: true, published })
  } catch (err) {
    logError('bnimsp-publish', err)
    return NextResponse.json({ error: 'Publisering feilet' }, { status: 500 })
  }
}
