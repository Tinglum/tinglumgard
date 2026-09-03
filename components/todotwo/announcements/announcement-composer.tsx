'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { AnnouncementUrgency } from '@/lib/todotwo/notifications/queries'

/**
 * Writing a notice. Staff only — the policies enforce that, this component is
 * simply not rendered for anyone else.
 *
 * Publishing sets published_at, which fires the fan-out trigger and queues one
 * email per person. Saving a draft leaves published_at null and sends nothing;
 * publishing it later is a separate press, and re-publishing an already
 * published notice cannot re-send, because the dedupe key is already taken.
 */

const URGENCIES: { value: AnnouncementUrgency; label: string; hint: string }[] = [
  { value: 'info', label: 'Info', hint: 'Worth knowing.' },
  { value: 'important', label: 'Important', hint: 'Everyone should read this.' },
  { value: 'urgent', label: 'Urgent', hint: 'Today, and it matters.' },
]

const inputClass =
  'w-full rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 py-2 text-[14px] text-[var(--tt-ink)] outline-none focus:border-[var(--tt-accent)]'

export function AnnouncementComposer({ authorPersonId }: { authorPersonId: string }) {
  const router = useRouter()
  const [open, setOpen] = React.useState(false)
  const [title, setTitle] = React.useState('')
  const [body, setBody] = React.useState('')
  const [urgency, setUrgency] = React.useState<AnnouncementUrgency>('info')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const ready = title.trim().length > 0 && body.trim().length > 0

  async function save(publish: boolean) {
    if (!ready) return
    setPending(true)
    setError(null)

    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: insertError } = await supabase.from('announcements').insert({
        title: title.trim(),
        body: body.trim(),
        urgency,
        author_person_id: authorPersonId,
        published_at: publish ? new Date().toISOString() : null,
      })

      if (insertError) {
        setError(insertError.message)
        return
      }

      setTitle('')
      setBody('')
      setUrgency('info')
      setOpen(false)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  if (!open) {
    return (
      <div>
        <Button size="sm" onClick={() => setOpen(true)}>
          Write a notice
        </Button>
      </div>
    )
  }

  return (
    <Surface className="flex flex-col gap-3 p-4">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Title
        </span>
        <input
          className={inputClass}
          value={title}
          maxLength={200}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="The vet comes Thursday morning"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Notice
        </span>
        <textarea
          className={`${inputClass} min-h-[120px] resize-y`}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="What everyone needs to know, and what they should do about it."
        />
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--tt-ink-3)]">
          Urgency
        </legend>
        <div className="flex flex-wrap gap-2">
          {URGENCIES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setUrgency(option.value)}
              aria-pressed={urgency === option.value}
              title={option.hint}
              className={
                urgency === option.value
                  ? 'rounded-full bg-[var(--tt-accent-soft)] px-3 py-1 text-[13px] text-[var(--tt-ink)]'
                  : 'rounded-full border border-[var(--tt-rule-strong)] px-3 py-1 text-[13px] text-[var(--tt-ink-2)]'
              }
            >
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={() => save(true)} disabled={pending || !ready}>
          {pending ? 'Working …' : 'Publish and notify'}
        </Button>
        <Button size="sm" variant="secondary" onClick={() => save(false)} disabled={pending || !ready}>
          Save as draft
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
          Cancel
        </Button>
      </div>

      <p className="text-[12px] leading-relaxed text-[var(--tt-ink-3)]">
        Publishing queues an email to everyone with an account. A draft sends nothing and stays
        visible to coordinators only.
      </p>

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </Surface>
  )
}
