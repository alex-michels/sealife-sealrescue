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
- Локализация — нативная Payload, локали `ru` (исходная) + `en`. DE — только legal-shell, не контент-локаль.

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
| `npm run seed:glossary` | посев глоссария/translation memory (идемпотентно) |
| `npm run seed:m1` | посев демо-контента и видов (статьи/новости/мемы/Тюленепедия), `ru`/`en` |
| `npm run test:int` / `npm run test:e2e` | Vitest (integration) / Playwright (e2e) |

> После изменения схемы Payload: `npm run generate:types`. В dev схема синхронизируется push-режимом автоматически; для прод-миграций ревьюить изменения до применения.

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
      [site]/de/...        #   legal-shell DE (impressum/datenschutz/cookies/terms)
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

## Глоссарий и переводы (translation memory)

Словарь терминов и тюль-сленга (`ru → перевод`) для переводчиков и будущего Агента-переводчика. Это **справочник/translation memory, а не движок перевода «на лету»**: добавление термина не перепереводит существующий контент — перевод статей/видов хранится в самих коллекциях (`Content`/`Species`, локализованные поля) и делается заранее.

**Где редактировать:**

1. **Вживую — в админке** (source of truth, хранится в БД): группа **«Локализация» → «Словарь терминов и тюль-сленга»**, или напрямую `/admin/collections/glossary`. Создавать/менять могут `admin`/`editor`/`translator`; удалять — `editor`. Агент пишет только через `agent-proposals`.
2. **Стартовый набор — в коде:** `src/seed/glossaryTerms.ts`. Залить идемпотентно (апсерт по `source`):
   ```bash
   npm run seed:glossary
   ```

**Схема коллекции** — `src/collections/Glossary.ts`. Поля записи:

| Поле | Назначение |
| --- | --- |
| `source` | исходный термин на `ru` (ключ, общий для локалей; не переводится) |
| `translation` | эквивалент в текущей локали (`en` сейчас, `de` позже); *локализованное* — переключай локаль в админке |
| `category` | `term` (термин) / `slang` (тюль-сленг) / `meme` |
| `variants[]` | альтернативные формы (тюласты, тюласточки…) |
| `note` | контекст/пояснение (локализованное) |
| `doNotTranslate` | «не переводить» (имена, телефоны, бренды) |

Пример (уже в сиде, `src/seed/glossaryTerms.ts`):

```ts
{
  source: 'реабилитационный тюль-центр',
  en: 'seal rescue center',
  category: 'slang',
  note: 'Каламбур «тюль-»: реабилитационный центр для тюленей. На en — нейтральное seal rescue center.',
}
```

## Демо-контент (сиды)

Идемпотентный посев демо-статей/новостей/мемов/страниц и видов (`ru`/`en`), чтобы каталог, фильтры и Тюленепедия рендерились из БД:

```bash
npm run seed:m1
```

Данные правятся в `src/seed/m1SeedData.ts`, логика записи — `src/seed/seedM1.ts`.

## Архитектурные инварианты (кратко)

Полный список и обоснования — в [`CLAUDE.md`](CLAUDE.md). Ключевое:

- **Human-in-the-loop:** агенты создают только черновики и записи в `agent-proposals`; публикует/удаляет только человек. Зашито в access control + хук `forceAgentDrafts`.
- **Локали `ru`/`en`**, `ru` — исходная. **DE — только legal-роуты**, не третья контент-локаль; запрещённые `/de`-контент-роуты → 404.
- **GDPR-минимизация:** email у публичных пользователей не собираем (нигде); UGC — премодерация; аналитика cookieless и только после opt-in.
- **AI-прозрачность:** AI-контент маркируется provenance-меткой, видимой пользователю (`aiGenerated`).
- **Rescue-данные:** не выдавать неподтверждённое за verified; приоритет официальных источников.

## Документация

- [`Roadmap.md`](Roadmap.md) — задачи по ID (M0/M1/M2…), статусы
- [`DESIGN_BRIEF.md`](DESIGN_BRIEF.md) — дизайн-направление, токены, типографика, компоненты
- [`COMPLIANCE_EU_DE.md`](COMPLIANCE_EU_DE.md) — EU/DE-комплаенс (Impressum, TDDDG, DSA, AI Act)
- [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md) — правила для AI-агентов и разработки
- [`sealife-masterplan-v1.md`](sealife-masterplan-v1.md) — общий план продукта
