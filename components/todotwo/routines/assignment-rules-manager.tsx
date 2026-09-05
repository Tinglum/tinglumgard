'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'
import type { AssignmentRule } from '@/lib/todotwo/domain/assignment-rules'

interface ProposedRule {
  kind: string
  payload: Record<string, unknown>
  label: string
}

/**
 * The rules the nightly round runs on.
 *
 * They used to be constants in the source, which meant switching one off for
 * a week needed a developer. Each row here is a database row the cron reads,
 * so a toggle takes effect on the next run.
 *
 * Switching off is kept distinct from deleting on purpose: "no meals rule
 * this week because we are short-handed" is a different act from "we never
 * did it that way".
 */
export function AssignmentRulesManager({
  rules,
  canEdit,
}: {
  rules: AssignmentRule[]
  canEdit: boolean
}) {
  const router = useRouter()
  const [pending, setPending] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const [text, setText] = React.useState('')
  const [parsing, setParsing] = React.useState(false)
  const [proposed, setProposed] = React.useState<ProposedRule[] | null>(null)
  const [rejected, setRejected] = React.useState<string[]>([])
  const [summary, setSummary] = React.useState<string | null>(null)

  async function toggle(rule: AssignmentRule) {
    setPending(rule.id)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: updateError } = await supabase
      .from('assignment_rules')
      .update({ enabled: !rule.enabled })
      .eq('id', rule.id)

    setPending(null)
    if (updateError) {
      setError(`Could not change that: ${updateError.message}`)
      return
    }
    router.refresh()
  }

  async function remove(rule: AssignmentRule) {
    setPending(rule.id)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const { error: deleteError } = await supabase
      .from('assignment_rules')
      .delete()
      .eq('id', rule.id)

    setPending(null)
    if (deleteError) {
      setError(`Could not remove that: ${deleteError.message}`)
      return
    }
    router.refresh()
  }

  async function parse() {
    setParsing(true)
    setError(null)
    setProposed(null)
    setRejected([])
    setSummary(null)

    try {
      const response = await fetch('/api/todotwo/rules/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() }),
      })

      const body = (await response.json()) as {
        ok?: boolean
        rules?: ProposedRule[]
        rejected?: string[]
        summary?: string
        message?: string
      }

      if (!response.ok || !body.ok) {
        setError(body.message ?? 'Could not read that. Try saying it another way.')
        return
      }

      setProposed(body.rules ?? [])
      setRejected(body.rejected ?? [])
      setSummary(body.summary ?? null)
    } catch {
      setError('Could not read that. Try again shortly.')
    } finally {
      setParsing(false)
    }
  }

  async function saveProposed() {
    if (!proposed || proposed.length === 0) return
    setParsing(true)
    setError(null)

    const supabase = getTodoTwoBrowserClient()
    const maxOrder = rules.reduce((max, r) => Math.max(max, r.sort_order), 0)

    const { error: insertError } = await supabase.from('assignment_rules').insert(
      proposed.map((r, i) => ({
        label: r.label,
        kind: r.kind,
        payload: r.payload,
        enabled: true,
        sort_order: maxOrder + (i + 1) * 10,
        source_text: text.trim(),
      }))
    )

    setParsing(false)
    if (insertError) {
      setError(`Could not save: ${insertError.message}`)
      return
    }

    setText('')
    setProposed(null)
    setSummary(null)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {rules.length === 0 ? (
          <li className="text-[13px] text-[var(--tt-ink-3)]">
            No rules yet — work is simply spread evenly.
          </li>
        ) : null}

        {rules.map((rule) => (
          <li
            key={rule.id}
            className="flex items-start justify-between gap-3 rounded-md border border-[var(--tt-rule)] p-3"
          >
            <div className="min-w-0">
              <p
                className={
                  rule.enabled
                    ? 'text-[14px]'
                    : 'text-[14px] text-[var(--tt-ink-3)] line-through'
                }
              >
                {rule.label}
              </p>
              {rule.source_text ? (
                <p className="text-[12px] text-[var(--tt-ink-3)]">“{rule.source_text}”</p>
              ) : null}
            </div>

            {canEdit ? (
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === rule.id}
                  onClick={() => toggle(rule)}
                >
                  {rule.enabled ? 'Turn off' : 'Turn on'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={pending === rule.id}
                  onClick={() => remove(rule)}
                  className="text-[var(--tt-danger)]"
                >
                  Remove
                </Button>
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {canEdit ? (
        <div className="flex flex-col gap-2 rounded-md border border-[var(--tt-rule)] p-3">
          <p className="text-[13px] font-medium">Add a rule</p>
          <p className="text-[12px] text-[var(--tt-ink-3)]">
            Say it plainly — “whoever does the greenhouse does not do the goats”, “Amber is off
            Thursdays”, “nobody does more than four things a day”. It will be shown back to you
            before it is kept.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={2}
            className="rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] p-2 text-[15px] text-[var(--tt-ink)]"
          />

          <div className="flex gap-2">
            <Button size="sm" variant="secondary" disabled={parsing || text.trim().length < 3} onClick={parse}>
              {parsing ? 'Reading …' : 'Read it'}
            </Button>
          </div>

          {summary ? <p className="text-[13px] text-[var(--tt-ink-2)]">{summary}</p> : null}

          {proposed && proposed.length > 0 ? (
            <div className="flex flex-col gap-2 rounded-md bg-[var(--tt-surface-2)] p-3">
              <p className="text-[13px] font-medium">This is what it will keep:</p>
              <ul className="list-disc pl-5 text-[13px] text-[var(--tt-ink-2)]">
                {proposed.map((r, i) => (
                  <li key={i}>{r.label}</li>
                ))}
              </ul>
              <div className="flex gap-2">
                <Button size="sm" disabled={parsing} onClick={saveProposed}>
                  Keep {proposed.length === 1 ? 'it' : 'them'}
                </Button>
                <Button size="sm" variant="ghost" disabled={parsing} onClick={() => setProposed(null)}>
                  Discard
                </Button>
              </div>
            </div>
          ) : null}

          {proposed && proposed.length === 0 && rejected.length === 0 ? (
            <p className="text-[13px] text-[var(--tt-ink-2)]">
              Nothing in that could be turned into a rule.
            </p>
          ) : null}

          {rejected.length > 0 ? (
            <div className="flex flex-col gap-1 rounded-md bg-[var(--tt-warn-soft)] p-3">
              {rejected.map((r, i) => (
                <p key={i} className="text-[13px] text-[var(--tt-ink-2)]">
                  {r}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="text-[13px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
