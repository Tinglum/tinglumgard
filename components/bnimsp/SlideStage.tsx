'use client'

import Image from 'next/image'
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react'
import type { Slide } from '@/lib/bnimsp/types'

interface Props {
  slide: Slide
  total: number
  onPrev: () => void
  onNext: () => void
}

export function SlideStage({ slide, total, onPrev, onNext }: Props) {
  return (
    <div>
      <div className="group relative overflow-hidden rounded-2xl border border-[var(--bni-line)] bg-black shadow-sm">
        <Image
          key={slide.n}
          src={slide.image}
          alt={slide.title || `Slide ${slide.n}`}
          width={1600}
          height={900}
          className="h-auto w-full"
          priority
        />
        <button
          onClick={onPrev}
          disabled={slide.n <= 1}
          className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
          aria-label="Forrige slide"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={onNext}
          disabled={slide.n >= total}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white opacity-0 transition-opacity hover:bg-black/70 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-0"
          aria-label="Neste slide"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
        <span className="absolute bottom-2 right-2 rounded-md bg-black/60 px-2 py-0.5 text-xs font-medium text-white">
          {slide.n} / {total}
        </span>
      </div>

      <div className="mt-3 flex items-start justify-between gap-4">
        <h1 className="text-xl font-extrabold leading-snug">{slide.title || `Slide ${slide.n}`}</h1>
        {slide.timing && (
          <span className="mt-1 inline-flex shrink-0 items-center gap-1.5 rounded-full bg-zinc-100 px-3 py-1 text-sm font-medium text-[var(--bni-ink)]">
            <Clock className="h-4 w-4 text-[var(--bni-red)]" />
            {slide.timing}
          </span>
        )}
      </div>
    </div>
  )
}
