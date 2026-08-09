import Link from 'next/link'
import type { Media } from '@/payload-types'
import type { Locale } from '@/i18n/config'
import { t } from '@/i18n/ui'
import { pickOfDay } from '@/content/factOfDay'
import { factPool, realCover, tileState, type BentoSlot, type TileState } from '@/content/bento'
import type { ResolvedSection } from '@/site/sectionContent'
import { dailyPool, latestOfType } from '../content/getContent'
import { allSpeciesFacts } from '../content/getSpecies'
import { featuredGame } from '../content/getGames'
import { quizPool } from '../content/getQuizzes'
import { Cover } from '../content/Cover'
import { cx } from '../ui/cx'

/**
 * Bento-хаб «Сегодня» на главной sealife (Roadmap **M1-T05**).
 *
 * Иерархия слотов — §6a брифа, и она объявлена в CSS (`.bento`, `grid-template-areas`), а не
 * выведена из данных: порядок DOM = визуальный порядок = порядок для клавиатуры и скринридера.
 * Разметка заголовков даёт ровно тот же список: «Сегодня» → Факт дня → Квиз дня → Мем дня → Во что
 * поиграть → Последняя новость → Тюленепедия. Логика состояний — `src/content/bento.ts`.
 *
 * ## Почему плитка никогда не исчезает
 * Пустой слот рендерит честное пустое состояние в своей области. Скрывать пустые плитки нельзя:
 * сетка даст дыры и «зажатые слева» карточки, которые §16 запрещает прямым текстом, а иерархия
 * §6a перестанет быть видимой. Сегодня это режим по умолчанию: сиды пишут `content`/`species`
 * черновиками (BIO-16), поэтому наполнена ровно одна плитка — игры.
 *
 * ## Async-компонент под своим `<Suspense>`
 * Запросы живут здесь, а не в `page.tsx`, чтобы hero и хаб разделов отдавались сразу — тот же
 * приём, что у `LatestFeed` (M0-T19). Граница именно вокруг блока: `loading.tsx` на уровне
 * `[site]/[locale]` заставил бы Next стримить `notFound()` со статусом 200 (soft-404).
 */
export async function BentoToday({
  locale,
  sections,
}: {
  locale: Locale
  /** CR-11: разделы приходят пропсом уже с admin-overrides (M1-T27), сами их не читаем. */
  sections: ResolvedSection[]
}) {
  const quizSection = sections.find((s) => s.slug === 'quizzes')

  // Один заход в базу на все плитки. `allSpeciesFacts` переиспользуется дважды (факт + тюленепедия),
  // поэтому запрашивается один раз, а не по разу на плитку (урок CR-13 про дедупликацию).
  const [speciesRows, memePool, game, news, quizzes] = await Promise.all([
    allSpeciesFacts(locale),
    dailyPool('meme', locale),
    featuredGame(locale),
    latestOfType('news', locale),
    // M1-T10: раздел уехал на Payload, поэтому плитка наконец читает данные. Пока раздел был
    // `mockBacked`, здесь стоял захардкоженный `false` — со снятием флага он превратил бы плитку в
    // вечно пустую, и снятие флага выглядело бы как поломка.
    quizSection?.mockBacked ? Promise.resolve([]) : quizPool(locale),
  ])

  const fact = pickOfDay(factPool(speciesRows, locale))
  const meme = pickOfDay(memePool)
  const quiz = pickOfDay(quizzes)
  const speciesNames = speciesRows.map((s) => s.name).filter(Boolean)

  return (
    <ul className="bento">
      <Tile
        slot="fact"
        state={tileState(Boolean(fact))}
        label={t(locale, 'factOfDay')}
        href={fact?.href ?? `/${locale}/species`}
        headline={fact?.fact}
        note={fact?.name}
        empty={t(locale, 'bentoFactEmpty')}
        locale={locale}
        // Факт дня — самая широкая плитка (ряд целиком), поэтому текст крупнее остальных.
        wide
      />

      {/*
        Квиз (M1-T10): читает Payload, как и остальные плитки. `tileState` по-прежнему принимает
        `mockBacked` — механизм общий и остаётся рабочим для разделов, которые ещё не переехали
        (сейчас это `rescue-centers` → M2-T02). Пока флаг стоит, плитка не берёт данные ВООБЩЕ:
        контент из `@/mock/sample` на главной обошёл бы сразу оба механизма CR-09, потому что у
        главной нет `noindex` и она стоит первой записью в sitemap.
      */}
      <Tile
        slot="quiz"
        state={tileState(Boolean(quiz), quizSection?.mockBacked)}
        label={t(locale, 'quizOfDay')}
        href={quiz ? `/${locale}/quizzes/${quiz.slug}` : `/${locale}/quizzes`}
        headline={quiz?.title}
        empty={quizSection?.mockBacked ? t(locale, 'bentoQuizSoon') : t(locale, 'bentoQuizEmpty')}
        locale={locale}
      />

      <Tile
        slot="meme"
        state={tileState(Boolean(meme))}
        label={t(locale, 'memeOfDay')}
        href={meme ? `/${locale}/${meme.slug}` : `/${locale}/memes`}
        headline={meme?.title}
        empty={t(locale, 'bentoMemeEmpty')}
        locale={locale}
        // Мем — единственная плитка, где картинка И ЕСТЬ содержание. Только настоящая:
        // декоративная заглушка стала бы крупнейшим элементом главной и, хуже того, могла
        // выехать тёплой (sandbank зарезервирован за rescue-переходом) — см. realCover().
        cover={realCover(meme?.coverImage)}
      />

      <Tile
        slot="game"
        state={tileState(Boolean(game))}
        label={t(locale, 'gamePick')}
        href={game ? `/${locale}/games/${game.slug}` : `/${locale}/games`}
        headline={game?.title}
        note={game?.excerpt ?? undefined}
        empty={t(locale, 'bentoGameEmpty')}
        locale={locale}
      />

      <Tile
        slot="news"
        state={tileState(Boolean(news))}
        label={t(locale, 'newsLatest')}
        href={news ? `/${locale}/${news.slug}` : `/${locale}/news`}
        headline={news?.title}
        note={news?.excerpt ?? undefined}
        empty={t(locale, 'bentoNewsEmpty')}
        locale={locale}
      />

      <Tile
        slot="species"
        state={tileState(speciesNames.length > 0)}
        label={t(locale, 'speciesHub')}
        href={`/${locale}/species`}
        headline={speciesNames.slice(0, 3).join(' · ')}
        empty={t(locale, 'bentoSpeciesEmpty')}
        locale={locale}
      />
    </ul>
  )
}

/**
 * Одна плитка bento. Ссылкой обёрнута ЦЕЛИКОМ (и в пустом состоянии тоже — §8: пустой экран
 * приглашает к действию, а не отчитывается об отсутствии). Вложенных ссылок внутри нет: они
 * недопустимы в HTML и ломают клавиатурный порядок.
 *
 * `<h3>` — подпись слота, а не заголовок материала. Так оглавление страницы для скринридера
 * читается ровно как иерархия §6a, независимо от того, наполнены плитки или пусты.
 */
function Tile({
  slot,
  state,
  label,
  href,
  headline,
  note,
  empty,
  locale,
  cover,
  wide = false,
}: {
  slot: BentoSlot
  state: TileState
  label: string
  href: string
  headline?: string | null
  note?: string | null
  empty: string
  locale: Locale
  cover?: Media | null
  wide?: boolean
}) {
  const filled = state === 'filled'
  return (
    <li data-slot={slot}>
      <Link href={href} className="block h-full">
        <div
          className={cx(
            // overflow-hidden обязателен: обложка вытянута под края отрицательными margin'ами
            // и без него вылезла бы за скруглённый угол плитки.
            'flex h-full flex-col overflow-hidden rounded-card border p-6 transition-transform hover:-translate-y-0.5',
            // Пустое и «скоро» — на info-поверхности azure-soft (§6a), текст остаётся тёмным (§2e).
            // Тёплая пара sandbank + critical не тратится ни на одну плитку: §6a резервирует её за
            // переходом на sealrescue, это единственный аварийный сигнал главной.
            filled ? 'border-border bg-surface' : 'border-border-cool bg-surface-info',
          )}
        >
          {/* Только настоящая картинка: Cover сам подставляет декоративную заглушку, если
              передать null, — а её в bento быть не должно (см. realCover в content/bento.ts). */}
          {filled && cover && <Cover image={cover} className="-mx-6 -mt-6 mb-4" />}
          <h3 className="font-mono text-xs font-normal uppercase tracking-wide text-muted">
            {label}
          </h3>
          {filled ? (
            <>
              <p className={cx('mt-2 text-text', wide ? 'text-2xl' : 'text-xl')}>{headline}</p>
              {note && <p className="mt-2 text-sm text-muted">{note}</p>}
            </>
          ) : (
            <>
              <p className="mt-2 text-lg text-text">{empty}</p>
              <p className="mt-auto pt-4 text-sm text-link">{t(locale, 'bentoOpen')} →</p>
            </>
          )}
        </div>
      </Link>
    </li>
  )
}
