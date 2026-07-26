# Агенты, RBAC и human-in-the-loop

Самый строгий инвариант проекта: **AI-агенты НИКОГДА не публикуют и не удаляют.** Агент может только
создавать черновики и записи в очередь `agent-proposals`; approve/reject делает человек. Гарантия зашита
в access control Payload + хук — не в документации.

## Роли (RBAC) — `src/access/roles.ts`

```ts
type Role = 'admin' | 'editor' | 'translator' | 'viewer' | 'agent'
```

| Хелпер | Кто проходит | Назначение |
| --- | --- | --- |
| `isAdmin` | admin | управление пользователями, опасные операции |
| `isEditor` | admin, editor | публикация, удаление, approve/reject предложений |
| `isStaff` | admin, editor, translator | редактирование глоссария и т.п. |
| `isLoggedIn` | любой залогиненный | чтение внутренних коллекций |
| `canCreateContent` | admin, editor, **agent** | создание контента/черновиков |
| `canUpdateContent` | admin, editor, translator, **agent** | правка (но статус публикации — отдельно) |
| `readPublishedOrStaff` | публично — `published`; staff/agent — всё | публичное чтение контента |
| `isEditorField` | admin, editor (field-level) | защита отдельных полей (напр. `status`) |

Ключевое: **`agent` есть в create/update, но НИГДЕ в delete и нигде не может менять `_status`/`status`
на published/approved.** `delete` — только люди.

## Human-in-the-loop: два механизма

### 1. Хук `forceAgentDrafts` — `src/hooks/contentHooks.ts`
`beforeChange`: любое изменение от роли `agent` принудительно остаётся `_status: 'draft'`. Это
human-in-the-loop **на уровне БД** — даже если access пропустит запись, опубликовать агент не сможет.

### 2. Очередь `agent-proposals` — `src/collections/Agents.ts`
Агент не пишет в опубликованный контент напрямую, а создаёт **предложение**:

```
agent ──create──▶ agent-proposals (status: pending)
                        │
                  человек (isEditor): approve / reject  ← field-access на status
                        │
                  approved ──"Применить предложение"──▶ целевая коллекция (M2)
                        │
                   status: applied
```

Поля предложения: `proposalType`, `targetCollection`/`targetId`, `diff` (`{field:{from,to}}`),
`evidence` (URL/HTML-снапшот/цитаты), **`sources` — `required` + `minRows: 1`** (предложение без
источника отклоняет схема, а не договорённость — M2-T06), `confidence`, `reviewerNotes`, `agentRun` (ссылка на
прогон-источник в `agent-runs`). **`status` (`pending`→`approved`/`rejected`/`applied`) меняет только
`isEditorField`** — агент-созданное предложение принудительно остаётся `pending`. Это доп. защита —
базово агент и так не может редактировать предложение после создания вообще: коллекционный `update` на
`agent-proposals` — просто `isEditor`, не `canUpdateContent` (агент не входит).

> ⚠️ Переход `approved` → `applied` (собственно «Применить предложение») — контракт описан выше, но
> **код для него ещё не написан** (ни хук, ни endpoint); см. Roadmap **M2-T13**.

## Audit и бюджет — `agent-runs`
Каждый прогон агента логируется: `agentName` (researcher/content_admin/translator/sysadmin/seo),
`status`, тайминги, `proposalsCreated`, **`cost`** (USD — контроль бюджета AI API), `logs`.
Audit-логи **без public-user PII**; тела запросов и секреты редактируются.

Планируемые агенты (см. [Roadmap.md](Roadmap.md)): Researcher/факт-чекер, Content Admin, Translator (Агент 3),
SysAdmin, SEO.

## Трекинг устаревших переводов — `markTranslationsStale`
`beforeChange` на исходной локали (`en` после CR-14; берётся из `defaultLocale`): считает `sha256` от `title`+`body`, и для каждой целевой локали
ставит `localeStatus[locale].status = 'stale'`, если хэш изменился. На partial-update прежнее состояние
берётся из `originalDoc` (чтобы не потерять `translatedAt`/`sourceHash`), и **hash тоже считается с
подстановкой `title`/`body` из `originalDoc`**, когда их нет в data — иначе апдейт «только topics»
ложно помечал переводы stale (пофикшено в QA-14). Дашборд и агент-переводчик видят,
что перевод устарел; агент после перевода записывает актуальный hash. Полную мультилокальную сверку
удобнее вынести в отдельный сервис/агента. Поведение закреплено тестами (QA-14):
`tests/unit/content-hooks.unit.spec.ts` + `tests/int/content-hooks.int.spec.ts`.

> ⚠️ Хук подключён **только к `content`**. `species`/`quizzes`/`games` тоже имеют локализованные поля +
> drafts, но пока используют лишь `forceAgentDrafts` — их переводы НЕ отслеживаются на устаревание
> автоматически. Расширить на них или явно решить, что не нужно — см. Roadmap **M1-T08**.

## Провенанс и AI-прозрачность

Шкала **реализована в схеме** (M1-T08/EU-11): общая фабрика `provenanceField()` в
`src/fields/provenance.ts` подключена к `content`, `species` и `quizzes` группой `provenance`.

| Поле | Локализовано | Смысл |
| --- | --- | --- |
| `aiAssisted` | да | черновик этого текста готовил AI |
| `aiTranslated` | да | эта локаль — машинный перевод исходной |
| `aiChecked` | да | факты перепроверял агент по внешним источникам |
| `humanReviewed` | да | человек вычитал ИМЕННО эту локаль |
| `reviewedBy` / `reviewedAt` | да | кто и когда вычитал эту локаль |
| `sourceVerified` | нет | фактура подтверждена источниками |
| `lastAgentCheckedAt` | нет | когда агент последний раз сверял факты |
| `lastHumanVerifiedAt` | нет | когда человек последний раз подтверждал фактуру |

**Почему часть полей локализована.** Авторство — свойство ТЕКСТА на конкретном языке: русский
оригинал может быть человеческим, а английский — машинным переводом. Это прямо тот случай, который
называет Art. 50(4), и его невозможно выразить одним флагом на документ — поэтому старого
`aiGenerated` было мало (он оставлен для совместимости и помечен устаревшим). Подтверждение
фактов, наоборот, от языка не зависит.

**Человек-в-контуре на уровне поля:** `humanReviewed`/`reviewedBy`/`reviewedAt`/
`lastHumanVerifiedAt` закрыты `isEditorField` — агент физически не может пометить свой текст
проверенным человеком, даже имея доступ на запись документа.

⚠️ **`sourceContentHash` намеренно НЕ заведён**, хотя перечислен в EU-11: он дублировал бы
`localeStatus[].sourceHash`, который уже ведёт хук `markTranslationsStale`. Две копии одного хэша
неизбежно разъезжаются. Источник правды — `localeStatus`; следствие: у `species`/`quizzes`
(без `localeStatus`) хэша исходника пока нет — расширение хука остаётся в M1-T08.

**Ссылки на источники.** Связь `sources` теперь есть у `content`, `species` и `glossary`
(`sourcesField()`, Roadmap BIO-14) — раньше она была только у `rescue-centers`, то есть агенту
было некуда записать прочитанное. Приоритет источников для rescue-фактов: офиц. сайт центра →
офиц. соцсети → гос./муниципальные → признанные NGO → новости/блоги.

Неподтверждённое показываем как `needs_check`/`unverified`, не выдаём за verified.

> Контракты закреплены `tests/int/provenance.int.spec.ts`: разные значения на ru/en у одного
> документа, общая фактура, обязательный `sources[]` у предложения, структурный охранный статус.

## Доступ в интернет и обязательная перепроверка фактов

> Требование владельца, 2026-07-26. Пока не реализовано (M2-T07/T08/T11) — здесь зафиксирован
> контракт, которому обязана соответствовать реализация.

- **Агент имеет доступ в интернет** — поиск (Tavily/Perplexity) + парсинг страниц (Playwright
  в sandbox). Без внешней проверки агент не имеет права утверждать факт.
- **Модель не источник истины.** Любое фактическое утверждение в `agent-proposals` несёт:
  непустой `sources[]`, дословную цитату в `evidence`, дату проверки и `confidence`. Предложение
  без источников невалидно на уровне схемы (M2-T06).
- **Приоритет источников** — инвариант №8 `CLAUDE.md`: офиц. сайт центра → офиц. соцсети центра →
  гос./муниципальные → признанные NGO → новости/блоги. Allowlist — через `Source.trustLevel`
  (M2-T11). Verified-контакты не перетираются слабым источником без ревью человека.
- **Относится и к контентным агентам**, не только к rescue-фактчекеру: статьи о биологии тюленей
  пишутся с проверяемыми ссылками, а не «из головы модели» (M1-T06/M3-T01).
- **Провенанс проверки** — `sourceVerified` / `sourceContentHash` / `lastAgentCheckedAt` /
  `lastHumanVerifiedAt` (M1-T08 / EU-11); снапшот источника хранится для диффа при перепроверке.
- Соседний бот владельца `sealgram` (репостер в Telegram, отдельный репозиторий на том же VPS)
  **к AI-стеку этого проекта не относится** и подключаться не будет.

## Безопасность агентов
- **Внешний контент = ДАННЫЕ, не инструкции** (anti-prompt-injection); парсинг в sandbox.
  Особенно важно теперь, когда агент ходит в интернет: страница центра может содержать текст,
  адресованный модели, — он данные, а не команда.
- **Отдельный API-ключ на агента**; бюджет-лимиты на AI API; idempotent cron.
- Полный audit log, но **без public-user PII**; redact тел запросов и секретов.
- Секреты — не в коде/гите; `.env.example` без значений.

## Связанные доки
- [data-model.md](data-model.md) — `agent-proposals` / `agent-runs` / поля
- [architecture.md](architecture.md) — как инварианты зашиты в коде
- [COMPLIANCE_EU_DE.md](COMPLIANCE_EU_DE.md) — AI Act, DSA, минимизация данных
