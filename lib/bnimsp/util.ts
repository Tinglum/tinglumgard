import type { BnimspContent, BreakDef, ModuleDef, Slide } from './types'

/** Parse a timing label like "ca. 5 min" or "ca. 3–4 min" → minutes (upper bound). */
export function parseMinutes(timing: string): number {
  if (!timing) return 0
  const nums = (timing.match(/\d+/g) || []).map(Number)
  if (nums.length === 0) return 0
  return Math.max(...nums)
}

export function formatMinutes(total: number): string {
  if (total <= 0) return '-'
  if (total < 60) return `${total} min`
  const h = Math.floor(total / 60)
  const m = total % 60
  return m ? `${h} t ${m} min` : `${h} t`
}

export interface ModuleGroup {
  module: ModuleDef
  slides: Slide[]
  minutes: number
}

export function groupByModule(content: BnimspContent): ModuleGroup[] {
  return content.modules.map((module) => {
    const slides = content.slides
      .filter((s) => s.moduleId === module.id)
      .sort((a, b) => a.n - b.n)
    const minutes = slides.reduce((sum, s) => sum + parseMinutes(s.timing), 0)
    return { module, slides, minutes }
  })
}

/** Content minutes only (sum of slide timings). */
export function contentMinutes(content: BnimspContent): number {
  return content.slides.reduce((sum, s) => sum + parseMinutes(s.timing), 0)
}

/** Total program minutes including scheduled breaks. */
export function totalMinutes(content: BnimspContent): number {
  return contentMinutes(content) + breakMinutes(content)
}

export function breakMinutes(content: BnimspContent): number {
  return (content.breaks || []).reduce((sum, b) => sum + b.minutes, 0)
}

/** The break scheduled immediately after a given slide number, if any. */
export function breakAfter(content: BnimspContent, slideN: number): BreakDef | undefined {
  return (content.breaks || []).find((b) => b.afterSlide === slideN)
}
