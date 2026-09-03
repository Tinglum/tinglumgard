'use client'

import * as React from 'react'
import { AlertTriangle, Check, Loader2, Mic, MicOff, Plus, Sparkles, X } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'

interface QuickAddPerson {
  id: string
  name: string
}

interface QuickAddProject {
  id: string
  name: string
}

interface ParsedQuickAddTask {
  title: string
  description: string | null
  dueDate: string | null
  assigneePersonId: string | null
  projectId: string | null
}

interface ParseResponse {
  ok: true
  parsed: ParsedQuickAddTask
  people: QuickAddPerson[]
  projects: QuickAddProject[]
}

interface ApiError {
  error: string
  message: string
}

// Minimal shape of the Web Speech API this component uses. Not in lib.dom.d.ts.
interface SpeechRecognitionResultLike {
  results: { [index: number]: { [index: number]: { transcript: string } } } & { length: number }
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string
  interimResults: boolean
  continuous: boolean
  start(): void
  stop(): void
  onresult: ((event: SpeechRecognitionResultLike) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
}

function getSpeechRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRecognitionLike
    webkitSpeechRecognition?: new () => SpeechRecognitionLike
  }
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
}

/**
 * Quick add — type or speak a task into existence.
 *
 * Voice is just the browser's native Web Speech API filling the same text
 * field; there is no server-side audio handling. Mirrors the assignment
 * console's confirm-before-write shape: Parse asks Claude for a structured
 * proposal, the person reviews/edits it, and only Create actually writes
 * anything. See supabase/migrations/20260909083000_todotwo_quick_add.sql for
 * why this is staff-only for now.
 */
export function QuickAdd() {
  const [open, setOpen] = React.useState(false)
  const [text, setText] = React.useState('')
  const [listening, setListening] = React.useState(false)
  const [speechSupported, setSpeechSupported] = React.useState(false)

  const [parsing, setParsing] = React.useState(false)
  const [creating, setCreating] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [people, setPeople] = React.useState<QuickAddPerson[]>([])
  const [projects, setProjects] = React.useState<QuickAddProject[]>([])
  const [proposal, setProposal] = React.useState<ParsedQuickAddTask | null>(null)
  const [created, setCreated] = React.useState(false)

  const recognitionRef = React.useRef<SpeechRecognitionLike | null>(null)

  React.useEffect(() => {
    setSpeechSupported(getSpeechRecognitionCtor() !== null)
  }, [])

  function reset() {
    setText('')
    setProposal(null)
    setError(null)
    setCreated(false)
  }

  function toggleListening() {
    const Ctor = getSpeechRecognitionCtor()
    if (!Ctor) return

    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const recognition = new Ctor()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.continuous = false
    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1]
      const transcript = last?.[0]?.transcript
      if (transcript) setText((prev) => (prev ? `${prev} ${transcript}` : transcript))
    }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    setListening(true)
    recognition.start()
  }

  async function runParse() {
    setParsing(true)
    setError(null)
    setProposal(null)
    setCreated(false)

    try {
      const res = await fetch('/api/todotwo/quick-add/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = (await res.json()) as ParseResponse | ApiError

      if (!res.ok || !('ok' in data)) {
        setError((data as ApiError).message ?? 'Could not parse that.')
        return
      }

      setPeople(data.people)
      setProjects(data.projects)
      setProposal(data.parsed)
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setParsing(false)
    }
  }

  async function runCreate() {
    if (!proposal) return
    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/todotwo/quick-add/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: proposal.title,
          description: proposal.description,
          projectId: proposal.projectId,
          dueDate: proposal.dueDate,
          assigneePersonId: proposal.assigneePersonId,
        }),
      })

      const data = (await res.json()) as { ok: boolean; taskId?: string } & Partial<ApiError>

      if (!res.ok || !data.ok) {
        setError(data.message ?? 'Could not create the task.')
        return
      }

      setCreated(true)
      setProposal(null)
      setText('')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setCreating(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick add a task"
        className={cn(
          'fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full shadow-lg',
          'bg-[var(--tt-accent)] text-[var(--tt-on-accent)] hover:bg-[var(--tt-accent-hover)]',
          'md:bottom-6 md:right-6'
        )}
      >
        <Plus className="h-6 w-6" aria-hidden="true" />
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 md:items-center">
      <Surface className="flex w-full max-w-lg flex-col gap-4 rounded-t-xl p-4 md:rounded-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--tt-ink)]">Quick add</h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setOpen(false)
              reset()
            }}
            className="flex h-9 w-9 items-center justify-center rounded-md text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!proposal ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="quick-add-text" className="text-[13px] font-medium text-[var(--tt-ink)]">
                Type or speak a task
              </label>
              <div className="flex items-start gap-2">
                <textarea
                  id="quick-add-text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={3}
                  placeholder='e.g. "Remind me to check the fence by the north paddock tomorrow"'
                  className={cn(
                    'w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-3 text-[15px]',
                    'text-[var(--tt-ink)] placeholder:text-[var(--tt-ink-3)]',
                    'focus:outline-none focus:ring-2 focus:ring-[var(--tt-accent)]'
                  )}
                />
                {speechSupported ? (
                  <button
                    type="button"
                    onClick={toggleListening}
                    aria-label={listening ? 'Stop listening' : 'Speak a task'}
                    aria-pressed={listening}
                    className={cn(
                      'flex h-11 w-11 shrink-0 items-center justify-center rounded-full border',
                      listening
                        ? 'border-[var(--tt-danger)] bg-[var(--tt-danger-soft)] text-[var(--tt-danger)]'
                        : 'border-[var(--tt-rule-strong)] text-[var(--tt-ink-2)] hover:bg-[var(--tt-surface-2)]'
                    )}
                  >
                    {listening ? <MicOff className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-5 w-5" aria-hidden="true" />}
                  </button>
                ) : null}
              </div>
            </div>

            <Button onClick={runParse} disabled={parsing || text.trim().length === 0} className="self-start">
              {parsing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Reading …
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" aria-hidden="true" />
                  Parse
                </>
              )}
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="qa-title" className="text-[12px] text-[var(--tt-ink-3)]">
                Title
              </label>
              <input
                id="qa-title"
                value={proposal.title}
                onChange={(e) => setProposal({ ...proposal, title: e.target.value })}
                className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[15px] text-[var(--tt-ink)]"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="qa-desc" className="text-[12px] text-[var(--tt-ink-3)]">
                Description
              </label>
              <textarea
                id="qa-desc"
                value={proposal.description ?? ''}
                onChange={(e) => setProposal({ ...proposal, description: e.target.value || null })}
                rows={2}
                className="rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-2 text-[14px] text-[var(--tt-ink)]"
              />
            </div>

            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1">
                <label htmlFor="qa-due" className="text-[12px] text-[var(--tt-ink-3)]">
                  Due date
                </label>
                <input
                  id="qa-due"
                  type="date"
                  value={proposal.dueDate ?? ''}
                  onChange={(e) => setProposal({ ...proposal, dueDate: e.target.value || null })}
                  className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[14px] text-[var(--tt-ink)]"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="qa-assignee" className="text-[12px] text-[var(--tt-ink-3)]">
                  Assign to
                </label>
                <select
                  id="qa-assignee"
                  value={proposal.assigneePersonId ?? ''}
                  onChange={(e) => setProposal({ ...proposal, assigneePersonId: e.target.value || null })}
                  className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[14px] text-[var(--tt-ink)]"
                >
                  <option value="">Unassigned</option>
                  {people.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="qa-project" className="text-[12px] text-[var(--tt-ink-3)]">
                  Project
                </label>
                <select
                  id="qa-project"
                  value={proposal.projectId ?? ''}
                  onChange={(e) => setProposal({ ...proposal, projectId: e.target.value || null })}
                  className="min-h-[40px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[14px] text-[var(--tt-ink)]"
                >
                  <option value="">None</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={runCreate} disabled={creating || proposal.title.trim().length === 0}>
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Creating …
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Create task
                  </>
                )}
              </Button>
              <Button variant="secondary" onClick={() => setProposal(null)} disabled={creating}>
                Back
              </Button>
            </div>
          </div>
        )}

        {error ? (
          <p role="alert" className="flex items-start gap-2 text-[13px] text-[var(--tt-danger)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            {error}
          </p>
        ) : null}

        {created ? (
          <p className="flex items-center gap-2 text-[14px] text-[var(--tt-accent)]">
            <Check className="h-4 w-4" aria-hidden="true" />
            Task created.
          </p>
        ) : null}
      </Surface>
    </div>
  )
}
