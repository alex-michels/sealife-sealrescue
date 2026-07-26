# Архитектура

## Картина в целом

Одно Next.js-приложение (App Router) обслуживает **два публичных сайта** и встроенную CMS:

- **sealife.info** — медиа-хаб (статьи, новости, мемы, квизы, игры). Тон игривый.
- **sealrescue.info** — справочник центров + emergency-инструкции. Тон серьёзный.
- **Payload v3** — CMS внутри того же Next-процесса (`src/payload.config.ts`), общий бэкенд для обоих сайтов.
- **Postgres** — единственный source of truth для durable-состояния (`@payloadcms/db-postgres`). БД в EU/EEA.

```
                 ┌─────────────────────────── Next.js 16 (один процесс) ───────────────────────────┐
 sealife.info ──▶│  proxy.ts (хост→сайт, локаль)                                                    │
sealrescue.info ▶│   ├─ (frontend)  app/(frontend)/[site]/[locale]/…   — публичные страницы (RSC)   │──▶ Postgres
                 │   ├─ (payload)   app/(payload)/admin                — админка Payload             │   (EU/EEA)
                 │   ├─ (payload)   app/(payload)/api/[...slug]        — авто REST + GraphQL Payload  │
                 │   └─ endpoints   /api/leaderboard*                  — кастомные (игра)             │
                 │  /public/games/seal-hunt-v1/…                       — статические игры             │
                 └─────────────────────────────────────────────────────────────────────────────────┘
```

Стек: Next 16 + React 19 · Payload 3.85 (lexical rich text) · Postgres · Tailwind v4 + CSS-переменные ·
self-host шрифты (`next/font`) · аналитика Plausible (cookieless, только после opt-in).

## Жизненный цикл запроса (публичный фронтенд)

Маршрутизацию делает `src/proxy.ts` (Next 16 `proxy`, бывш. middleware). Подробно — в [localization.md](localization.md).

1. **Хост → сайт.** `resolveSiteId(host, override)` определяет `sealife` | `sealrescue` по домену
   (локально — `?site=` / cookie). Внутренний `rewrite` на сегмент `/[site]`; URL пользователя не меняется.
2. **Локаль.** Нет локали в пути → redirect на `ru`/`en` (авто-выбор без forced-редиректа: русскоязычные → `ru`,
   все остальные, включая немецкоязычных, → `en`; явный выбор в cookie `NEXT_LOCALE` важнее). Есть локаль → rewrite на `/[site]/[locale]/…`.
   Префикс в пути распознаётся по `routeLocales` (`ru`/`en`/`de`), иначе `/de/privacy` улетел бы в редирект.
3. **Legal-роуты.** Slug общий (`legal-notice`/`privacy`/`cookies`/`terms`), заголовок и подпись зависят от локали.
   Единственное место, где живёт `de`: немецкие Impressum/Datenschutz обязательны, потому что оператор в Германии
   (§5 DDG / §18 MStV), независимо от языков сайта. Контентных страниц под `/de` нет — они отдают 404.
4. **Admin/API исключены** из proxy matcher — Payload обслуживает их сам.

> ⚠️ **TODO (Roadmap EU-06):** сохранять ли немецкие legal-страницы вообще — вопрос к юридической
> консультации. До неё `de` в `legalOnlyLocales` — временная страховка, а не окончательное решение.

Публичные страницы — **server components по умолчанию**; client-JS только где нужна интерактивность
(переключатель языка, consent-баннер, mock-свитчеры, игры). ⚠️ Статическая генерация — пока цель,
не текущее поведение: только `[site]/[locale]/layout.tsx` использует `generateStaticParams`
(site×routeLocale-шелл, включая `/de` ради legal); все страницы с данными делают живой `getPayload`-запрос на каждый рендер (SSR
per-request), без ISR/`force-static`. См. [localization.md](localization.md).

## Слои кода

```
src/
  payload.config.ts   # сборка Payload: коллекции, локали, БД, endpoints
  proxy.ts            # мультидомен + локаль-роутинг
  access/roles.ts     # RBAC: admin/editor/translator/viewer/agent (см. agents.md)
  hooks/              # contentHooks: forceAgentDrafts, markTranslationsStale
  collections/        # 14 коллекций Payload (см. data-model.md)
  endpoints/          # leaderboard.ts — server-authoritative лидерборд (см. api.md)
  i18n/               # config (локали — единый источник), ui, date, alternates
  site/               # config (сайты/бренды), sections, legal
  content/            # таксономия тем, «факт дня»
  seed/               # glossaryTerms+seedGlossary, m1SeedData+seedM1
  app/(frontend)/     # публичные сайты (App Router)
  app/(payload)/      # админка + авто REST/GraphQL Payload
```

## Сквозные инварианты (как они зашиты)

Нормативный список — в [`CLAUDE.md`](../CLAUDE.md). Реализация:

| Инвариант | Где зашит |
| --- | --- |
| Агент не публикует/не удаляет (human-in-the-loop) | access control коллекций + хук `forceAgentDrafts` |
| Агент пишет только в `agent-proposals` | access (`update: isEditor` на статусе) + коллекция-очередь |
| Исходная локаль `ru`, перевод заранее | `i18n/config.ts` + `markTranslationsStale` + localized-поля |
| Контент-локали — только `ru`/`en`; `de` — legal-only | `i18n/config.ts` (`locales` vs `legalOnlyLocales`/`routeLocales`): страницы контента валидируют `isLocale`, legal-страницы — `isRouteLocale` |
| Непереведённый документ не отдаётся под чужой локалью | `localization.fallback: false` + гейт `translatedWhere()` (`i18n/translated.ts`) во всех публичных чтениях; деталь → 404, hreflang и sitemap считают доступность `localesWithContent()` |
| Email с публичных пользователей не собираем | схема коллекций (нет email-полей в UGC; только `contactHandle`) |
| Лидерборд анонимный (без PII) | `game-scores`: хэш `playerKey`, без IP/email/аккаунтов |
| Неизвестная локаль / несуществующий slug / контент под `/de` → 404 | `proxy.ts` + `[locale]` route guard |
| Provenance AI-контента виден пользователю | provenance-поля в `Content`/`Species`/… (расширяется, M1-T08) |

## Провенанс (модель доверия к контенту)

Для публикуемого контента и rescue-данных предусмотрена шкала провенанса:
`aiAssisted` / `aiTranslated` / `aiChecked` / `humanReviewed` / `reviewedBy` / `reviewedAt` /
`sourceVerified` / `sourceContentHash` / `lastAgentCheckedAt` / `lastHumanVerifiedAt`.

Это честная маркировка для пользователя (AI-прозрачность, AI Act Art. 50) и основа для rescue-инварианта:
неподтверждённые данные показываются как `needs_check`/`unverified`, а не выдаются за verified. Покрытие
расширяется постепенно (см. Roadmap M1-T08 / EU-11), но модель держим в голове при изменениях схемы.

**Хранение** — `provenanceField()` (`src/fields/provenance.ts`) на `content`, `species`, `glossary`.
Первые четыре флага и `reviewedBy`/`reviewedAt` **локализованы**: русский оригинал и его английский
перевод — разные утверждения, и склеивать их нельзя. `sourceVerified` / `lastAgentCheckedAt` /
`lastHumanVerifiedAt` общие для локалей: факт сверки источника от языка не зависит.

**Отображение** — `AiBadge` (`_components/content/AiBadge.tsx`) рендерит ряд меток; какие именно,
решает чистая функция `provenanceMarks()` в [`src/content/provenance.ts`](../src/content/provenance.ts)
(вынесена из `src/app/**`, чтобы считаться в пороге покрытия). Три правила важнее вёрстки:
пустая группа — **ничего не рендерим** (молчание честнее неявного «написано человеком»);
`humanReviewed` визуально сильнее AI-флагов и несёт дату ревью; легаси-`aiGenerated` показывается,
только пока группа пуста.

> ⚠️ **Что ещё не покрыто.** `rescue-centers`, где доверие важнее всего (CLAUDE.md §7), пока
> рендерится **из dev-моков** (`@/mock/sample`), не из реальных полей коллекции
> (`verifiedByAgentAt`/`verifiedByHumanAt` в схеме есть — фронтенд их ещё не читает). См. M2-T02.
> `sourceContentHash` в группу сознательно не добавлен: у переводов эту роль уже играет
> `localeStatus[].sourceHash`, и второе поле с тем же смыслом разошлось бы с первым.

## Связанные доки
- [data-model.md](data-model.md) — коллекции и доступ
- [localization.md](localization.md) — роутинг и локали
- [agents.md](agents.md) — агенты, провенанс, безопасность
- [DEPLOYMENT.md](DEPLOYMENT.md) — хостинг и окружения
