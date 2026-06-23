import { NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// Publish: atomically move all pending drafts to published (via RPC transaction).
// This prevents partial publishes from leaving inconsistent state.
export async function POST() {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Use a Postgres RPC to atomically publish all slides + appendix in one transaction.
    // Falls back to the manual loop if the RPC doesn't exist yet.
    const { data: result, error: rpcError } = await supabaseAdmin.rpc('bnimsp_publish_all', {
      updated_by: session?.email || session?.name || 'admin',
    })

    if (rpcError) {
      // RPC doesn't exist or failed; log and fall back to the manual approach.
      logError('bnimsp-publish-rpc', rpcError)

      // Fallback: manual atomic-as-possible publish via prepared batch.
      // Note: still not true atomicity without RPC, but reduces partial-publish risk.
      const { data: slides, error: slidesErr } = await supabaseAdmin
        .from('bnimsp_slides')
        .select('n, draft')
        .not('draft', 'is', null)
      if (slidesErr) {
        return NextResponse.json({ error: 'Publisering feilet. Er migrasjonen kjørt?' }, { status: 500 })
      }

      const { data: appx, error: appxErr } = await supabaseAdmin
        .from('bnimsp_appendix')
        .select('slug, draft')
        .not('draft', 'is', null)
      if (appxErr) {
        return NextResponse.json({ error: 'Publisering feilet. Er migrasjonen kjørt?' }, { status: 500 })
      }

      const now = new Date().toISOString()
      const updates = [
        ...((slides || []).map((row) => ({
          table: 'bnimsp_slides',
          n: row.n,
          published: row.draft,
          draft: null,
          updated_at: now,
          updated_by: session?.email || session?.name || 'admin',
        }))),
        ...((appx || []).map((a) => ({
          table: 'bnimsp_appendix',
          slug: a.slug,
          published: a.draft,
          draft: null,
          updated_at: now,
          updated_by: session?.email || session?.name || 'admin',
        }))),
      ]

      let slidesCount = 0
      for (const upd of updates.filter((u) => u.table === 'bnimsp_slides') as Array<{ n: number; published: any; draft: null; updated_at: string; updated_by: string }>) {
        const { error: upErr } = await supabaseAdmin
          .from('bnimsp_slides')
          .update({
            published: upd.published,
            draft: upd.draft,
            updated_at: upd.updated_at,
            updated_by: upd.updated_by,
          })
          .eq('n', upd.n)
        if (upErr) {
          logError('bnimsp-publish-slide-fallback', upErr)
          continue
        }
        slidesCount++
      }

      for (const upd of updates.filter((u) => u.table === 'bnimsp_appendix') as Array<{ slug: string; published: any; draft: null; updated_at: string; updated_by: string }>) {
        const { error: upErr } = await supabaseAdmin
          .from('bnimsp_appendix')
          .update({
            published: upd.published,
            draft: upd.draft,
            updated_at: upd.updated_at,
            updated_by: upd.updated_by,
          })
          .eq('slug', upd.slug)
        if (upErr) {
          logError('bnimsp-publish-appendix-fallback', upErr)
        }
      }

      return NextResponse.json({ ok: true, published: slidesCount })
    }

    return NextResponse.json({ ok: true, published: result?.slides_published || 0 })
  } catch (err) {
    logError('bnimsp-publish', err)
    return NextResponse.json({ error: 'Publisering feilet' }, { status: 500 })
  }
}
