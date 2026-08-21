'use client'

import { useCallback, useMemo, useState } from 'react'

type Recipient = { display_name: string; email: string; total_score: number }
type PreviewState = { count: number; recipients: Recipient[]; signature: string }
type SendResult = { sent: number; skipped: number; failures: Array<{ display_name: string; reason: string }>; matched?: number }

const SECTION_NAMES = ['Fuel & macros', 'Adaptability', 'Nutrient coverage', 'Feedback & recovery', 'Longevity']
const TRACK_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'Any (no challenge filter)' },
  { value: 'standard', label: 'Standard track' },
  { value: 'advanced', label: 'Advanced track' },
  { value: 'very_advanced', label: 'Very advanced track' },
  { value: 'none', label: 'Not enrolled in the challenge' },
]
const MESSAGE_LIMIT = 5000

const labelClass = 'block text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'
const inputClass = 'mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 text-sm text-[#17251d] focus:border-[#173f2b] focus:outline-none focus:ring-2 focus:ring-[#173f2b]/20'
const primaryButtonClass = 'rounded-xl bg-[#173f2b] px-5 py-3 text-sm font-medium text-white disabled:opacity-40'
const secondaryButtonClass = 'rounded-xl border border-[#173f2b] bg-white px-5 py-3 text-sm font-medium text-[#173f2b] disabled:opacity-40'

export function ExportAndBroadcast({ eventId }: { eventId: string | null }) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [submittedOnly, setSubmittedOnly] = useState(false)
  const [minTotal, setMinTotal] = useState('')
  const [maxTotal, setMaxTotal] = useState('')
  const [section, setSection] = useState('')
  const [sectionMax, setSectionMax] = useState('10')
  const [challengeTrack, setChallengeTrack] = useState('')

  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<SendResult | null>(null)

  const exportHref = useMemo(() => {
    const params = new URLSearchParams({ format: 'csv' })
    if (eventId) params.set('eventId', eventId)
    return `/api/quest/admin/export?${params.toString()}`
  }, [eventId])

  const segment = useMemo(
    () => ({
      submittedOnly: submittedOnly || undefined,
      minTotal: minTotal === '' ? undefined : Number(minTotal),
      maxTotal: maxTotal === '' ? undefined : Number(maxTotal),
      section: section === '' ? undefined : Number(section),
      sectionMax: section === '' || sectionMax === '' ? undefined : Number(sectionMax),
      challengeTrack: challengeTrack || undefined,
    }),
    [submittedOnly, minTotal, maxTotal, section, sectionMax, challengeTrack]
  )

  // A preview is only trustworthy for the exact wording and filters it was run
  // against, so any edit afterwards invalidates it and re-arms the preview step.
  const signature = useMemo(() => JSON.stringify({ eventId, subject, message, segment }), [eventId, subject, message, segment])
  const previewIsCurrent = Boolean(preview && preview.signature === signature)
  const canSend = previewIsCurrent && (preview?.count || 0) > 0 && !busy

  const post = useCallback(
    async (dryRun: boolean) => {
      const response = await fetch('/api/quest/admin/broadcast', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ eventId: eventId || undefined, subject, message, segment, dryRun }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'The broadcast request failed')
      return payload
    },
    [eventId, subject, message, segment]
  )

  async function runPreview() {
    setBusy(true)
    setError('')
    setResult(null)
    setConfirming(false)
    try {
      const payload = await post(true)
      setPreview({ count: payload.count || 0, recipients: payload.recipients || [], signature })
    } catch (previewError) {
      setPreview(null)
      setError(previewError instanceof Error ? previewError.message : 'Could not preview recipients')
    } finally {
      setBusy(false)
    }
  }

  async function send() {
    setBusy(true)
    setError('')
    try {
      const payload = await post(false)
      setResult(payload)
      setPreview(null)
      setConfirming(false)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send the broadcast')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-7 rounded-3xl bg-white p-5 shadow-sm sm:p-8" aria-labelledby="export-broadcast-heading">
      <div className="mb-6">
        <p className={labelClass}>Export &amp; cohort email</p>
        <h2 id="export-broadcast-heading" className="mt-2 text-2xl font-medium sm:text-3xl">
          Take the data out, or write to a segment
        </h2>
        <p className="mt-1 text-sm text-neutral-500">
          The export is one row per participant with every answer and score. The broadcast writes to a filtered slice of the room.
        </p>
      </div>

      <div className="mb-8 rounded-2xl bg-[#edf3e9] p-5">
        <p className={labelClass}>Download</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <a
            href={exportHref}
            className={primaryButtonClass}
            aria-disabled={!eventId}
            onClick={(clickEvent) => {
              if (!eventId) clickEvent.preventDefault()
            }}
          >
            Download CSV
          </a>
          <a href={`${exportHref.replace('format=csv', 'format=json')}`} className={secondaryButtonClass} target="_blank" rel="noreferrer">
            View as JSON
          </a>
          <span className="text-sm text-neutral-500">{eventId ? 'Exports the session shown above.' : 'Exports the current session.'}</span>
        </div>
      </div>

      <form
        onSubmit={(formEvent) => {
          formEvent.preventDefault()
          void runPreview()
        }}
        className="space-y-6"
      >
        <div className="grid gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="broadcast-subject" className={labelClass}>
              Subject
            </label>
            <input
              id="broadcast-subject"
              value={subject}
              onChange={(changeEvent) => setSubject(changeEvent.target.value)}
              maxLength={200}
              required
              placeholder="A note on your fuelling section"
              className={inputClass}
            />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="broadcast-message" className={labelClass}>
              Message
            </label>
            <textarea
              id="broadcast-message"
              value={message}
              onChange={(changeEvent) => setMessage(changeEvent.target.value)}
              rows={8}
              maxLength={MESSAGE_LIMIT}
              required
              placeholder="Write to the people this filter selects. Line breaks are kept."
              aria-describedby="broadcast-message-count"
              className={`${inputClass} font-normal`}
            />
            <p id="broadcast-message-count" className="mt-1 text-right text-xs text-neutral-500">
              {message.length} / {MESSAGE_LIMIT} characters
            </p>
          </div>
        </div>

        <fieldset className="rounded-2xl border border-neutral-200 p-5">
          <legend className={`${labelClass} px-2`}>Who receives it</legend>

          <div className="mt-3 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            <div className="flex items-start gap-3 md:col-span-2 lg:col-span-3">
              <input
                id="broadcast-submitted-only"
                type="checkbox"
                checked={submittedOnly}
                onChange={(changeEvent) => setSubmittedOnly(changeEvent.target.checked)}
                className="mt-1 h-4 w-4 rounded border-neutral-300 text-[#173f2b] focus:ring-[#173f2b]"
              />
              <label htmlFor="broadcast-submitted-only" className="text-sm">
                Only people who have submitted their assessment
              </label>
            </div>

            <div>
              <label htmlFor="broadcast-section" className={labelClass}>
                Low score in section
              </label>
              <select
                id="broadcast-section"
                value={section}
                onChange={(changeEvent) => setSection(changeEvent.target.value)}
                className={inputClass}
              >
                <option value="">No section filter</option>
                {SECTION_NAMES.map((name, index) => (
                  <option key={name} value={index + 1}>
                    {index + 1}. {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="broadcast-section-max" className={labelClass}>
                Scored at or below
              </label>
              <input
                id="broadcast-section-max"
                type="number"
                min={0}
                max={20}
                value={sectionMax}
                onChange={(changeEvent) => setSectionMax(changeEvent.target.value)}
                disabled={section === ''}
                aria-describedby="broadcast-section-help"
                className={`${inputClass} disabled:bg-neutral-50 disabled:text-neutral-400`}
              />
              <p id="broadcast-section-help" className="mt-1 text-xs text-neutral-500">
                Out of 20. Pick a section first.
              </p>
            </div>

            <div>
              <label htmlFor="broadcast-track" className={labelClass}>
                Fasting challenge
              </label>
              <select
                id="broadcast-track"
                value={challengeTrack}
                onChange={(changeEvent) => setChallengeTrack(changeEvent.target.value)}
                className={inputClass}
              >
                {TRACK_OPTIONS.map((option) => (
                  <option key={option.value || 'any'} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="broadcast-min-total" className={labelClass}>
                Total score from
              </label>
              <input
                id="broadcast-min-total"
                type="number"
                min={0}
                max={100}
                value={minTotal}
                onChange={(changeEvent) => setMinTotal(changeEvent.target.value)}
                placeholder="0"
                className={inputClass}
              />
            </div>

            <div>
              <label htmlFor="broadcast-max-total" className={labelClass}>
                Total score up to
              </label>
              <input
                id="broadcast-max-total"
                type="number"
                min={0}
                max={100}
                value={maxTotal}
                onChange={(changeEvent) => setMaxTotal(changeEvent.target.value)}
                placeholder="100"
                className={inputClass}
              />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={busy || !subject.trim() || !message.trim()} className={secondaryButtonClass}>
            {busy && !confirming ? 'Checking…' : 'Preview recipients'}
          </button>
          <button type="button" disabled={!canSend} onClick={() => setConfirming(true)} className={primaryButtonClass}>
            Send broadcast
          </button>
          {!previewIsCurrent && (
            <span className="text-sm text-neutral-500">Preview the recipients before sending.</span>
          )}
        </div>
      </form>

      {error && (
        <p role="alert" className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}

      {previewIsCurrent && preview && (
        <div className="mt-6 rounded-2xl border border-neutral-200 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h3 className="text-lg font-medium">
              {preview.count} {preview.count === 1 ? 'person matches' : 'people match'} this filter
            </h3>
            <span className="text-xs text-neutral-500">Nothing has been sent yet.</span>
          </div>
          {preview.count === 0 ? (
            <p className="mt-3 text-sm text-neutral-500">Loosen the filter — there is nobody to write to.</p>
          ) : (
            <ul className="mt-4 max-h-64 space-y-2 overflow-y-auto pr-1">
              {preview.recipients.map((recipient, index) => (
                <li key={`${recipient.email || 'no-email'}-${index}`} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-neutral-100 pb-2 text-sm last:border-0">
                  <span className="font-medium">{recipient.display_name || 'Unnamed participant'}</span>
                  <span className={recipient.email ? 'text-neutral-500' : 'text-amber-700'}>
                    {recipient.email || 'No email — will be skipped'}
                  </span>
                  <span className="text-neutral-500">{recipient.total_score} / 100</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {confirming && preview && (
        <div role="alertdialog" aria-labelledby="broadcast-confirm-heading" className="mt-6 rounded-2xl border-2 border-[#173f2b] bg-[#edf3e9] p-5">
          <h3 id="broadcast-confirm-heading" className="text-lg font-medium">
            Send this email to <strong className="text-2xl">{preview.count}</strong> {preview.count === 1 ? 'person' : 'people'}?
          </h3>
          <p className="mt-2 text-sm text-neutral-600">
            These are real inboxes. Subject: <strong>{subject}</strong>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" disabled={busy} onClick={() => void send()} className={primaryButtonClass}>
              {busy ? 'Sending…' : `Yes, send to ${preview.count}`}
            </button>
            <button type="button" disabled={busy} onClick={() => setConfirming(false)} className={secondaryButtonClass}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div role="status" className="mt-6 rounded-2xl bg-[#edf3e9] p-5">
          <h3 className="text-lg font-medium">Broadcast finished</h3>
          <p className="mt-1 text-sm text-neutral-600">
            {result.sent} sent · {result.skipped} skipped (no deliverable email) · {result.failures.length} failed
          </p>
          {result.failures.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-red-800">
              {result.failures.map((failure, index) => (
                <li key={`${failure.display_name}-${index}`}>
                  {failure.display_name}: {failure.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  )
}
