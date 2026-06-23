import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canEditBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface VersionRecord {
  id: number
  publishedAt: string
  publishedBy: string
  title?: string
}

// GET /api/bnimsp/slides/[n]/versions - List version history for a slide.
export async function GET(request: NextRequest, { params }: { params: { n: string } }) {
  try {
    const session = await getBnimspSession()
    if (!canEditBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const n = Number(params.n)
    if (!Number.isInteger(n)) {
      return NextResponse.json({ error: 'Invalid slide' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin
      .from('bnimsp_slide_versions')
      .select('id, published_at, published_by, body')
      .eq('slide_n', n)
      .order('published_at', { ascending: false })
      .limit(20)

    if (error) {
      logError('bnimsp-versions-get', error)
      return NextResponse.json({ error: 'Failed to load versions' }, { status: 500 })
    }

    const versions: VersionRecord[] = (data || []).map((v) => ({
      id: v.id,
      publishedAt: v.published_at,
      publishedBy: v.published_by,
      title: v.body?.title || '',
    }))

    return NextResponse.json({ versions })
  } catch (err) {
    logError('bnimsp-versions-get', err)
    return NextResponse.json({ error: 'Failed to load versions' }, { status: 500 })
  }
}

// POST /api/bnimsp/slides/[n]/versions/revert - Revert to a specific version.
export async function POST(request: NextRequest, { params }: { params: { n: string } }) {
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
    const versionId = Number(body.versionId)
    if (!Number.isInteger(versionId) || versionId <= 0) {
      return NextResponse.json({ error: 'Invalid version ID' }, { status: 400 })
    }

    // Fetch the version to revert to.
    const { data: version, error: versionErr } = await supabaseAdmin
      .from('bnimsp_slide_versions')
      .select('body')
      .eq('id', versionId)
      .eq('slide_n', n)
      .maybeSingle()

    if (versionErr || !version) {
      logError('bnimsp-revert-fetch', versionErr)
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Revert: set published back to the old version, clear draft.
    const { error: updateErr } = await supabaseAdmin
      .from('bnimsp_slides')
      .update({
        published: version.body,
        draft: null,
        updated_at: new Date().toISOString(),
        updated_by: `${session?.name || session?.email || 'admin'} (reverted)`,
      })
      .eq('n', n)

    if (updateErr) {
      logError('bnimsp-revert-update', updateErr)
      return NextResponse.json({ error: 'Revert failed' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, message: `Reverted to version from ${version.body.title}` })
  } catch (err) {
    logError('bnimsp-revert', err)
    return NextResponse.json({ error: 'Revert failed' }, { status: 500 })
  }
}
