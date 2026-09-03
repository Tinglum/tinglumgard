'use client'

import { useCallback, useEffect, useState } from 'react'

import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

/**
 * Unauthenticated "what's happening today" board.
 *
 * Deliberately OUTSIDE app/todotwo/(app), so it never passes through
 * requireTodoTwoUser: no login, no session, no cookie needed. It is meant to
 * be opened directly on a known URL (a kiosk tablet, a link sent before
 * arrival) — nothing in the authenticated app links here, and this page
 * links to nothing else in the app.
 *
 * The only data this page can ever see is whatever
 * todotwo.public_today_board() returns: title, project name, first name,
 * status, due time. No ids, no contact details, no client-supplied date —
 * see supabase/migrations/20260909091500_todotwo_public_today_board.sql.
 */

interface BoardRow {
  title: string
  project_name: string | null
  first_name: string
  status: string
  due_time: string | null
}

const REFRESH_MS = 90_000

const STATUS_LABEL: Record<string, string> = {
  unassigned: 'Unassigned',
  assigned: 'Assigned',
  accepted: 'Accepted',
  in_progress: 'In progress',
  blocked: 'Blocked',
  completed: 'Done',
  awaiting_verification: 'Done',
  verified: 'Done',
  not_completed: 'Not done',
}

export default function TodoTwoPublicBoardPage() {
  const [rows, setRows] = useState<BoardRow[] | null>(null)
  const [error, setError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null)

  const load = useCallback(async () => {
    try {
      const client = getTodoTwoBrowserClient()
      const { data, error: rpcError } = await client.rpc('public_today_board')
      if (rpcError) {
        setError(true)
        return
      }
      setError(false)
      setRows((data ?? []) as BoardRow[])
      setUpdatedAt(new Date())
    } catch {
      setError(true)
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, REFRESH_MS)
    return () => clearInterval(interval)
  }, [load])

  return (
    <main className="min-h-screen bg-[#faf8f4] px-8 py-10 text-[#20261f]">
      <header className="mb-8 flex items-baseline justify-between">
        <h1 className="text-4xl font-semibold tracking-tight">Today on the farm</h1>
        {updatedAt && (
          <p className="text-lg text-[#6b6f63]">
            Updated{' '}
            {updatedAt.toLocaleTimeString('en-GB', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Europe/Oslo',
            })}
          </p>
        )}
      </header>

      {error && (
        <p className="text-2xl text-[#8a4b3b]">Could not load the board. Trying again shortly.</p>
      )}

      {!error && rows === null && <p className="text-2xl text-[#6b6f63]">Loading&hellip;</p>}

      {!error && rows !== null && rows.length === 0 && (
        <p className="text-2xl text-[#6b6f63]">Nothing on the board for today.</p>
      )}

      {!error && rows !== null && rows.length > 0 && (
        <ul className="flex list-none flex-col gap-4">
          {rows.map((row, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-6 rounded-2xl border border-[#e5e0d5] bg-white px-6 py-5 shadow-sm"
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="truncate text-2xl font-medium">{row.title}</span>
                <span className="text-lg text-[#6b6f63]">
                  {row.project_name ? `${row.project_name} · ` : ''}
                  {row.first_name}
                </span>
              </div>
              <div className="flex flex-shrink-0 flex-col items-end gap-1">
                {row.due_time && <span className="text-2xl font-semibold">{row.due_time}</span>}
                <span className="text-lg text-[#6b6f63]">
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}
