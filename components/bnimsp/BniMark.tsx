// Simple BNI wordmark in brand red. Used for page chrome (slides carry the real logo).
export function BniMark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-extrabold tracking-tight ${className}`}>
      <span className="text-[var(--bni-red)]">BNI</span>
      <span className="ml-1 text-[0.6em] font-semibold uppercase tracking-[0.18em] text-[var(--bni-ink)]">
        MSP
      </span>
    </span>
  )
}
