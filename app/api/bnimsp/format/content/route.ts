import { NextRequest, NextResponse } from 'next/server'
import { getBnimspSession } from '@/lib/bnimsp/session'
import { canViewBnimsp } from '@/lib/bnimsp/access'
import { loadContent } from '@/lib/bnimsp/content'
import { getFormatConfig, condenseScript, condenseTask } from '@/lib/bnimsp/format-config'
import type { TrainingFormat, Slide } from '@/lib/bnimsp/types'
import { logError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

interface FormatSlide extends Slide {
  formattedTiming: string
  formattedScript: string
  formattedTask: string
  includeInFormat: boolean
}

// GET /api/bnimsp/format/content?format=90min
// Returns slides + scripts + tasks formatted for the selected format
export async function GET(request: NextRequest) {
  try {
    const session = await getBnimspSession()
    if (!canViewBnimsp(session)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const format = (new URL(request.url).searchParams.get('format') || 'full') as TrainingFormat
    if (!['full', '120min', '90min'].includes(format)) {
      return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
    }

    // Load master content
    const { content } = await loadContent('published')
    const formatConfig = getFormatConfig(content.slides.length)
    const config = formatConfig[format]

    // Build format-specific slides
    const formattedSlides: FormatSlide[] = content.slides.map((slide) => {
      const isIncluded = config.slides.includes(slide.n)
      const scriptOverride = config.scriptVariants[slide.n]
      const taskOverride = config.taskVariants[slide.n]

      return {
        ...slide,
        formattedTiming: `${config.timingPerSlide} min`,
        formattedScript: scriptOverride || condenseScript(slide.sayThis, format),
        formattedTask: taskOverride || condenseTask(slide.askGroup, format),
        includeInFormat: isIncluded,
      }
    })

    // Filter to included slides
    const selectedSlides = formattedSlides.filter((s) => s.includeInFormat)
    const totalMinutes = selectedSlides.length * config.timingPerSlide

    return NextResponse.json({
      format,
      config: {
        selectedSlides: selectedSlides.map((s) => s.n),
        timingPerSlide: config.timingPerSlide,
        estimatedMinutes: totalMinutes,
      },
      slides: selectedSlides,
      allSlides: formattedSlides, // Include all for reference
    })
  } catch (err) {
    logError('bnimsp-format-content', err)
    return NextResponse.json({ error: 'Failed to load format content' }, { status: 500 })
  }
}
