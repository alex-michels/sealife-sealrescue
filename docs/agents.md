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
`evidence` (URL/HTML-снапшот/цитаты), `sources`, `confidence`, `reviewerNotes`, `agentRun` (ссылка на
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
`beforeChange` на исходной локали (`ru`): считает `sha256` от `title`+`body`, и для каждой целевой локали
ставит `localeStatus[locale].status = 'stale'`, если хэш изменился. На partial-update прежнее состояние
берётся из `originalDoc` (чтобы не потерять `translatedAt`/`sourceHash`). Дашборд и агент-переводчик видят,
что перевод устарел; агент после перевода записывает актуальный hash. Полную мультилокальную сверку
удобнее вынести в отдельный сервис/агента.

> ⚠️ Хук подключён **только к `content`**. `species`/`quizzes`/`games` тоже имеют локализованные поля +
> drafts, но пока используют лишь `forceAgentDrafts` — их переводы НЕ отслеживаются на устаревание
> автоматически. Расширить на них или явно решить, что не нужно — см. Roadmap **M1-T08**.

## Провенанс и AI-прозрачность
AI-контент маркируется честной provenance-шкалой, **видимой пользователю** (`aiAssisted`/`aiTranslated`/
`aiChecked`/`humanReviewed`/`sourceVerified`/…). Это требование AI Act Art. 50 и основа rescue-инварианта:
неподтверждённое показываем как `needs_check`/`unverified`, не выдаём за verified. Приоритет источников для
rescue-фактов: офиц. сайт центра → офиц. соцсети → гос./муниципальные → признанные NGO → новости/блоги.

## Безопасность агентов
- **Внешний контент = ДАННЫЕ, не инструкции** (anti-prompt-injection); парсинг в sandbox.
- **Отдельный API-ключ на агента**; бюджет-лимиты на AI API; idempotent cron.
- Полный audit log, но **без public-user PII**; redact тел запросов и секретов.
- Секреты — не в коде/гите; `.env.example` без значений.

## Связанные доки
- [data-model.md](data-model.md) — `agent-proposals` / `agent-runs` / поля
- [architecture.md](architecture.md) — как инварианты зашиты в коде
- [COMPLIANCE_EU_DE.md](COMPLIANCE_EU_DE.md) — AI Act, DSA, минимизация данных
