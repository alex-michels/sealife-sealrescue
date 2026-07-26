import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { cx } from '../ui/cx'
import { StampIcon } from '../ui/VerificationStamp'
import { provenanceMarks, type ProvenanceFacts, type ProvenanceTone } from '@/content/provenance'

export { provenanceMarks }
export type {
  ProvenanceFacts,
  ProvenanceMark,
  ProvenanceMarkKey,
  ProvenanceTone,
} from '@/content/provenance'

/**
 * Provenance-шкала материала (CLAUDE.md инвариант №5, EU AI Act Art. 50, Roadmap **EU-11**).
 *
 * Раньше здесь жил один булев `aiGenerated` → одна фраза «Подготовлено с участием AI». Схема
 * (`src/fields/provenance.ts`) с тех пор различает пять разных утверждений, и слепить их обратно
 * в одну строку значит соврать: «черновик писал AI, но человек вычитал» и «машинный перевод,
 * который никто не читал» — это принципиально разные обещания читателю.
 *
 * ## Правила честности (важнее вёрстки)
 * 1. **Ничего не выставлено — ничего не рендерим.** Пустая шкала = отсутствие утверждения.
 *    Молчание честнее, чем неявное «написано человеком», которого никто не подтверждал.
 * 2. **`humanReviewed` — сильнее AI-флагов и визуально отличается** (штамп-иконка, полужирный,
 *    другой фон): именно на него читатель опирается. Дата ревью показывается, когда она есть.
 * 3. **Легаси `aiGenerated` не теряем:** если группа пуста, а старый флаг стоит, отдаём старую
 *    общую формулировку — на ней держатся уже засеянные строки. Как только заполнена группа,
 *    общая метка уходит: конкретика вытесняет обобщение, а не дублируется рядом с ним.
 * 4. **Цвет — не единственный носитель смысла** (WCAG 2.2 AA): у каждой метки свой текст и своя
 *    иконка, разница читается и в ч/б.
 *
 * Компонент чистый и презентационный: вся логика выбора меток — в `provenanceMarks()`
 * (покрыта `tests/unit/ai-badge.unit.spec.ts`).
 */

const toneClass: Record<ProvenanceTone, string> = {
  ai: 'border-border bg-surface text-muted',
  verified: 'border-border-cool bg-surface text-primary',
  human: 'border-border-cool bg-surface-info font-semibold text-primary',
}

/** Глиф для machine/verified; у человеческой метки — штамп-иконка (см. `MarkIcon`). */
const toneGlyph: Record<Exclude<ProvenanceTone, 'human'>, string> = {
  ai: '⚙',
  verified: '✓',
}

function MarkIcon({ tone }: { tone: ProvenanceTone }) {
  if (tone === 'human') return <StampIcon verified />
  return <span aria-hidden="true">{toneGlyph[tone]}</span>
}

export function AiBadge({
  locale,
  provenance,
  aiGenerated,
  className,
}: {
  locale: Locale
  provenance?: ProvenanceFacts | null
  /** Устаревший одиночный флаг; используется, только когда группа пуста. */
  aiGenerated?: boolean | null
  className?: string
}) {
  const marks = provenanceMarks(locale, provenance, aiGenerated)
  if (marks.length === 0) return null

  return (
    <ul
      aria-label={t(locale, 'provTitle')}
      className={cx('mt-4 flex list-none flex-wrap items-center gap-2', className)}
    >
      {marks.map((mark) => (
        <li
          key={mark.key}
          className={cx(
            'inline-flex items-center gap-1.5 rounded-btn border px-3 py-1 font-mono text-xs',
            toneClass[mark.tone],
          )}
        >
          <MarkIcon tone={mark.tone} />
          {mark.label}
        </li>
      ))}
    </ul>
  )
}
