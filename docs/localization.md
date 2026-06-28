# Локализация и маршрутизация

## Локали

- **Контент-локали Payload — `['ru','en','de']`** (`src/i18n/config.ts` — единый источник).
  `ru` — исходная (`defaultLocale`), `en` и `de` — публичные переводы. **Все три равноправны.**
- **`fallbackLocale = 'en'`** — для посетителей, чей язык мы НЕ поддерживаем, и запросов
  без `Accept-Language`. **НЕ** путать с `defaultLocale`. Политика: русскоязычные → `ru`,
  немецкоязычные → `de`, остальные → `en`.
- **DE — полноценная контент-локаль** наравне с RU/EN: статьи/виды/квизы/новости/мемы/центры
  переводятся на `de` заранее, в хранилище, с hreflang (как и `en`). Переключатель языка
  предлагает RU/EN/DE на всех публичных поверхностях (sealife, sealrescue, игры) и в админке.

`src/i18n/config.ts` — единственное место, где объявлены локали. Добавить/убрать локаль = одна
строка там; это автоматически обновит локали Payload, целевые локали перевода (хуки), редирект
proxy, статические параметры маршрутов и hreflang. Модуль намеренно без тяжёлых зависимостей —
его импортируют `payload.config`, хуки, `proxy.ts` (edge) и серверные компоненты.

```ts
export const locales = ['ru', 'en', 'de'] as const
export const defaultLocale: Locale = 'ru'        // контент пишется на ru
export const fallbackLocale: Locale = 'en'       // неподдерживаемые языки → en
export const targetLocales = locales.filter((l) => l !== defaultLocale) // что переводить (en, de)
```

## Перевод — заранее, в хранилище

Никакого перевода «на лету» на запрос. Перевод статей/видов хранится в самих коллекциях (localized-поля)
и делается заранее, с hreflang. `glossary` — translation memory (справочник), а не движок перевода.
Хук `markTranslationsStale` (см. [agents.md](agents.md)) помечает перевод устаревшим при изменении `ru`-исходника
(для всех целевых локалей — en и de).

Не переводятся: имена центров, телефоны, адреса, URL, научные названия видов (`latin`) — правило глоссария
(`doNotTranslate`).

## Маршрутизация — `src/proxy.ts`

Next 16 `proxy` (бывш. middleware) делает две вещи на публичном фронтенде:

### 1. Мультидомен (хост → сайт)
`resolveSiteId(host, override)` → `sealife` | `sealrescue`. Внутренний `rewrite` на сегмент `/[site]`
— **URL пользователя не меняется**. В проде сайт определяется по домену; локально — `?site=sealrescue`
(или cookie `site`), по умолчанию открывается sealife.

### 2. Локаль (без forced-редиректа)
- **Нет локали в пути** → `pickLocale(req)` и **redirect** на `/<locale>/…`. Приоритет:
  1. явный выбор — cookie `NEXT_LOCALE` (ставит `LanguageSwitcher`, не proxy);
  2. `Accept-Language` с учётом q-весов (совпадает с любой из `ru`/`en`/`de`);
  3. `fallbackLocale` (`en`).
  Ответ помечается `Vary: Accept-Language, Cookie` (подсказка кэшам/CDN).
- **Есть локаль** (`/ru`, `/en` или `/de`) → `rewrite` на `/[site]/[locale]/…`. Язык здесь НЕ запоминается
  (cookie ставится только при явном выборе в свитчере — требование TDDDG: хранить выбор языка только
  после явного действия).

### Legal-роуты
Slug общий для всех локалей (`legal-notice`/`privacy`/`cookies`/`terms`); заголовок и подпись в футере
локализованы. На DE страницы отображаются как **«Impressum»** (`/de/legal-notice`) и **«Datenschutz»**
(`/de/privacy`). German/EU legal pages обязательны независимо от набора включённых языков.

### Matcher
```ts
matcher: ['/((?!admin|api|_next|_static|favicon.ico|.*\\..*).*)']
```
Admin, API (Payload), внутренние пути Next и файлы с расширением — proxy не трогает.

## Структура маршрутов (App Router)

```
app/(frontend)/[site]/[locale]/          # locale ∈ {ru, en, de}
  page.tsx                 # главная (sealife / sealrescue)
  articles, news, memes/   # медиа sealife
  species, species/[slug]  # Тюленепедия
  quizzes, quizzes/[slug]  # квизы
  games, games/[slug]      # игры (встраивает /public/games/<slug>, ?lang=<locale>)
  rescue-centers/[slug]    # центры (sealrescue)
  what-to-do, report       # emergency / нотис
  rescue-news, rescue-quest
  legal-notice, privacy, cookies, terms   # legal (локализованы, вкл. DE: Impressum/Datenschutz)
  [slug]                   # контентная страница по slug
```

> Все локали (вкл. `de`) обслуживаются одним сегментом `[locale]`; отдельного статического `de`-шелла
> больше нет. `[locale]/layout.tsx` выставляет `<html lang>` и `data-site` динамически.

## hreflang / canonical / sitemap

- Альтернаты и canonical считаются из `src/i18n/` (`alternates`); `ru`/`en`/`de` ссылаются друг на друга,
  `x-default` — по политике.
- `app/sitemap.xml/route.ts` отдаёт карту по локалям с hreflang/x-default.
- Локализованные страницы — статическая генерация (перформанс + SEO).

## Связанные доки
- [architecture.md](architecture.md) — жизненный цикл запроса
- [api.md](api.md) — route guards и 404 (неизвестные локали / несуществующие slug)
