'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, Highlighter, Eraser, RotateCcw, Check } from 'lucide-react'

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** Convert the master script (plain text with blank-line paragraphs) to HTML. */
function masterToHtml(master: string): string {
  return master
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, '<br>')}</p>`)
    .join('')
}

interface Props {
  slideN: number
  master: string
  /** The director's saved override HTML, or null to show the master. */
  initialHtml: string | null
  onChange: (html: string) => void
  onRestore: () => void
}

// Per-director rewritable + highlightable script. Editing and highlighting both
// go through the contenteditable's native undo stack, so Ctrl/Cmd+Z works.
// Saves are debounced upstream in the Studio.
export function PersonalScript({ slideN, master, initialHtml, onChange, onRestore }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const [overridden, setOverridden] = useState(!!initialHtml)
  const [flash, setFlash] = useState(false)
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Set content once on mount (component is keyed by slideN, so it remounts per slide).
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = initialHtml || masterToHtml(master)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function emit() {
    if (!ref.current) return
    setOverridden(true)
    onChange(ref.current.innerHTML)
    setFlash(true)
    if (flashTimer.current) clearTimeout(flashTimer.current)
    flashTimer.current = setTimeout(() => setFlash(false), 1200)
  }

  function withinEditor(node: Node | null): boolean {
    return !!node && !!ref.current && ref.current.contains(node)
  }

  function highlight() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!withinEditor(range.commonAncestorContainer) || !range.toString().trim()) return
    const mark = document.createElement('mark')
    mark.className = 'bni-hl'
    try {
      range.surroundContents(mark)
    } catch {
      // selection spans element boundaries — extract and re-wrap
      mark.appendChild(range.extractContents())
      range.insertNode(mark)
    }
    sel.removeAllRanges()
    emit()
  }

  function removeHighlight() {
    const sel = window.getSelection()
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return
    const range = sel.getRangeAt(0)
    if (!withinEditor(range.commonAncestorContainer)) return
    const text = range.toString()
    if (!text) return
    range.deleteContents()
    range.insertNode(document.createTextNode(text))
    sel.removeAllRanges()
    emit()
  }

  function restore() {
    if (!ref.current) return
    if (!window.confirm('Tilbakestille til original-manuset? Din egen versjon for denne sliden forsvinner.')) return
    ref.current.innerHTML = masterToHtml(master)
    setOverridden(false)
    onRestore()
  }

  return (
    <div className="rounded-xl border border-[var(--bni-line)] bg-white p-4 xl:p-5">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2">
          <Mic className="h-4 w-4 text-[var(--bni-ink)]" />
          <span className="text-sm font-bold tracking-tight">Si dette</span>
          {overridden && (
            <span className="rounded-full bg-[var(--bni-red)]/10 px-2 py-0.5 text-[10px] font-semibold text-[var(--bni-red)]">
              din versjon
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          {flash && (
            <span className="mr-1 inline-flex items-center gap-1 text-[11px] font-medium text-green-700">
              <Check className="h-3 w-3" /> lagret
            </span>
          )}
          <button onMouseDown={(e) => { e.preventDefault(); highlight() }} title="Marker valgt tekst" className="inline-flex items-center gap-1 rounded-md border border-[var(--bni-line)] px-2 py-1 text-xs font-medium text-[var(--bni-muted)] hover:bg-amber-50 hover:text-amber-700">
            <Highlighter className="h-3.5 w-3.5" /> Marker
          </button>
          <button onMouseDown={(e) => { e.preventDefault(); removeHighlight() }} title="Fjern markering på valgt tekst" className="inline-flex items-center gap-1 rounded-md border border-[var(--bni-line)] px-2 py-1 text-xs font-medium text-[var(--bni-muted)] hover:bg-zinc-100">
            <Eraser className="h-3.5 w-3.5" />
          </button>
          {overridden && (
            <button onMouseDown={(e) => { e.preventDefault(); restore() }} title="Tilbakestill til original" className="inline-flex items-center gap-1 rounded-md border border-[var(--bni-line)] px-2 py-1 text-xs font-medium text-[var(--bni-muted)] hover:bg-zinc-100">
              <RotateCcw className="h-3.5 w-3.5" /> Original
            </button>
          )}
        </div>
      </div>

      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        spellCheck={false}
        className="bni-script min-h-[80px] rounded-lg p-2 text-[15px] leading-relaxed text-[var(--bni-ink)] outline-none transition-shadow focus:bg-[var(--bni-red)]/[0.03] focus:ring-2 focus:ring-[var(--bni-red)]/15 xl:text-base"
      />
      <p className="mt-1.5 text-[11px] text-[var(--bni-muted)]">
        Skriv om manuset slik du vil ha det. Marker viktige deler. Ctrl/Cmd+Z angrer. Alt lagres automatisk til din profil.
      </p>
    </div>
  )
}
