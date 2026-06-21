import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'

/** Sample-данные нельзя выдавать за реальные (DESIGN_BRIEF §11) — честная плашка на каждой mock-странице. */
export function MockBanner({ locale }: { locale: Locale }) {
  return (
    <p
      role="note"
      className="my-6 rounded-card border border-border-cool bg-surface-info px-4 py-2 font-mono text-xs text-text"
    >
      ⚓ {m(locale).mockNotice}
    </p>
  )
}
