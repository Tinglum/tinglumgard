'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, RotateCcw } from 'lucide-react'
import { parseMinutes } from '@/lib/bnimsp/util'

// Counts up while rehearsing; turns amber/red as you approach/exceed the slide target.
export function PracticeTimer({ timing, slideN }: { timing: string; slideN: number }) {
  const target = parseMinutes(timing) * 60 // seconds
  const [seconds, setSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const tick = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reset whenever the slide changes.
  useEffect(() => {
    setSeconds(0)
    setRunning(true)
  }, [slideN])

  useEffect(() => {
    if (running) {
      tick.current = setInterval(() => setSeconds((s) => s + 1), 1000)
    }
    return () => { if (tick.current) clearInterval(tick.current) }
  }, [running])

  const over = target > 0 && seconds > target
  const near = target > 0 && !over && seconds > target * 0.8
  const color = over ? 'text-[var(--bni-red)]' : near ? 'text-amber-500' : 'text-white'

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')

  return (
    <div className="flex items-center gap-3">
      <span className={`font-mono text-2xl font-bold tabular-nums ${color}`}>
        {mm}:{ss}
      </span>
      {target > 0 && (
        <span className="text-xs text-zinc-400">/ {parseMinutes(timing)}:00 mål</span>
      )}
      <div className="ml-1 flex items-center gap-1">
        <button
          onClick={() => setRunning((r) => !r)}
          className="rounded-md bg-white/10 p-1.5 text-white hover:bg-white/20"
          aria-label={running ? 'Pause' : 'Start'}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </button>
        <button
          onClick={() => { setSeconds(0); setRunning(true) }}
          className="rounded-md bg-white/10 p-1.5 text-white hover:bg-white/20"
          aria-label="Nullstill"
        >
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
