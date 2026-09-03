import * as React from 'react'

import { cn } from '@/lib/utils'

/**
 * A stable set of background colors for the initials fallback, picked by
 * hashing the person's id so the same person always lands on the same color
 * across rows and pages without needing to store a color anywhere.
 */
const AVATAR_COLORS = [
  '#b45309',
  '#0f766e',
  '#4338ca',
  '#be123c',
  '#166534',
  '#a16207',
  '#1d4ed8',
  '#9d174d',
]

function colorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export interface AvatarPerson {
  id: string
  fullName: string
  preferredName?: string | null
  photoUrl?: string | null
}

/**
 * A small circular avatar: the person's photo when `photoUrl` is set, else
 * their first initial on a color derived from their id. Used anywhere a task's
 * assignee is shown, so the same person reads the same everywhere.
 */
export function Avatar({
  person,
  size = 20,
  className,
}: {
  person: AvatarPerson
  size?: number
  className?: string
}) {
  const name = person.preferredName?.trim() || person.fullName
  const initial = name.trim().charAt(0).toUpperCase() || '?'

  if (person.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- farm-internal
      // admin tool; a plain <img> sidesteps next/image's remote-host allowlist
      // for what is otherwise a purely decorative thumbnail.
      <img
        src={person.photoUrl}
        alt=""
        width={size}
        height={size}
        className={cn('shrink-0 rounded-full object-cover', className)}
        style={{ width: size, height: size }}
      />
    )
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white',
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: colorForId(person.id),
        fontSize: Math.max(10, Math.round(size * 0.45)),
      }}
    >
      {initial}
    </span>
  )
}
