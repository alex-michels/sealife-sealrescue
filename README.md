# sealife-sealrescue

Два сайта на одном бэкенде **Payload v3 (внутри Next.js)** + Postgres:

- **sealife.info** — медиа-хаб о тюленях: статьи, новости, мемы, квизы, игры. Тон игривый, тюль-сленг. Вордмарк: «Тюлень.Инфо» (RU) / «SeaLife.Info» (EN).
- **sealrescue.info** — справочник центров реабилитации + «нашёл тюленя — что делать». Тон серьёзный, emergency-first. Вордмарк: «Спасение тюленей» (RU) / «Seal Rescue» (EN).

Оба сайта обслуживает одно Next-приложение (мультидомен), контент — из общей CMS Payload. Перелинковка sealife ↔ sealrescue в обе стороны.

## Стек

- **Next.js 16** (App Router, server components по умолчанию) + **React 19**
- **Payload v3.85** (CMS внутри Next), rich text — lexical
- **Postgres** (`@payloadcms/db-postgres`) — БД в EU/EEA-регионе (персональные данные)
- **Tailwind CSS v4** + CSS-переменные (токены `primitive → semantic`, два режима через `data-site`)
- Self-host шрифты через `next/font`; аналитика — Plausible (cookieless, только после opt-in)
- Локализация — нативная Payload, контент-локали `en` (исходная) + `ru` — обе полноценные. Немецкий не является языком сайта: `de` остаётся только как **legal-only** route-локаль для четырёх обязательных страниц (Impressum / Datenschutz / Cookies / Terms), потому что оператор в Германии; контент под `/de` отдаёт 404.

## Быстрый старт

Требования: Node `^18.20.2 || >=20.9.0`, доступный Postgres (локальный или облачный — Neon/Supabase в EU).

```bash
# 1. зависимости
npm install

# 2. окружение
cp .env.example .env        # затем заполнить значения (см. ниже)

# 3. dev-сервер (Next + Payload). Схема БД синхронизируется автоматически (push в dev).
npm run dev
```

Открой:
- публичный сайт — `http://localhost:3000/ru` (или `/en`);
- админка — `http://localhost:3000/admin`.

Локально оба сайта живут на одном хосте; по умолчанию открывается **sealife**. Чтобы посмотреть **sealrescue** локально, добавь `?site=sealrescue` (override из `src/proxy.ts`; в проде сайт определяется по домену).

### ENV

```
DATABASE_URI=postgres://...            # БД в EU/EEA; для Neon/Supabase — полный URI
PAYLOAD_SECRET=...                     # длинная случайная строка
NEXT_PUBLIC_PLAUSIBLE_SRC=             # src скрипта Plausible; пусто = аналитика и баннер выключены
```

## Скрипты

| Команда | Что делает |
| --- | --- |
| `npm run dev` | Next + Payload в dev (админка на `/admin`) |
| `npm run devsafe` | то же, но с чисткой `.next` |
| `npm run build` / `npm start` | прод-сборка / запуск |
| `npm run generate:types` | сгенерировать `src/payload-types.ts` (после изменения схемы) |
| `npm run generate:importmap` | пересобрать import map админки |
| `npm run lint` | ESLint |
| `npm run seed:baseline` | посев обязательного минимума (нужен на любой свежей БД) |
| `npm run seed:glossary` | посев глоссария/translation memory (идемпотентно) |
| `npm run seed:m1` | посев демо-контента и видов (статьи/новости/мемы/Тюленепедия), `ru`/`en` |
| `npm run test:int` / `npm run test:e2e` | Vitest (integration) / Playwright (e2e) |

> После изменения схемы Payload: `npm run generate:types`. В dev схема синхронизируется push-режимом автоматически; для прод-миграций ревьюить изменения до применения.
> Полный список нюансов (Node-версии для dev vs сидов, пре-коммит-хук, тесты, Docker) — [`docs/local-development.md`](docs/local-development.md).

## Структура

```
src/
  payload.config.ts        # сборка Payload: коллекции, локали, БД
  proxy.ts                 # хост → сайт (мультидомен), чистые URL /ru,/en
  access/roles.ts          # RBAC: admin/editor/translator/viewer/agent
  hooks/                   # contentHooks: forceAgentDrafts, markTranslationsStale
  collections/             # Users, Content, Species, RescueCenters, Quizzes,
                           #   Glossary, Sources, Agents, Community, Media
  content/                 # таксономия тем (topics), «факт дня» (factOfDay)
  i18n/                    # config (локали), ui (строки интерфейса), date, alternates
  site/                    # config (сайты/бренды), sections (разделы), legal
  seed/                    # glossaryTerms + seedGlossary, m1SeedData + seedM1
  app/
    (frontend)/            # публичные сайты (App Router)
      [site]/[locale]/...  #   разделы: articles, news, memes, species, quizzes, games,
                           #   rescue-centers, what-to-do, report, … + /[slug]
      _components/         #   ui, content, home, legal, consent, mock
    (payload)/admin        # админка Payload
    sitemap.xml/           # карта сайта по локалям (hreflang/x-default)
```

## Админка (Payload)

Админка Payload — единый бэкенд для обоих сайтов, здесь редактируется весь контент.

```bash
npm run dev
```

Затем открой **`/admin`** (локально — `http://localhost:3000/admin`).

- **Первый запуск:** на `/admin` Payload предложит создать первого пользователя — это будет аккаунт `admin`.
- **Вход:** по email + паролю (staff-аутентификация по email — единственное исключение из правила «email не собираем»; у публичных пользователей email не запрашивается).
- **Роли** (`src/access/roles.ts`): `admin` / `editor` / `translator` / `viewer` / `agent`. Кто что может — задано в `access` каждой коллекции (напр. публиковать/удалять — только человек, агент создаёт только черновики).
- Админку **не перекрашиваем** — кастомный дизайн только в публичных фронтендах.

## Глоссарий, переводы и демо-контент

Translation memory (`ru → перевод`, коллекция `glossary`) и демо-контент/сиды — см.
[`docs/data-model.md`](docs/data-model.md) (схема коллекций) и [`docs/local-development.md`](docs/local-development.md)
(команды `seed:glossary`/`seed:m1`/`seed:baseline`, где что редактировать).

## Архитектурные инварианты (кратко)

Полный список и обоснования — в [`CLAUDE.md`](CLAUDE.md). Ключевое:

- **Human-in-the-loop:** агенты создают только черновики и записи в `agent-proposals`; публикует/удаляет только человек. Зашито в access control + хук `forceAgentDrafts`.
- **Контент-локали `ru`/`en`**, `ru` — исходная (`en` — перевод); обе равноправны. `de` — legal-only route-локаль (четыре обязательные страницы, оператор в Германии); контент под `/de`, неизвестные локали/slug → 404. Оставлять ли немецкие legal-страницы вообще — TODO для юридического ревью (EU-06).
- **GDPR-минимизация:** email у публичных пользователей не собираем (нигде); UGC — премодерация; аналитика cookieless и только после opt-in.
- **AI-прозрачность:** AI-контент маркируется provenance-меткой, видимой пользователю (`aiGenerated`).
- **Rescue-данные:** не выдавать неподтверждённое за verified; приоритет официальных источников.

## Документация

Все доки — в **[`docs/`](docs/)** ([индекс](docs/README.md)). В корне остаются только конвенционные
[`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) (правила для AI-агентов) и этот README.

**Технические (как устроен проект):**

- [`docs/architecture.md`](docs/architecture.md) — общая картина, жизненный цикл запроса, инварианты
- [`docs/data-model.md`](docs/data-model.md) — коллекции Payload, поля, связи, матрица доступа
- [`docs/api.md`](docs/api.md) — endpoints (лидерборд), авто-REST/GraphQL, route guards
- [`docs/localization.md`](docs/localization.md) — локали, мультидомен, роутинг (`proxy.ts`), локализованные legal-роуты
- [`docs/agents.md`](docs/agents.md) — RBAC, `agent-proposals`, хуки, human-in-the-loop, безопасность
- [`docs/game-seal-hunter.md`](docs/game-seal-hunter.md) — игра, лидерборд, анти-чит
- [`docs/local-development.md`](docs/local-development.md) — ENV, скрипты, БД, сиды, тесты

**Стратегические / governance:**

- [`docs/Roadmap.md`](docs/Roadmap.md) — задачи по ID (M0/M1/M2…), статусы
- [`docs/DESIGN_BRIEF.md`](docs/DESIGN_BRIEF.md) — дизайн-направление, токены, типографика, компоненты
- [`docs/COMPLIANCE_EU_DE.md`](docs/COMPLIANCE_EU_DE.md) — EU/DE-комплаенс (Impressum, TDDDG, DSA, AI Act)
- [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md) — хостинг (VPS), окружения БД, публичный alpha игры
- [`docs/sealife-masterplan-v1.md`](docs/sealife-masterplan-v1.md) — общий план продукта
