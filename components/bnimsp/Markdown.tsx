import { Fragment, type ReactNode } from 'react'
import { Zap, AlertTriangle, Info, Brain, Lightbulb, CheckCircle2, Circle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { slugify } from '@/lib/bnimsp/markdown'

// A small, dependency-free markdown renderer with BNI styling.
// Supports: ## ### headings, paragraphs, bold/italic/code/links, ordered &
// unordered lists, checklists (- [ ] / - [x]), GFM tables, horizontal rules,
// and callouts: > [!NINJA|KEY|WARN|NOTE|TIP] Title  /  > body lines.

const CALLOUTS: Record<string, { icon: LucideIcon; ring: string; bar: string; label: string; bg: string }> = {
  NINJA: { icon: Zap, ring: 'border-[var(--bni-red)]/25', bar: 'bg-[var(--bni-red)]', label: 'text-[var(--bni-red)]', bg: 'bg-[var(--bni-red)]/[0.04]' },
  KEY: { icon: Brain, ring: 'border-violet-300', bar: 'bg-violet-500', label: 'text-violet-700', bg: 'bg-violet-50' },
  WARN: { icon: AlertTriangle, ring: 'border-amber-300', bar: 'bg-amber-500', label: 'text-amber-700', bg: 'bg-amber-50' },
  NOTE: { icon: Info, ring: 'border-sky-300', bar: 'bg-sky-500', label: 'text-sky-700', bg: 'bg-sky-50' },
  TIP: { icon: Lightbulb, ring: 'border-emerald-300', bar: 'bg-emerald-500', label: 'text-emerald-700', bg: 'bg-emerald-50' },
}

// ---- inline ----
function inline(text: string, keyPrefix = 'i'): ReactNode[] {
  const nodes: ReactNode[] = []
  const re = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(`([^`]+)`)|(\[([^\]]+)\]\(([^)]+)\))/g
  let last = 0
  let m: RegExpExecArray | null
  let i = 0
  while ((m = re.exec(text))) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[2] !== undefined) nodes.push(<strong key={`${keyPrefix}-b${i}`} className="font-bold text-[var(--bni-ink)]">{m[2]}</strong>)
    else if (m[4] !== undefined) nodes.push(<em key={`${keyPrefix}-e${i}`}>{m[4]}</em>)
    else if (m[6] !== undefined) nodes.push(<code key={`${keyPrefix}-c${i}`} className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--bni-ink)]">{m[6]}</code>)
    else if (m[8] !== undefined) nodes.push(<a key={`${keyPrefix}-l${i}`} href={m[9]} className="font-medium text-[var(--bni-red)] underline underline-offset-2 hover:opacity-80">{m[8]}</a>)
    last = m.index + m[0].length
    i++
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

type Block =
  | { t: 'h2' | 'h3'; text: string }
  | { t: 'p'; text: string }
  | { t: 'ul'; items: string[] }
  | { t: 'ol'; items: string[] }
  | { t: 'check'; items: { done: boolean; text: string }[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'callout'; kind: string; title: string; body: string[] }
  | { t: 'hr' }

function parse(md: string): Block[] {
  const lines = md.replace(/\r/g, '').split('\n')
  const blocks: Block[] = []
  let i = 0
  const isTableSep = (s: string) => /^\s*\|?[\s:|-]+\|?\s*$/.test(s) && s.includes('-')
  const cells = (s: string) => s.replace(/^\s*\||\|\s*$/g, '').split('|').map((c) => c.trim())

  while (i < lines.length) {
    let line = lines[i]
    const t = line.trim()
    if (!t) { i++; continue }

    // heading
    const h = /^(#{2,3})\s+(.*)$/.exec(t)
    if (h) { blocks.push({ t: h[1].length === 2 ? 'h2' : 'h3', text: h[2] }); i++; continue }

    // hr
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(t)) { blocks.push({ t: 'hr' }); i++; continue }

    // callout
    const c = /^>\s*\[!(NINJA|KEY|WARN|NOTE|TIP)\]\s*(.*)$/.exec(t)
    if (c) {
      const body: string[] = []
      i++
      while (i < lines.length && /^>\s?/.test(lines[i].trim())) { body.push(lines[i].trim().replace(/^>\s?/, '')); i++ }
      blocks.push({ t: 'callout', kind: c[1], title: c[2], body })
      continue
    }

    // table
    if (t.startsWith('|') && i + 1 < lines.length && isTableSep(lines[i + 1])) {
      const head = cells(t)
      i += 2
      const rows: string[][] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) { rows.push(cells(lines[i].trim())); i++ }
      blocks.push({ t: 'table', head, rows })
      continue
    }

    // checklist
    if (/^[-*]\s+\[[ xX]\]/.test(t)) {
      const items: { done: boolean; text: string }[] = []
      while (i < lines.length && /^[-*]\s+\[[ xX]\]/.test(lines[i].trim())) {
        const mm = /^[-*]\s+\[([ xX])\]\s*(.*)$/.exec(lines[i].trim())!
        items.push({ done: mm[1].toLowerCase() === 'x', text: mm[2] })
        i++
      }
      blocks.push({ t: 'check', items })
      continue
    }

    // unordered list
    if (/^[-*]\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^[-*]\s+/, '')); i++ }
      blocks.push({ t: 'ul', items })
      continue
    }

    // ordered list
    if (/^\d+\.\s+/.test(t)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) { items.push(lines[i].trim().replace(/^\d+\.\s+/, '')); i++ }
      blocks.push({ t: 'ol', items })
      continue
    }

    // paragraph (gather consecutive plain lines)
    const para: string[] = [t]
    i++
    while (i < lines.length && lines[i].trim() && !/^(#{2,3}\s|[-*]\s|\d+\.\s|>\s|\||-{3,}$)/.test(lines[i].trim())) {
      para.push(lines[i].trim()); i++
    }
    blocks.push({ t: 'p', text: para.join(' ') })
  }
  return blocks
}

export function Markdown({ content }: { content: string }) {
  const blocks = parse(content || '')
  return (
    <div className="bni-md space-y-5 text-[15px] leading-relaxed text-[var(--bni-ink)]">
      {blocks.map((b, idx) => {
        switch (b.t) {
          case 'h2': {
            const id = slugify(b.text)
            return (
              <h2 id={id} key={idx} className="scroll-mt-24 border-b border-[var(--bni-line)] pb-2 pt-3 text-xl font-extrabold tracking-tight first:pt-0">
                {inline(b.text, `h${idx}`)}
              </h2>
            )
          }
          case 'h3': {
            const id = slugify(b.text)
            return (
              <h3 id={id} key={idx} className="scroll-mt-24 pt-1 text-base font-bold tracking-tight">
                <span className="mr-2 inline-block h-3 w-1 -translate-y-px rounded-full bg-[var(--bni-red)] align-middle" />
                {inline(b.text, `h${idx}`)}
              </h3>
            )
          }
          case 'p':
            return <p key={idx}>{inline(b.text, `p${idx}`)}</p>
          case 'ul':
            return (
              <ul key={idx} className="space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-2.5">
                    <span className="mt-[0.55em] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--bni-red)]" />
                    <span>{inline(it, `ul${idx}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'ol':
            return (
              <ol key={idx} className="space-y-1.5">
                {b.items.map((it, j) => (
                  <li key={j} className="flex gap-3">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bni-ink)] text-[11px] font-bold text-white">{j + 1}</span>
                    <span className="pt-px">{inline(it, `ol${idx}-${j}`)}</span>
                  </li>
                ))}
              </ol>
            )
          case 'check':
            return (
              <ul key={idx} className="space-y-2 rounded-xl border border-[var(--bni-line)] bg-zinc-50/60 p-4">
                {b.items.map((it, j) => (
                  <li key={j} className="flex items-start gap-2.5">
                    {it.done
                      ? <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-600" />
                      : <Circle className="mt-px h-4 w-4 shrink-0 text-zinc-300" />}
                    <span className={it.done ? 'text-[var(--bni-muted)] line-through' : ''}>{inline(it.text, `ck${idx}-${j}`)}</span>
                  </li>
                ))}
              </ul>
            )
          case 'table':
            return (
              <div key={idx} className="overflow-x-auto rounded-xl border border-[var(--bni-line)]">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-[var(--bni-ink)] text-left text-white">
                      {b.head.map((c, j) => <th key={j} className="px-4 py-2.5 font-semibold">{inline(c, `th${idx}-${j}`)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, j) => (
                      <tr key={j} className="border-t border-[var(--bni-line)] odd:bg-white even:bg-zinc-50/60">
                        {r.map((c, k) => <td key={k} className="px-4 py-2.5 align-top">{inline(c, `td${idx}-${j}-${k}`)}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          case 'callout': {
            const cfg = CALLOUTS[b.kind] || CALLOUTS.NOTE
            const Icon = cfg.icon
            return (
              <div key={idx} className={`relative overflow-hidden rounded-xl border ${cfg.ring} ${cfg.bg} pl-4 pr-4 py-3.5`}>
                <span className={`absolute inset-y-0 left-0 w-1 ${cfg.bar}`} />
                <div className={`mb-1 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] ${cfg.label}`}>
                  <Icon className="h-4 w-4" />
                  {b.title || b.kind}
                </div>
                <div className="space-y-1.5 text-[14px] leading-relaxed">
                  {b.body.map((ln, j) => <p key={j}>{inline(ln, `co${idx}-${j}`)}</p>)}
                </div>
              </div>
            )
          }
          case 'hr':
            return <hr key={idx} className="border-[var(--bni-line)]" />
          default:
            return <Fragment key={idx} />
        }
      })}
    </div>
  )
}
