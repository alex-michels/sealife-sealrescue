'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Locale } from '@/i18n/config'
import { navSectionsForSite } from '@/site/sections'
import type { SiteId } from '@/site/config'
import { cx } from './ui/cx'

/**
 * Основная навигация по разделам сайта (M0-T19). Клиентский компонент только ради
 * подсветки активного раздела (usePathname → aria-current). Набор разделов зависит
 * от сайта (sealife ≠ sealrescue). На /de-legal не рендерится (см. SiteHeader).
 */
export function SectionNav({ site, locale }: { site: SiteId; locale: Locale }) {
  const pathname = usePathname() || ''
  const items = navSectionsForSite(site)
  if (items.length === 0) return null

  return (
    <nav aria-label={locale === 'en' ? 'Sections' : 'Разделы'} className="border-t border-border">
      <ul className="mx-auto flex max-w-5xl flex-wrap gap-1 px-3 py-1.5 text-sm">
        {items.map((s) => {
          const href = `/${locale}/${s.slug}`
          const active = pathname === href || pathname.startsWith(`${href}/`)
          return (
            <li key={s.slug}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cx(
                  'inline-flex min-h-8 items-center rounded-btn px-3 py-1 transition-colors',
                  active ? 'bg-surface-info text-text' : 'text-muted hover:text-text',
                )}
              >
                {s.label[locale]}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
