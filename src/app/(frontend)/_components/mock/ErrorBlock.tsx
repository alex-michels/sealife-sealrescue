import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import type { SiteId } from '@/site/config'
import { m } from '@/mock/copy'

/**
 * Единый дизайн состояния ошибки (DESIGN_BRIEF §4c/§8): ошибка ТЕКСТОМ + действие.
 * Используется и error.tsx-границей (реальные ошибки), и mock-демо состояния error,
 * чтобы дизайн был один. `action` — кнопка reset (граница) или ссылка-повтор (демо).
 */
export function ErrorBlock({
  site,
  locale,
  action,
}: {
  site: SiteId
  locale: Locale
  action: ReactNode
}) {
  return (
    <div role="alert" className="rounded-card border border-border bg-surface p-8 text-center">
      <p className="text-xl text-text">{m(locale).error[site]}</p>
      <div className="mt-4 flex justify-center">{action}</div>
    </div>
  )
}
