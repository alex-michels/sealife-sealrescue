'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'
import { CONSENT_EVENT, getConsent } from './consent'

/**
 * Plausible — приватная аналитика без cookies (M0-T12). Грузится ТОЛЬКО после
 * явного согласия (M0-T11): до согласия скрипт вообще не появляется в DOM.
 * Plausible сам трекает переходы SPA (патчит History API), отдельная логика не нужна.
 */
export function Analytics({ domain, src }: { domain: string; src: string }) {
  const [granted, setGranted] = useState(false)

  useEffect(() => {
    const update = () => setGranted(getConsent() === 'granted')
    update()
    window.addEventListener(CONSENT_EVENT, update)
    return () => window.removeEventListener(CONSENT_EVENT, update)
  }, [])

  if (!granted) return null

  return <Script id="plausible" defer data-domain={domain} src={src} strategy="afterInteractive" />
}
