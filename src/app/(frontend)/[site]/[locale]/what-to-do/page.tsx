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

/**
 * «Нашёл тюленя — что делать» (M2-T01). Публичная инструкция по безопасности; переписана по
 * предметному аудиту 2026-07-26 (Roadmap, трек **BIO**).
 *
 * Порядок блоков — суть правки, а не вёрстка:
 *  1. «скорее всего, всё в порядке» — ПЕРЕД шагами. Раньше страница шла от «не подходите»
 *     сразу к кнопке «найти центры», и читатель делал вывод, что вмешиваться нужно всегда.
 *     Изъятие здоровых детёнышей доброжелательными прохожими — главный реальный вред
 *     тюленям (BIO-01).
 *  2. что делать → 3. чего НЕ делать никогда: «не сталкивать в воду» (самая частая смертельная
 *     ошибка очевидцев, BIO-02) и предупреждение об укусах и зоонозах (BIO-03).
 *  4. наблюдаемые признаки, по которым звонить, — вместо прежнего бессодержательного
 *     «оцените состояние с расстояния» (BIO-04).
 *
 * `demo={false}`: страница НЕ помечается плашкой демо-данных. Инструкции настоящие, и подписать
 * их «демо» опаснее, чем не показывать вовсе. Плашка остаётся там, где данные фальшивые.
 */
const DO_KEYS = ['rescueStep1', 'rescueStep2', 'rescueStep3', 'rescueStep4'] as const
const NEVER_KEYS = ['rescueNever1', 'rescueNever2', 'rescueNever3', 'rescueNever4'] as const
const SIGN_KEYS = [
  'rescueSign1',
  'rescueSign2',
  'rescueSign3',
  'rescueSign4',
  'rescueSign5',
  'rescueSign6',
  'rescueSign7',
] as const

export function generateMetadata({ params }: { params: RouteParams }) {
  return sectionMetadata(params, SLUG)
}

export default async function WhatToDoPage({ params }: { params: RouteParams }) {
  const { locale, section } = await requireSection(params, SLUG)
  return (
    <SectionShell
      locale={locale}
      title={section.title[locale]}
      intro={section.intro[locale]}
      narrow
      demo={false}
    >
      {/* Главное сообщение страницы. Стоит первым и выделено: если читатель уйдёт после
          первого абзаца, он должен унести именно это. */}
      <p className="rounded-card border border-border-cool bg-surface-info p-4 text-lg">
        {t(locale, 'rescueNormal')}
      </p>

      <h2 className="mt-8 text-2xl">{t(locale, 'rescueDoTitle')}</h2>
      <ol className="mt-3 space-y-2">
        {DO_KEYS.map((key, i) => (
          <li key={key} className="flex gap-3">
            <span className="font-mono text-sm text-muted">{i + 1}.</span>
            <span>{t(locale, key)}</span>
          </li>
        ))}
      </ol>
      <p className="mt-3 text-sm text-muted">{t(locale, 'rescueDistance')}</p>

      <h2 className="mt-8 text-2xl text-critical">{t(locale, 'rescueNeverTitle')}</h2>
      <ul className="mt-3 space-y-2">
        {NEVER_KEYS.map((key) => (
          <li key={key} className="flex gap-3">
            {/* Значок декоративный: смысл несёт сам текст пункта и заголовок блока —
                цвет и иконка не единственные носители смысла (WCAG 2.2 AA). */}
            <span aria-hidden="true" className="text-critical">
              ✕
            </span>
            <span>{t(locale, key)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 rounded-card border border-border bg-surface-warm p-3 text-sm">
        {t(locale, 'rescueBite')}
      </p>

      <h2 className="mt-8 text-2xl">{t(locale, 'rescueSignsTitle')}</h2>
      <ul className="mt-3 list-disc space-y-1 pl-5">
        {SIGN_KEYS.map((key) => (
          <li key={key}>{t(locale, key)}</li>
        ))}
      </ul>

      <div className="mt-8 flex flex-wrap gap-2">
        <Link href={`/${locale}/rescue-centers`} className={buttonClasses('critical', 'lg')}>
          {t(locale, 'rescueCta')}
        </Link>
        <Link href={`/${locale}/rescue-quest`} className={buttonClasses('ghost', 'lg')}>
          {{ ru: 'Пройти квест →', en: 'Try the quest →' }[locale]}
        </Link>
      </div>
    </SectionShell>
  )
}
