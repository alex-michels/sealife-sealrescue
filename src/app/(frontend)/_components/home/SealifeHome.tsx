import Link from 'next/link'
import type { ReactNode } from 'react'
import type { Locale } from '@/i18n/config'
import { sites } from '@/site/config'
import { t } from '@/i18n/ui'
import { Card } from '../ui/Card'
import { Cover } from '../content/Cover'
import { EqualCardGrid } from '../ui/EqualCardGrid'
import { WhiskerDivider } from '../ui/WhiskerDivider'
import { SealMascot } from '../ui/SealMascot'
import { CrossLink } from '../content/CrossLink'
import type { ResolvedSection } from '@/site/sectionContent'

/**
 * Главная sealife — медиа-хаб, игривый тон (**M1-T05**).
 *
 * Порядок полос буквально повторяет приоритет из `docs/DESIGN_BRIEF.md` §6a:
 *
 *  1. hero: маскот + кинетичный вордмарк (класс `.kinetic-wordmark`, hero-only) + tagline;
 *  2. bento «Сегодня» — слоты 2–7 §6a (факт / квиз / мем / игра / новость / тюленепедия);
 *  3. хаб всех разделов;
 *  4. лента «Свежее»;
 *  5. cross-link на sealrescue — слот 8.
 *
 * ## Почему bento и хаб разделов — РАЗНЫЕ полосы, а не одна
 * Bento — это объявленная иерархия §6a, и `articles` в ней нет вовсе. Если растворить хаб в bento,
 * из главной пропадёт вход в статьи. Плюс хаб — единственное место, куда доезжают admin-overrides
 * (M1-T27), и он гарантированно непуст: разделы приходят из кода, а не из базы.
 *
 * ## Что приходит слотами, а не читается здесь
 * `bento` и `feed` — async-компоненты, каждый под своим `<Suspense>` в `page.tsx`: hero и хаб
 * отдаются сразу, не дожидаясь Payload (M0-T19). `sections` приходят пропсом уже с overrides —
 * читать `sectionsForSite()` здесь нельзя, это буквальный откат CR-11.
 */
export function SealifeHome({
  locale,
  sections,
  bento,
  feed,
}: {
  locale: Locale
  sections: ResolvedSection[]
  bento: ReactNode
  feed: ReactNode
}) {
  const site = sites.sealife
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <section className="dapple rounded-card px-6 py-12">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          {/* Анимированный маскот рядом с вордмарком (моргает / показывает язык) — только sealife (§5). */}
          <SealMascot size={104} animated className="shrink-0" />
          <div>
            {/*
              Кинетичный вордмарк: один проход блика по глифам, дальше покой (globals.css).
              Текстовый узел ОДИН и равен вордмарку — на этом держится контракт главной
              (`frontend.e2e.spec.ts`: ровно один h1 с текстом `sites.sealife.brand[locale]`).
            */}
            <h1 className="kinetic-wordmark text-5xl">{site.brand[locale]}</h1>
            <p className="mt-4 max-w-2xl text-xl text-muted">{site.tagline[locale]}</p>
          </div>
        </div>
      </section>

      <WhiskerDivider className="my-6" />

      {/* Слоты 2–7 §6a. Сама сетка и состояния плиток — BentoToday / src/content/bento.ts. */}
      <h2 className="mb-5 text-2xl">{t(locale, 'bentoToday')}</h2>
      {bento}

      <WhiskerDivider className="my-8" />

      {/*
        Хаб разделов — вход во ВСЕ разделы, включая те, которых нет в §6a (articles).
        Обложка карточки — опциональный admin-override (M1-T27); без неё карточка текстовая.
        Заголовок намеренно «Все разделы», а не «Разделы»: этим именем уже назван landmark
        навигации в хедере, и второе такое же имя путало бы навигацию по скринридеру.
      */}
      <h2 className="mb-5 text-2xl">{t(locale, 'sectionsAll')}</h2>
      <EqualCardGrid>
        {sections.map((s) => (
          <li key={s.slug}>
            <Link href={`/${locale}/${s.slug}`} className="block h-full">
              <Card className="h-full overflow-hidden transition-transform hover:-translate-y-0.5">
                {s.cover && <Cover image={s.cover} className="-mx-6 -mt-6 mb-4" />}
                <h3 className="text-xl">{s.label[locale]}</h3>
                <p className="mt-2 text-muted">{s.intro[locale]}</p>
              </Card>
            </Link>
          </li>
        ))}
      </EqualCardGrid>

      <WhiskerDivider className="my-8" />

      <h2 className="mb-5 text-2xl">{t(locale, 'latest')}</h2>
      {feed}

      {/* Слот 8 §6a. Единственный блок страницы на тёплой паре sandbank + critical (M1-T04). */}
      <CrossLink locale={locale} variant="emergency" />
    </div>
  )
}
