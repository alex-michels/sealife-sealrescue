# Локализация и маршрутизация

## Локали

- **Контент-локали Payload — только `['ru','en']`** (`src/i18n/config.ts` — единый источник).
  `ru` — исходная (`defaultLocale`), `en` — публичный перевод.
- **`fallbackLocale = 'en'`** — для посетителей, чей язык не поддерживаем (напр. немецкий), и запросов
  без `Accept-Language`. **НЕ** путать с `defaultLocale`. Политика: русскоязычные → `ru`, остальные → `en`.
- **`de` в content-локализацию НЕ добавлять** — иначе Payload потребует DE-поля для всех статей/видов/квизов.
  DE — только legal-shell (отдельные роуты), не третья контент-локаль.

`src/i18n/config.ts` — единственное место, где объявлены локали. Добавить DE-контент-локаль (если
когда-нибудь) = одна строка там; это автоматически обновит локали Payload, целевые локали перевода (хуки),
редирект proxy, статические параметры маршрутов и hreflang. Модуль намеренно без тяжёлых зависимостей —
его импортируют `payload.config`, хуки, `proxy.ts` (edge) и серверные компоненты.

```ts
export const locales = ['ru', 'en'] as const   // + 'de' — одной строкой
export const defaultLocale: Locale = 'ru'        // контент пишется на ru
export const fallbackLocale: Locale = 'en'       // не-русские → en
export const targetLocales = locales.filter((l) => l !== defaultLocale) // что переводить
```

## Перевод — заранее, в хранилище

Никакого перевода «на лету» на запрос. Перевод статей/видов хранится в самих коллекциях (localized-поля)
и делается заранее, с hreflang. `glossary` — translation memory (справочник), а не движок перевода.
Хук `markTranslationsStale` (см. [agents.md](agents.md)) помечает перевод устаревшим при изменении `ru`-исходника.

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
  2. `Accept-Language` с учётом q-весов;
  3. `fallbackLocale` (`en`).
  Ответ помечается `Vary: Accept-Language, Cookie` (подсказка кэшам/CDN).
- **Есть локаль** → `rewrite` на `/[site]/[locale]/…`. Язык здесь НЕ запоминается (cookie ставится
  только при явном выборе в свитчере — требование TDDDG: хранить выбор языка только после явного действия).

### DE legal-shell
`/de` и `/de/*` — статический сегмент: `rewrite` на `/[site]/de/*` **без** локали-редиректа. Существуют
только legal-страницы (`impressum`/`datenschutz`/`cookies`/`terms`); контентных `/de/*` нет → Next отдаёт
**404** (route guard).

### Matcher
```ts
matcher: ['/((?!admin|api|_next|_static|favicon.ico|.*\\..*).*)']
```
Admin, API (Payload), внутренние пути Next и файлы с расширением — proxy не трогает.

## Структура маршрутов (App Router)

```
app/(frontend)/[site]/[locale]/
  page.tsx                 # главная (sealife / sealrescue)
  articles, news, memes/   # медиа sealife
  species, species/[slug]  # Тюленепедия
  quizzes, quizzes/[slug]  # квизы
  games, games/[slug]      # игры (встраивает /public/games/<slug>)
  rescue-centers/[slug]    # центры (sealrescue)
  what-to-do, report       # emergency / нотис
  rescue-news, rescue-quest
  legal-notice, privacy, cookies, terms   # legal EN
  [slug]                   # контентная страница по slug
app/(frontend)/[site]/de/
  impressum, datenschutz, cookies, terms  # legal DE (shell)
```

## hreflang / canonical / sitemap

- Альтернаты и canonical считаются из `src/i18n/` (`alternates`); `ru`/`en` ссылаются друг на друга,
  `x-default` — по политике.
- `app/sitemap.xml/route.ts` отдаёт карту по локалям с hreflang/x-default.
- Локализованные страницы — статическая генерация (перформанс + SEO).

## Связанные доки
- [architecture.md](architecture.md) — жизненный цикл запроса
- [api.md](api.md) — route guards и 404 для `/de`-контента
