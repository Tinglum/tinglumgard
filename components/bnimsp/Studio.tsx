'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import {
  Presentation, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  CheckCircle2, Target, Flag,
} from 'lucide-react'
import type { BnimspContent, LayerKey, Slide } from '@/lib/bnimsp/types'
import { groupByModule } from '@/lib/bnimsp/util'
import { ModuleRail } from './ModuleRail'
import { SlideStage } from './SlideStage'
import { LayerStack, PrivateNotesCard, DELIVERY_BLOCKS, REFERENCE_BLOCKS } from './LayerPanel'
import { EditableText } from './EditableText'
import { PracticeTimer } from './PracticeTimer'

interface Props {
  initialContent: BnimspContent
  canEdit: boolean
  isDirector: boolean
  initialN: number
  initialAudience?: boolean
}

type PresenterMessage =
  | { type: 'slide'; n: number }
  | { type: 'exit' }

interface ScreenLike {
  availLeft?: number
  availTop?: number
  availWidth?: number
  availHeight?: number
  left?: number
  top?: number
  width?: number
  height?: number
}

interface ScreenDetailsLike {
  currentScreen: ScreenLike
  screens: ScreenLike[]
}

declare global {
  interface Window {
    getScreenDetails?: () => Promise<ScreenDetailsLike>
  }

  interface Screen {
    isExtended?: boolean
  }
}

const PRESENTER_CHANNEL = 'bnimsp-presenter'
const PRESENTER_STORAGE_KEY = 'bnimsp:presenter:event'

export function Studio({ initialContent, canEdit, isDirector, initialN, initialAudience = false }: Props) {
  const [slides, setSlides] = useState<Slide[]>(initialContent.slides)
  const [currentN, setCurrentN] = useState(clamp(initialN, 1, initialContent.slides.length))
  const [presenter, setPresenter] = useState(false)
  const [railOpen, setRailOpen] = useState(true)
  const [savedFlash, setSavedFlash] = useState(false)
  const [noteCache, setNoteCache] = useState<Record<number, string>>({})
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audienceWindowRef = useRef<Window | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  const total = slides.length
  const content = useMemo(() => ({ ...initialContent, slides }), [initialContent, slides])
  const groups = useMemo(() => groupByModule(content), [content])
  const slide = slides.find((s) => s.n === currentN) || slides[0]
  const nextSlide = slides.find((s) => s.n === currentN + 1) || null

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('s', String(currentN))
    window.history.replaceState(null, '', url.toString())
  }, [currentN])

  const go = useCallback((n: number) => setCurrentN((c) => clamp(n, 1, total) || c), [total])

  useEffect(() => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(PRESENTER_CHANNEL) : null
    channelRef.current = channel

    function onPresenterMessage(message: PresenterMessage) {
      if (!initialAudience) return
      if (message.type === 'slide') go(message.n)
      if (message.type === 'exit') window.close()
    }

    function onChannelMessage(event: MessageEvent<PresenterMessage>) {
      if (event.data) onPresenterMessage(event.data)
    }

    function onStorage(event: StorageEvent) {
      if (event.key !== PRESENTER_STORAGE_KEY || !event.newValue) return
      try {
        const payload = JSON.parse(event.newValue) as { message?: PresenterMessage }
        if (payload.message) onPresenterMessage(payload.message)
      } catch {}
    }

    channel?.addEventListener('message', onChannelMessage)
    window.addEventListener('storage', onStorage)

    return () => {
      channel?.removeEventListener('message', onChannelMessage)
      channel?.close()
      if (channelRef.current === channel) channelRef.current = null
      window.removeEventListener('storage', onStorage)
    }
  }, [go, initialAudience])

  const broadcast = useCallback((message: PresenterMessage) => {
    channelRef.current?.postMessage(message)
    try {
      localStorage.setItem(PRESENTER_STORAGE_KEY, JSON.stringify({ message, at: Date.now() }))
    } catch {}
  }, [])

  useEffect(() => {
    if (!presenter || initialAudience) return
    broadcast({ type: 'slide', n: currentN })
  }, [broadcast, currentN, initialAudience, presenter])

  useEffect(() => {
    if (!initialAudience) return
    document.documentElement.requestFullscreen?.().catch(() => {})
  }, [initialAudience])

  useEffect(() => {
    return () => {
      if (audienceWindowRef.current && !audienceWindowRef.current.closed) audienceWindowRef.current.close()
    }
  }, [])

  const exitPresenterMode = useCallback(() => {
    setPresenter(false)
    broadcast({ type: 'exit' })
    if (audienceWindowRef.current && !audienceWindowRef.current.closed) audienceWindowRef.current.close()
    audienceWindowRef.current = null
  }, [broadcast])

  const enterPresenterMode = useCallback(async () => {
    setPresenter(true)
    broadcast({ type: 'slide', n: currentN })

    const audienceUrl = new URL(window.location.href)
    audienceUrl.searchParams.set('audience', '1')
    audienceUrl.searchParams.set('s', String(currentN))

    const targetScreen = await getAudienceScreen(window).catch(() => null)
    const extendedDisplay = window.screen.isExtended ?? Boolean(targetScreen)
    if (!extendedDisplay && !targetScreen) return

    const features = popupFeatures(targetScreen)
    const existing = audienceWindowRef.current
    const audienceWindow = existing && !existing.closed
      ? existing
      : window.open(audienceUrl.toString(), 'bnimsp-audience', features)

    if (!audienceWindow) return

    audienceWindowRef.current = audienceWindow
    try {
      audienceWindow.location.replace(audienceUrl.toString())
    } catch {}

    if (targetScreen) moveWindowToScreen(audienceWindow, targetScreen)
  }, [broadcast, currentN])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowRight') go(currentN + 1)
      else if (e.key === 'ArrowLeft') go(currentN - 1)
      else if (e.key.toLowerCase() === 'p') {
        if (presenter) exitPresenterMode()
        else void enterPresenterMode()
      } else if (e.key === 'Escape' && presenter) {
        exitPresenterMode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [currentN, enterPresenterMode, exitPresenterMode, go, presenter])

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
          method: 'PUT', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: value }),
        }).catch(() => {})
      } else {
        try { localStorage.setItem(`bnimsp:note:${n}`, value) } catch {}
      }
    }, 600)
  }, [currentN, isDirector])

  const onEditLayer = useCallback(async (key: LayerKey | 'title' | 'timing', value: string) => {
    setSlides((prev) => prev.map((s) => (s.n === currentN ? { ...s, [key]: value } : s)))
    try {
      const res = await fetch(`/api/bnimsp/slides/${currentN}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) { setSavedFlash(true); setTimeout(() => setSavedFlash(false), 1500) }
    } catch { /* optimistic value stays */ }
  }, [currentN])

  if (initialAudience) {
    return <AudienceView slide={slide} />
  }

  if (presenter) {
    return (
      <PresenterView
        slide={slide} nextSlide={nextSlide} total={total}
        onPrev={() => go(currentN - 1)} onNext={() => go(currentN + 1)} onExit={exitPresenterMode}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[2000px] px-3 py-5 sm:px-5 xl:px-8 2xl:text-[15px]">
      <div className="grid gap-5 xl:gap-7 lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Rail */}
        <aside className={`${railOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[var(--bni-line)] bg-white p-3">
            <ModuleRail groups={groups} currentN={currentN} onSelect={go} />
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => setRailOpen((v) => !v)}
              className="rounded-lg border border-[var(--bni-line)] bg-white p-2 text-[var(--bni-muted)] hover:bg-zinc-100 lg:hidden"
              aria-label="Vis/skjul moduler"
            >
              {railOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <button
              onClick={() => void enterPresenterMode()}
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

          {/* Content: slide + delivery (center) | understanding + tools (right) */}
          <div className="grid gap-5 xl:gap-7 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
            <div className="min-w-0 space-y-4 xl:space-y-5">
              <SlideStage slide={slide} total={total} onPrev={() => go(currentN - 1)} onNext={() => go(currentN + 1)} />
              <GoalBanner slide={slide} editable={canEdit} onEditLayer={onEditLayer} />
              <LayerStack slide={slide} blocks={DELIVERY_BLOCKS} editable={canEdit} onEditLayer={onEditLayer} />
            </div>

            <div className="min-w-0 space-y-3 xl:space-y-4">
              <LayerStack slide={slide} blocks={REFERENCE_BLOCKS} editable={canEdit} onEditLayer={onEditLayer} />
              <PrivateNotesCard value={noteCache[currentN] ?? ''} onChange={onPrivateNote} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function GoalBanner({
  slide, editable, onEditLayer,
}: {
  slide: Slide
  editable: boolean
  onEditLayer: (key: LayerKey, value: string) => Promise<void> | void
}) {
  if (!slide.goal && !slide.outcome && !editable) return null
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[var(--bni-line)] bg-white p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Target className="h-4 w-4 text-[var(--bni-red)]" />
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">Mål med sliden</span>
        </div>
        <EditableText value={slide.goal} editable={editable} onSave={(v) => onEditLayer('goal', v)} placeholder="—" />
      </div>
      <div className="rounded-xl border border-[var(--bni-line)] bg-white p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Flag className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">Vi ønsker å oppnå</span>
        </div>
        <EditableText value={slide.outcome} editable={editable} onSave={(v) => onEditLayer('outcome', v)} placeholder="—" />
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

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-hidden p-5 lg:grid-cols-[1.05fr_1fr] xl:p-7">
        <div className="flex min-h-0 flex-col gap-4">
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
            <Image src={slide.image} alt="" width={1600} height={900} className="h-auto w-full" priority />
          </div>
          {(slide.ninjaTip || slide.transition) && (
            <div className="grid gap-3 md:grid-cols-2">
              {slide.ninjaTip && <PresenterBlob label="Ninja-tips" body={slide.ninjaTip} />}
              {slide.transition && <PresenterBlob label="Overgang" body={slide.transition} />}
            </div>
          )}
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
          <PresenterBlock label="Si dette" body={slide.sayThis} big />
          {slide.doThis && <PresenterBlock label="Gjør dette" body={slide.doThis} />}
          {slide.askGroup && <PresenterBlock label="Spør gruppen" body={slide.askGroup} />}
          {slide.understand && <PresenterBlock label="Forstå & forklar" body={slide.understand} />}
        </div>
      </div>
    </div>
  )
}

function AudienceView({ slide }: { slide: Slide }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-3">
      <div className="flex h-full w-full items-center justify-center">
        <Image
          key={slide.n}
          src={slide.image}
          alt={slide.title || `Slide ${slide.n}`}
          width={1600}
          height={900}
          className="h-auto max-h-full w-full object-contain"
          priority
        />
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
      <div className={`bni-prose ${big ? 'text-lg leading-relaxed xl:text-xl' : 'text-sm leading-relaxed text-zinc-200 xl:text-base'}`}>{body}</div>
    </div>
  )
}

function PresenterBlob({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--bni-red)]/40 bg-[var(--bni-red)]/10 p-4">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-[0.14em] text-[var(--bni-red)]">
        {label}
      </div>
      <div className="bni-prose text-sm leading-relaxed text-zinc-100 xl:text-base">{body}</div>
    </div>
  )
}

function popupFeatures(target: ScreenLike | null) {
  if (!target) return 'popup=yes'

  const left = Math.round(target.availLeft ?? target.left ?? 0)
  const top = Math.round(target.availTop ?? target.top ?? 0)
  const width = Math.round(target.availWidth ?? target.width ?? 1600)
  const height = Math.round(target.availHeight ?? target.height ?? 900)

  return `popup=yes,left=${left},top=${top},width=${width},height=${height}`
}

function moveWindowToScreen(targetWindow: Window, target: ScreenLike) {
  const left = Math.round(target.availLeft ?? target.left ?? 0)
  const top = Math.round(target.availTop ?? target.top ?? 0)
  const width = Math.round(target.availWidth ?? target.width ?? 1600)
  const height = Math.round(target.availHeight ?? target.height ?? 900)

  try {
    targetWindow.moveTo(left, top)
    targetWindow.resizeTo(width, height)
  } catch {}
}

async function getAudienceScreen(hostWindow: Window) {
  if (!hostWindow.screen.isExtended) return null

  const details = await hostWindow.getScreenDetails?.()
  if (!details) return null

  return details.screens.find((entry) => !isSameScreen(entry, details.currentScreen)) || null
}

function isSameScreen(a: ScreenLike, b: ScreenLike) {
  return (
    (a.left ?? a.availLeft ?? 0) === (b.left ?? b.availLeft ?? 0) &&
    (a.top ?? a.availTop ?? 0) === (b.top ?? b.availTop ?? 0) &&
    (a.width ?? a.availWidth ?? 0) === (b.width ?? b.availWidth ?? 0) &&
    (a.height ?? a.availHeight ?? 0) === (b.height ?? b.availHeight ?? 0)
  )
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n))
}
