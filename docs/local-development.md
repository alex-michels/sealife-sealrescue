# Локальная разработка

Краткий быстрый старт — в корневом [`README.md`](../README.md). Здесь — детали для разработки.

## Требования
- **Node** `^18.20.2 || >=20.9.0` (прод-таргет cPanel/VPS — Node 22).
- **pnpm** `^9 || ^10` (в `package.json` `engines`; npm тоже работает — в README команды через `npm`).
- Доступный **Postgres**: локальный, или облачный в EU (Neon/Supabase). Адаптер — `@payloadcms/db-postgres`.

## ENV (`.env`)
```
DATABASE_URI=postgres://user:password@127.0.0.1:5432/sealife-sealrescue   # или полный URI Neon/Supabase (EU)
PAYLOAD_SECRET=<длинная случайная строка>                                  # подписывает в т.ч. play-token лидерборда
NEXT_PUBLIC_PLAUSIBLE_SRC=                                                  # пусто = аналитика и consent-баннер выключены
SERVER_URL=http://localhost:3000                                           # serverURL Payload (опц. в dev)
```
Секреты не коммитим; `.env.example` — без значений. На разных окружениях `PAYLOAD_SECRET` **должен
отличаться** (см. [DEPLOYMENT.md](DEPLOYMENT.md)).

## Запуск
```bash
npm install
cp .env.example .env     # заполнить значения
npm run dev              # Next + Payload; схема БД синхронизируется push-режимом (dev)
```
- Публичный сайт: `http://localhost:3000/ru` (или `/en`). По умолчанию открывается **sealife**;
  **sealrescue** — `http://localhost:3000/ru?site=sealrescue`.
- Админка: `http://localhost:3000/admin` (первый запуск предложит создать `admin`-пользователя).

## Скрипты
| Команда | Что делает |
| --- | --- |
| `npm run dev` | Next + Payload в dev |
| `npm run devsafe` | то же, с чисткой `.next` (помогает на Windows при «залипшем» кэше) |
| `npm run build` / `npm start` | прод-сборка / запуск (`build` поднимает heap до 8 GB) |
| `npm run generate:types` | сгенерировать `src/payload-types.ts` — **после изменения схемы** |
| `npm run generate:importmap` | пересобрать import map админки |
| `npm run lint` | ESLint |
| `npm run seed:glossary` | посев глоссария/translation memory (идемпотентно) |
| `npm run seed:m1` | посев демо-контента и видов (`ru`/`en`) |
| `npm run test:int` | Vitest (integration) |
| `npm run test:e2e` | Playwright (e2e) |

## База данных
- **Dev — push-режим:** Payload синхронизирует схему с Postgres автоматически, миграций пока нет.
  Удобно итерировать, но **перед запуском в прод** нужен baseline-снимок миграции (см. [DEPLOYMENT.md](DEPLOYMENT.md)).
- После изменения коллекций/полей: `npm run generate:types`, затем ревью diff `payload-types.ts`.
- Прод-БД — self-hosted Postgres на VPS с бэкапами; dev/test — Neon (EU). Переключение — `DATABASE_URI`.

## Сиды (демо-данные)
```bash
npm run seed:glossary   # словарь терминов/тюль-сленга (апсерт по source)
npm run seed:m1         # демо статьи/новости/мемы/виды, ru+en
```
Данные правятся в `src/seed/` (`glossaryTerms.ts`, `m1SeedData.ts`); логика записи — `seedGlossary.ts`,
`seedM1.ts`. Сиды используют `payload run` — корректное завершение через top-level await (иначе запись в БД
не успевает; см. историю проекта).

## Тесты
- **Integration** — Vitest (`vitest.config.mts`, `test.env`), `tests/int/api.int.spec.ts`.
- **E2E** — Playwright (`playwright.config.ts`), `tests/e2e/` (admin, frontend). Покрывают в т.ч. route
  guards: контент- и legal-роуты работают на `/ru`, `/en`, `/de`; неизвестные локали и slug → 404.
```bash
npm run test:int
npm run test:e2e
```

## Docker (опционально)
В корне есть `Dockerfile` и `docker-compose.yml` (Postgres + приложение) — для воспроизводимого окружения.

## Стиль кода
- TypeScript **strict**, без `any`; внешний/агентный ввод валидировать (Zod).
- ESLint + Prettier (`.prettierrc.json`, `eslint.config.mjs`); pre-commit (lint/typecheck).
- В компонентах — только **semantic-токены** (не raw `--baltic`); см. [DESIGN_BRIEF.md](DESIGN_BRIEF.md).
- Conventional commits, маленькие PR; ветка/коммит со ссылкой на ID задачи из [Roadmap.md](Roadmap.md);
  после выполнения — `[ ]`→`[x]` в Roadmap.

## Связанные доки
- [architecture.md](architecture.md) · [data-model.md](data-model.md) · [api.md](api.md) ·
  [localization.md](localization.md) · [DEPLOYMENT.md](DEPLOYMENT.md)
