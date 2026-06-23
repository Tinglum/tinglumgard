import type { Slide, TrainingFormat } from './types'
import { parseMinutes } from './util'

/** The three formats a trainer can deliver, in display order. */
export const FORMATS: TrainingFormat[] = ['full', '120min', '90min']

/** Target run time (content minutes, excluding breaks) used for the budget read-out. */
export const FORMAT_TARGET_MIN: Record<TrainingFormat, number> = {
  full: 180,
  '120min': 120,
  '90min': 90,
}

export function formatLabel(fmt: TrainingFormat): string {
  return { full: 'Fullversjon', '120min': 'Kompakt', '90min': 'Fokusert' }[fmt]
}

export function formatBadge(fmt: TrainingFormat): string {
  return { full: '3 timer', '120min': '2 timer', '90min': '90 min' }[fmt]
}

export function formatDescription(fmt: TrainingFormat): string {
  return {
    full: 'Hele programmet med pauser',
    '120min': 'Kjerne + viktige eksempler – halvdagsworkshop',
    '90min': 'Essensielt innhold – fokus på hovedmeldingene',
  }[fmt]
}

/** Is this slide part of the given format? Full always includes everything. */
export function isIncluded(slide: Slide, fmt: TrainingFormat): boolean {
  if (fmt === 'full') return true
  return slide.formats?.[fmt]?.include ?? true
}

/**
 * Resolve a slide for a format: swap in the format-specific script / task /
 * timing where the trainer authored one, otherwise keep the full version.
 * Returns a normal Slide so every downstream component (LayerStack, presenter,
 * timer) works unchanged.
 */
export function resolveSlide(slide: Slide, fmt: TrainingFormat): Slide {
  if (fmt === 'full') return slide
  const o = slide.formats?.[fmt]
  if (!o) return slide
  return {
    ...slide,
    sayThis: o.sayThis?.trim() ? o.sayThis : slide.sayThis,
    askGroup: o.askGroup?.trim() ? o.askGroup : slide.askGroup,
    timing: o.timing?.trim() ? o.timing : slide.timing,
  }
}

/** True when the trainer has authored a real delta for this field in this format. */
export function hasOverride(
  slide: Slide,
  fmt: TrainingFormat,
  field: 'sayThis' | 'askGroup' | 'timing',
): boolean {
  if (fmt === 'full') return false
  return Boolean(slide.formats?.[fmt]?.[field]?.trim())
}

export interface FormatTotals {
  count: number
  minutes: number
  target: number
  /** minutes - target; positive means over budget. */
  delta: number
}

/** Slide count + content minutes for the slides included in a format. */
export function formatTotals(slides: Slide[], fmt: TrainingFormat): FormatTotals {
  const included = slides.filter((s) => isIncluded(s, fmt))
  const minutes = included.reduce((sum, s) => sum + parseMinutes(resolveSlide(s, fmt).timing), 0)
  const target = FORMAT_TARGET_MIN[fmt]
  return { count: included.length, minutes, target, delta: minutes - target }
}
