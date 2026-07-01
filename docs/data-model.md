# Модель данных (коллекции Payload)

Все коллекции собираются в [`src/payload.config.ts`](../src/payload.config.ts). Локализация — нативная
Payload: поля с `localized: true` хранят значение по локали (`ru` исходная, `en` перевод). `slug`
канонический — **общий для локалей** и не локализуется. Типы генерируются в `src/payload-types.ts`
(`npm run generate:types` после изменения схемы).

Доступ (RBAC) задаётся в `access` каждой коллекции через хелперы из [`src/access/roles.ts`](../src/access/roles.ts).
Роли: `admin` / `editor` / `translator` / `viewer` / `agent`. Подробно про роли — в [agents.md](agents.md).

## Контент

### `content` — статьи / новости / мемы
Единая коллекция редакционного контента; вид задаётся полем `type` (`article`/`news`/`meme`/`page`).
Поля: `title`*/`excerpt`/`body` (lexical) — локализованные; `slug` (canonical, общий); `coverImage`
(→`media`); `topics` (hasMany select, фильтр ленты — подписи локализуются в коде `content/topics.ts`,
НЕ через Payload-локализацию); `crossLink.rescueCenter` (relationship → `rescue-centers` — механизм
перелинковки sealife↔sealrescue, см. CLAUDE.md); `seo.metaTitle`/`seo.metaDescription` (локализованные);
`aiGenerated` (checkbox, AI Act); `localeStatus[]` (`locale`/`status`/`sourceHash`/`translatedAt` —
заполняется хуком `markTranslationsStale`, см. [agents.md](agents.md)). Drafts включены. **Доступ:**
read `readPublishedOrStaff` (публично — только `published`, staff видит черновики), create
`canCreateContent` (вкл. агентов → черновик), update `canUpdateContent` (admin/editor/**translator**/agent),
**delete `isEditor`** (агент удалять не может).

### `species` — «Тюленепедия»
Карточки видов ластоногих для sealife. Отдельная коллекция: `name`*/`slug` (локализованы, `slug`
canonical), `latin` (**не** локализуется — научное имя одинаково), `conservationStatus` (select IUCN:
`LC`/`NT`/`VU`/`EN`/`CR`/`DD`), `region`/`size` (локализованные), `excerpt`/`body` (локализованные),
`facts[]` (локализованный array, используется и в «Факте дня»), `coverImage`, `aiGenerated`.
Drafts + `forceAgentDrafts`. **Доступ:** как у `content`. ⚠️ **`markTranslationsStale` сюда НЕ подключён**
(в отличие от `content`) — integrity перевода для видов пока не трекается автоматически (M1-T08).

### `quizzes` — квизы
`title`*/`slug`/`description`, `questions[]` → `options[]` (`text`, `isCorrect`), `explanation`,
`aiGenerated`. Тексты локализованы. Drafts + `forceAgentDrafts`. **Доступ:** как у `content`.

### `games` — мини-игры (метаданные)
Метаданные игры, не сам код: `title`*/`slug` (канонический), `excerpt`, `how` (локализованное «как
играть» — текст вне canvas, доступность), `embed` (путь к статической игре в `/public/games/<...>`,
язык передаётся через `?lang=<locale>`), `showCover`/`coverSeed` (управление заставкой), `order`
(сортировка в списке). Drafts + `forceAgentDrafts`. **Доступ:** как у `content`.
См. [game-seal-hunter.md](game-seal-hunter.md).

### `media` — загрузки
`upload: true`. Поле `alt` — **локализованное и обязательное** (WCAG/EAA + SEO — инвариант, не «на словах»).
Определена **инлайн в `payload.config.ts`** (не отдельным файлом). **Доступ:** read публичный
(`() => true`); ⚠️ `create`/`update`/`delete` НЕ заданы явно → Payload по умолчанию пускает любого
залогиненного — единственная коллекция без полного явного access-блока (нарушает правило CLAUDE.md
«в каждой коллекции — явный access»), см. **SEC-07** в Roadmap.
> ⚠️ `src/collections/Media.ts` — мёртвый неиспользуемый файл: похожая, но не идентичная схема
> (там `alt` НЕ localized), никогда не импортируется в `payload.config.ts`. Не путать с реальной
> (инлайн) коллекцией выше; см. **SEC-07**.

## Rescue

### `rescue-centers` — справочник центров
Публичный справочник. `name` (**не** локализуется — имя центра не переводим, правило глоссария),
`slug` (unique), `country`*/`region`, `website`, `email`/`phone`, `address`, `location` (point
`[lng,lat]`, для карты), `socialLinks[]` (`platform` select + `url`), `operatingLanguages`
(hasMany `ru`/`en`/`de`/`other`), `description` (localized richText), `status` (select:
`active`/`unconfirmed`/`link_broken`/`needs_check` — код использует `unconfirmed`, а не `unverified`
из CLAUDE.md §7; терминология не 1:1, свериться при следующей правке схемы), `verificationScore`
(0–1), `lastCheckedAt`/`verifiedByAgentAt`/`verifiedByHumanAt` (даты, рендерятся в «штампе проверки»),
`sources[]` (→`sources`). **Доступ:** read публичный; create/update/**delete** — `isEditor` (агент НЕ
пишет напрямую; предлагает через `agent-proposals`). Инвариант: не перетирать verified-контакты слабым
источником без ревью.
> ⚠️ **Фронтенд пока не читает эту коллекцию.** `rescue-centers/page.tsx` и `[slug]/page.tsx`
> сейчас на 100% на dev-моках (`@/mock/sample`), не на Payload — реальное подключение входит в
> **M2-T02** (Roadmap).

## Сообщество (UGC) и реакции — `src/collections/Community.ts`

### `user-submissions` — заявки/нотисы
UGC всегда на премодерации. Минимум данных: **email НЕ запрашиваем**, только опциональный `contactHandle`
(ник TG/VK), если человек хочет ответ. Поля: `summary`, `submissionType`, `content`*, `relatedCollection`/
`relatedId`, `contactHandle`, `status` (`pending`/`approved`/`rejected`). **Доступ:** read `isEditor`
(не публичны до модерации), **create публичный** (прислать может любой без аккаунта), update/delete
`isEditor`. ⚠️ Публичный `create` пока БЕЗ rate-limit/CAPTCHA (в отличие от лидерборда) — см. **SEC-05**.

### `reactions` — анонимные реакции
Анонимные реакции на контент (без PII, без аккаунтов): `key` (`collection:id`), `emoji`, `count`.
Source of truth — БД, не localStorage. **Доступ:** read публичный; create/update/delete `isEditor` —
⚠️ атомарный публичный инкремент-эндпоинт (упомянут в комментарии `Community.ts`) пока **не реализован**
(см. **M1-T12**), поэтому анонимный пользователь сегодня не может оставить реакцию через API вообще.

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

**Задел под мульти-игровой лидерборд (SR-09, ещё НЕ в схеме — целевое состояние):** опциональные,
game-нейтральные поля `distance` / `livesRemaining` / `fishCollected` / `courseSeed` (number/number/
number/text, все null/omitted у существующих строк Seal Hunter → обратная совместимость). `courseSeed`
выводится сервером из play-токена, не от клиента (см. [game-seal-run.md](game-seal-run.md) §2.2/§2.6).
`score` остаётся required сорт-ключом (для Seal Run — производная формула distance+улов+жизни,
≤100000; ранжирование `sort: ['-score', createdAt]` не меняется).

## Агенты — `src/collections/Agents.ts`

### `agent-proposals` — очередь ревью (сердце human-in-the-loop)
Агент СОЗДАЁТ предложение; статус approve/reject меняет ТОЛЬКО человек. Поля: `summary`*, `proposalType`,
`targetCollection`/`targetId`, `diff` (json), `evidence` (json), `sources` (relationship), `confidence`,
`status` (`pending`/`approved`/`rejected`/`applied` — **дополнительно field-access `isEditorField`**),
`reviewerNotes`, `agentRun` (relationship → `agent-runs`, привязка предложения к прогону-источнику).
**Доступ:** read `isLoggedIn`, create `canCreateContent` (вкл. агентов), **update и delete —
коллекционный `isEditor`** (не `canUpdateContent`!) — т.е. агент не может редактировать предложение
вообще после создания, не только поле `status`; field-access `isEditorField` на `status` — доп.
защитный слой, а не единственное ограничение.
> ⚠️ Переход `approved` → `applied` («Применить предложение», diff → черновик целевой коллекции) —
> **пока не реализован кодом** (ни хука, ни endpoint'а); это ожидаемо и отслеживается как **M2-T13**.

### `agent-runs` — audit log прогонов
Аудит + бюджет-контроль. `agentName` (researcher/content_admin/translator/sysadmin/seo), `status`,
`startedAt`/`finishedAt`, `proposalsCreated`, `cost` (USD), `logs` (json). Audit-логи без public-user PII;
секреты/тела запросов редактируются.

## Пользователи

### `users` — staff-аккаунты
Внутренние аккаунты персонала (аутентификация по email — единственное исключение из «email не собираем»;
`auth.useAPIKey: true` — у агентов свой API-ключ на аккаунт). `role` (admin/editor/translator/viewer/agent),
`email`, `displayName`. **Доступ:** create/update/delete `isAdmin`; **read — только себя, КРОМЕ `admin`**
(видит всех) — не «себя/staff» в широком смысле: editor/translator/viewer/agent не видят чужие записи
`users` вообще (least-privilege на список email/API-ключей). Публичных user-аккаунтов нет (вне MVP).

## Матрица доступа (read · create · update · delete)

| Коллекция | read | create | update | delete |
| --- | --- | --- | --- | --- |
| `content`, `species`, `quizzes`, `games` | published/staff | +agent (draft) | translator/+agent | editor |
| `rescue-centers` | public | editor | editor | editor |
| `media` | public | ⚠️ не задан явно³ | ⚠️ не задан явно³ | ⚠️ не задан явно³ |
| `glossary` | public | staff | staff | editor |
| `sources` | logged-in | +agent | translator/+agent | editor |
| `user-submissions` | editor | **public**⁴ | editor | editor |
| `game-scores` | public | editor¹ | editor¹ | editor |
| `agent-proposals` | logged-in | +agent | editor² | editor |
| `agent-runs` | logged-in | +agent | translator/+agent | editor |
| `users` | self only (admin: все) | admin | admin | admin |

¹ публичная запись — только через endpoint лидерборда (валидация + local API). · ² коллекционный `isEditor`
(агент не редактирует предложение вообще после создания, не только `status`) — доп. field-access
`isEditorField` на `status`. · ³ Payload по умолчанию пускает любого залогиненного — не «никто», это
пробел (см. **SEC-07**). · ⁴ без rate-limit/CAPTCHA (см. **SEC-05**).
**Инвариант: `delete` НИКОГДА не у роли `agent`.** «+agent» и «translator» в `update` идут через
`canUpdateContent`, который включает admin/editor/translator/agent одновременно — таблица не разбивает
их построчно, но обе роли реально есть везде, где стоит `canUpdateContent`.
