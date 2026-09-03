'use client'

import * as React from 'react'
import { KeyRound, Trash2 } from 'lucide-react'

import { Button } from '@/components/todotwo/ui/button'
import { ErrorState, Surface } from '@/components/todotwo/ui/states'
import { getTodoTwoBrowserClient } from '@/lib/todotwo/db-browser'

interface PasskeyRow {
  id: string
  device_label: string | null
  created_at: string
  last_used_at: string | null
}

export function PasskeyManager() {
  const [rows, setRows] = React.useState<PasskeyRow[] | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const [adding, setAdding] = React.useState(false)
  const [deviceLabel, setDeviceLabel] = React.useState('')

  const load = React.useCallback(async () => {
    const supabase = getTodoTwoBrowserClient()
    const { data, error: loadError } = await supabase
      .from('webauthn_credentials')
      .select('id, device_label, created_at, last_used_at')
      .order('created_at', { ascending: false })

    if (loadError) {
      setError('Could not load your passkeys.')
      return
    }
    setRows((data ?? []) as PasskeyRow[])
  }, [])

  React.useEffect(() => {
    void load()
  }, [load])

  async function handleDelete(id: string) {
    const supabase = getTodoTwoBrowserClient()
    const { error: deleteError } = await supabase.from('webauthn_credentials').delete().eq('id', id)
    if (deleteError) {
      setError('Could not remove that passkey.')
      return
    }
    setRows((current) => current?.filter((row) => row.id !== id) ?? current)
  }

  async function handleAdd() {
    setError(null)
    setAdding(true)

    try {
      const { startRegistration } = await import('@simplewebauthn/browser')

      const optionsResponse = await fetch('/api/todotwo/auth/passkey/register-options', {
        method: 'POST',
      })
      if (!optionsResponse.ok) throw new Error('options_failed')
      const options = await optionsResponse.json()

      const attestation = await startRegistration({ optionsJSON: options })

      const verifyResponse = await fetch('/api/todotwo/auth/passkey/register-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: attestation,
          deviceLabel: deviceLabel.trim() || undefined,
        }),
      })

      if (!verifyResponse.ok) {
        setError('Could not save that passkey. Try again.')
        setAdding(false)
        return
      }

      setDeviceLabel('')
      setAdding(false)
      await load()
    } catch {
      // Cancelled, unsupported, or failed ceremony — a soft message is enough.
      setAdding(false)
      setError('Could not add a passkey. Cancelled, or your device does not support one here.')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <ErrorState title="Passkeys" description={error} /> : null}

      <Surface className="flex flex-col gap-3 p-4">
        <label htmlFor="tt-passkey-label" className="text-sm font-medium">
          Add a passkey
        </label>
        <div className="flex gap-2">
          <input
            id="tt-passkey-label"
            placeholder="e.g. My iPhone"
            value={deviceLabel}
            onChange={(event) => setDeviceLabel(event.target.value)}
            className="min-h-[44px] flex-1 rounded-md border border-[var(--tt-rule-strong)] bg-[var(--tt-surface)] px-3 text-[16px] text-[var(--tt-ink)]"
          />
          <Button type="button" onClick={handleAdd} disabled={adding}>
            <KeyRound className="h-4 w-4" aria-hidden="true" />
            {adding ? 'Waiting …' : 'Add passkey'}
          </Button>
        </div>
      </Surface>

      <Surface className="divide-y divide-[var(--tt-rule)]">
        {rows === null ? (
          <p className="p-4 text-sm text-[var(--tt-ink-2)]">Loading …</p>
        ) : rows.length === 0 ? (
          <p className="p-4 text-sm text-[var(--tt-ink-2)]">No passkeys registered yet.</p>
        ) : (
          rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 p-4">
              <div>
                <p className="text-sm font-medium">{row.device_label || 'Unnamed passkey'}</p>
                <p className="text-xs text-[var(--tt-ink-3)]">
                  Added {new Date(row.created_at).toLocaleDateString()}
                  {row.last_used_at
                    ? ` · last used ${new Date(row.last_used_at).toLocaleDateString()}`
                    : ' · never used'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(row.id)}
                aria-label="Remove passkey"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>
          ))
        )}
      </Surface>
    </div>
  )
}
