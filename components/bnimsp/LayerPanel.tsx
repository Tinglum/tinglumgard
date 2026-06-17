'use client'

import {
  Mic, ListChecks, MessageSquareQuote, CornerDownRight, BookOpen, Zap, Lightbulb,
  Users, Anchor, NotebookPen, Lock,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { LayerKey, Slide } from '@/lib/bnimsp/types'
import { EditableText } from './EditableText'

export interface BlockCfg {
  key: LayerKey
  label: string
  icon: LucideIcon
  accent: string
  tone?: 'plain' | 'tip' | 'muted'
  /** Render the body larger (used for the primary script). */
  big?: boolean
}

// The live delivery flow — sits under the slide, in reading order.
export const DELIVERY_BLOCKS: BlockCfg[] = [
  { key: 'sayThis', label: 'Si dette', icon: Mic, accent: 'text-[var(--bni-ink)]', big: true },
  { key: 'doThis', label: 'Gjør dette', icon: ListChecks, accent: 'text-emerald-600' },
  { key: 'askGroup', label: 'Spør gruppen', icon: MessageSquareQuote, accent: 'text-sky-600' },
  { key: 'transition', label: 'Overgang', icon: CornerDownRight, accent: 'text-[var(--bni-muted)]' },
]

// Understanding + tools — the reference column.
export const REFERENCE_BLOCKS: BlockCfg[] = [
  { key: 'understand', label: 'Forstå & forklar', icon: BookOpen, accent: 'text-violet-600' },
  { key: 'ninjaTip', label: 'Ninja-tips', icon: Zap, accent: 'text-[var(--bni-red)]', tone: 'tip' },
  { key: 'example', label: 'Eksempel', icon: Lightbulb, accent: 'text-amber-500' },
  { key: 'participant', label: 'For deltakerne (fallgruver)', icon: Users, accent: 'text-sky-600' },
  { key: 'teamAnchor', label: 'Teammanual-anker', icon: Anchor, accent: 'text-[var(--bni-muted)]', tone: 'muted' },
  { key: 'notes', label: 'Dine notater', icon: NotebookPen, accent: 'text-[var(--bni-muted)]' },
]

function LayerCard({
  slide, cfg, editable, onEditLayer,
}: {
  slide: Slide
  cfg: BlockCfg
  editable: boolean
  onEditLayer: (key: LayerKey, value: string) => Promise<void> | void
}) {
  const value = slide[cfg.key]
  if (!value && !editable && cfg.tone === 'muted') return null // hide empty muted refs for viewers

  const tone =
    cfg.tone === 'tip'
      ? 'border-[var(--bni-red)]/30 bg-[var(--bni-red)]/[0.04]'
      : cfg.tone === 'muted'
        ? 'border-[var(--bni-line)] bg-zinc-50/60'
        : 'border-[var(--bni-line)] bg-white'

  return (
    <div className={`rounded-xl border ${tone} p-4 xl:p-5`}>
      <div className="mb-2 flex items-center gap-2">
        <cfg.icon className={`h-4 w-4 shrink-0 ${cfg.accent}`} />
        <span className="text-sm font-bold tracking-tight">{cfg.label}</span>
      </div>
      <EditableText
        value={value}
        editable={editable}
        onSave={(next) => onEditLayer(cfg.key, next)}
        placeholder={editable ? 'Klikk for å fylle ut.' : '—'}
        className={cfg.big ? 'text-[15px] leading-relaxed xl:text-base' : ''}
      />
    </div>
  )
}

export function LayerStack({
  slide, blocks, editable, onEditLayer,
}: {
  slide: Slide
  blocks: BlockCfg[]
  editable: boolean
  onEditLayer: (key: LayerKey, value: string) => Promise<void> | void
}) {
  return (
    <div className="space-y-3 xl:space-y-4">
      {blocks.map((cfg) => (
        <LayerCard key={cfg.key} slide={slide} cfg={cfg} editable={editable} onEditLayer={onEditLayer} />
      ))}
    </div>
  )
}

// Private, per-director notes — never part of the master content.
export function PrivateNotesCard({
  value, onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--bni-line)] bg-zinc-50 p-4 xl:p-5">
      <div className="mb-2 flex items-center gap-2">
        <Lock className="h-4 w-4 shrink-0 text-[var(--bni-muted)]" />
        <span className="text-sm font-bold tracking-tight">Mine private notater</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Kun synlig for deg. Din egen vri, formuleringer eller huskelapper for denne sliden."
        className="min-h-[92px] w-full resize-y rounded-lg border border-[var(--bni-line)] bg-white p-3 text-sm leading-relaxed outline-none focus:border-[var(--bni-red)] focus:ring-2 focus:ring-[var(--bni-red)]/15"
      />
    </div>
  )
}
