import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { cx } from '../ui/cx'

/**
 * Демо-переключатель состояний списка (только в моке, M0-T19): populated / empty /
 * loading / error. Цель мока — проверить ВСЕ состояния (DESIGN_BRIEF §4c/§11), поэтому
 * каждое достижимо по ссылке `?state=`. В проде этого переключателя не будет.
 */
export type MockState = 'populated' | 'empty' | 'loading' | 'error'

export const parseState = (value?: string | string[]): MockState => {
  const v = Array.isArray(value) ? value[0] : value
  return v === 'empty' || v === 'loading' || v === 'error' ? v : 'populated'
}

export function StateSwitcher({
  basePath,
  locale,
  current,
}: {
  basePath: string
  locale: Locale
  current: MockState
}) {
  const c = m(locale)
  const items: Array<{ key: MockState; label: string; href: string }> = [
    { key: 'populated', label: c.statePopulated, href: basePath },
    { key: 'empty', label: c.stateEmpty, href: `${basePath}?state=empty` },
    { key: 'loading', label: c.stateLoading, href: `${basePath}?state=loading` },
    { key: 'error', label: c.stateError, href: `${basePath}?state=error` },
  ]
  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 text-xs">
      <span className="font-mono text-muted">{c.stateLabel}</span>
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          aria-current={it.key === current ? 'true' : undefined}
          className={cx(
            'inline-flex min-h-6 items-center rounded-btn border px-2.5 py-1 transition-colors',
            it.key === current
              ? 'border-border-cool bg-surface-info text-text'
              : 'border-border text-muted hover:text-text',
          )}
        >
          {it.label}
        </Link>
      ))}
    </div>
  )
}
