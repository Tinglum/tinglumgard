import { NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { seedContent, pickLayers } from '@/lib/bnimsp/content'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// One-time (idempotent) load of the committed master content into the DB.
// Existing published content is left untouched unless ?force=1 is passed.
export async function POST(request: Request) {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }
    const force = new URL(request.url).searchParams.get('force') === '1'
    const content = seedContent()

    const { data: existing, error: probeErr } = await supabaseAdmin
      .from('bnimsp_slides')
      .select('n')
      .limit(1)
    if (probeErr) {
      return NextResponse.json(
        { error: 'Tabellene finnes ikke ennå. Kjør migrasjonen først.' },
        { status: 500 },
      )
    }
    if ((existing?.length || 0) > 0 && !force) {
      return NextResponse.json({ ok: true, skipped: true, reason: 'already seeded (use ?force=1 to overwrite)' })
    }

    await supabaseAdmin.from('bnimsp_modules').upsert(
      content.modules.map((m, i) => ({
        id: m.id, title: m.title, slide_from: m.range[0], slide_to: m.range[1], sort_order: i,
      })),
    )
    await supabaseAdmin.from('bnimsp_slides').upsert(
      content.slides.map((s) => ({
        n: s.n,
        module_id: s.moduleId,
        title: s.title,
        image: s.image,
        timing: s.timing,
        published: pickLayers(s),
        draft: null,
        updated_at: new Date().toISOString(),
      })),
    )
    await supabaseAdmin.from('bnimsp_appendix').upsert(
      content.appendix.map((a, i) => ({
        slug: a.slug, title: a.title, published: a.body, draft: null, sort_order: i,
      })),
    )

    return NextResponse.json({
      ok: true,
      slides: content.slides.length,
      modules: content.modules.length,
      appendix: content.appendix.length,
    })
  } catch (err) {
    logError('bnimsp-seed', err)
    return NextResponse.json({ error: 'Seeding feilet' }, { status: 500 })
  }
}
