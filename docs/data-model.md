# Модель данных (коллекции Payload)

Все коллекции собираются в [`src/payload.config.ts`](../src/payload.config.ts). Локализация — нативная
Payload: поля с `localized: true` хранят значение по локали (`ru` исходная, `en` перевод). `slug`
канонический — **общий для локалей** и не локализуется. Типы генерируются в `src/payload-types.ts`
(`npm run generate:types` после изменения схемы).

Доступ (RBAC) задаётся в `access` каждой коллекции через хелперы из [`src/access/roles.ts`](../src/access/roles.ts).
Роли: `admin` / `editor` / `translator` / `viewer` / `agent`. Подробно про роли — в [agents.md](agents.md).

## Контент

### `content` — статьи / новости / мемы
Единая коллекция редакционного контента; вид задаётся полем `type`. Поля: `title`*, `slug`, `body`
(lexical) — локализованные; provenance-метки. Drafts включены. **Доступ:** read `readPublishedOrStaff`
(публично — только `published`, staff видит черновики), create `canCreateContent` (вкл. агентов → черновик),
update `canUpdateContent`, **delete `isEditor`** (агент удалять не может).

### `species` — «Тюленепедия»
Карточки видов ластоногих для sealife. Отдельная коллекция (свои поля: латынь, ареал, размер, факты,
охранный статус). `name`/`slug` локализованы, `latin` — **не** локализуется (научное имя одинаково).
Drafts + `forceAgentDrafts`. **Доступ:** как у `content`.

### `quizzes` — квизы
`title`*/`slug`/`description`, `questions[]` → `options[]` (`text`, `isCorrect`), `explanation`. Тексты
локализованы. Drafts. **Доступ:** как у `content`.

### `games` — мини-игры (метаданные)
Метаданные игры (заставка, «как играть», `embed`-путь), не сам код. Игра (HTML/CSS/JS) лежит в
`/public/games/<...>` и встраивается фреймом; язык передаётся через `?lang=<locale>`. `title`/`excerpt`
локализованы, `slug` канонический. Drafts + `forceAgentDrafts`. **Доступ:** как у `content`.
См. [game-seal-hunter.md](game-seal-hunter.md).

### `media` — загрузки
`upload: true`. Поле `alt` — **локализованное и обязательное** (WCAG/EAA + SEO — инвариант, не «на словах»).
**Доступ:** read публичный.

## Rescue

### `rescue-centers` — справочник центров
Публичный справочник. `name` (**не** локализуется — имя центра не переводим, правило глоссария),
`slug` (unique), `country`*/`region`, `website`, `email`/`phone`, `status`, provenance/verification.
**Доступ:** read публичный; create/update/**delete** — `isEditor` (агент НЕ пишет напрямую; предлагает
через `agent-proposals`). Инвариант: не перетирать verified-контакты слабым источником без ревью.

## Сообщество (UGC) и реакции — `src/collections/Community.ts`

### `user-submissions` — заявки/нотисы
UGC всегда на премодерации. Минимум данных: **email НЕ запрашиваем**, только опциональный `contactHandle`
(ник TG/VK), если человек хочет ответ. Поля: `summary`, `submissionType`, `content`*, `relatedCollection`/
`relatedId`, `contactHandle`. **Доступ:** read `isEditor` (не публичны до модерации), **create публичный**
(прислать может любой без аккаунта), update/delete `isEditor`.

### `reactions` — анонимные реакции
Анонимные реакции на контент (без PII, без аккаунтов). Source of truth — БД, не localStorage.

## Локализация / источники

### `glossary` — translation memory + словарь
`ru→перевод` для переводчиков и будущего Агента-переводчика. **Справочник, а не движок перевода «на лету»**.
Поля: `source` (ru-ключ), `translation` (локализованный), `category` (`term`/`slang`/`meme`), `variants[]`
(локализованные), `note`, `doNotTranslate`. Старт-набор — `src/seed/glossaryTerms.ts` (`npm run seed:glossary`,
идемпотентно). **Доступ:** read публичный; create/update `isStaff` (admin/editor/translator); delete `isEditor`.
Агент читает, но пишет только через `agent-proposals`.

### `sources` — источники для фактчекинга
URL-источники для агентов и проверки rescue-данных. `url`*, `type`, `trustLevel` (приоритет офиц. источников),
`lastFetchedAt`, `notes`. **Доступ:** read `isLoggedIn` (внутреннее), create/update `canCreateContent`/
`canUpdateContent`, delete `isEditor`.

## Игры

### `game-scores` — анонимный лидерборд
EU-чистая модель: **нет PII** (ни email, ни IP, ни аккаунтов, ни сырого seed). `playerKey` —
недельный односторонний `sha256(seed:game:season)` (только для дедупа строки за неделю, ротируется и
удаляется при сбросе). Имя локализуемо: `nameParts` + `baseAlias` (EN) + `suffix`; `alias` — EN display
для админки. `board` (грубо desktop/mobile, без пиксельных размеров → без fingerprint), `season` (ISO-неделя).
**Доступ:** read публичный (нет PII); create/update/**delete** `isEditor` — публичная запись идёт ТОЛЬКО через
валидирующий server-authoritative endpoint (local API, overrideAccess). См. [api.md](api.md) и
[game-seal-hunter.md](game-seal-hunter.md).

## Агенты — `src/collections/Agents.ts`

### `agent-proposals` — очередь ревью (сердце human-in-the-loop)
Агент СОЗДАЁТ предложение; статус approve/reject меняет ТОЛЬКО человек. Поля: `summary`*, `proposalType`,
`targetCollection`/`targetId`, `diff` (json), `evidence` (json), `sources` (relationship), `confidence`,
`status` (`pending`/`approved`/`rejected`/`applied` — **field-access: менять может только `isEditorField`**),
`reviewerNotes`, `agentRun`. **Доступ:** read `isLoggedIn`, create `canCreateContent` (вкл. агентов),
update/delete `isEditor`.

### `agent-runs` — audit log прогонов
Аудит + бюджет-контроль. `agentName` (researcher/content_admin/translator/sysadmin/seo), `status`,
`startedAt`/`finishedAt`, `proposalsCreated`, `cost` (USD), `logs` (json). Audit-логи без public-user PII;
секреты/тела запросов редактируются.

## Пользователи

### `users` — staff-аккаунты
Внутренние аккаунты персонала (аутентификация по email — единственное исключение из «email не собираем»).
`role` (admin/editor/translator/viewer/agent), `email`, `displayName`. **Доступ:** create/update/delete `isAdmin`;
read — себя/staff. Публичных user-аккаунтов нет (вне MVP).

## Матрица доступа (read · create · update · delete)

| Коллекция | read | create | update | delete |
| --- | --- | --- | --- | --- |
| `content`, `species`, `quizzes`, `games` | published/staff | +agent (draft) | +agent | editor |
| `rescue-centers` | public | editor | editor | editor |
| `media` | public | — | — | — |
| `glossary` | public | staff | staff | editor |
| `sources` | logged-in | +agent | +agent | editor |
| `user-submissions` | editor | **public** | editor | editor |
| `game-scores` | public | editor¹ | editor¹ | editor |
| `agent-proposals` | logged-in | +agent | editor² | editor |
| `agent-runs` | logged-in | +agent | +agent | editor |
| `users` | self/staff | admin | admin | admin |

¹ публичная запись — только через endpoint лидерборда (валидация + local API). · ² статус — field-access `isEditor`.
**Инвариант: `delete` НИКОГДА не у роли `agent`.**
