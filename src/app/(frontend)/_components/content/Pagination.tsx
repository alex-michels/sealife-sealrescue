import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { pageHref, pageWindow } from '@/content/pagination'
import { cx } from '../ui/cx'

const copy = {
  ru: {
    nav: 'Страницы',
    prev: 'Назад',
    next: 'Дальше',
    page: 'Страница',
    current: 'Текущая страница',
  },
  en: { nav: 'Pages', prev: 'Previous', next: 'Next', page: 'Page', current: 'Current page' },
} as const

/**
 * Пагинация списка (**CR-07**). Серверный компонент: обычные ссылки, ноль клиентского JS.
 *
 * Доступность (WCAG 2.2 AA, как весь проект): это `nav` с подписью, текущая страница помечена
 * `aria-current="page"`, у каждой ссылки есть внятное имя («Страница 3»), а цель нажатия —
 * не меньше 44px, потому что 24×24 это минимум, а не хорошая идея для пальца.
 */
export function Pagination({
  locale,
  basePath,
  page,
  totalPages,
  params = {},
}: {
  locale: Locale
  /** Путь раздела без query, например `/ru/articles`. */
  basePath: string
  page: number
  totalPages: number
  /** Прочие параметры, которые нужно сохранить в ссылках (например `topic`). */
  params?: Record<string, string | undefined>
}) {
  if (totalPages <= 1) return null // одна страница — навигация была бы шумом
  const t = copy[locale]

  const cell =
    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn px-3 text-sm transition-colors'

  return (
    <nav aria-label={t.nav} className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1">
        {page > 1 && (
          <li>
            <Link
              href={pageHref(basePath, page - 1, params)}
              rel="prev"
              className={cx(cell, 'text-muted hover:text-text')}
            >
              ← {t.prev}
            </Link>
          </li>
        )}

        {pageWindow(page, totalPages).map((p, i) =>
          p === null ? (
            <li key={`gap-${i}`} aria-hidden="true" className={cx(cell, 'text-muted')}>
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={pageHref(basePath, p, params)}
                aria-label={`${t.page} ${p}`}
                aria-current={p === page ? 'page' : undefined}
                className={cx(
                  cell,
                  p === page
                    ? 'bg-surface-info font-semibold text-text'
                    : 'text-muted hover:text-text',
                )}
              >
                {p}
              </Link>
            </li>
          ),
        )}

        {page < totalPages && (
          <li>
            <Link
              href={pageHref(basePath, page + 1, params)}
              rel="next"
              className={cx(cell, 'text-muted hover:text-text')}
            >
              {t.next} →
            </Link>
          </li>
        )}
      </ul>
    </nav>
  )
}
