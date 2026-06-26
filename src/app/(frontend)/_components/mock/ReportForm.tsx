'use client'

import { useState, type FormEvent } from 'react'
import Link from 'next/link'
import type { Locale } from '@/i18n/config'
import { m } from '@/mock/copy'
import { buttonClasses } from '../ui/Button'

/**
 * Форма «сообщить об ошибке / предложить центр» (M2-T04 preview).
 * COMPLIANCE: email НЕ собираем — только опциональный ник в TG/VK для ответа;
 * за гарантированным ответом — контакт оператора в Impressum. Демо: ничего не шлёт.
 */
export function ReportForm({ locale }: { locale: Locale }) {
  const c = m(locale)
  const [sent, setSent] = useState(false)

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <form className="mt-2 max-w-xl space-y-4" onSubmit={onSubmit}>
      <p className="rounded-card border border-border-cool bg-surface-info px-4 py-2 text-sm text-text">
        {c.formNoEmail}
      </p>

      <div>
        <label htmlFor="report-nick" className="block text-sm font-medium">
          {c.formNick}
        </label>
        <input
          id="report-nick"
          name="nick"
          type="text"
          autoComplete="off"
          className="mt-1 w-full rounded-btn border border-border bg-surface px-3 py-2 text-base"
        />
        <p className="mt-1 text-xs text-muted">{c.formNickHint}</p>
      </div>

      <div>
        <label htmlFor="report-message" className="block text-sm font-medium">
          {c.formMessage}
        </label>
        <textarea
          id="report-message"
          name="message"
          required
          rows={5}
          className="mt-1 w-full rounded-card border border-border bg-surface px-3 py-2 text-base"
        />
      </div>

      <button type="submit" className={buttonClasses('primary', 'md')}>
        {c.formSubmit}
      </button>

      {sent && (
        <p role="status" className="rounded-card border border-border bg-surface-info px-4 py-2 text-sm text-text">
          {c.formDone}
        </p>
      )}

      <p className="text-sm text-muted">
        {c.formContactHint}{' '}
        <Link href={`/${locale}/legal-notice`} className="underline underline-offset-2">
          {c.formContactLink}
        </Link>
        .
      </p>
    </form>
  )
}
