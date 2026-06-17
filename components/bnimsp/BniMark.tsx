import Image from 'next/image'

// Official BNI wordmark (extracted from BNI brand assets), with an "MSP" tag.
// `variant` picks the red logo (light surfaces) or white logo (dark surfaces).
const RATIO = 729 / 300

export function BniMark({
  variant = 'red',
  height = 24,
  withMsp = true,
}: {
  variant?: 'red' | 'white'
  height?: number
  withMsp?: boolean
}) {
  const src = variant === 'white' ? '/bnimsp/bni-logo-white.png' : '/bnimsp/bni-logo.png'
  return (
    <span className="inline-flex items-center gap-2 align-middle">
      <Image
        src={src}
        alt="BNI"
        width={Math.round(height * RATIO)}
        height={height}
        priority
        className="block w-auto"
        style={{ height }}
      />
      {withMsp && (
        <span
          className={`text-[0.62em] font-bold uppercase tracking-[0.2em] ${
            variant === 'white' ? 'text-white/90' : 'text-[var(--bni-ink)]'
          }`}
          style={{ fontSize: Math.max(11, Math.round(height * 0.46)) }}
        >
          MSP
        </span>
      )}
    </span>
  )
}
