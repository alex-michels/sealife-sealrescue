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
- Публичный сайт: `http://localhost:3000/ru` (или `/en` — контентных локалей две). По умолчанию
  открывается **sealife**; **sealrescue** — `http://localhost:3000/ru?site=sealrescue`.
- Префикс `/de` — **legal-only**: резолвятся лишь `/de/legal-notice` (Impressum), `/de/privacy`
  (Datenschutz), `/de/cookies`, `/de/terms`; любой контентный `/de/...` отдаёт 404. Немецкого UI
  больше нет — обвязка этих страниц рендерится по-английски, немецкими остаются сами обязательные
  документы. **TODO (EU-06):** оставлять ли немецкие legal-страницы вообще — на юрпроверку.
  Подробности — [localization.md](localization.md).
- Админка: `http://localhost:3000/admin` (первый запуск предложит создать `admin`-пользователя).

### ⚠️ Ловушка: `npm run build` и `npm run dev` делят один `.next`

**Симптом.** Часть роутов начинает отдавать **404 — нашу собственную `not-found.tsx`**, хотя код и
данные в порядке. Наблюдалось 2026-07-26: `/en/games` и `/en/species` отдавали 404, тогда как
`/en/articles`, `/en/memes`, `/en/quizzes` — 200. Тот же URL при этом отвечал то 200, то 404 по
мере того как dev-сервер до-компилировал сегменты.

**Причина.** Прод-сборка и dev-сервер пишут в один каталог `.next`. Если их чередовать (а именно
это происходит при отладке e2e: `npm run build` → `CI=1 playwright test` → снова `npm run dev`),
манифесты роутов расходятся, и сервер обслуживает устаревший бандл.

**Как отличить от настоящей регрессии** — три признака, любой из которых почти наверняка означает
именно эту ловушку:
* 404 нестабилен: тот же URL отвечает то 200, то 404;
* CI зелёный, а локально красное — CI собирает с нуля на каждый прогон;
* **навигация подсвечивает раздел, который отдаёт 404.** Самый показательный признак:
  `SectionNav` — клиентский компонент и читает `sectionDefs` из клиентского бандла, а route guard
  зовёт `getSection()` на сервере. «Клиент знает про раздел, сервер — нет» = серверный бандл
  устарел, потому что оба берут набор разделов из одного `src/site/sections.ts`.

**Лечение.** `npm run devsafe` (чистит `.next` и поднимает dev).

**Проверка, что это не код.** Прежде чем чинить «баг», убедиться, что данные на месте
(`curl -s 'http://localhost:3000/api/games?locale=en&depth=0'`) и что unit-тест структуры разделов
(`tests/unit/sections-legal.unit.spec.ts`) зелёный. Если оба в порядке, а `nav-smoke.e2e.spec.ts` в
CI зелёный — код не при чём.

**Почему не разнесли каталоги.** Отдельный `distDir` для прод-сборки убрал бы ловушку совсем, но
поменял бы пути в `deploy/`, `deploy.yml` и systemd-юните. Пока сочтено, что цена выше пользы:
ловушка ловится за минуту по признакам выше. Если начнёт повторяться — заводить задачу.

## Скрипты
| Команда | Что делает |
| --- | --- |
| `npm run dev` | Next + Payload в dev |
| `npm run devsafe` | то же, с чисткой `.next` — лечит «залипший» кэш, в т.ч. ловушку `build` × `dev` выше |
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
Данные правятся в `src/seed/` (`glossaryTerms.ts`, `m1SeedData.ts`); логика записи — `src/seed/lib.ts`
(экспортируемые функции, QA-18), а `seedBaseline.ts`/`seedGlossary.ts`/`seedM1.ts` — тонкие
`payload run`-обёртки. Сиды идемпотентны (upsert по slug/source) — закреплено
`tests/int/seeds.int.spec.ts`. Запуск через `payload run` — корректное завершение через top-level
await (иначе запись в БД не успевает; см. историю проекта).

⚠️ **Сиды гонять на Node 22, не 24** (`payload run`/`tsx` пока не поддерживает Node 24 module loader —
inline-комментарий в `seedBaseline.ts`/`seedGlossary.ts`/`seedM1.ts`): `fnm use 22 && npm run seed:baseline`.
Сборка/dev-сервер — на Node 24 (`.nvmrc`), это разные версии для разных команд. См. также `DEPLOYMENT.md` §5.7/§9.

## Перед коммитом

Полный локальный прогон **перед каждым коммитом/пушем** (правило CLAUDE.md → Dev best practices):

```bash
npm run lint          # 0 errors (warnings — по warn-политике)
npm run typecheck     # tsc --noEmit
npm run test:coverage # unit + int + порог покрытия (то же, что гоняет CI)
npm run build         # если менял фронтенд, схему Payload или конфиги сборки
npm run test:e2e      # затронутые спеки, если менял e2e-поведение
```

Красное = не коммитим.

⚠️ Этот чек-лист сам заводит ловушку `build` × `dev`: `npm run build` и `npm run test:e2e`
(поднимает прод-сборку) пишут в тот же `.next`, из которого потом читает `npm run dev`. Если после
прогона локальный сайт начал отдавать 404 на части роутов — это не регрессия, а устаревший бандл:
`npm run devsafe`. Признаки и диагностика — [§ Ловушка выше](#️-ловушка-npm-run-build-и-npm-run-dev-делят-один-next).

Изменил схему Payload → дополнительно `npm run generate:types` и помнить:
локальный `build` проходит против ТВОЕЙ БД (push уже прошёл при первом бооте), а БД, в которые
смотрят deploy-build и CI, получают схему своими шагами (`Sync DB schema` в `deploy.yml`;
`scripts/push-dev-schema.mts` в jobs `test`/`e2e`). Новое окружение без этого шага упадёт
на `relation … does not exist` (инцидент PR #53) — см. `DEPLOYMENT.md` §9.

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
  ролей, `resolveSiteId`/`pickLocale`/proxy-контракт, инварианты локалей, `t()`/`buildAlternates`,
  alias-контракт server↔client, season-математика, `factOfDay`, sections/legal/`formatDate`,
  хуки контента, **пути предпросмотра** (`preview-paths.unit.spec.ts` — CR-08, в т.ч. защита от
  открытого редиректа), **типы контента** (`content-types.unit.spec.ts` — CR-06: что попадает в ленту
  главной и есть ли у типа локализованная подпись), **дата публикации** (`published-at.unit.spec.ts` — CR-05: когда ставится штамп
  и когда его нельзя двигать), **владение сида** (`seed-ownership.unit.spec.ts` — CR-03, когда сид НЕ имеет
  права перезаписать запись), **provenance-шкала** (`ai-badge.unit.spec.ts` — какие метки увидит читатель,
  EU-11), **биология сида** (`seed-biology.unit.spec.ts` — коды IUCN и факты, трек BIO),
  **sim-golden** (детерминизм ядра игры; обновление — `UPDATE_GOLDEN=1`, QA-30) и
  **fairness** (пороги честности по профилям экранов, QA-31). Coverage-гейт: пороги в
  `vitest.config.mts` (ratchet — только вверх).
- **Integration** — Vitest project `int` (`tests/int/*.int.spec.ts`, jsdom + setup; файлы бегут
  последовательно — `fileParallelism: false`, иначе параллельный boot Payload гоняет drizzle push
  наперегонки).
  ⚠️ **Два vitest-процесса против одной БД одновременно запускать нельзя** — `fileParallelism`
  закрывает гонку внутри прогона, между процессами закрыть нечем. Каждый `getPayload()` гоняет
  drizzle-push, и два push'а роняют друг друга на DDL ещё до первого теста:
  `ALTER TABLE … DROP CONSTRAINT … does not exist`, дальше вся спека уходит в skip, а `afterAll`
  падает на `payload` = undefined. Ловится по стеку: `pushDevSchema` ← `getPayload` в `beforeAll`.
  Практически: не запускать `npm run test:coverage` и `vitest --project int` одновременно, и не
  забывать про фоновые прогоны. Своя БД под каждый процесс (`DATABASE_URI_TEST`) — единственный
  способ обойти, для одиночной машины смысла нет.
  Состав: `access-matrix.int.spec.ts` — вся access-матрица из `data-model.md` (QA-13, 110
  тестов, включая инварианты №1–2 и `forceAgentDrafts`); `leaderboard.int.spec.ts` — контракт
  лидерборда, все ветки анти-чита (QA-15); `content-hooks.int.spec.ts` — `markTranslationsStale`
  на живом Payload (QA-14); `seeds.int.spec.ts` — идемпотентность сидов + инварианты локалей
  (QA-18); `feed-types.int.spec.ts` — CR-06: лента не отдаёт служебные страницы (и фиксирует, что
  без фильтра отдавала бы); `published-at.int.spec.ts` — CR-05 на живом Payload: публикация ставит дату, правка её
  не двигает, сортировка `-publishedAt` не поднимает отредактированный старый материал;
  `seed-guard.int.spec.ts` — CR-03: опубликованная человеком запись переживает
  повторный сид, `force` осознанно возвращает демо-эталон; `media-upload.int.spec.ts` — CR-04: загрузка пишется в настроенный `staticDir` (и он
  не внутри `releases/`), производные размеры генерируются, оригинал пережат в webp без EXIF.
  ⚠️ Единственная спека с `// @vitest-environment node`: проверка типа файла в Payload идёт через
  `file-type`, а тот падает в jsdom — артефакт среды, в реальном Node загрузка работает;
  `provenance.int.spec.ts` — поля шкалы провенанса на живом Payload, включая локализацию
  флагов и `isEditorField` на «человек проверил» (EU-11); `locale-fallback.int.spec.ts` —
  контракт CR-01: непереведённый документ не виден в чужой локали, плюс ЗАПИСЬ измеренного
  поведения Payload (одного `fallbackLocale: false` мало — документ возвращается с пустым
  заголовком; строка локали не может существовать без заголовка, он `required`);
  `api.int.spec.ts` — smoke.
- **E2E** — Playwright (`playwright.config.ts`), `tests/e2e/`:
  - `frontend.e2e.spec.ts` — контракты брендинга/роутинга: главные обеих локалей (title/h1/`lang`/свитчер),
    sealrescue через `?site=`, redirect-политика `/`, настоящие HTTP 404 + локализованная
    `not-found.tsx` (QA-04/05 — done, PR #39/#40).
  - `admin.e2e.spec.ts` — логин в админку, dashboard, списки/создание пользователя.
  - `game-standalone.e2e.spec.ts` — standalone vs iframe-режим игры (свитчер языка,
    `?lang=`, запись языка в `localStorage` только после явного выбора).
  - `game-leaderboard-scroll.e2e.spec.ts` + `helpers/mock-leaderboard.ts` — регрессионный тест
    авто-скролла к строке игрока (в CI с QA-09; расширение обвязки — Roadmap **QA-32**).
  - `consent.e2e.spec.ts` — TDDDG-контракт аналитики (QA-23): opt-in гейт Plausible, равнозначные
    кнопки, consent-cookie (не localStorage), отзыв через Cookie-Settings. Бежит только при
    заданном `NEXT_PUBLIC_PLAUSIBLE_SRC` (CI ставит фиктивный `.test`-URL; локально — по желанию
    в `.env`, иначе спек пропускается).
  - `seo.e2e.spec.ts` — hreflang/canonical на контентных страницах ×2 локали (`ru`/`en`) + контракт
    `sitemap.xml` (published-only, прод-домены, x-default; sealrescue — только главная до M2) (QA-20).
  - `legal.e2e.spec.ts` — legal-shell: 12 роутов ×200 (4 legal-страницы × `ru`/`en` + legal-only `de`),
    DE-заголовки (Impressum/…), draft-плашка, футер-ссылки на 6 типах страниц (QA-22).
  - `language-switcher.e2e.spec.ts` — aria-контракт свитчера, закрытие (Esc/вне/Tab), сохранение
    пути, `NEXT_LOCALE` только по явному клику (QA-24).
  - `nav-smoke.e2e.spec.ts` — обход навигации (последний пункт **M0-T19**): меню в DOM сверяется с
    `navSectionsForSite()`, каждая ссылка отдаёт 200 + непустой `<h1>`, legal-ссылки футера — 200;
    оба сайта × ru/en. Утверждений о текстах карточек нет: спека должна пережить вывод моков
    (трек **MOCK**) и работать на пустой БД.
  - `rescue-advice.e2e.spec.ts` — **контракт безопасности** страницы «нашёл тюленя» (трек BIO):
    «одинокий детёныш обычно НЕ брошен», запрет возвращать в воду, укусы/зоонозы, наблюдаемые
    признаки, порог дистанции — и **порядок блоков** (норма выше запретов). Не про вёрстку: если
    копирайт сократят, тест обязан покраснеть.
  - `preview.e2e.spec.ts` — CR-08: гейт предпросмотра. Аноним получает 401 и черновика не видит;
    внешний путь отвергается как 400 (защита от открытого редиректа), валидный путь без сессии —
    401, то есть причины отказа разделены; сотрудник видит черновик с плашкой, выход возвращает 404.
  - `report-form.e2e.spec.ts` — форма «сообщить»: нет email-полей, error/success-состояния (QA-25;
    форма пока демо — DB-ассерты придут с M2-T04, серверный контракт премодерации —
    `tests/int/user-submissions.int.spec.ts`).
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
- **Изоляция БД (QA-11):** int-тесты идут в `DATABASE_URI_TEST`, если он задан в `.env` —
  заведите отдельную БД или Neon-ветку dev-БД; без него — dev-БД с громким предупреждением
  (`vitest.setup.ts`). В CI изоляция всегда полная (ephemeral Postgres на прогон). На e2e
  НЕ распространяется: Playwright тестирует сервер, который сам читает `DATABASE_URI`, поэтому
  сид (`tests/helpers/seedUser.ts`) и сервер обязаны смотреть в одну БД.
- Сеть в e2e мокируется, где внешняя зависимость не является предметом теста
  (`tests/e2e/helpers/mock-leaderboard.ts` — образец).
- **Политика флаки (QA-12):**
  - `waitForTimeout`/sleep в тестах **запрещены ESLint-правилом** (`no-restricted-syntax` для
    `tests/**` в `eslint.config.mjs`) — ждать только web-first assertions;
  - ретраи (max 2) — только в CI (`retries` в `playwright.config.ts`);
  - флакующий e2e-тест помечается тегом: `test('…', { tag: '@quarantine' }, …)` — в CI он
    исключается (`grepInvert` в конфиге) и не блокирует мерж, локально продолжает бегать;
  - карантин — не жизнь: тест чинится или удаляется **в течение недели**; неактуальный,
    скипнутый или флакующий тест — такой же баг, как его отсутствие (CLAUDE.md).
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
