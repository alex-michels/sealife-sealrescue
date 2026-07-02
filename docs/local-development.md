# Локальная разработка

Краткий быстрый старт — в корневом [`README.md`](../README.md). Здесь — детали для разработки.

## Требования
- **Node** `^18.20.2 || >=20.9.0` в `package.json engines`; `.nvmrc` пинит **24** (совпадает со сборкой/
  рантаймом в CI/на VPS — `nvm use`/`fnm use` без аргумента даёт правильную версию для `dev`/`build`).
  ⚠️ **Кроме сидов** — `payload run` (сиды, `tsx`) пока не поддерживает Node 24 module loader
  (`node:crypto` ENOENT); сиды гонять на **Node 22**: `fnm use 22 && npm run seed:baseline` (см. §«Сиды»,
  и inline-комментарий вверху `src/seed/seedBaseline.ts`).
- **pnpm** упомянут в `package.json engines`/`pnpm.onlyBuiltDependencies` (наследие шаблона Payload), но
  **фактический менеджер пакетов проекта — npm**: канонический lockfile — `package-lock.json`
  (`pnpm-lock.yaml` в `.gitignore`), CI использует `npm ci`/`npm run build`. `.npmrc` содержит
  `legacy-peer-deps=true` (влияет на `npm install`). `playwright.config.ts` `webServer` локально
  поднимает `npm run dev` сам (уже запущенный dev-сервер переиспользуется), в CI — `npm run start`
  против прод-сборки.
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
| `npm run typecheck` | `tsc --noEmit` (гоняется и в CI на каждый PR) |
| `npm run seed:baseline` | посев обязательного MUST-HAVE минимума (сейчас: строка `games` для лидерборда) — нужен на любой свежей БД, иначе `unknown_game` |
| `npm run seed:glossary` | посев глоссария/translation memory (идемпотентно) |
| `npm run seed:m1` | посев демо-контента и видов (`ru`/`en`) |
| `npm run test:unit` | Vitest, unit-слой (`tests/unit/`, чистая логика, без БД — секунды) |
| `npm run test:int` | Vitest, integration (`tests/int/`, Payload + БД) |
| `npm run test:coverage` | unit + int одним прогоном с coverage-гейтом (пороги в `vitest.config.mts`; так же гоняет CI) |
| `npm run test:e2e` | Playwright (e2e) |
| `npm test` | `test:unit` + `test:int` + `test:e2e` подряд |

## База данных
- **Dev — push-режим:** Payload синхронизирует схему с Postgres автоматически, миграций пока нет.
  Удобно итерировать, но **перед запуском в прод** нужен baseline-снимок миграции (см. [DEPLOYMENT.md](DEPLOYMENT.md)).
- После изменения коллекций/полей: `npm run generate:types`, затем ревью diff `payload-types.ts`.
- Прод-БД — self-hosted Postgres на VPS с бэкапами; dev/test — Neon (EU). Переключение — `DATABASE_URI`.

## Сиды (демо-данные)
```bash
npm run seed:baseline   # обязательный минимум (games) — нужен на любой свежей БД
npm run seed:glossary   # словарь терминов/тюль-сленга (апсерт по source)
npm run seed:m1         # демо статьи/новости/мемы/виды, ru+en
```
Данные правятся в `src/seed/` (`glossaryTerms.ts`, `m1SeedData.ts`); логика записи — `seedBaseline.ts`,
`seedGlossary.ts`, `seedM1.ts`. Сиды используют `payload run` — корректное завершение через top-level
await (иначе запись в БД не успевает; см. историю проекта).

⚠️ **Сиды гонять на Node 22, не 24** (`payload run`/`tsx` пока не поддерживает Node 24 module loader —
inline-комментарий в `seedBaseline.ts`/`seedGlossary.ts`/`seedM1.ts`): `fnm use 22 && npm run seed:baseline`.
Сборка/dev-сервер — на Node 24 (`.nvmrc`), это разные версии для разных команд. См. также `DEPLOYMENT.md` §5.7/§9.

## Тесты

> **Правило проекта: любая фича без теста — баг** (CLAUDE.md → Dev best practices). Тесты — часть
> Definition of Done: фича/бизнес-логика/изменение поведения приходит в PR вместе с тестом своего
> уровня. Изменение, валящее существующий тест, чинит код или осознанно обновляет тест в том же PR.
> Неактуальный (устаревший, скипнутый, флаки) тест — такой же баг, как его отсутствие.
> Полный план покрытия — `docs/Roadmap.md` § «QA — Качество».

**Карта уровней — что каким тестом закрывать:**

| Логика | Уровень | Инструмент / место |
| --- | --- | --- |
| Чистые функции (i18n, alias/PRNG, season-математика, `pickLocale`, sim-ядро игры) | unit | Vitest, без БД/DOM |
| Access control, хуки коллекций, endpoints (лидерборд), сиды | integration | Vitest + Payload local API + тестовая БД, `tests/int/` |
| Роутинг/страницы/UI-контракты/consent/игра в браузере | e2e | Playwright, `tests/e2e/` |
| Доступность | a11y | `@axe-core/playwright` поверх e2e (QA-26) |
| Внешний вид компонентов/токены | visual | `toHaveScreenshot` по styleguide (QA-27) |
| Скорость/CWV | perf | Lighthouse CI (QA-36), FPS-бюджет игры (QA-34) |

**Текущее состояние:**

- **Unit** — Vitest project `unit` (`tests/unit/*.unit.spec.ts`, node-env, без БД): access-матрица
  ролей, `resolveSiteId`, инварианты локалей, `t()`/`buildAlternates`, alias-рендер лидерборда,
  `factOfDay`, sections/legal/`formatDate`. Coverage-гейт: пороги в `vitest.config.mts`
  (ratchet — только вверх; branches поднимется с QA-15).
- **Integration** — Vitest project `int` (`tests/int/*.int.spec.ts`, jsdom + setup):
  `api.int.spec.ts` (пока один smoke-тест — `payload.find('users')`; access control/хуки/лидерборд —
  Roadmap **QA-13…QA-18**).
- **E2E** — Playwright (`playwright.config.ts`), `tests/e2e/`:
  - `frontend.e2e.spec.ts` — контракты брендинга/роутинга: главные 3 локалей (title/h1/`lang`/свитчер),
    sealrescue через `?site=`, redirect-политика `/`, настоящие HTTP 404 + локализованная
    `not-found.tsx` (QA-04/05 — done, PR #39/#40).
  - `admin.e2e.spec.ts` — логин в админку, dashboard, списки/создание пользователя.
  - `game-standalone.e2e.spec.ts` — standalone vs iframe-режим игры (свитчер языка, alpha-notice,
    `?lang=`, запись языка в `localStorage` только после явного выбора).
  - `game-leaderboard-scroll.e2e.spec.ts` + `helpers/mock-leaderboard.ts` — регрессионный тест
    авто-скролла к строке игрока (в CI с QA-09; расширение обвязки — Roadmap **QA-32**).
- **CI-гейт (QA-08 + QA-09 + QA-10):** `.github/workflows/test.yml`, на каждый PR и push в `main`:
  job `test` — `lint` + `typecheck` + `test:coverage` (unit+int+пороги); job `e2e` — схема через
  `scripts/push-dev-schema.mts` → `next build` → Playwright поднимает `next start` и гоняет весь
  e2e-набор на chromium headless shell (трейсы/отчёт — артефакты при фейле). Обе джобы — против
  ephemeral Postgres (PostGIS-образ; поле `point` требует расширение). Required check на `main`
  пока только `test`; `e2e` добавить в protection после недели стабильности.

```bash
npm run test:int
npm run test:e2e
```

**Конвенции:**

- Тесты детерминированы: фиксированный seed, замороженное время где нужно; фикстуры сидируются
  в `beforeAll`, без зависимости от dev-данных.
- Никаких `waitForTimeout`/sleep — только web-first assertions (`expect(...).toBeVisible()` и т.п.).
- Сеть в e2e мокируется, где внешняя зависимость не является предметом теста
  (`tests/e2e/helpers/mock-leaderboard.ts` — образец).
- Флаки-тест чинится или удаляется в течение недели; ретраи (max 2) — только в CI (QA-12).
- **Новая игра** обязана с первого PR иметь: DOM-free sim-ядро, seeded golden-run,
  контрактные тесты лидерборда, e2e-смоук, fairness-пороги (QA-35; образец — Seal The Hunter:
  `core/sim.js` + `tools/fairness-sim.mjs`).

## Docker (опционально)
- `docker-compose.yml` — **только Postgres**-сервис (алтернатива Neon для локальной БД; в комментарии
  файла отмечено, что требует Docker Desktop, который по умолчанию не установлен). Приложение в
  `docker-compose.yml` НЕ описано.
- `Dockerfile` — не задействован нигде в реальном деплое (прод собирается как `.next/standalone` +
  systemd, см. `DEPLOYMENT.md`); это неадаптированный boilerplate из примера Next.js `with-docker`.
  Не полагаться на него как на актуальный деплой-путь.

## Стиль кода
- TypeScript **strict**, без `any`; внешний/агентный ввод валидировать (Zod).
- ESLint + Prettier (`.prettierrc.json`, `eslint.config.mjs`) настроены и рабочие.
  ⚠️ **Pre-commit хука (husky/lint-staged) сейчас фактически НЕТ** — `.git/hooks/` без активных хуков,
  `package.json` без `prepare`/`husky`; lint/typecheck не проверяются автоматически ни локально при
  коммите, ни в CI (см. Roadmap **M0-T07**). Запускать `npm run lint` вручную до коммита.
- В компонентах — только **semantic-токены** (не raw `--baltic`); см. [DESIGN_BRIEF.md](DESIGN_BRIEF.md).
- Conventional commits, маленькие PR; ветка/коммит со ссылкой на ID задачи из [Roadmap.md](Roadmap.md);
  после выполнения — `[ ]`→`[x]` в Roadmap.

## Связанные доки
- [architecture.md](architecture.md) · [data-model.md](data-model.md) · [api.md](api.md) ·
  [localization.md](localization.md) · [DEPLOYMENT.md](DEPLOYMENT.md)
