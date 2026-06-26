'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { buttonClasses } from '../ui/Button'
import { CONSENT_EVENT, getConsent, setConsent } from './consent'

/**
 * Баннер согласия на аналитику (M0-T11, opt-in).
 *
 * EU/Германия (TDDDG): «Принять» и «Отклонить» — РАВНОЗНАЧНЫ (один размер, цвет,
 * уровень), оба на первом уровне, без тёмных паттернов и без cookie-wall.
 * Показывается только пока выбор не сделан; не блокирует контент.
 */
export function ConsentBanner({ locale }: { locale: Locale }) {
  // По умолчанию считаем «решено», чтобы не мелькать у тех, кто уже выбрал;
  // реальное состояние выставляем после монтирования.
  const [decided, setDecided] = useState(true)

  useEffect(() => {
    const update = () => setDecided(getConsent() !== null)
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  if (decided) return null

  return (
    <section
      role="region"
      aria-label={t(locale, 'consentTitle')}
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-2xl rounded-card border border-border bg-surface p-4 shadow-lg sm:p-5"
    >
      <p className="text-sm">
        {t(locale, 'consentText')}{' '}
        <Link href={`/${locale}/cookies`} className="underline underline-offset-2">
          {t(locale, 'consentMore')}
        </Link>
      </p>
      {/* Равнозначные кнопки: одинаковый размер и стиль (требование Германии). */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={() => setConsent('denied')}
          className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}
        >
          {t(locale, 'consentDecline')}
        </button>
        <button
          type="button"
          onClick={() => setConsent('granted')}
          className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}
        >
          {t(locale, 'consentAccept')}
        </button>
      </div>
    </section>
  )
}
