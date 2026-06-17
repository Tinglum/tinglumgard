// BNIMSP — Train-the-trainer content model.
// The page is the master copy of the trainer manual (Nasjonal MSP 2026).

/** The coaching layers attached to every slide. */
export interface SlideLayers {
  /** Spoken delivery — what the trainer says (from the deck speaker notes). */
  speakerNotes: string
  /** In-depth explanation — the core points that must land (manual: Kjernepoeng). */
  inDepth: string
  /** A concrete example or story to use (manual: Spesifikt eksempel / historie). */
  example: string
  /** Questions to ask the room / assignment / debrief (manual: Oppgave, spørsmål). */
  questions: string
  /** What to do if you have to cut time (manual: Hvis du må kutte tid). */
  cutTime: string
  /** Ninja tip — a delivery move that lifts the slide. Trainer-authored. */
  ninjaTip: string
  /** Remember this — the one thing not to forget. Trainer-authored. */
  remember: string
  /** Watch for that — pitfalls / participant reactions. Trainer-authored. */
  watchFor: string
  /** Common mistakes trainers make on this slide. Trainer-authored. */
  commonMistakes: string
  /** Freeform extra notes. Trainer-authored. */
  notes: string
}

export type LayerKey = keyof SlideLayers

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
}

export interface BnimspContent {
  program: ProgramMeta
  modules: ModuleDef[]
  slides: Slide[]
  appendix: AppendixPage[]
}

/** Private, per-director note for a single slide. */
export interface UserSlideNote {
  slideN: number
  body: string
  updatedAt: string
}

/** Ordered metadata describing each editable layer for the UI. */
export const LAYER_META: {
  key: LayerKey
  label: string
  /** Whether this layer was seeded from the source manual/deck (vs. trainer-authored). */
  sourced: boolean
  hint: string
}[] = [
  { key: 'speakerNotes', label: 'Manus', sourced: true, hint: 'Det du sier — talemanus fra slidenotatene.' },
  { key: 'inDepth', label: 'Dybde', sourced: true, hint: 'Kjernepoengene som må lande.' },
  { key: 'example', label: 'Eksempel', sourced: true, hint: 'Konkret eksempel eller historie å bruke.' },
  { key: 'questions', label: 'Spørsmål & oppgave', sourced: true, hint: 'Spør rommet / oppgave / debrief.' },
  { key: 'cutTime', label: 'Hvis du må kutte tid', sourced: true, hint: 'Slik strammer du inn når tiden er knapp.' },
  { key: 'ninjaTip', label: 'Ninja-tips', sourced: false, hint: 'Et leveringsgrep som løfter sliden.' },
  { key: 'remember', label: 'Husk dette', sourced: false, hint: 'Den ene tingen du ikke må glemme.' },
  { key: 'watchFor', label: 'Vær obs på', sourced: false, hint: 'Fallgruver og reaksjoner i rommet.' },
  { key: 'commonMistakes', label: 'Vanlige feil', sourced: false, hint: 'Typiske feil trenere gjør her.' },
  { key: 'notes', label: 'Notater', sourced: false, hint: 'Frie notater.' },
]
