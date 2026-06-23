'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import Image from 'next/image'
import {
  Presentation, X, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen,
  CheckCircle2, Target, Flag, Maximize2, Clock, Eye, EyeOff, Scissors,
} from 'lucide-react'
import type { BnimspContent, LayerKey, Slide, TrainingFormat } from '@/lib/bnimsp/types'
import { groupByModule, totalMinutes, cumulativeStartMinutes } from '@/lib/bnimsp/util'
import { useUnsavedWarning } from '@/lib/bnimsp/hooks'
import { resolveSlide, isIncluded, formatTotals, formatLabel, hasOverride } from '@/lib/bnimsp/format'
import { ModuleRail } from './ModuleRail'
import { SlideStage } from './SlideStage'
import { LayerStack, PrivateNotesCard, DELIVERY_BLOCKS, REFERENCE_BLOCKS } from './LayerPanel'
import { EditableText } from './EditableText'
import { PracticeTimer } from './PracticeTimer'
import { PersonalScript } from './PersonalScript'
import { EndTimeTracker } from './EndTimeTracker'
import { FormatBar } from './FormatBar'

interface PersonalState { notes: string; script: string | null }
const DELIVERY_NO_SCRIPT = DELIVERY_BLOCKS.filter((b) => b.key !== 'sayThis')

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
  // Sent by the audience window (e.g. when a clicker is focused there) so the
  // presenter window stays the single source of truth for the current slide.
  | { type: 'nav'; dir: number }

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
  const [personalCache, setPersonalCache] = useState<Record<number, PersonalState>>({})
  const [hasPendingSave, setHasPendingSave] = useState(false)
  const [trainingFormat, setTrainingFormat] = useState<TrainingFormat>('full')
  const noteTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const scriptTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Directors who can't edit the master get a personal, rewritable script.
  const ownsPersonalScript = isDirector && !canEdit
  const audienceWindowRef = useRef<Window | null>(null)
  const channelRef = useRef<BroadcastChannel | null>(null)

  // Warn user if there's unsaved work before they navigate away.
  useUnsavedWarning(hasPendingSave)

  // Remember the trainer's chosen format across visits (per browser).
  useEffect(() => {
    const saved = localStorage.getItem('bnimsp:format')
    if (saved === 'full' || saved === '120min' || saved === '90min') setTrainingFormat(saved)
  }, [])
  const changeFormat = useCallback((fmt: TrainingFormat) => {
    setTrainingFormat(fmt)
    try { localStorage.setItem('bnimsp:format', fmt) } catch {}
  }, [])

  // Slides included in the active format (full = everything), with their
  // script/task/timing resolved to the format-specific version.
  const visibleSlides = useMemo(
    () => slides.filter((s) => isIncluded(s, trainingFormat)).map((s) => resolveSlide(s, trainingFormat)),
    [slides, trainingFormat],
  )
  const visibleNums = useMemo(() => visibleSlides.map((s) => s.n), [visibleSlides])
  const totals = useMemo(() => formatTotals(slides, trainingFormat), [slides, trainingFormat])

  const total = slides.length // absolute deck size (for "n / 40" labels)
  const content = useMemo(
    () => ({ ...initialContent, slides: visibleSlides }),
    [initialContent, visibleSlides],
  )
  const groups = useMemo(() => groupByModule(content), [content])
  const rawSlide = slides.find((s) => s.n === currentN) || slides[0]
  const slide = useMemo(() => resolveSlide(rawSlide, trainingFormat), [rawSlide, trainingFormat])
  const nextN = visibleNums[visibleNums.indexOf(currentN) + 1]
  const nextSlide = visibleSlides.find((s) => s.n === nextN) || null
  const currentExcluded = !isIncluded(rawSlide, trainingFormat)

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set('s', String(currentN))
    window.history.replaceState(null, '', url.toString())
  }, [currentN])

  // Navigation works over the visible (filtered) slides only.
  const go = useCallback((n: number) => {
    setCurrentN(() => {
      if (visibleNums.length === 0) return n
      if (visibleNums.includes(n)) return n
      // Snap to the nearest visible slide.
      return visibleNums.reduce((best, v) => (Math.abs(v - n) < Math.abs(best - n) ? v : best), visibleNums[0])
    })
  }, [visibleNums])
  const goBy = useCallback((dir: number) => {
    setCurrentN((c) => {
      if (visibleNums.length === 0) return c
      const idx = visibleNums.indexOf(c)
      if (idx === -1) return visibleNums[0]
      return visibleNums[clamp(idx + dir, 0, visibleNums.length - 1)]
    })
  }, [visibleNums])

  // If the current slide isn't part of the chosen format, jump to the nearest one.
  useEffect(() => {
    if (visibleNums.length > 0 && !visibleNums.includes(currentN)) {
      setCurrentN(visibleNums.reduce((best, v) => (Math.abs(v - currentN) < Math.abs(best - currentN) ? v : best), visibleNums[0]))
    }
  }, [visibleNums, currentN])

  useEffect(() => {
    const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(PRESENTER_CHANNEL) : null
    channelRef.current = channel

    function onPresenterMessage(message: PresenterMessage) {
      if (initialAudience) {
        if (message.type === 'slide') go(message.n)
        if (message.type === 'exit') window.close()
      } else {
        // Presenter window: honour nav requests forwarded from the audience
        // window (clicker focused there). The resulting slide change is then
        // broadcast back so the audience follows.
        if (message.type === 'nav') goBy(message.dir)
      }
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
  }, [go, goBy, initialAudience])

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
    const audienceUrl = new URL('/bnimsp/audience', window.location.origin)
    audienceUrl.searchParams.set('s', String(currentN))
    const targetScreen = await getAudienceScreen(window).catch(() => null)

    const existing = audienceWindowRef.current
    const audienceWindow = existing && !existing.closed
      ? existing
      : window.open(audienceUrl.toString(), 'bnimsp-audience', popupFeatures(targetScreen))

    if (!audienceWindow) return

    audienceWindowRef.current = audienceWindow
    if (existing && !existing.closed) {
      renderAudienceLoading(audienceWindow)
    }

    try {
      audienceWindow.location.replace(audienceUrl.toString())
    } catch {}

    if (targetScreen) syncAudienceWindowFrame(audienceWindow, targetScreen)
    tryAudienceFullscreen(audienceWindow)
    audienceWindow.focus()

    setPresenter(true)
    broadcast({ type: 'slide', n: currentN })
  }, [broadcast, currentN])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null
      if (el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable) return
      if (e.metaKey || e.ctrlKey || e.altKey) return

      // Slide navigation. Covers arrow keys and presentation clickers, which
      // typically emit PageDown/PageUp (some emit Space or arrows).
      const next = e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === 'ArrowDown'
        || (e.key === ' ' && (presenter || initialAudience))
      const prev = e.key === 'ArrowLeft' || e.key === 'PageUp' || e.key === 'ArrowUp'
      if (next || prev) {
        e.preventDefault()
        const dir = next ? 1 : -1
        // The audience window forwards to the presenter; the presenter moves
        // directly and then broadcasts the change back to the audience.
        if (initialAudience) broadcast({ type: 'nav', dir })
        else goBy(dir)
        return
      }

      if (initialAudience) return
      if (e.key.toLowerCase() === 'p') {
        if (presenter) exitPresenterMode()
        else void enterPresenterMode()
      } else if (e.key === 'Escape' && presenter) {
        exitPresenterMode()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [broadcast, enterPresenterMode, exitPresenterMode, goBy, initialAudience, presenter])

  useEffect(() => {
    if (currentN in personalCache) return
    let cancelled = false
    async function load() {
      let state: PersonalState = { notes: '', script: null }
      if (isDirector) {
        try {
          const res = await fetch(`/api/bnimsp/notes/${currentN}`)
          const data = await res.json().catch(() => ({}))
          state = { notes: data.notes || '', script: data.script ?? null }
        } catch { /* keep empty */ }
      } else {
        try {
          const raw = localStorage.getItem(`bnimsp:personal:${currentN}`)
          if (raw) state = JSON.parse(raw)
        } catch { /* keep empty */ }
      }
      if (!cancelled) setPersonalCache((c) => ({ ...c, [currentN]: state }))
    }
    load()
    return () => { cancelled = true }
  }, [currentN, isDirector, personalCache])

  // Persist one field of the per-director personal state (debounced).
  const persist = useCallback((n: number, patch: Partial<PersonalState>, timer: typeof noteTimer) => {
    if (timer.current) clearTimeout(timer.current)
    setHasPendingSave(true)
    timer.current = setTimeout(async () => {
      try {
        if (isDirector) {
          const res = await fetch(`/api/bnimsp/notes/${n}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(patch),
          })
          if (!res.ok) throw new Error('Save failed')
        } else {
          const prev: PersonalState = personalCache[n] || { notes: '', script: null }
          localStorage.setItem(`bnimsp:personal:${n}`, JSON.stringify({ ...prev, ...patch }))
        }
      } finally {
        setHasPendingSave(false)
      }
    }, 600)
  }, [isDirector, personalCache])

  const onPrivateNote = useCallback((value: string) => {
    const n = currentN
    setPersonalCache((c) => ({ ...c, [n]: { notes: value, script: c[n]?.script ?? null } }))
    persist(n, { notes: value }, noteTimer)
  }, [currentN, persist])

  const onScriptChange = useCallback((html: string) => {
    const n = currentN
    setPersonalCache((c) => ({ ...c, [n]: { notes: c[n]?.notes ?? '', script: html } }))
    persist(n, { script: html }, scriptTimer)
  }, [currentN, persist])

  const onScriptRestore = useCallback(() => {
    const n = currentN
    setPersonalCache((c) => ({ ...c, [n]: { notes: c[n]?.notes ?? '', script: null } }))
    if (scriptTimer.current) clearTimeout(scriptTimer.current)
    if (isDirector) {
      fetch(`/api/bnimsp/notes/${n}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: null }),
      }).catch(() => {})
    } else {
      try { localStorage.setItem(`bnimsp:personal:${n}`, JSON.stringify({ notes: personalCache[n]?.notes ?? '', script: null })) } catch {}
    }
  }, [currentN, isDirector, personalCache])

  const onEditLayer = useCallback(async (key: LayerKey | 'title' | 'timing', value: string) => {
    const oldSlide = slides.find((s) => s.n === currentN)
    // In a short format, edits to the delivery fields land on that format's
    // variant; everything else (and all edits in "full") edits the master.
    const fmt = trainingFormat
    const scoped = fmt !== 'full' && (key === 'sayThis' || key === 'askGroup' || key === 'timing')

    setSlides((prev) => prev.map((s) => {
      if (s.n !== currentN) return s
      if (scoped) {
        const formats = { ...(s.formats || {}) }
        formats[fmt] = { ...(formats[fmt] || {}), [key]: value }
        return { ...s, formats }
      }
      return { ...s, [key]: value }
    }))

    try {
      const res = await fetch(`/api/bnimsp/slides/${currentN}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [key]: value,
          ...(scoped ? { format: fmt } : {}),
          updatedAt: oldSlide?.updated_at,
        }),
      })
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      } else if (res.status === 409) {
        // Conflict: another editor changed this slide. Reload and notify.
        setSlides((prev) => prev.map((s) => (s.n === currentN && oldSlide ? oldSlide : s)))
        alert('Denne sliden ble redigert et annet sted. Endringene dine ble gjenopprettet. Last inn siden på nytt.')
        window.location.reload()
      }
    } catch { /* optimistic value stays */ }
  }, [currentN, slides, trainingFormat])

  // Include / exclude the current slide from the active short format.
  const onToggleInclude = useCallback(async (include: boolean) => {
    const fmt = trainingFormat
    if (fmt === 'full') return
    const oldSlide = slides.find((s) => s.n === currentN)
    setSlides((prev) => prev.map((s) => {
      if (s.n !== currentN) return s
      const formats = { ...(s.formats || {}) }
      formats[fmt] = { ...(formats[fmt] || {}), include }
      return { ...s, formats }
    }))
    try {
      const res = await fetch(`/api/bnimsp/slides/${currentN}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ include, format: fmt, updatedAt: oldSlide?.updated_at }),
      })
      if (res.ok) {
        setSavedFlash(true)
        setTimeout(() => setSavedFlash(false), 1500)
      } else if (res.status === 409) {
        setSlides((prev) => prev.map((s) => (s.n === currentN && oldSlide ? oldSlide : s)))
        window.location.reload()
      }
    } catch { /* optimistic stays */ }
  }, [currentN, slides, trainingFormat])

  if (initialAudience) {
    return <AudienceView slide={slide} />
  }

  if (presenter) {
    return (
      <PresenterView
        slide={slide} nextSlide={nextSlide} total={total} content={content}
        personalScript={ownsPersonalScript ? (personalCache[currentN]?.script ?? null) : null}
        onPrev={() => goBy(-1)} onNext={() => goBy(1)} onGo={go} onExit={exitPresenterMode}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-[2000px] px-3 py-5 sm:px-5 xl:px-8 2xl:text-[15px]">
      {/* Format switcher + live time budget */}
      <FormatBar format={trainingFormat} onChange={changeFormat} totals={totals} />

      <div className="grid gap-5 xl:gap-7 lg:grid-cols-[230px_minmax(0,1fr)] 2xl:grid-cols-[260px_minmax(0,1fr)]">
        {/* Rail */}
        <aside className={`${railOpen ? 'block' : 'hidden'} lg:block`}>
          <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-2xl border border-[var(--bni-line)] bg-white p-3">
            <ModuleRail groups={groups} currentN={currentN} onSelect={go} breaks={content.breaks} />
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
              <SlideStage slide={slide} total={total} onPrev={() => goBy(-1)} onNext={() => goBy(1)} canEdit={canEdit} />
              {trainingFormat !== 'full' && (
                <FormatSlideStrip
                  format={trainingFormat}
                  slide={slide}
                  rawSlide={rawSlide}
                  canEdit={canEdit}
                  excluded={currentExcluded}
                  onToggleInclude={onToggleInclude}
                  onEditTiming={(v) => onEditLayer('timing', v)}
                />
              )}
              <GoalBanner slide={slide} editable={canEdit} onEditLayer={onEditLayer} />
              {ownsPersonalScript ? (
                <>
                  {currentN in personalCache && (
                    <PersonalScript
                      key={currentN}
                      slideN={currentN}
                      master={slide.sayThis}
                      initialHtml={personalCache[currentN]?.script ?? null}
                      onChange={onScriptChange}
                      onRestore={onScriptRestore}
                    />
                  )}
                  <LayerStack slide={slide} blocks={DELIVERY_NO_SCRIPT} editable={canEdit} onEditLayer={onEditLayer} />
                </>
              ) : (
                <LayerStack slide={slide} blocks={DELIVERY_BLOCKS} editable={canEdit} onEditLayer={onEditLayer} />
              )}
            </div>

            <div className="min-w-0 space-y-3 xl:space-y-4">
              <LayerStack slide={slide} blocks={REFERENCE_BLOCKS} editable={canEdit} onEditLayer={onEditLayer} />
              <PrivateNotesCard value={personalCache[currentN]?.notes ?? ''} onChange={onPrivateNote} />
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
        <EditableText value={slide.goal} editable={editable} onSave={(v) => onEditLayer('goal', v)} placeholder="-" />
      </div>
      <div className="rounded-xl border border-[var(--bni-line)] bg-white p-4">
        <div className="mb-1.5 flex items-center gap-2">
          <Flag className="h-4 w-4 text-emerald-600" />
          <span className="text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">Vi ønsker å oppnå</span>
        </div>
        <EditableText value={slide.outcome} editable={editable} onSave={(v) => onEditLayer('outcome', v)} placeholder="-" />
      </div>
    </div>
  )
}

// Per-slide controls shown only in a short format: include/exclude this slide,
// set its format-specific pacing, and signal whether the delivery text below is
// a trimmed variant or still inheriting the full version.
function FormatSlideStrip({
  format, slide, rawSlide, canEdit, excluded, onToggleInclude, onEditTiming,
}: {
  format: TrainingFormat
  slide: Slide
  rawSlide: Slide
  canEdit: boolean
  excluded: boolean
  onToggleInclude: (include: boolean) => void
  onEditTiming: (value: string) => void
}) {
  const label = formatLabel(format)
  const scriptTrimmed = hasOverride(rawSlide, format, 'sayThis')
  const taskTrimmed = hasOverride(rawSlide, format, 'askGroup')

  return (
    <div className={`rounded-xl border p-3 ${excluded ? 'border-[var(--bni-red)]/30 bg-[var(--bni-red)]/[0.04]' : 'border-blue-200 bg-blue-50/60'}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[var(--bni-muted)]">
          <Scissors className="h-3.5 w-3.5 text-blue-600" />
          {label}-versjon
        </span>

        {/* Include / exclude this slide */}
        {canEdit ? (
          <button
            onClick={() => onToggleInclude(excluded)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition-colors ${
              excluded
                ? 'border-[var(--bni-red)]/40 bg-white text-[var(--bni-red)] hover:bg-[var(--bni-red)]/5'
                : 'border-blue-300 bg-white text-blue-700 hover:bg-blue-50'
            }`}
          >
            {excluded ? <><Eye className="h-3.5 w-3.5" /> Ta med i {label.toLowerCase()}</> : <><EyeOff className="h-3.5 w-3.5" /> Utelat fra {label.toLowerCase()}</>}
          </button>
        ) : (
          excluded && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--bni-red)]">
              <EyeOff className="h-3.5 w-3.5" /> Ikke med i {label.toLowerCase()}
            </span>
          )
        )}

        {/* Format-specific pacing */}
        <span className="inline-flex items-center gap-1.5 text-xs text-[var(--bni-ink)]">
          <Clock className="h-3.5 w-3.5 text-[var(--bni-red)]" />
          {canEdit ? (
            <span className="min-w-[64px]">
              <EditableText value={slide.timing} editable onSave={(v) => onEditTiming(v)} placeholder="sett tid" className="text-xs" />
            </span>
          ) : (
            slide.timing || '–'
          )}
        </span>

        {/* What the trainer is looking at below */}
        <span className="ml-auto flex items-center gap-1.5 text-[11px]">
          <FmtTag on={scriptTrimmed} label="Si dette" />
          <FmtTag on={taskTrimmed} label="Spør gruppen" />
        </span>
      </div>

      {canEdit && !excluded && (
        <p className="mt-2 text-[11px] leading-snug text-[var(--bni-muted)]">
          Endringer i «Si dette» og «Spør gruppen» nedenfor lagres kun for {label.toLowerCase()}-versjonen.
          Tomt felt arver fullversjonen, så du kan korte ned originalteksten.
        </p>
      )}
    </div>
  )
}

function FmtTag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-2 py-0.5 font-semibold ${
        on ? 'bg-blue-600 text-white' : 'bg-zinc-200 text-[var(--bni-muted)]'
      }`}
      title={on ? `${label}: tilpasset for dette formatet` : `${label}: arver fullversjonen`}
    >
      {label}: {on ? 'tilpasset' : 'arver'}
    </span>
  )
}

function PresenterView({
  slide, nextSlide, total, content, personalScript, onPrev, onNext, onGo, onExit,
}: {
  slide: Slide; nextSlide: Slide | null; total: number; content: BnimspContent
  personalScript: string | null
  onPrev: () => void; onNext: () => void; onGo: (n: number) => void; onExit: () => void
}) {
  const [nextPreviewVh, setNextPreviewVh] = useState(30)
  const scriptScrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const saved = Number(localStorage.getItem('bnimsp:nextPreviewVh'))
    if (saved >= 12 && saved <= 60) setNextPreviewVh(saved)
  }, [])

  useEffect(() => {
    scriptScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [slide.n])

  const updatePreviewVh = (v: number) => {
    setNextPreviewVh(v)
    try { localStorage.setItem('bnimsp:nextPreviewVh', String(v)) } catch {}
  }
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-zinc-950 text-white">
      <div className="flex items-center justify-between gap-4 border-b border-white/10 px-5 py-3">
        <PracticeTimer timing={slide.timing} slideN={slide.n} />
        <div className="flex items-center gap-3">
          <EndTimeTracker programMin={totalMinutes(content)} cumStartMin={cumulativeStartMinutes(content, slide.n)} />
          <div className="hidden h-8 w-px bg-white/10 sm:block" />
          <button onClick={onPrev} disabled={slide.n <= 1} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40" aria-label="Forrige">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <SlideJump current={slide.n} total={total} onGo={onGo} />
          <button onClick={onNext} disabled={slide.n >= total} className="rounded-lg bg-white/10 p-2 hover:bg-white/20 disabled:opacity-40" aria-label="Neste">
            <ChevronRight className="h-5 w-5" />
          </button>
          <button onClick={onExit} className="ml-2 inline-flex items-center gap-1.5 rounded-lg bg-[var(--bni-red)] px-3 py-2 text-sm font-semibold hover:bg-[var(--bni-red-dark)]">
            <X className="h-4 w-4" /> Avslutt
          </button>
        </div>
      </div>

      <div
        className="bni-presenter-grid min-h-0 flex-1 gap-5 overflow-hidden p-5 xl:p-7"
        style={{ '--bni-next-max-h': `${nextPreviewVh}vh` } as CSSProperties}
      >
        <div className="flex min-h-0 flex-col gap-4">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/10 bg-black max-md:aspect-video max-md:flex-none">
            <Image src={slide.image} alt="" fill className="object-contain" sizes="60vw" priority />
          </div>
          {(slide.ninjaTip || slide.transition) && (
            <div className="grid gap-3 md:grid-cols-2">
              {slide.ninjaTip && <PresenterBlob label="Ninja-tips" body={slide.ninjaTip} />}
              {slide.transition && <PresenterBlob label="Overgang" body={slide.transition} />}
            </div>
          )}
          {nextSlide && (
            <div className="mt-auto rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide">
                <span className="rounded bg-white/10 px-1.5 py-0.5 font-semibold text-zinc-300">Neste</span>
                <span className="min-w-0 flex-1 truncate font-medium text-zinc-200">{nextSlide.title || `Slide ${nextSlide.n}`}</span>
                <Maximize2 className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
                <input
                  type="range" min={12} max={60} step={1} value={nextPreviewVh}
                  onChange={(e) => updatePreviewVh(Number(e.target.value))}
                  aria-label="Størrelse på neste-visning"
                  title="Juster størrelsen på neste-visningen"
                  className="bni-size-slider w-24 shrink-0"
                />
              </div>
              <div className="bni-next-preview relative overflow-hidden rounded-lg border border-white/10 bg-black">
                <Image src={nextSlide.image} alt="" fill className="object-cover" sizes="45vw" />
              </div>
            </div>
          )}
        </div>

        <div ref={scriptScrollRef} className="min-h-0 overflow-y-auto pr-1">
          <PresenterBlock label="Si dette" body={slide.sayThis} html={personalScript} big />
          {slide.doThis && <PresenterBlock label="Gjør dette" body={slide.doThis} />}
          {slide.askGroup && <PresenterBlock label="Spør gruppen" body={slide.askGroup} />}
          {slide.understand && <PresenterBlock label="Forstå & forklar" body={slide.understand} />}
        </div>
      </div>
    </div>
  )
}

function AudienceView({ slide }: { slide: Slide }) {
  const [needsFullscreenPrompt, setNeedsFullscreenPrompt] = useState(false)

  const requestFullscreenNow = useCallback(async () => {
    const success = await requestWindowFullscreen(window)
    setNeedsFullscreenPrompt(!success)
  }, [])

  useEffect(() => {
    const syncFullscreen = () => {
      setNeedsFullscreenPrompt(!Boolean(document.fullscreenElement))
    }

    const promptTimer = window.setTimeout(() => {
      if (!document.fullscreenElement) setNeedsFullscreenPrompt(true)
    }, 900)

    document.addEventListener('fullscreenchange', syncFullscreen)
    void requestFullscreenNow()

    return () => {
      window.clearTimeout(promptTimer)
      document.removeEventListener('fullscreenchange', syncFullscreen)
    }
  }, [requestFullscreenNow])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black p-3">
      {needsFullscreenPrompt && (
        <button
          type="button"
          onClick={() => void requestFullscreenNow()}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
        >
          Go Fullscreen
        </button>
      )}
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

function SlideJump({ current, total, onGo }: { current: number; total: number; onGo: (n: number) => void }) {
  const [val, setVal] = useState(String(current))
  useEffect(() => { setVal(String(current)) }, [current])
  const commit = () => {
    const n = parseInt(val, 10)
    if (Number.isFinite(n) && n >= 1 && n <= total) onGo(n)
    else setVal(String(current))
  }
  return (
    <span className="inline-flex min-w-[64px] items-center justify-center gap-1 text-sm tabular-nums text-zinc-400">
      <input
        type="number" min={1} max={total} value={val}
        onChange={(e) => setVal(e.target.value)}
        onFocus={(e) => e.currentTarget.select()}
        onBlur={commit}
        onKeyDown={(e) => {
          e.stopPropagation()
          if (e.key === 'Enter') { e.preventDefault(); commit(); e.currentTarget.blur() }
          else if (e.key === 'Escape') { setVal(String(current)); e.currentTarget.blur() }
        }}
        aria-label="Gå til slide"
        title="Skriv et slidenummer og trykk Enter"
        className="bni-jump-input w-11 rounded-md border border-white/15 bg-white/10 px-1 py-1 text-center font-medium text-white outline-none focus:border-[var(--bni-red)] focus:bg-white/15"
      />
      <span className="text-zinc-500">/ {total}</span>
    </span>
  )
}

function PresenterBlock({ label, body, html, big, accent }: { label: string; body: string; html?: string | null; big?: boolean; accent?: boolean }) {
  const size = big ? 'text-lg leading-relaxed xl:text-xl' : 'text-sm leading-relaxed text-zinc-200 xl:text-base'
  return (
    <div className={`mb-4 rounded-xl border p-4 ${accent ? 'border-[var(--bni-red)]/40 bg-[var(--bni-red)]/10' : 'border-white/10 bg-white/5'}`}>
      <div className={`mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] ${accent ? 'text-[var(--bni-red)]' : 'text-zinc-400'}`}>
        {label}
        {html != null && <span className="rounded-full bg-[var(--bni-red)]/20 px-2 py-0.5 text-[9px] text-[var(--bni-red)]">din versjon</span>}
      </div>
      {html != null
        ? <div className={`${size} [&_p]:mb-3 [&_p:last-child]:mb-0`} dangerouslySetInnerHTML={{ __html: html }} />
        : <div className={`bni-prose ${size}`}>{body}</div>}
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

function renderAudienceLoading(targetWindow: Window) {
  try {
    targetWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>BNI MSP Audience</title>
    <style>
      html, body {
        margin: 0;
        height: 100%;
        background: #000;
        color: #fff;
        font-family: Arial, sans-serif;
      }
      body {
        display: flex;
        align-items: center;
        justify-content: center;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        font-size: 12px;
      }
    </style>
  </head>
  <body>Opening audience view...</body>
</html>`)
    targetWindow.document.close()
  } catch {}
}

function tryAudienceFullscreen(targetWindow: Window) {
  try {
    const onLoad = () => {
      void requestWindowFullscreen(targetWindow)
    }
    targetWindow.addEventListener('load', onLoad, { once: true })
  } catch {}
}

function popupFeatures(target: ScreenLike | null) {
  const features = [
    'popup=yes',
    'menubar=no',
    'toolbar=no',
    'location=no',
    'status=no',
    'scrollbars=no',
    'resizable=yes',
  ]

  if (!target) return features.join(',')

  const left = Math.round(target.availLeft ?? target.left ?? 0)
  const top = Math.round(target.availTop ?? target.top ?? 0)
  const width = Math.round(target.availWidth ?? target.width ?? 1600)
  const height = Math.round(target.availHeight ?? target.height ?? 900)

  features.push(`left=${left}`, `top=${top}`, `width=${width}`, `height=${height}`)
  return features.join(',')
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

function syncAudienceWindowFrame(targetWindow: Window, target: ScreenLike) {
  const apply = () => moveWindowToScreen(targetWindow, target)

  apply()
  window.setTimeout(apply, 120)
  window.setTimeout(apply, 500)
  window.setTimeout(apply, 1200)

  try {
    targetWindow.addEventListener('load', () => {
      apply()
      window.setTimeout(apply, 120)
      window.setTimeout(apply, 500)
    }, { once: true })
  } catch {}
}

async function requestWindowFullscreen(targetWindow: Window) {
  try {
    const doc = targetWindow.document
    const root = doc.documentElement as typeof doc.documentElement & {
      webkitRequestFullscreen?: () => Promise<void> | void
    }
    if (doc.fullscreenElement) return true
    if (root.requestFullscreen) {
      await root.requestFullscreen()
      return true
    }
    if (root.webkitRequestFullscreen) {
      await root.webkitRequestFullscreen()
      return true
    }
  } catch {}
  return false
}

async function getAudienceScreen(hostWindow: Window) {
  const details = await hostWindow.getScreenDetails?.()
  if (details?.screens?.length) {
    return details.screens.find((entry) => !isSameScreen(entry, details.currentScreen)) || null
  }

  if (hostWindow.screen.isExtended === false) return null

  return null
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
