// BNIMSP - Train-the-trainer content model.
// The page is the master copy of the trainer manual (Nasjonal MSP 2026).

/**
 * The coaching layers attached to every slide. Sourced by splitting the deck's
 * structured speaker notes (Mål, Si dette, Gjør dette, Spør gruppen, Overgang,
 * NINJA-TIPS, Tenk på som trener, TRENERINSTRUKSJON, …) plus the trainer manual.
 */
export interface SlideLayers {
  /** Goal of the slide (Mål med denne sliden). */
  goal: string
  /** What success looks like (#VI ØNSKER Å OPPNÅ#). */
  outcome: string
  /** The spoken script - what the trainer says (Si dette). */
  sayThis: string
  /** Physical / practical actions to take (Gjør dette). */
  doThis: string
  /** Questions to ask the room + exercises (Spør gruppen + manual). */
  askGroup: string
  /** Bridge to the next slide (Overgang). */
  transition: string
  /** In-depth understanding for the trainer - how/why to deliver it
   *  (Tenk på som trener + TRENERINSTRUKSJON / For erfaren konsulent). */
  understand: string
  /** What's going on for the participants (Tenk på for deltakerne). */
  participant: string
  /** A delivery move that lifts the slide (NINJA-TIPS). */
  ninjaTip: string
  /** A concrete example story to use (EKSTRA EKSEMPEL). */
  example: string
  /** Team-manual grounding for this slide (TEAMMANUAL-ANKER). */
  teamAnchor: string
  /** Freeform extra notes. Trainer-authored. */
  notes: string
}

export type LayerKey = keyof SlideLayers

/** Ordered list of every layer key - single source of truth for loaders/APIs. */
export const LAYER_KEYS: LayerKey[] = [
  'goal', 'outcome', 'sayThis', 'doThis', 'askGroup', 'transition',
  'understand', 'participant', 'ninjaTip', 'example', 'teamAnchor', 'notes',
]

/** All editable slide fields: layers + metadata. Single source of truth for API validation. */
export const EDITABLE_SLIDE_FIELDS = ['title', 'timing', ...LAYER_KEYS] as const
export type EditableSlideField = typeof EDITABLE_SLIDE_FIELDS[number]

/** Max field lengths to prevent runaway blobs. */
export const FIELD_LIMITS: Record<string, number> = {
  title: 200,
  timing: 100,
  goal: 5000,
  outcome: 5000,
  sayThis: 10000,
  doThis: 5000,
  askGroup: 5000,
  transition: 3000,
  understand: 8000,
  participant: 5000,
  ninjaTip: 3000,
  example: 5000,
  teamAnchor: 3000,
  notes: 10000,
}

/**
 * Training-format variants. The "full" 3-hour program is the master content;
 * shorter formats (120 / 90 min) are authored deltas on top of it: which slides
 * to keep, and a trimmed script / task / pacing per slide. Empty string means
 * "inherit the full version" so trainers start from the real script and cut it
 * down rather than rewriting from scratch.
 */
export type TrainingFormat = 'full' | '120min' | '90min'

/** The condensed formats (everything except the full master). */
export const SHORT_FORMATS = ['120min', '90min'] as const
export type ShortFormat = typeof SHORT_FORMATS[number]

export interface SlideFormatOverride {
  /** Keep this slide in the format. Defaults to true when unset. */
  include?: boolean
  /** Format-specific pacing, e.g. "ca. 2 min". Empty inherits the full timing. */
  timing?: string
  /** Trimmed script for this format. Empty inherits the full "Si dette". */
  sayThis?: string
  /** Trimmed task/question for this format. Empty inherits the full "Spør gruppen". */
  askGroup?: string
}

export type SlideFormats = Partial<Record<ShortFormat, SlideFormatOverride>>

/** Fields a format override may carry (used for API validation). */
export const FORMAT_OVERRIDE_FIELDS = ['sayThis', 'askGroup', 'timing'] as const

export interface Slide extends SlideLayers {
  /** 1-based slide number, stable identity. */
  n: number
  moduleId: string
  title: string
  /** Public path to the exported slide image. */
  image: string
  /** Pacing target, e.g. "ca. 5 min". */
  timing: string
  /** Per-format authored deltas (120 / 90 min). */
  formats?: SlideFormats
  /** Last update timestamp, used for optimistic concurrency. */
  updated_at?: string
}

export interface ModuleDef {
  id: string
  title: string
  /** Inclusive [from, to] slide numbers. */
  range: [number, number]
}

export interface AppendixPage {
  slug: string
  title: string
  body: string
}

export interface ProgramMeta {
  title: string
  subtitle: string
  totalSlides: number
  /** Human label for the total run time, e.g. "3 timer (inkl. pauser)". */
  durationLabel?: string
}

/** A scheduled break, placed after a given slide. */
export interface BreakDef {
  afterSlide: number
  minutes: number
  label: string
}

export interface BnimspContent {
  program: ProgramMeta
  modules: ModuleDef[]
  slides: Slide[]
  appendix: AppendixPage[]
  breaks?: BreakDef[]
}

/** Private, per-director note for a single slide. */
export interface UserSlideNote {
  slideN: number
  body: string
  updatedAt: string
}
