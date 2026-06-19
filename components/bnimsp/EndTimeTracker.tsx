'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, AlertTriangle, AlertCircle, Flag, Pencil, Power, RotateCcw } from 'lucide-react'

const END_TIME_KEY = 'bnimsp:endtime'
const END_TIME_ENABLED_KEY = 'bnimsp:endtime:enabled'

function fmt(ms: number): string {
  const neg = ms < 0
  let s = Math.floor(Math.abs(ms) / 1000)
  const h = Math.floor(s / 3600); s -= h * 3600
  const m = Math.floor(s / 60); s -= m * 60
  const pad = (x: number) => String(x).padStart(2, '0')
  const body = h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
  return (neg ? '−' : '') + body
}

function endTimestampToday(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date()
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

/**
 * Presenter end-time tracker. The AD sets when the training must end; this shows
 * a live countdown to that time and a traffic light for whether the CURRENT
 * slide is on schedule to finish the whole program by then.
 *
 * delay = (program time still left from this slide) − (clock time left to end).
 *   delay ≤ 0   → green (on track / ahead)
 *   1–20 min    → yellow
 *   > 20 min    → red
 */
export function EndTimeTracker({ programMin, cumStartMin }: { programMin: number; cumStartMin: number }) {
  const [endTime, setEndTime] = useState('')
  const [enabled, setEnabled] = useState(true)
  const [editing, setEditing] = useState(false)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const saved = localStorage.getItem(END_TIME_KEY) || ''
    const savedEnabled = localStorage.getItem(END_TIME_ENABLED_KEY)
    const nextEnabled = savedEnabled !== '0'
    setEndTime(saved)
    setEnabled(nextEnabled)
    setEditing(nextEnabled && !saved)
  }, [])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  function persist(nextTime: string, nextEnabled: boolean) {
    try {
      if (nextTime) localStorage.setItem(END_TIME_KEY, nextTime)
      else localStorage.removeItem(END_TIME_KEY)
      localStorage.setItem(END_TIME_ENABLED_KEY, nextEnabled ? '1' : '0')
    } catch { /* ignore */ }
  }

  function save(v: string) {
    setEndTime(v)
    setEnabled(true)
    persist(v, true)
    if (v) setEditing(false)
  }

  function reset() {
    setEndTime('')
    setEnabled(true)
    setEditing(true)
    persist('', true)
  }

  function turnOff() {
    setEnabled(false)
    setEditing(false)
    persist(endTime, false)
  }

  function turnOn() {
    setEnabled(true)
    setEditing(!endTime)
    persist(endTime, true)
  }

  if (!enabled) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-zinc-300">
          <Power className="h-4 w-4" />
          <span>Slutttid av</span>
        </div>
        <button
          onClick={turnOn}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          title="Slå på slutttid"
        >
          <Flag className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  if (!endTime || editing) {
    return (
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-sm">
          <Flag className="h-4 w-4 text-zinc-300" />
          <span className="text-zinc-300">Slutttid</span>
          <input
            type="time"
            defaultValue={endTime}
            onChange={(e) => e.target.value && save(e.target.value)}
            className="bg-transparent text-white outline-none [color-scheme:dark]"
            autoFocus
          />
        </label>
        <button
          onClick={turnOff}
          className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
          title="Slå av slutttid"
        >
          <Power className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  const remainingMs = endTimestampToday(endTime) - now
  const remainingMin = remainingMs / 60000
  const scheduledRemainingMin = programMin - cumStartMin
  const delayMin = scheduledRemainingMin - remainingMin // > 0 = behind schedule

  const status = delayMin <= 0 ? 'green' : delayMin <= 20 ? 'yellow' : 'red'
  const cfg = {
    green: { Icon: CheckCircle2, ring: 'border-emerald-400/40 bg-emerald-500/15', text: 'text-emerald-300', label: 'I rute' },
    yellow: { Icon: AlertTriangle, ring: 'border-amber-400/40 bg-amber-500/15', text: 'text-amber-300', label: `${Math.round(delayMin)} min bak` },
    red: { Icon: AlertCircle, ring: 'border-red-400/50 bg-red-500/20', text: 'text-red-300', label: `${Math.round(delayMin)} min bak` },
  }[status]
  const Icon = cfg.Icon

  return (
    <div className="flex items-center gap-2">
      <div className={`flex items-center gap-2.5 rounded-lg border ${cfg.ring} px-3 py-1.5`}>
        <Icon className={`h-6 w-6 shrink-0 ${cfg.text}`} />
        <div className="leading-tight">
          <div className={`font-mono text-xl font-bold tabular-nums ${remainingMs < 0 ? 'text-red-300' : 'text-white'}`}>
            {fmt(remainingMs)}
          </div>
          <div className={`text-[10px] font-semibold uppercase tracking-wide ${cfg.text}`}>
            {cfg.label} · slutt {endTime}
          </div>
        </div>
      </div>
      <button
        onClick={() => setEditing(true)}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        title="Endre sluttid"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={reset}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        title="Nullstill slutttid"
      >
        <RotateCcw className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={turnOff}
        className="rounded-md p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
        title="Slå av slutttid"
      >
        <Power className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
