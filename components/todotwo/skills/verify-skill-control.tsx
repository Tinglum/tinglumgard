'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

import { Button } from '@/components/todotwo/ui/button'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

const LEVELS = ['novice', 'competent', 'proficient', 'expert'] as const
type Level = (typeof LEVELS)[number]

const LEVEL_LABEL: Record<Level, string> = {
  novice: 'Novice',
  competent: 'Competent',
  proficient: 'Proficient',
  expert: 'Expert',
}

/**
 * Staff verifying a skill on someone else's behalf. Calls
 * todotwo.set_skill_verification(), the only path that may ever write
 * admin_verified_level or authorized_unsupervised — the function re-checks
 * is_staff() itself rather than trusting that this control is only ever
 * rendered for staff, per RLS.md.
 */
export function VerifySkillControl({
  personId,
  skillId,
  verifiedLevel,
  authorizedUnsupervised,
}: {
  personId: string
  skillId: string
  verifiedLevel: string | null
  authorizedUnsupervised: boolean
}) {
  const router = useRouter()
  const [level, setLevel] = React.useState<Level | ''>((verifiedLevel as Level) || '')
  const [unsupervised, setUnsupervised] = React.useState(authorizedUnsupervised)
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save() {
    if (!level) {
      setError('Choose a level.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('set_skill_verification', {
        p_person_id: personId,
        p_skill_id: skillId,
        p_verified_level: level,
        p_authorized_unsupervised: unsupervised,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const field =
    'min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]'

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="flex items-center gap-1 text-[12px] text-[var(--tt-ink-2)]">
          <input
            type="checkbox"
            checked={unsupervised}
            onChange={(event) => setUnsupervised(event.target.checked)}
            className="h-4 w-4"
          />
          Unsupervised
        </label>
        <select
          value={level}
          onChange={(event) => setLevel(event.target.value as Level)}
          className={field}
          aria-label="Verified level"
        >
          <option value="" disabled>
            {verifiedLevel ? LEVEL_LABEL[verifiedLevel as Level] : 'Not verified'}
          </option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
        <Button size="sm" variant="primary" disabled={pending} onClick={save}>
          {pending ? 'Saving …' : 'Verify'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[12px] text-[var(--tt-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  )
}
