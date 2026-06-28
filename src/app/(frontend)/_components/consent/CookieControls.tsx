'use client'

import { useEffect, useState } from 'react'
import type { LegalLang } from '@/site/legal'
import { buttonClasses } from '../ui/Button'
import { CONSENT_EVENT, getConsent, setConsent, type ConsentValue } from './consent'

/**
 * Управление согласием на странице cookies (M0-T11): просмотр и отзыв в любой момент
 * (GDPR — отзыв так же прост, как дача согласия). Работает на всех локалях (RU/EN/DE).
 */
const LABELS: Record<LegalLang, Record<'status' | 'granted' | 'denied' | 'none' | 'enable' | 'disable', string>> = {
  ru: {
    status: 'Текущий выбор:',
    granted: 'аналитика включена',
    denied: 'аналитика отключена',
    none: 'не задан',
    enable: 'Включить аналитику',
    disable: 'Отключить аналитику',
  },
  en: {
    status: 'Current choice:',
    granted: 'analytics enabled',
    denied: 'analytics disabled',
    none: 'not set',
    enable: 'Enable analytics',
    disable: 'Disable analytics',
  },
  de: {
    status: 'Aktuelle Auswahl:',
    granted: 'Analyse aktiviert',
    denied: 'Analyse deaktiviert',
    none: 'nicht gesetzt',
    enable: 'Analyse aktivieren',
    disable: 'Analyse deaktivieren',
  },
}

export function CookieControls({ lang }: { lang: LegalLang }) {
  const [value, setValue] = useState<ConsentValue | null>(null)
  const L = LABELS[lang]

  useEffect(() => {
    const update = () => setValue(getConsent())
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  const choose = (next: ConsentValue) => {
    const wasGranted = getConsent() === 'granted'
    setConsent(next)
    // Отзыв уже выданного согласия — перезагружаем, чтобы выгрузить уже загруженный Plausible.
    if (next === 'denied' && wasGranted) window.location.reload()
  }

  const statusLabel = value === 'granted' ? L.granted : value === 'denied' ? L.denied : L.none

  return (
    <div className="mt-6 rounded-card border border-border bg-surface p-5">
      <p className="text-sm">
        {L.status} <strong>{statusLabel}</strong>
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => choose('granted')}
          disabled={value === 'granted'}
          className={buttonClasses('primary', 'md')}
        >
          {L.enable}
        </button>
        <button
          type="button"
          onClick={() => choose('denied')}
          disabled={value === 'denied'}
          className={buttonClasses('ghost', 'md')}
        >
          {L.disable}
        </button>
      </div>
    </div>
  )
}
