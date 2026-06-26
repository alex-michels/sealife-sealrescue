import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'

/**
 * Provenance-метка (AI-прозрачность, CLAUDE.md §5 / EU AI Act Art. 50): честно
 * сообщает, что материал подготовлен с участием AI. Видна пользователю.
 */
export function AiBadge({ locale }: { locale: Locale }) {
  return (
    <p className="mt-4 inline-block rounded-btn bg-surface px-3 py-1 font-mono text-xs text-muted">
      ⚙ {t(locale, 'aiGenerated')}
    </p>
  )
}
