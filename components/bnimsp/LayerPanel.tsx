'use client'

import { Mic, Lightbulb, MessageSquareQuote, Zap, AlertTriangle, Scissors, BookText, Brain, NotebookPen, Lock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LayerKey, Slide } from '@/lib/bnimsp/types'
import { EditableText } from './EditableText'

interface Props {
  slide: Slide
  editable: boolean
  onEditLayer: (key: LayerKey | 'title' | 'timing', value: string) => Promise<void> | void
  privateNote: string
  onPrivateNote: (value: string) => void
}

interface LayerCfg {
  key: LayerKey
  label: string
  icon: LucideIcon
  accent: string
  sourced: boolean
}

const SECTIONS: { title: string; layers: LayerCfg[] }[] = [
  {
    title: 'Levering',
    layers: [{ key: 'speakerNotes', label: 'Manus', icon: Mic, accent: 'text-[var(--bni-ink)]', sourced: true }],
  },
  {
    title: 'Forstå & forklar',
    layers: [
      { key: 'inDepth', label: 'Dybde — kjernepoeng', icon: BookText, accent: 'text-sky-600', sourced: true },
      { key: 'example', label: 'Eksempel / historie', icon: Lightbulb, accent: 'text-amber-500', sourced: true },
    ],
  },
  {
    title: 'Engasjer rommet',
    layers: [{ key: 'questions', label: 'Spørsmål & oppgave', icon: MessageSquareQuote, accent: 'text-emerald-600', sourced: true }],
  },
  {
    title: 'Trenergrep',
    layers: [
      { key: 'ninjaTip', label: 'Ninja-tips', icon: Zap, accent: 'text-[var(--bni-red)]', sourced: false },
      { key: 'remember', label: 'Husk dette', icon: Brain, accent: 'text-violet-600', sourced: false },
      { key: 'watchFor', label: 'Vær obs på', icon: AlertTriangle, accent: 'text-orange-600', sourced: false },
      { key: 'commonMistakes', label: 'Vanlige feil', icon: AlertTriangle, accent: 'text-rose-600', sourced: false },
    ],
  },
  {
    title: 'Tid',
    layers: [{ key: 'cutTime', label: 'Hvis du må kutte tid', icon: Scissors, accent: 'text-[var(--bni-muted)]', sourced: true }],
  },
  {
    title: 'Notater (delt)',
    layers: [{ key: 'notes', label: 'Frie notater', icon: NotebookPen, accent: 'text-[var(--bni-muted)]', sourced: false }],
  },
]

export function LayerPanel({ slide, editable, onEditLayer, privateNote, onPrivateNote }: Props) {
  return (
    <div className="space-y-5">
      {SECTIONS.map((section) => (
        <section key={section.title}>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--bni-muted)]">
            {section.title}
          </h3>
          <div className="space-y-3">
            {section.layers.map((cfg) => {
              const value = slide[cfg.key]
              const empty = !value
              return (
                <div
                  key={cfg.key}
                  className="rounded-xl border border-[var(--bni-line)] bg-white p-4"
                >
                  <div className="mb-1.5 flex items-center gap-2">
                    <cfg.icon className={`h-4 w-4 ${cfg.accent}`} />
                    <span className="text-sm font-semibold">{cfg.label}</span>
                    {!cfg.sourced && empty && (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-[var(--bni-muted)]">
                        {editable ? 'klikk for å fylle ut' : 'ikke fylt ut'}
                      </span>
                    )}
                  </div>
                  <EditableText
                    value={value}
                    editable={editable}
                    onSave={(next) => onEditLayer(cfg.key, next)}
                    placeholder={cfg.sourced ? '—' : 'Ikke fylt ut ennå.'}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}

      {/* Private, per-director notes — never part of the master content. */}
      <section>
        <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--bni-muted)]">
          <Lock className="h-3.5 w-3.5" /> Mine private notater
        </h3>
        <textarea
          value={privateNote}
          onChange={(e) => onPrivateNote(e.target.value)}
          placeholder="Kun synlig for deg. Skriv din egen vri, formuleringer eller huskelapper for denne sliden."
          className="min-h-[96px] w-full resize-y rounded-xl border border-dashed border-[var(--bni-line)] bg-zinc-50 p-3 text-sm leading-relaxed outline-none focus:border-[var(--bni-red)] focus:bg-white focus:ring-2 focus:ring-[var(--bni-red)]/15"
        />
      </section>
    </div>
  )
}
