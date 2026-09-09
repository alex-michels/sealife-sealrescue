# Контракт Researcher v1 (M2-T06)

Источник схемы — `src/agents/researcherContract.ts` (Zod). Машиночитаемый экспорт:
[`researcher-output.schema.json`](researcher-output.schema.json), JSON Schema Draft 2020-12.
Обновление: `npx tsx scripts/export-researcher-schema.mts`; unit-тест ловит рассинхронизацию.
Это переносимый контракт; адаптация к подмножеству JSON Schema конкретного AI-провайдера — M2-T07.

## Вход и результат

[`researcher-prompt.md`](researcher-prompt.md) — системный промпт EN. В рантайме ему передаются
текущая запись центра и снапшоты, полученные доверенным fetcher'ом. Отсутствие доказательств или
изменений выражается JSON `null`: очередь не пополняется. Иначе результат содержит:

| Поле | Контракт |
| --- | --- |
| `schemaVersion` / `locale` | `1` / `en` |
| `proposalType` | `center_update`, `new_center`, `broken_link` |
| `targetCollection` / `targetId` | `rescue-centers`; ID существующей записи или `null` для новой |
| `summary` | Короткое обоснование на английском |
| `diff` | Непустой массив `{field, from, to}`; поле не повторяется |
| `sources` | Непустой массив `{sourceId, url, checkedAt, snapshotHash}` |
| `evidence` | Непустой массив `{field, sourceId, quote}`; доказательство для каждого изменения |
| `confidence` | Число 0…1; оценка агента, не знак verified |

Allowlist полей включает контакты, имя/slug, страну/регион, координаты, соцсети, языки работы и
статус центра. Значения `to` типизированы. Для нового центра обязательны name/slug/country,
а `from` каждого поля равен `null`. Локализованный rich text, news/translation/SEO и остальные
типы общей очереди `agent-proposals` не входят в первый контракт Researcher; их добавляют
контракты соответствующих агентов. Новая коллекция/миграция для этого не нужна.

## Проверка перед записью

`validateResearcherProposal(input, snapshots, now?)` принимает `unknown` и отдельные
`SourceSnapshot[]`: `sourceId`, `url`, `checkedAt`, `text`. Снапшоты получает **код fetcher'а**;
их нельзя извлекать из ответа модели. Хэш — SHA-256 UTF-8 байтов именно этого extracted text,
без неявной нормализации. Полный HTML может храниться отдельно у fetcher'а (M2-T07).

Zod отвергает неизвестные/служебные поля, пустые sources/evidence/diff, неверные типы значений,
локаль, даты, URL и confidence. Контекстная проверка дополнительно отвергает дубли/пустые изменения,
неполный новый центр, ссылки на чужие поля/источники, неподтверждённые дату/URL, дату из будущего,
неверный хэш и цитаты, которых дословно нет в снапшоте. Неиспользованные источники также запрещены.
Эти связи со снапшотами нельзя доказать одной JSON Schema: **после structured output обязательна
контекстная проверка**, а не только `researcherOutputSchema.parse()`.

`prepareResearcherProposal()` выполняет всю проверку и преобразует результат в текущие поля
Payload: `diff` → `{field:{from,to}}`, `sources` → relationship IDs; в `evidence` остаются версия,
локаль, метаданные источников и цитаты. `status` задаётся кодом как `pending`. `null` остаётся `null`.
Функция чистая: она **не пишет** в CMS и не присваивает human-reviewed/source-verified метки.

**Подключение к worker реализовано:** [M2-T07/T11](researcher-sources.md) поставляют интернет/fetcher и allowlist. M2-T08 (смысловая проверка фактов/свежести) остаётся открытой; M2-T09 — [клиент записи по API-ключу](researcher-runner.md).
Текущий REST endpoint очереди не подключён к этому валидатору; там остаётся существующая
проверка непустого relationship `sources` и RBAC. Writer вызывает
`prepareResearcherProposal` с доверенными снапшотами до `create` и записывать от роли agent
(Local API — с `overrideAccess: false`). Логи ошибок не должны содержать сырой ответ модели,
request body, PII или секреты. Существующие права publish/delete/approve не меняются.

Совпадение цитаты не доказывает смысловую поддержку факта и не подтверждает качество источника.
Человек оценивает age/confidence/authority и расхождения; низкая уверенность или устаревший источник
не превращаются автоматически в verified. При применении M2-T13 должен заново прочитать target
и сверить `from`, чтобы не перетереть более свежую правку человека.

## Проверенный пример

[`researcher-example.json`](researcher-example.json) предлагает заполнить адрес; это **офлайн-пример**,
а не запись в CMS. Target ID `101` и source ID `1` — фикстурные, не идентификаторы настоящей БД.
[`researcher-example-snapshot.json`](researcher-example-snapshot.json) хранит короткий проверенный
фрагмент официальной [контактной страницы Seal Rescue Ireland](https://www.sealrescueireland.org/contact-us/),
проверенной 2026-09-09; confidence примера — 0.95. Хэш относится только к этому фрагменту, не ко всей
странице. Тесты используют сохранённый снимок без сети; для реального запуска fetcher получает
новый снапшот и реальные IDs. Пример не подтверждает актуальность аварийного контакта на будущую дату.
