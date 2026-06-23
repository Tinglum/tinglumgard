'use client'

import { useEffect, useState } from 'react'
import { Clock, ChevronDown, Loader2 } from 'lucide-react'
import type { TrainingFormat, Slide } from '@/lib/bnimsp/types'
import { formatLabel, formatDescription } from '@/lib/bnimsp/format-types'

interface FormatSlide extends Slide {
  formattedTiming: string
  formattedScript: string
  formattedTask: string
  includeInFormat: boolean
}

interface Props {
  totalSlides: number
  onFormatChange: (format: TrainingFormat) => void
}

/**
 * Intelligent format editor showing:
 * - Smart slide suggestions (not manual toggle)
 * - Script variants per slide per format
 * - Task variants per slide per format
 * - Timing adjustments
 */
export function TrainingFormatEditor({ totalSlides, onFormatChange }: Props) {
  const [format, setFormat] = useState<TrainingFormat>('full')
  const [showDropdown, setShowDropdown] = useState(false)
  const [slides, setSlides] = useState<FormatSlide[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedSlides, setExpandedSlides] = useState<Set<number>>(new Set())

  // Load format-specific content
  useEffect(() => {
    const loadFormatContent = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/bnimsp/format/content?format=${format}`)
        const data = await res.json()
        if (res.ok) {
          setSlides(data.slides || [])
        }
      } catch {
        // Silently fail; will show empty
      } finally {
        setLoading(false)
      }
    }
    loadFormatContent()
  }, [format])

  const handleFormatChange = (newFormat: TrainingFormat) => {
    setFormat(newFormat)
    onFormatChange(newFormat)
    setShowDropdown(false)
    setExpandedSlides(new Set())
  }

  const toggleExpanded = (slideN: number) => {
    const next = new Set(expandedSlides)
    if (next.has(slideN)) next.delete(slideN)
    else next.add(slideN)
    setExpandedSlides(next)
  }

  const selectedCount = slides.length
  const estimatedMinutes = slides.reduce(
    (sum, s) => sum + parseInt(s.formattedTiming),
    0
  )

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      {/* Format selector */}
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-semibold text-blue-900">Treningsformat:</span>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="inline-flex items-center gap-2 rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-900 hover:bg-blue-50"
          >
            {formatLabel(format)}
            <ChevronDown className={`h-4 w-4 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDropdown && (
            <div className="absolute top-full left-0 mt-2 w-96 rounded-xl border border-blue-200 bg-white p-4 shadow-lg z-40">
              <div className="space-y-2 mb-4">
                {(['full', '120min', '90min'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleFormatChange(fmt)}
                    className={`w-full text-left rounded-lg border-2 p-3 transition-colors ${
                      format === fmt
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-blue-100 bg-white hover:bg-blue-25'
                    }`}
                  >
                    <div className="font-semibold text-sm text-blue-900">{formatLabel(fmt)}</div>
                    <div className="text-xs text-blue-700">{formatDescription(fmt)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-blue-700 ml-auto">
          {selectedCount} av {totalSlides} slides · ~{estimatedMinutes} min
        </span>
      </div>

      {/* Slide list with variants */}
      {loading ? (
        <div className="flex items-center justify-center py-8 gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Laster format innhold...
        </div>
      ) : slides.length === 0 ? (
        <p className="text-xs text-blue-600">Ingen slides for dette formatet.</p>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto bg-white rounded-lg p-3">
          {slides.map((slide) => (
            <div key={slide.n} className="border border-blue-100 rounded-lg p-3 hover:bg-blue-25">
              <button
                onClick={() => toggleExpanded(slide.n)}
                className="w-full text-left flex items-start justify-between gap-3 cursor-pointer"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="inline-block bg-blue-600 text-white rounded px-2 py-0.5 text-xs font-bold w-8 text-center">
                      {slide.n}
                    </span>
                    <span className="font-semibold text-sm text-blue-900 truncate">{slide.title}</span>
                    <span className="text-xs text-blue-600 font-medium">⏱ {slide.formattedTiming}</span>
                  </div>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-blue-600 transition-transform flex-shrink-0 ${
                    expandedSlides.has(slide.n) ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {expandedSlides.has(slide.n) && (
                <div className="mt-3 pt-3 border-t border-blue-100 space-y-3">
                  {/* Script variant */}
                  <div>
                    <label className="text-xs font-bold text-blue-900">Si dette:</label>
                    <p className="mt-1 text-xs text-blue-800 bg-blue-100 p-2 rounded leading-relaxed">
                      {slide.formattedScript}
                    </p>
                  </div>

                  {/* Task variant */}
                  {slide.formattedTask && (
                    <div>
                      <label className="text-xs font-bold text-blue-900">Spør gruppen:</label>
                      <p className="mt-1 text-xs text-blue-800 bg-amber-100 p-2 rounded leading-relaxed">
                        {slide.formattedTask}
                      </p>
                    </div>
                  )}

                  {/* Goal/outcome (reference) */}
                  {slide.goal && (
                    <div>
                      <label className="text-xs font-bold text-blue-900">Mål:</label>
                      <p className="mt-1 text-xs text-blue-700 italic">{slide.goal}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mt-3 text-xs text-blue-700">
        💡 Disse slidene og timingene er optimalisert for {formatLabel(format).toLowerCase()}. Du kan redigere
        "Si dette" og "Spør gruppen" på hver slide.
      </div>
    </div>
  )
}
