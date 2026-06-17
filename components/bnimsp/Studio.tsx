'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import { Presentation, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen, CheckCircle2 } from 'lucide-react'
import type { BnimspContent, LayerKey, Slide } from '@/lib/bnimsp/types'
import { groupByModule } from '@/lib/bnimsp/util'
import { ModuleRail } from './ModuleRail'
import { SlideStage } from './SlideStage'
import { LayerPanel } from './LayerPanel'
import { PracticeTimer } from './PracticeTimer'

interface Props {
  initialContent: BnimspContent
  canEdit: boolean
  isDirector: boolean
  initialN: number
}

export function Studio({ initialContent, canEdit, isDirector, initialN }: Props) {
  const [slides, setSlides] = useState<Slide[]>(initialContent.slides)
  const [currentN, setCurrentN] = useState(clamp(initialN, 1, initialContent.slides.length))
  const [presenter, setPresenter] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const [noteCache, setNoteCache] = useState<Record<number, string>>({})
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const total = slides.length
  const content = useMemo(() => ({ ...initialContent, slides }), [initialContent, slides])
  const groups = useMemo(() => groupByModule(content), [content])
  const slide = slides.find((s) => s.n === currentN) || slides[0]
  const nextSlide = slides.find((s) => s.n === currentN + 1) || null

  // Keep the URL shareable/deep-linkable without a full navigation.
  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('s', String(currentN))
    window.history.replaceState(null, '', url.toString())
  }, [currentN])

  const go = useCallback((n: number) => setCurrentN((c) => clamp(n, 1, total) || c), [total])

  // Keyboard navigation + presenter toggle.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(currentN + 1)
      else if (e.key === 'ArrowLeft') go(currentN - 1)
      else if (e.key.toLowerCase() === 'p') setPresenter((v) => !v)
      else if (e.key === 'Escape') setPresenter(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentN, go])

  // Load private note for the current slide (director → DB, others → localStorage).
  useEffect(() => {
    if (currentN in noteCache) return
    let cancelled = false
    async function load() {
      let body = ''
      if (isDirector) {
        try {
          const res = await fetch(`/api/bnimsp/notes/${currentN}`)
          const data = await res.json().catch(() => ({}))
          body = data.body || ''
        } catch { body = '' }
      } else {
        body = localStorage.getItem(`bnimsp:note:${currentN}`) || ''
      }
      if (!cancelled) setNoteCache((c) => ({ ...c, [currentN]: body }))
    }
    load()
    return () => { cancelled = true }
  }, [currentN, isDirector, noteCache])

  const onPrivateNote = useCallback((value: string) => {
    setNoteCache((c) => ({ ...c, [currentN]: value }))
    if (noteTimer.current) clearTimeout(noteTimer.current)
    const n = currentN
    noteTimer.current = setTimeout(() => {
      if (isDirector) {
        fetch(`/api/bnimsp/notes/${n}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: value }),
        }).catch(() => {})
      } else {
        try { localStorage.setItem(`bnimsp:note:${n}`, value) } catch {}
      }
    }, 600)
  }, [currentN, isDirector])

  // Edit a master layer (admin) — optimistic, persists to the slide draft.
  const onEditLayer = useCallback(async (key: LayerKey | 'title' | 'timing', value: string) => {
    setSlides((prev) => prev.map((s) => (s.n === currentN ? { ...s, [key]: value } : s)))
    try {
      const res = await fetch(`/api/bnimsp/slides/${currentN}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      }
    } catch { /* optimistic value stays; will reconcile on reload */ }
  }, [currentN])

  if (presenter) {
    return (
      <PresenterView
        slide={slide}
        nextSlide={nextSlide}
        total={total}
        onPrev={() => go(currentN - 1)}
        onNext={() => go(currentN + 1)}
        onExit={() => setPresenter(false)}
      />
    )
  }

  return (
    <div className="mx-auto grid max-w-[1400px] gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      {/* Rail */}
      <aside className={`${railOpen ? 'block' : 'hidden'} lg:block`}>
        <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[var(--bni-line)] bg-white p-3">
          <ModuleRail groups={groups} currentN={currentN} onSelect={go} />
        </div>
      </aside>

      {/* Main */}
      <div>
        <div className="mb-4 flex items-center gap-2">
          <button
            onClick={() => setRailOpen((v) => !v)}
            className="rounded-lg border border-[var(--bni-line)] bg-white p-2 text-[var(--bni-muted)] hover:bg-zinc-100 lg:hidden"
            aria-label="Vis/skjul moduler"
          >
            {railOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>
          <button
            onClick={() => setPresenter(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--bni-ink)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            <Presentation className="h-4 w-4" /> Presentatørmodus
          </button>
          <span className="hidden text-xs text-[var(--bni-muted)] sm:inline">
            Piltaster for å bla · «P» for presentatør
          </span>
          {canEdit && savedFlash && (
            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3.5 w-3.5" /> Lagret som utkast
            </span>
          )}
        </div>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
          <div className="xl:sticky xl:top-20 xl:self-start">
            <SlideStage slide={slide} total={total} onPrev={() => go(currentN - 1)} onNext={() => go(currentN + 1)} />
          </div>
          <div>
            <LayerPanel
              slide={slide}
              editable={canEdit}
              onEditLayer={onEditLayer}
              privateNote={noteCache[currentN] ?? ''}
              onPrivateNote={onPrivateNote}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

function PresenterView({
  slide, nextSlide, total, onPrev, onNext, onExit,
}: {
  slide: Slide; nextSlide: Slide | null; total: number
  onPrev: () => void; onNext: () => void; onExit: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      {/* Top bar: timer + controls */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <PracticeTimer timing={slide.timing} slideN={slide.n} />
        <div className="flex items-center gap-2">
          <button onClick={onPrev} disabled={slide.n <= 1} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40" aria-label="Forrige">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="min-w-[64px] text-center text-sm tabular-nums text-zinc-400">{slide.n} / {total}</span>
          <button onClick={onNext} disabled={slide.n >= total} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40" aria-label="Neste">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={onExit} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--bni-red)] px-3 py-2 text-sm font-semibold hover:bg-[var(--bni-red-dark)]">
            <X className="h-4 w-4" /> Avslutt
          </button>
        </div>
      </div>

      {/* Body: slide + current notes / key points / next */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden p-5 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <Image src={slide.image} alt="" width={1600} height={900} className="h-auto w-full" priority />
          </div>
          <h2 className="text-2xl font-extrabold leading-tight">{slide.title || `Slide ${slide.n}`}</h2>
          {nextSlide && (
            <div className="mt-auto flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-md">
                <Image src={nextSlide.image} alt="" fill className="object-cover" sizes="80px" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wide text-zinc-400">Neste</div>
                <div className="truncate text-sm font-medium">{nextSlide.title || `Slide ${nextSlide.n}`}</div>
              </div>
            </div>
          )}
        </div>

        <div className="min-h-0 overflow-y-auto pr-1">
          <PresenterBlock label="Manus" body={slide.speakerNotes} big />
          {slide.inDepth && <PresenterBlock label="Kjernepoeng" body={slide.inDepth} />}
          {slide.ninjaTip && <PresenterBlock label="Ninja-tips" body={slide.ninjaTip} accent />}
          {slide.remember && <PresenterBlock label="Husk dette" body={slide.remember} accent />}
          {slide.watchFor && <PresenterBlock label="Vær obs på" body={slide.watchFor} accent />}
          {slide.questions && <PresenterBlock label="Spør rommet" body={slide.questions} />}
        </div>
      </div>
    </div>
  )
}

function PresenterBlock({ label, body, big, accent }: { label: string; body: string; big?: boolean; accent?: boolean }) {
  return (
    <div className={`mb-4 rounded-xl border p-4 ${accent ? 'border-[var(--bni-red)]/40 bg-[var(--bni-red)]/10' : 'border-white/10 bg-white/5'}`}>
      <div className={`mb-1.5 text-xs font-bold uppercase tracking-[0.14em] ${accent ? 'text-[var(--bni-red)]' : 'text-zinc-400'}`}>
        {label}
      </div>
      <div className={`bni-prose ${big ? 'text-lg leading-relaxed' : 'text-sm leading-relaxed text-zinc-200'}`}>{body}</div>
    </div>
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
