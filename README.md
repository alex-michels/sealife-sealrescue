# Payload v3 — контент-схема (scaffold)

Стартовая схема CMS для sealife.info / sealrescue.info. Кладётся в проект **Payload v3 (внутри Next.js)**.

## Установка

```bash
# создать проект Payload v3 + Next
npx create-payload-app@latest
# выбрать: Postgres, blank template

# затем заменить/положить эти файлы и собрать типы
npm install
npm run generate:types   # сгенерирует payload-types.ts
npm run dev              # админка на /admin
```

Файлы из этого scaffold кладутся в `src/`:
```
src/
  payload.config.ts
  access/roles.ts
  hooks/contentHooks.ts
  collections/
    Users.ts  RescueCenters.ts  Content.ts  Quizzes.ts
    Sources.ts  Agents.ts  Community.ts
```

> Сеть в этой среде отключена, поэтому файлы не собирались/не проверялись здесь —
> это готовый каркас, который компилируется в реальном проекте Payload v3 после
> `generate:types`. Версии API могут слегка отличаться между минорными релизами Payload.

## ENV

```
DATABASE_URI=postgres://...        # БД в EU/EEA-регионе (персональные данные)
PAYLOAD_SECRET=...                 # длинная случайная строка
SERVER_URL=https://...
```

## Что уже заложено (привязка к мастер-плану)

- **Локализация ru/en** нативно (Payload `localization`). DE — одна закомментированная строка в `payload.config.ts` + добавить в `TARGET_LOCALES` в `hooks/contentHooks.ts`.
- **Human-in-the-loop**: `versions.drafts` даёт статус draft/published. Роль `agent` + хук `forceAgentDrafts` — агенты создают только черновики, публиковать/удалять не могут.
- **Очередь на ревью**: `agent-proposals`. Агент создаёт, approve/reject — только человек.
- **Integrity перевода**: поле `localeStatus` + хук `markTranslationsStale` (помечает перевод устаревшим при изменении русского).
- **Каталог центров** с `socialLinks` (Instagram/FB/TikTok/LinkedIn/YouTube/VK/TG/X), статусами, `verifiedByAgentAt` / `verifiedByHumanAt`.
- **EU compliance**: минимизация PII в UGC (email не запрашиваем), `alt` обязателен (WCAG/EAA), флаг `aiGenerated` (AI Act), хостинг БД в EU.
- **Безопасность AI** (OWASP): отдельный API-ключ на агента, роль без DELETE, `Source.trustLevel` под allowlist, `AgentRun.cost` под бюджет-контроль, `evidence`/`sources` в каждом предложении.

## Что НЕ входит в этот scaffold (следующие шаги)

1. **Эндпоинт инкремента реакций** (атомарный +1, rate-limit) — реакции без авторизации.
2. **Контракт вывода Агента-1** (researcher) → как именно он пишет `agent-proposals`.
3. **Кнопка «Применить предложение»** в дашборде (берёт `diff` → обновляет целевой документ как черновик).
4. Коллекция `media` использует локальное хранилище — для прод подключить Cloudflare R2 (`@payloadcms/storage-s3`).
5. Field-level доступ для роли `translator` (правка только переводов).
