'use client'

import { FormEvent, useMemo, useState } from 'react'
import { QUEST_ASSESSMENT } from '@/lib/quest/assessment'

type AuditEntry = { question_id: string; from?: string; to: string; note: string; at: string; by: string }
type ParticipantSummary = {
  user_id: string
  display_name: string
  submitted_at: string | null
  section_scores: number[]
  total_score: number
  results_released: boolean | null
  answer_audit: AuditEntry[]
}

const LABEL = 'text-xs font-semibold uppercase tracking-[.16em] text-emerald-800'
const PRIMARY = 'rounded-xl bg-[#173f2b] px-5 py-3 font-medium text-white disabled:opacity-40'
const SECONDARY = 'rounded-xl border border-[#173f2b] bg-white px-5 py-3 font-medium text-[#173f2b] disabled:opacity-40'
const DESTRUCTIVE = 'rounded-xl border border-red-300 bg-white px-5 py-3 font-medium text-red-800 disabled:opacity-40'
const FIELD = 'mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3'
const NOTE_MAX = 300

export function ParticipantActions({
  userId,
  eventId,
  displayName,
  submittedAt,
  answers,
  onChanged,
}: {
  userId: string
  eventId: string | null
  displayName: string
  submittedAt?: string | null
  answers: Record<string, string>
  onChanged: () => void
}): JSX.Element {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [confirmingReopen, setConfirmingReopen] = useState(false)
  const [summary, setSummary] = useState<ParticipantSummary | null>(null)
  const [questionId, setQuestionId] = useState<string>(QUEST_ASSESSMENT.questions[0]?.id ?? 'Q1')
  const [answerKey, setAnswerKey] = useState('')
  const [note, setNote] = useState('')

  const questions = QUEST_ASSESSMENT.questions
  const question = useMemo(() => questions.find((item) => item.id === questionId), [questions, questionId])
  const audit = summary?.answer_audit ?? []
  const isSubmitted = summary ? Boolean(summary.submitted_at) : Boolean(submittedAt)
  const released = summary?.results_released ?? null

  async function act(action: string, extra: Record<string, unknown> = {}, success = '') {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const response = await fetch('/api/quest/admin/participant', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId, eventId, action, ...extra }),
      })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'That action did not go through')
      setSummary(payload.participant as ParticipantSummary)
      setNotice(success)
      onChanged()
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That action did not go through')
      return false
    } finally {
      setBusy(false)
    }
  }

  async function submitOverride(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!question || !answerKey || !note.trim()) return
    const previous = answers?.[questionId] || 'no answer'
    const confirmed = window.confirm(
      `Change the answer to ${questionId} for ${displayName} from ${previous} to ${answerKey}? This changes their score.`,
    )
    if (!confirmed) return
    const ok = await act(
      'override-answer',
      { questionId, answerKey, note: note.trim() },
      `${questionId} corrected and scores recomputed.`,
    )
    if (ok) {
      setAnswerKey('')
      setNote('')
    }
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6" aria-labelledby={`participant-actions-${userId}`}>
      <p className={LABEL}>Participant actions</p>
      <h3 id={`participant-actions-${userId}`} className="mt-2 text-xl font-medium">
        {displayName}
      </h3>
      <p className="mt-1 text-sm text-neutral-500">
        {isSubmitted ? 'Assessment submitted.' : 'Not submitted yet.'}
        {summary ? ` Total ${summary.total_score} / 100.` : ''}
        {released === true
          ? ' Results released to this person.'
          : released === false
            ? ' Results withheld from this person.'
            : ''}
      </p>

      {error && (
        <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-xl bg-[#edf3e9] p-3 text-sm text-emerald-900">
          {notice}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-3">
        {isSubmitted &&
          (confirmingReopen ? (
            <>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const ok = await act('reopen', {}, 'Assessment reopened for editing.')
                  if (ok) setConfirmingReopen(false)
                }}
                className={DESTRUCTIVE}
              >
                Confirm reopen
              </button>
              <button type="button" disabled={busy} onClick={() => setConfirmingReopen(false)} className={SECONDARY}>
                Cancel reopen
              </button>
            </>
          ) : (
            <button type="button" disabled={busy} onClick={() => setConfirmingReopen(true)} className={DESTRUCTIVE}>
              Reopen assessment
            </button>
          ))}
        <button
          type="button"
          disabled={busy}
          onClick={() => act('release-results', {}, 'Results released to this participant.')}
          className={PRIMARY}
        >
          Release results to this person
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act('hide-results', {}, 'Results hidden from this participant.')}
          className={SECONDARY}
        >
          Hide results from this person
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => act('recompute', {}, 'Scores recomputed from answers.')}
          className={SECONDARY}
        >
          Recompute scores
        </button>
      </div>

      <form onSubmit={submitOverride} className="mt-7 border-t border-neutral-200 pt-6">
        <p className={LABEL}>Correct a mis-tapped answer</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <label className="block text-sm font-medium" htmlFor={`question-${userId}`}>
            Question
            <select
              id={`question-${userId}`}
              value={questionId}
              onChange={(event) => {
                setQuestionId(event.target.value)
                setAnswerKey('')
              }}
              className={FIELD}
            >
              {questions.map((item) => (
                <option key={item.id} value={item.id}>
                  {`Q${item.order} — ${item.prompt.en}`}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-medium" htmlFor={`answer-${userId}`}>
            New answer
            <select
              id={`answer-${userId}`}
              value={answerKey}
              onChange={(event) => setAnswerKey(event.target.value)}
              required
              className={FIELD}
            >
              <option value="">Choose the corrected answer</option>
              {(question?.choices ?? []).map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {`${choice.id} — ${choice.text.en}`}
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-2 text-xs text-neutral-500">
          Currently recorded: {answers?.[questionId] || 'not answered'}
        </p>
        <label className="mt-4 block text-sm font-medium" htmlFor={`note-${userId}`}>
          Why this correction is being made
          <textarea
            id={`note-${userId}`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            required
            rows={3}
            maxLength={NOTE_MAX}
            placeholder="e.g. Participant reported tapping D by mistake and confirmed C in the room."
            className="mt-2 w-full rounded-xl border border-neutral-300 p-4 font-normal"
          />
        </label>
        <p className="mt-1 text-xs text-neutral-400">
          {note.length} / {NOTE_MAX} characters · saved to the audit trail
        </p>
        <button type="submit" disabled={busy || !answerKey || !note.trim()} className={`${PRIMARY} mt-4`}>
          Apply correction
        </button>
      </form>

      {audit.length > 0 && (
        <div className="mt-7 border-t border-neutral-200 pt-6">
          <p className={LABEL}>Correction history</p>
          <ul className="mt-4 space-y-3">
            {audit.map((entry, index) => (
              <li key={`${entry.question_id}-${entry.at}-${index}`} className="rounded-2xl bg-[#edf3e9] p-4">
                <p className="text-sm font-medium">
                  {entry.question_id}: {entry.from || 'no answer'} &rarr; {entry.to}
                </p>
                <p className="mt-1 text-sm text-neutral-700">{entry.note}</p>
                <p className="mt-1 text-xs text-neutral-500">
                  {new Date(entry.at).toLocaleString()} · {entry.by}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
