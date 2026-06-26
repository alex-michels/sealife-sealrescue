import { cx } from './cx'

/**
 * Signature-элемент sealife (DESIGN_BRIEF §4): «усатый» разделитель.
 * Тонкая SVG-линия, заканчивающаяся точками-«усами» (крап шкуры). Не растр.
 */
export function WhiskerDivider({ className }: { className?: string }) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      className={cx('flex items-center gap-3 text-muted', className)}
    >
      <span className="h-px flex-1 bg-border" />
      <svg width="72" height="14" viewBox="0 0 72 14" fill="none" aria-hidden="true">
        <circle cx="6" cy="7" r="2.2" fill="currentColor" />
        <circle cx="15" cy="7" r="1.4" fill="currentColor" />
        <path d="M22 7c8-3 16-3 28 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M22 7c8 3 16 3 28 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="57" cy="7" r="1.4" fill="currentColor" />
        <circle cx="66" cy="7" r="2.2" fill="currentColor" />
      </svg>
      <span className="h-px flex-1 bg-border" />
    </div>
  )
}
