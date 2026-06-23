import { NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface DiffItem {
  n: number
  title: string
  type: 'slide' | 'appendix'
}

// Preview which slides and appendix pages have unpublished changes before publishing.
export async function GET() {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const [slidesRes, appendixRes] = await Promise.all([
      supabaseAdmin
        .from('bnimsp_slides')
        .select('n, title, draft, published')
        .not('draft', 'is', null),
      supabaseAdmin
        .from('bnimsp_appendix')
        .select('slug, title, draft, published')
        .not('draft', 'is', null),
    ])

    const diffs: DiffItem[] = []

    // Slides with unpublished changes.
    if (slidesRes.data) {
      for (const row of slidesRes.data) {
        // Diff: draft differs from published (either published is null or content differs).
        const pubStr = JSON.stringify(row.published || {})
        const draftStr = JSON.stringify(row.draft || {})
        if (pubStr !== draftStr) {
          diffs.push({ n: row.n, title: row.title || `Slide ${row.n}`, type: 'slide' })
        }
      }
    }

    // Appendix pages with unpublished changes.
    if (appendixRes.data) {
      for (const row of appendixRes.data) {
        const pubStr = JSON.stringify(row.published || '')
        const draftStr = JSON.stringify(row.draft || '')
        if (pubStr !== draftStr) {
          diffs.push({ n: 0, title: row.title, type: 'appendix' })
        }
      }
    }

    return NextResponse.json({
      ok: true,
      count: diffs.length,
      diffs: diffs.sort((a, b) => (a.type === b.type ? a.n - b.n : a.type.localeCompare(b.type))),
    })
  } catch (err) {
    logError('bnimsp-publish-diff', err)
    return NextResponse.json({ error: 'Failed to load diff' }, { status: 500 })
  }
}
