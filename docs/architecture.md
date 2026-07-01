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
2. **Локаль.** Нет локали в пути → redirect на `ru`/`en`/`de` (авто-выбор без forced-редиректа: русскоязычные → `ru`,
   немецкоязычные → `de`, остальные → `en`; явный выбор в cookie `NEXT_LOCALE` важнее). Есть локаль → rewrite на `/[site]/[locale]/…`.
3. **Legal-роуты.** Локализованы под каждую локаль (DE: Impressum/Datenschutz/Cookies/Terms); slug общий
   (`legal-notice`/`privacy`/`cookies`/`terms`), заголовок и подпись зависят от локали.
4. **Admin/API исключены** из proxy matcher — Payload обслуживает их сам.

Публичные страницы — **server components по умолчанию**; client-JS только где нужна интерактивность
(переключатель языка, consent-баннер, mock-свитчеры, игры). ⚠️ Статическая генерация — пока цель,
не текущее поведение: только `[site]/[locale]/layout.tsx` использует `generateStaticParams`
(site×locale-шелл); все страницы с данными делают живой `getPayload`-запрос на каждый рендер (SSR
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
| Email с публичных пользователей не собираем | схема коллекций (нет email-полей в UGC; только `contactHandle`) |
| Лидерборд анонимный (без PII) | `game-scores`: хэш `playerKey`, без IP/email/аккаунтов |
| Неизвестная локаль / несуществующий slug → 404 | `proxy.ts` + `[locale]` route guard |
| Provenance AI-контента виден пользователю | provenance-поля в `Content`/`Species`/… (расширяется, M1-T08) |

## Провенанс (модель доверия к контенту)

Для публикуемого контента и rescue-данных предусмотрена шкала провенанса:
`aiAssisted` / `aiTranslated` / `aiChecked` / `humanReviewed` / `reviewedBy` / `reviewedAt` /
`sourceVerified` / `sourceContentHash` / `lastAgentCheckedAt` / `lastHumanVerifiedAt`.

Это честная маркировка для пользователя (AI-прозрачность, AI Act Art. 50) и основа для rescue-инварианта:
неподтверждённые данные показываются как `needs_check`/`unverified`, а не выдаются за verified. Покрытие
расширяется постепенно (см. Roadmap M1-T08 / EU-11), но модель держим в голове при изменениях схемы.

> ⚠️ **Текущий охват тоньше модели.** UI сегодня показывает общий `aiGenerated`-бейдж (`content`/
> `species`/`quizzes`) и «штамп проверки» для центров — но `rescue-centers`, где доверие важнее всего
> (CLAUDE.md §7), пока рендерится **из dev-моков** (`@/mock/sample`), не из реальных полей коллекции
> (`verifiedByAgentAt`/`verifiedByHumanAt` в схеме есть — фронтенд их ещё не читает). См. M2-T02.

## Связанные доки
- [data-model.md](data-model.md) — коллекции и доступ
- [localization.md](localization.md) — роутинг и локали
- [agents.md](agents.md) — агенты, провенанс, безопасность
- [DEPLOYMENT.md](DEPLOYMENT.md) — хостинг и окружения
