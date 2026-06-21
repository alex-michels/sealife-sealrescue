import { cx } from '../ui/cx'

/**
 * Заглушка медиа для design-mock (M0-T19): инлайновый SVG, БЕЗ внешних картинок и
 * provider-URL (DESIGN_BRIEF §11). Тинт чередуется по seed — чтобы сетка не выглядела
 * монотонной. aspect фиксирован заранее → без CLS (§14). Декоративна (aria-hidden).
 */
const tints = ['bg-surface-info', 'bg-surface-warm', 'bg-surface'] as const

export function PlaceholderMedia({
  seed = 0,
  label,
  className,
}: {
  seed?: number
  label?: string
  className?: string
}) {
  const tint = tints[Math.abs(seed) % tints.length]
  return (
    <div
      aria-hidden="true"
      className={cx(
        'relative flex aspect-[16/10] items-center justify-center overflow-hidden dapple',
        tint,
        className,
      )}
    >
      <svg viewBox="0 0 120 80" fill="none" className="h-1/2 w-1/2 text-accent-cool">
        <path
          d="M18 58c0-17 15-30 36-30 23 0 42 9 54 24 4 5 0 8-6 8H28c-6 0-10-1-10-2z"
          fill="currentColor"
          opacity="0.26"
        />
        <circle cx="44" cy="40" r="2.6" fill="currentColor" opacity="0.6" />
      </svg>
      {label && (
        <span className="absolute bottom-2 right-3 font-mono text-[10px] uppercase tracking-wide text-muted">
          {label}
        </span>
      )}
    </div>
  )
}
