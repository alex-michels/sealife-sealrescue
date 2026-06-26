import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { topicLabel, type TopicSlug } from '@/content/topics'
import { cx } from '../ui/cx'

/**
 * Фильтр каталога/галереи по теме (M1-T02). Реализован ссылками (?topic=slug) —
 * без client-JS, работает с серверной фильтрацией и сохраняет SSR/доступность.
 * Активная тема помечена aria-current; «Все» сбрасывает фильтр. Цель ≥ 24px (WCAG 2.2).
 *
 * Показываем только темы, реально присутствующие в текущем наборе (available).
 */
export function TopicFilter({
  locale,
  basePath,
  available,
  active,
}: {
  locale: Locale
  basePath: string
  available: TopicSlug[]
  active?: TopicSlug
}) {
  if (available.length === 0) return null

  const chip = (key: string, label: string, href: string, isActive: boolean) => (
    <Link
      key={key}
      href={href}
      aria-current={isActive ? 'true' : undefined}
      className={cx(
        'inline-flex min-h-6 items-center rounded-btn border px-3 py-1 text-sm transition-colors',
        isActive
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-surface text-text hover:bg-surface-info',
      )}
    >
      {label}
    </Link>
  )

  return (
    <nav aria-label={t(locale, 'filterByTopic')} className="mt-6 flex flex-wrap gap-2">
      {chip('all', t(locale, 'filterAll'), basePath, !active)}
      {available.map((slug) =>
        chip(slug, topicLabel(slug, locale), `${basePath}?topic=${slug}`, active === slug),
      )}
    </nav>
  )
}
