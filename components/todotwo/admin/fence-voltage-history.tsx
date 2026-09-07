'use client'

import { useEffect, useState } from 'react'

type Reading = { id: number; date: string; recordedAt: string; person: string; goat_fence_kv: number; pig_fence_kv: number }

export function FenceVoltageHistory() {
  const [readings, setReadings] = useState<Reading[]>([])
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { fetch('/api/admin/fence-readings', { cache: 'no-store' }).then(async (response) => {
    const result = await response.json() as { readings?: Reading[]; error?: string }
    if (!response.ok) throw new Error(result.error ?? 'Could not load readings')
    setReadings(result.readings ?? [])
  }).catch((caught) => setError(caught instanceof Error ? caught.message : 'Could not load readings')) }, [])

  return <div className="space-y-5">
    <div><h2 className="text-2xl font-light text-neutral-900">Fence voltage history</h2><p className="mt-1 text-sm text-neutral-500">Daily readings from the morning goat routine, in kilovolts.</p></div>
    {error ? <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p> : null}
    <div className="overflow-x-auto rounded-xl border border-neutral-200">
      <table className="w-full min-w-[620px] text-left text-sm">
        <thead className="bg-neutral-50 text-neutral-500"><tr><th className="px-4 py-3 font-medium">Date</th><th className="px-4 py-3 font-medium">Goat fence · barn</th><th className="px-4 py-3 font-medium">Pig fence · workshop</th><th className="px-4 py-3 font-medium">Recorded by</th><th className="px-4 py-3 font-medium">Time</th></tr></thead>
        <tbody>{readings.map((reading) => <tr key={reading.id} className="border-t border-neutral-200"><td className="px-4 py-3">{reading.date}</td><td className="px-4 py-3 font-medium">{reading.goat_fence_kv.toFixed(1)} kV</td><td className="px-4 py-3 font-medium">{reading.pig_fence_kv.toFixed(1)} kV</td><td className="px-4 py-3">{reading.person}</td><td className="px-4 py-3 text-neutral-500">{new Date(reading.recordedAt).toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Oslo' })}</td></tr>)}</tbody>
      </table>
      {readings.length === 0 && !error ? <p className="p-8 text-center text-sm text-neutral-500">No readings recorded yet.</p> : null}
    </div>
  </div>
}


