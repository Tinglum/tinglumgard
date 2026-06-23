'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock, ChevronDown, Save, Loader2 } from 'lucide-react'
import type { TrainingFormat } from '@/lib/bnimsp/format-types'
import { formatLabel, formatDescription } from '@/lib/bnimsp/format-types'

interface Props {
  initialFormat: TrainingFormat
  totalSlides: number
  onFormatChange: (format: TrainingFormat) => void
  onSave?: (format: TrainingFormat, selectedSlides: Set<number>) => Promise<void>
}

/**
 * Top selector for training format (full / 120min / 90min).
 * Shows current format, allows switching, and provides slide selection UI.
 */
export function TrainingFormatSelector({
  initialFormat,
  totalSlides,
  onFormatChange,
  onSave,
}: Props) {
  const [format, setFormat] = useState<TrainingFormat>(initialFormat)
  const [showDropdown, setShowDropdown] = useState(false)
  const [selectedSlides, setSelectedSlides] = useState<Set<number>>(
    new Set(Array.from({ length: totalSlides }, (_, i) => i + 1))
  )
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  useEffect(() => {
    setFormat(initialFormat)
  }, [initialFormat])

  const handleFormatChange = useCallback((newFormat: TrainingFormat) => {
    setFormat(newFormat)
    onFormatChange(newFormat)
    setShowDropdown(false)
    setMsg(null)
  }, [onFormatChange])

  const toggleSlide = useCallback((slideN: number) => {
    setSelectedSlides((prev) => {
      const next = new Set(prev)
      if (next.has(slideN)) {
        next.delete(slideN)
      } else {
        next.add(slideN)
      }
      return next
    })
  }, [])

  const handleSave = async () => {
    if (selectedSlides.size === 0) {
      setMsg({ kind: 'err', text: 'Du må velge minst en slide.' })
      return
    }
    setSaving(true)
    setMsg(null)
    try {
      if (onSave) {
        await onSave(format, selectedSlides)
      }
      setMsg({ kind: 'ok', text: 'Formatinnstillinger lagret.' })
      setShowDropdown(false)
    } catch (err) {
      setMsg({
        kind: 'err',
        text: err instanceof Error ? err.message : 'Kunne ikke lagre innstillinger',
      })
    } finally {
      setSaving(false)
    }
  }

  const slidesSelected = selectedSlides.size
  const estimatedMinutes = {
    full: Math.round((slidesSelected / totalSlides) * 180),
    '120min': Math.round((slidesSelected / totalSlides) * 120),
    '90min': Math.round((slidesSelected / totalSlides) * 90),
  }[format]

  return (
    <div className="mb-6 rounded-2xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex flex-wrap items-center gap-4">
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
            <div className="absolute top-full left-0 mt-2 w-80 rounded-xl border border-blue-200 bg-white p-4 shadow-lg z-40">
              <div className="space-y-3 mb-4 max-h-48 overflow-y-auto">
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

              {/* Slide selection */}
              <div className="border-t border-blue-100 pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-blue-900">
                    Velg slides ({slidesSelected}/{totalSlides})
                  </span>
                  <button
                    onClick={() => setSelectedSlides(new Set(Array.from({ length: totalSlides }, (_, i) => i + 1)))}
                    className="text-xs text-blue-600 hover:text-blue-900 font-medium"
                  >
                    Velg alle
                  </button>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-3 max-h-32 overflow-y-auto">
                  {Array.from({ length: totalSlides }, (_, i) => i + 1).map((slideN) => (
                    <button
                      key={slideN}
                      onClick={() => toggleSlide(slideN)}
                      className={`rounded-lg py-1 text-xs font-semibold transition-colors ${
                        selectedSlides.has(slideN)
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                      }`}
                    >
                      {slideN}
                    </button>
                  ))}
                </div>

                <div className="mb-3 rounded-lg bg-blue-100 p-2 text-xs text-blue-900">
                  <strong>Estimert varighet:</strong> ~{estimatedMinutes} min
                </div>

                {msg && (
                  <div className={`mb-3 text-xs ${msg.kind === 'ok' ? 'text-green-700' : 'text-red-700'}`}>
                    {msg.text}
                  </div>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || selectedSlides.size === 0}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  Lagre instillinger
                </button>
              </div>
            </div>
          )}
        </div>

        <span className="text-xs text-blue-700 ml-auto">
          {slidesSelected} av {totalSlides} slides · ~{estimatedMinutes} min
        </span>
      </div>
    </div>
  )
}
