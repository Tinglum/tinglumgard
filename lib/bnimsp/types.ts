// BNIMSP — Train-the-trainer content model.
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
  /** The spoken script — what the trainer says (Si dette). */
  sayThis: string
  /** Physical / practical actions to take (Gjør dette). */
  doThis: string
  /** Questions to ask the room + exercises (Spør gruppen + manual). */
  askGroup: string
  /** Bridge to the next slide (Overgang). */
  transition: string
  /** In-depth understanding for the trainer — how/why to deliver it
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

/** Ordered list of every layer key — single source of truth for loaders/APIs. */
export const LAYER_KEYS: LayerKey[] = [
  'goal', 'outcome', 'sayThis', 'doThis', 'askGroup', 'transition',
  'understand', 'participant', 'ninjaTip', 'example', 'teamAnchor', 'notes',
]

export interface Slide extends SlideLayers {
  /** 1-based slide number, stable identity. */
  n: number
  moduleId: string
  title: string
  /** Public path to the exported slide image. */
  image: string
  /** Pacing target, e.g. "ca. 5 min". */
  timing: string
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

