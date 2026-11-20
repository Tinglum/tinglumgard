import { SkeletonLine, Surface } from '@/components/todotwo/ui/states'

export default function TodoTwoLoading() {
  return (
    <div
      className="mx-auto flex w-full max-w-4xl flex-col gap-5"
      role="status"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className="flex flex-col gap-2">
        <SkeletonLine className="h-3 w-28" />
        <SkeletonLine className="h-7 w-52" />
        <div className="mt-1 flex gap-2">
          <SkeletonLine className="h-7 w-28 rounded-full" />
          <SkeletonLine className="h-7 w-28 rounded-full" />
          <SkeletonLine className="h-7 w-24 rounded-full" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1.5 rounded-2xl bg-[var(--tt-surface-2)] p-1">
        <SkeletonLine className="h-9 rounded-xl bg-[var(--tt-surface)]" />
        <SkeletonLine className="h-9 rounded-xl" />
        <SkeletonLine className="h-9 rounded-xl" />
      </div>

      <Surface className="flex flex-col gap-4 p-4 sm:p-5">
        <SkeletonLine className="h-3 w-32" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 border-b border-[var(--tt-rule)] pb-3 last:border-b-0 last:pb-0"
          >
            <div className="h-6 w-6 shrink-0 animate-pulse rounded-full bg-[var(--tt-surface-2)]" />
            <div className="flex flex-1 flex-col gap-1.5">
              <SkeletonLine className="h-4 w-3/4" />
              <SkeletonLine className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </Surface>

      <span className="sr-only">Loading…</span>
    </div>
  )
}
