/**
 * Training format management: support full, 120-min, and 90-min versions.
 * Trainers can customize which slides to include and adjust scripts/tasks per format.
 */

export type TrainingFormat = 'full' | '120min' | '90min'

export interface FormatConfig {
  /** Current selected format */
  activeFormat: TrainingFormat

  /** Per-format slide selections (which slides to include) */
  slideInclusion: {
    full: Set<number>
    '120min': Set<number>
    '90min': Set<number>
  }

  /** Per-format script overrides (sayThis alternatives) */
  scriptOverrides: {
    [key in TrainingFormat]?: {
      [slideN: number]: string
    }
  }

  /** Per-format task overrides (askGroup alternatives) */
  taskOverrides: {
    [key in TrainingFormat]?: {
      [slideN: number]: string
    }
  }

  /** Per-format timing overrides (in minutes) */
  timingOverrides: {
    [key in TrainingFormat]?: {
      [slideN: number]: string
    }
  }
}

/** Default slide selections for each format (trainer can customize) */
export function getDefaultSlideInclusion(totalSlides: number): FormatConfig['slideInclusion'] {
  const all = new Set(Array.from({ length: totalSlides }, (_, i) => i + 1))

  // For 120min: include ~70% of slides (remove some low-priority ones)
  // For 90min: include ~50% (keep core slides only)
  // These are templates; trainer can adjust
  return {
    full: all,
    '120min': all, // Start with all; trainer removes as needed
    '90min': all,  // Start with all; trainer removes as needed
  }
}

export function formatLabel(fmt: TrainingFormat): string {
  return {
    full: 'Fullversjon (3 timer)',
    '120min': 'Kompakt (2 timer)',
    '90min': 'Fokusert (90 min)',
  }[fmt]
}

export function formatDescription(fmt: TrainingFormat): string {
  return {
    full: 'Hele programmet med pause – best for full engagement',
    '120min': 'Kjerne + viktige eksempler – passer til halvdagsworkshop',
    '90min': 'Essensielt innhold – fokus på hovedmeldinger',
  }[fmt]
}
