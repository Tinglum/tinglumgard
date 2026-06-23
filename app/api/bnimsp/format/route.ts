import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp } from '@/lib/bnimsp/access'
import { supabaseAdmin } from '@/lib/supabase/server'
import { logError } from '@/lib/logger'
import type { TrainingFormat } from '@/lib/bnimsp/format-types'

export const dynamic = 'force-dynamic'

interface FormatPrefs {
  activeFormat: TrainingFormat
  selectedSlides: number[]
}

// GET: Fetch director's training format preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getBnimspSession()
    if (!canViewBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const directorId = session?.userId
    if (!directorId) {
      // Non-director: return defaults
      return NextResponse.json({ activeFormat: 'full', selectedSlides: [] })
    }

    const { data } = await supabaseAdmin
      .from('bnimsp_user_notes')
      .select('body')
      .eq('director_id', directorId)
      .eq('slide_n', 0) // Special row: slide_n=0 for format config
      .maybeSingle()

    if (!data || !data.body) {
      return NextResponse.json({ activeFormat: 'full', selectedSlides: [] })
    }

    try {
      const parsed = JSON.parse(data.body)
      const { activeFormat = 'full', selectedSlides = [] } = parsed.format || {}
      return NextResponse.json({ activeFormat, selectedSlides })
    } catch {
      return NextResponse.json({ activeFormat: 'full', selectedSlides: [] })
    }
  } catch (err) {
    logError('bnimsp-format-get', err)
    return NextResponse.json({ error: 'Failed to load format' }, { status: 500 })
  }
}

// PUT: Save director's training format preferences
export async function PUT(request: NextRequest) {
  try {
    const session = await getBnimspSession()
    if (!canViewBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const directorId = session?.userId
    if (!directorId) {
      return NextResponse.json({ ok: true, persisted: false })
    }

    const body = await request.json().catch(() => ({}))
    const activeFormat: TrainingFormat = body.activeFormat || 'full'
    const selectedSlides: number[] = Array.isArray(body.selectedSlides) ? body.selectedSlides : []

    if (selectedSlides.length === 0) {
      return NextResponse.json({ error: 'Must select at least one slide' }, { status: 400 })
    }

    // Store in a special row: slide_n=0 contains format config
    const { error } = await supabaseAdmin.from('bnimsp_user_notes').upsert({
      director_id: directorId,
      slide_n: 0, // Special sentinel for format config
      body: JSON.stringify({
        format: { activeFormat, selectedSlides },
      }),
      updated_at: new Date().toISOString(),
    })

    if (error) {
      logError('bnimsp-format-put', error)
      return NextResponse.json({ error: 'Failed to save format' }, { status: 500 })
    }

    return NextResponse.json({ ok: true, persisted: true })
  } catch (err) {
    logError('bnimsp-format-put', err)
    return NextResponse.json({ error: 'Failed to save format' }, { status: 500 })
  }
}
