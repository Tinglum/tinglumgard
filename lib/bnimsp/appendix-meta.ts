// Static metadata for the appendix "trainer toolkit": categories, summaries and
// icons keyed by slug. Lives in code (not the DB) so the hub can be richly
// designed without a schema change. The page BODY still comes from the DB/seed.

export interface AppendixCategory {
  id: string
  title: string
  blurb: string
}

export interface AppendixMeta {
  slug: string
  category: string
  summary: string
  /** lucide icon name (resolved in the UI). */
  icon: string
  order: number
  /** If set, only these (lowercased) emails may see this page. */
  restrictTo?: string[]
}

export const APPENDIX_CATEGORIES: AppendixCategory[] = [
  { id: 'grunnlag', title: 'Grunnlag', blurb: 'Hvorfor MSP finnes, og hva som alltid skal sitte.' },
  { id: 'planer', title: 'Leveringsplaner', blurb: 'Kjøreplaner for ulike lengder og formater.' },
  { id: 'fasilitering', title: 'Fasilitering', blurb: 'Grepene, spørsmålene og språket som løfter leveransen.' },
  { id: 'rommet', title: 'I rommet', blurb: 'Mennesker, dynamikk og det fysiske/digitale oppsettet.' },
  { id: 'ovelser', title: 'Innhold & øvelser', blurb: 'Oppgaver og case du kan trekke rett inn i treningen.' },
  { id: 'sjekklister', title: 'Sjekklister', blurb: 'Det du sjekker før, under og etter.' },
]

export const APPENDIX_META: Record<string, AppendixMeta> = {
  'agenda-2-dagers-deltakere': { slug: 'agenda-2-dagers-deltakere', category: 'planer', icon: 'CalendarDays', order: 1, summary: 'Agenda for deltakerne — tider og mål for de to dagene.' },
  'agenda-2-dagers':       { slug: 'agenda-2-dagers',       category: 'planer',       icon: 'ClipboardList', order: 2,  summary: 'Fasilitatorens komplette kjøreplan med fasilitering (kun fasilitator).', restrictTo: ['kennethtinglum@bni.com'] },
  'leveringsprinsipp':     { slug: 'leveringsprinsipp',     category: 'grunnlag',     icon: 'Compass',      order: 1,  summary: 'Formålet med MSP og prinsippene som styrer hver eneste leveranse.' },
  'kjernebudskap':         { slug: 'kjernebudskap',         category: 'grunnlag',     icon: 'Megaphone',    order: 2,  summary: 'De fire setningene alt annet henger på.' },
  'resultater-dag-en':     { slug: 'resultater-dag-en',     category: 'grunnlag',     icon: 'Rocket',       order: 3,  summary: 'Hovedmålet: praktisk verdi fra dag én — uten å love garantert salg.' },
  'teammanual-link':       { slug: 'teammanual-link',       category: 'grunnlag',     icon: 'BookMarked',   order: 4,  summary: 'Hvordan MSP henger sammen med Teammanualen og Kompasset.' },
  'leveringsplan-3-timer': { slug: 'leveringsplan-3-timer', category: 'planer',       icon: 'Clock',        order: 3,  summary: 'Minutt-for-minutt kjøreplan for den fulle 3-timers leveransen.' },
  'tidsvarianter':         { slug: 'tidsvarianter',         category: 'planer',       icon: 'Timer',        order: 4,  summary: '90- og 120-minutters varianter når du ikke har tre timer.' },
  'standardgrep':          { slug: 'standardgrep',          category: 'fasilitering', icon: 'Wand2',        order: 1,  summary: 'Konsulentens standardgrep for diffuse, teoretiske eller trege rom.' },
  'coachingsporsmal':      { slug: 'coachingsporsmal',      category: 'fasilitering', icon: 'MessagesSquare', order: 2, summary: 'Spørsmålsbanken som gjør alt mer konkret og handlingsrettet.' },
  'spraakbank':            { slug: 'spraakbank',            category: 'fasilitering', icon: 'Quote',        order: 3,  summary: 'Teammanual-godkjente standardsetninger — det du faktisk sier.' },
  'vanskelige-deltakere':  { slug: 'vanskelige-deltakere',  category: 'rommet',       icon: 'Users',        order: 1,  summary: 'De vanskelige deltakertypene og trenergrepet for hver av dem.' },
  'rom-zoom-hybrid':       { slug: 'rom-zoom-hybrid',       category: 'rommet',       icon: 'MonitorPlay',  order: 2,  summary: 'Fysisk rom, Zoom og hybrid — oppsett som faktisk fungerer.' },
  'gruppeoppgaver':        { slug: 'gruppeoppgaver',        category: 'ovelser',      icon: 'Dumbbell',     order: 1,  summary: 'Oppgavebank med gruppeoppgaver og fun tasks, klare til bruk.' },
  'bransjecase':           { slug: 'bransjecase',           category: 'ovelser',      icon: 'Briefcase',    order: 2,  summary: 'Bransjespesifikke case du kan ta rett inn i rommet.' },
  'sjekklister':           { slug: 'sjekklister',           category: 'sjekklister',  icon: 'ListChecks',   order: 1,  summary: 'Trenerens sjekklister før, under og etter treningen.' },
}

export function metaFor(slug: string): AppendixMeta | undefined {
  return APPENDIX_META[slug]
}

/** Whether a page is visible to a given user email (per-page restriction). */
export function appendixVisibleTo(meta: AppendixMeta | undefined, email: string | null | undefined): boolean {
  if (!meta) return true
  if (!meta.restrictTo || meta.restrictTo.length === 0) return true
  const e = String(email || '').trim().toLowerCase()
  return meta.restrictTo.some((r) => r.toLowerCase() === e)
}
