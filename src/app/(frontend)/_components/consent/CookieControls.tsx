'use client'

import { useEffect, useState } from 'react'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { buttonClasses } from '../ui/Button'
import { CONSENT_EVENT, getConsent, setConsent, type ConsentValue } from './consent'

/**
 * Управление согласием на странице /cookies (M0-T11): просмотр и отзыв в любой момент
 * (требование GDPR — отзыв так же прост, как дача согласия).
 */
export function CookieControls({ locale }: { locale: Locale }) {
  const [value, setValue] = useState<ConsentValue | null>(null)

  useEffect(() => {
    const update = () => setValue(getConsent())
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  const choose = (next: ConsentValue) => {
    const wasGranted = getConsent() === 'granted'
    setConsent(next)
    // Если отзываем уже выданное согласие — перезагружаем, чтобы выгрузить уже
    // загруженный скрипт Plausible (он живёт до перезагрузки страницы).
    if (next === 'denied' && wasGranted) window.location.reload()
  }

  const statusLabel =
    value === 'granted'
      ? t(locale, 'cookiesGranted')
      : value === 'denied'
        ? t(locale, 'cookiesDenied')
        : t(locale, 'cookiesNone')

  return (
    <div className="mt-6 rounded-card border border-border bg-surface p-5">
      <p className="text-sm">
        {t(locale, 'cookiesStatusLabel')} <strong>{statusLabel}</strong>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => choose('granted')}
          disabled={value === 'granted'}
          className={buttonClasses('primary', 'md')}
        >
          {t(locale, 'cookiesEnable')}
        </button>
        <button
          type="button"
          onClick={() => choose('denied')}
          disabled={value === 'denied'}
          className={buttonClasses('ghost', 'md')}
        >
          {t(locale, 'cookiesDisable')}
        </button>
      </div>
    </div>
  )
}
