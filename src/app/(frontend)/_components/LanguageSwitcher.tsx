'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { locales, localeLabels, type Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { cx } from './ui/cx'

/**
 * Переключатель языка (DESIGN_BRIEF §9): названия ТЕКСТОМ, не флагами (язык ≠ страна);
 * виден в header + footer; доступен с клавиатуры и скринридера.
 *
 * Раскрывающийся список (disclosure): кнопка показывает текущий язык, по клику —
 * меню из трёх локалей. Закрытие: выбор, клик вне, Esc, уход фокуса. В футере
 * меню открывается вверх (`placement="up"`), чтобы не уезжать за нижний край.
 *
 * Язык хранится ТОЛЬКО после явного выбора (клик) — ставим cookie `NEXT_LOCALE`
 * здесь, а не автоматически в proxy (COMPLIANCE §3 / CLAUDE.md). slug канонический,
 * поэтому переключение = тот же путь с другим префиксом локали.
 */
const LOCALE_RE = new RegExp(`^/(${locales.join('|')})(?=/|$)`)
const ONE_YEAR = 60 * 60 * 24 * 365

export function LanguageSwitcher({
  current,
  placement = 'down',
}: {
  current: Locale
  placement?: 'up' | 'down'
}) {
  const pathname = usePathname() || `/${current}`
  const rest = pathname.replace(LOCALE_RE, '') // '' для главной, '/slug' для страницы
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const remember = (locale: Locale) => {
    document.cookie = `NEXT_LOCALE=${locale}; path=/; max-age=${ONE_YEAR}; samesite=lax`
  }

  return (
    <div
      ref={ref}
      className="relative"
      // Закрыть, когда фокус ушёл за пределы свитчера (Tab наружу).
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false)
      }}
    >
      <button
        type="button"
        aria-label={t(current, 'language')}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-btn border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-border-cool"
      >
        {localeLabels[current]}
        <svg
          aria-hidden="true"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          className={cx('transition-transform', open && 'rotate-180')}
        >
          <path
            d="M2.5 4.5 6 8l3.5-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <nav
        id={menuId}
        aria-label={t(current, 'language')}
        hidden={!open}
        // Меню: умеренный card-радиус + внутренний паддинг, пункты — отдельные «чипы»
        // со своим радиусом и отступом от краёв (паттерн GitHub/Linear), поэтому выделение
        // активного языка НИКОГДА не обрезается углом контейнера (--radius-btn у sealife = 999px).
        className={cx(
          'absolute right-0 z-50 flex min-w-[10rem] flex-col gap-0.5 rounded-card border border-border bg-surface p-1.5 shadow-lg',
          placement === 'up' ? 'bottom-full mb-2' : 'top-full mt-2',
        )}
      >
        {locales.map((locale) => (
          <Link
            key={locale}
            href={`/${locale}${rest}`}
            hrefLang={locale}
            lang={locale}
            aria-current={locale === current ? 'true' : undefined}
            onClick={() => {
              remember(locale)
              setOpen(false)
            }}
            className={cx(
              'flex min-h-9 items-center rounded-[10px] px-3 py-1.5 text-sm transition-colors',
              locale === current
                ? 'bg-primary font-medium text-white'
                : 'text-text hover:bg-surface-info',
            )}
          >
            {localeLabels[locale]}
          </Link>
        ))}
      </nav>
    </div>
  )
}
