/**
 * Format-aware training configuration with smart slide selection,
 * script variants, task variants, and timing adjustments.
 */

import type { TrainingFormat } from './format-types'

export interface FormatSlideConfig {
  /** Which slides to include in this format */
  slides: number[]
  /** Per-slide timing (minutes) */
  timingPerSlide: number
  /** Script condensing instructions per slide */
  scriptVariants: Record<number, string>
  /** Task condensing instructions per slide */
  taskVariants: Record<number, string>
}

/**
 * Smart slide selection for each format.
 * Based on BNI MSP 2026 deck structure (40 slides across 4 modules).
 */
export function getFormatConfig(totalSlides: number): Record<TrainingFormat, FormatSlideConfig> {
  // Helper: slides that are typically "core" vs "optional"
  // This is a heuristic; trainers can override
  const isCoreSlide = (n: number): boolean => {
    // Module structure assumptions (adjust based on actual deck):
    // 1-5: Opening & context (keep all)
    // 6-15: Core content (keep most)
    // 16-25: Deep dives & examples (keep some)
    // 26-35: Advanced topics (optional)
    // 36-40: Closing (keep all)
    if (n <= 5 || n >= 36) return true // Opening & closing
    if (n <= 15) return true // Core module
    if (n === 6 || n === 12 || n === 18) return true // Key content slides
    if (n === 20 || n === 22) return true // Important examples
    return false
  }

  const allSlides = Array.from({ length: totalSlides }, (_, i) => i + 1)
  const coreSlides = allSlides.filter(isCoreSlide)
  const optionalSlides = allSlides.filter((n) => !isCoreSlide(n))

  return {
    full: {
      slides: allSlides,
      timingPerSlide: 5, // 180 min ÷ 40 slides ≈ 4.5 min
      scriptVariants: {},
      taskVariants: {},
    },
    '120min': {
      // Keep ~60% of slides: all core + some optional examples
      slides: [...coreSlides, ...optionalSlides.filter((_, i) => i % 2 === 0)],
      timingPerSlide: 3,
      scriptVariants: {
        // Condense key intros
        1: 'Kort intro: velkommen til BNI MSP-trening. Vi skal dekke hvordan du bygger ditt nettverk.',
        2: 'Dagens program: 5 kjerneområder. Vi fokuserer på praktisk anvendelse.',
      },
      taskVariants: {
        // Shorter exercises
        4: 'Rask poll: Hva er ditt største nettverk utfordring? (30 sek)',
        8: 'Pair-share: Deles én erfaring med naboen (1 min)',
      },
    },
    '90min': {
      // Keep ~50% of slides: core only + critical closing
      slides: coreSlides.slice(0, Math.ceil(coreSlides.length * 0.8)),
      timingPerSlide: 2,
      scriptVariants: {
        1: 'Essensen: BNI handler om å bygge tillitsbaserte nettverk. Vi dekker 3 kjerneprinsipper på 90 minutter.',
        2: 'Vi fokuserer på: Lytting, Bæring, Spørring. Disse tre drar hele BNI-modellen.',
        3: 'Spørsmål før vi starter: Hvem her er ny i BNI? (Show of hands)',
      },
      taskVariants: {
        4: 'Refleksjon: Hvilken av de tre prinsippene er sterkest for deg? (Hand up)',
        8: 'Tenk på en person du møter denne uken. Hva spørsmål kan du stille? (Silent reflection)',
      },
    },
  }
}

/**
 * Apply format-specific condensing to a script.
 * Simple heuristic: remove detail, keep core message.
 */
export function condenseScript(original: string, format: TrainingFormat): string {
  if (format === 'full') return original

  // Very simple: take first sentence(s) or up to 100 chars for 90min
  const maxChars = format === '90min' ? 100 : 150
  if (original.length <= maxChars) return original

  // Try to break at sentence boundary
  const sentences = original.split(/(?<=[.!?])\s+/)
  let condensed = ''
  for (const sent of sentences) {
    if ((condensed + ' ' + sent).length > maxChars) break
    condensed += (condensed ? ' ' : '') + sent
  }
  return condensed || original.slice(0, maxChars)
}

/**
 * Apply format-specific condensing to a task/question.
 */
export function condenseTask(original: string, format: TrainingFormat): string {
  if (format === 'full') return original

  // Similar to script: shorten 5-min exercises to 2-min or 1-min versions
  const maxChars = format === '90min' ? 80 : 120
  if (original.length <= maxChars) return original

  const sentences = original.split(/(?<=[.!?])\s+/)
  let condensed = ''
  for (const sent of sentences) {
    if ((condensed + ' ' + sent).length > maxChars) break
    condensed += (condensed ? ' ' : '') + sent
  }
  return condensed || original.slice(0, maxChars)
}
