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
 * A person claiming (or updating) their own level for one skill. Calls
 * todotwo.claim_skill(), which upserts on (person_id, skill_id) as the caller
 * themselves — a Workawayer cannot pass someone else's person_id because the
 * function reads it from todotwo.current_person_id(), not an argument.
 */
export function ClaimSkillControl({
  skillId,
  claimedLevel,
}: {
  skillId: string
  claimedLevel: string | null
}) {
  const router = useRouter()
  const [level, setLevel] = React.useState<Level | ''>((claimedLevel as Level) || '')
  const [pending, setPending] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function save(nextLevel: Level) {
    setPending(true)
    setError(null)
    try {
      const supabase = getTodoTwoBrowserClient()
      const { error: rpcError } = await supabase.rpc('claim_skill', {
        p_skill_id: skillId,
        p_claimed_level: nextLevel,
      })
      if (rpcError) {
        setError(rpcError.message)
        return
      }
      setLevel(nextLevel)
      router.refresh()
    } finally {
      setPending(false)
    }
  }

  const field =
    'min-h-[36px] rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-2 text-[13px] text-[var(--tt-ink)]'

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <select
          value={level}
          onChange={(event) => {
            const next = event.target.value as Level
            setLevel(next)
          }}
          className={field}
          aria-label="Your claimed level"
        >
          <option value="" disabled>
            {claimedLevel ? LEVEL_LABEL[claimedLevel as Level] : 'Not claimed'}
          </option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {LEVEL_LABEL[l]}
            </option>
          ))}
        </select>
        <Button
          size="sm"
          variant="secondary"
          disabled={pending || !level || level === claimedLevel}
          onClick={() => level && save(level)}
        >
          {pending ? 'Saving …' : claimedLevel ? 'Update' : 'Claim'}
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
