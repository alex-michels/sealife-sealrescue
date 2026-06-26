import Link from 'next/link'
import { t } from '@/i18n/ui'
import {
  requireSection,
  sectionMetadata,
  type RouteParams,
} from '@/app/(frontend)/_components/mock/mockSection'
import { SectionShell } from '@/app/(frontend)/_components/mock/SectionShell'
import { buttonClasses } from '@/app/(frontend)/_components/ui/Button'

const SLUG = 'what-to-do'
const STEP_KEYS = ['rescueStep1', 'rescueStep2', 'rescueStep3', 'rescueStep4'] as const

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function WhatToDoPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  return (
    <SectionShell locale={locale} title={section.title[locale]} intro={section.intro[locale]} narrow>
      <ol className="space-y-2">
        {STEP_KEYS.map((key, i) => (
          <li key={key} className="flex gap-3">
            <span className="font-mono text-sm text-muted">{i + 1}.</span>
            <span>{t(locale, key)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-sm text-muted">{t(locale, 'rescueDistance')}</p>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={`/${locale}/rescue-centers`} className={buttonClasses('critical', 'lg')}>
          {t(locale, 'rescueCta')}
        </Link>
        <Link href={`/${locale}/rescue-quest`} className={buttonClasses('ghost', 'lg')}>
          {locale === 'en' ? 'Try the quest →' : 'Пройти квест →'}
        </Link>
      </div>
    </SectionShell>
  )
}
