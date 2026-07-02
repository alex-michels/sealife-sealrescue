# API и маршруты

Три класса HTTP-поверхностей:

1. **Кастомные endpoints** — наш код (лидерборд игры). `src/endpoints/leaderboard.ts`.
2. **Авто REST + GraphQL Payload** — генерируются из коллекций. `app/(payload)/api/[...slug]`.
3. **Публичные страницы фронтенда** — App Router, см. [localization.md](localization.md).

> ⚠️ **Для публичного alpha-теста игры (sealthehunter.online) наружу открываются ТОЛЬКО игра и
> лидерборд.** Авто-REST Payload, GraphQL и `/admin` должны быть недоступны — allowlist на reverse
> proxy. См. [DEPLOYMENT.md](DEPLOYMENT.md) §4.

## 1. Лидерборд (кастомные endpoints)

Server-authoritative: публичный клиент НЕ пишет в БД напрямую — только через эти endpoints
(валидация Zod, анти-чит, transient rate-limit). PII не хранится. Регистрируются в `payload.config.ts`
(`endpoints: [...]`) и доступны под префиксом `/api`.

### `GET /api/leaderboard/start?game=<slug>&board=<desktop|mobile>`
Выдаёт **play-token** на старте раунда (анти-чит). Токен — подписанный HMAC, привязан к game/board,
с временной меткой. ⚠️ Этот endpoint сам по себе БЕЗ rate-limit (только `POST /api/leaderboard` его
проверяет) — риск смягчён тем, что токен нужно ещё «прожить» ≥ `MIN_PLAY_MS` и израсходовать один раз.
→ `{ token: string }`

### `POST /api/leaderboard`
Отправить результат (upsert максимума игрока), вернуть ранг + первую страницу доски.

Тело (Zod-валидируется):
```jsonc
{
  "game": "seal-hunt-v1",   // slug, 1..64
  "score": 42,               // int 0..100000
  "durationMs": 60000,       // int 0..600000
  "board": "desktop",        // "desktop" | "mobile"
  "seed": 123456789,         // uint32 — детерминирует имя игрока
  "token": "<body>.<sig>"    // play-token из /start
}
```

Проверки (по порядку отказа):
| Ошибка | HTTP | Условие |
| --- | --- | --- |
| `rate_limited` | 429 | > 30 запросов / 60 c с IP (IP в БД не хранится) |
| `bad_json` / `invalid_input` | 400 | не JSON / не прошёл Zod |
| `invalid_token` | 401 | подпись неверна или game/board не совпали |
| `token_age` | 422 | сыграно < 40 c (`MIN_PLAY_MS`, запас под cold-start dev/Turbopack) или токену > 30 мин |
| `duration_mismatch` | 422 | заявленная длительность > реально прошедшего (+8 c) |
| `implausible_duration` | 422 | `durationMs` вне 50000..70000 (раунд ~60 c) |
| `implausible_score` | 422 | score > потолка (≈3 поимки/с + 8) |
| `token_used` | 409 | nonce уже израсходован (токен одноразовый) |
| `unknown_game` | 404 | нет игры с таким slug |

→ `{ alias, parts, suffix, board, season, resetAt, score, submitted, improved, rank, total, percentile, page, hasMore, top[] }`

### `GET /api/leaderboard?game=<slug>&board=<...>&page=<n>&limit=<n>`
Прочитать доску текущего сезона (ISO-неделя). `limit` ≤ 100, страница = 50 по умолчанию.
→ `{ board, season, resetAt, total, page, hasMore, top: [{ rank, alias, parts, suffix, score }] }`

Детали анти-чита, сезонов и имён — в [game-seal-hunter.md](game-seal-hunter.md).

> **Задел под Seal Run (SR-09/SR-10, ещё НЕ реализовано — целевое состояние).** Тот же эндпоинт,
> per-game расширение: `/start` добавит в подписанный токен `cs` (courseSeed) + сезон (сервер
> выводит `courseSeed = hash(сезон-выдачи)`, клиент не поставляет как истину). `POST /api/leaderboard`
> получит опц. поля `distance` / `livesRemaining` / `fishCollected` и **ветвление правдоподобия по
> слагу игры**: Seal Hunter — фикс-окно 50–70с (без изменений); Seal Run — «правдоподобная
> длительность ОТ дистанции» (`minPlausibleMs = distance / MAX_SPEED_UNITS_PER_MS`) + серверная
> пересборка сид-детерминированной трассы и сверка улова с бюджетом рыбы. Порог `MIN_PLAY_MS` тоже
> per-game (Run допускает ~3с). Подробности — [game-seal-run.md](game-seal-run.md) §2.2.

## 2. Авто REST + GraphQL Payload

Payload генерирует REST и GraphQL из коллекций (catch-all `app/(payload)/api/[...slug]/route.ts`):

- **REST:** `/api/<collection>` (find/create), `/api/<collection>/<id>` (get/update/delete),
  `/api/<collection>/<id>?locale=ru|en`. Доступ ограничен `access` каждой коллекции (см. [data-model.md](data-model.md)).
- **GraphQL:** `/api/graphql`, playground `/api/graphql-playground`.
- **Media:** `/api/media/file/**` (см. `next.config.ts` localPatterns).

Эти маршруты исключены из `proxy.ts` matcher — Payload обслуживает их сам. Чтение публикуемого контента
публично (`read: () => true` или `readPublishedOrStaff`), запись/админ-операции — по RBAC.

## 3. sitemap.xml (кастомный Next route, не Payload endpoint)

`GET /sitemap.xml` (`src/app/sitemap.xml/route.ts`) — не Payload-endpoint и не авто-REST; отдельный Next
route handler, который сам делает неаутентифицированные `payload.find()` по `content`/`species`
(только `published`, только для `site.id === 'sealife'`) и строит multi-locale URL с hreflang по хосту
запроса (`resolveSiteId`). ⚠️ `rescue-centers` пока сознательно исключён (см. комментарий в файле:
«появится в M2») — sitemap НЕ покрывает sealrescue. `robots.txt`-роута в проекте пока нет вообще.

## 4. Route guards (фронтенд)

Жёсткие гарантии маршрутизации (инвариант, зашит в `proxy.ts` + `[locale]/layout.tsx`):

- **Контент-локали — `/ru`, `/en`, `/de`** (равноправны). Нет локали в пути → авто-redirect (без forced по языку).
- **Legal-роуты локализованы:** slug общий, заголовок зависит от локали — `/de/legal-notice` рендерится как «Impressum», `/de/privacy` — как «Datenschutz».
- **404:** неизвестная локаль (не `ru`/`en`/`de`) или несуществующий slug → настоящий HTTP 404
  с локализованной `[locale]/not-found.tsx` (микрокопия различается по сайту). Достигается тем,
  что у детальных роутов нет loading-границы — подробности в
  [localization.md](localization.md) («404 и loading-границы»).
- **`/admin`** — админка Payload (staff, аутентификация по email).

> Route guards закреплены e2e-тестами `tests/e2e/frontend.e2e.spec.ts` (Roadmap **QA-04**):
> брендинг/`<html lang>` по локалям, redirect-политика, 404 по несуществующим slug и чужим разделам.

## Связанные доки
- [localization.md](localization.md) — как proxy.ts строит маршруты
- [game-seal-hunter.md](game-seal-hunter.md) — клиент лидерборда и анти-чит
- [DEPLOYMENT.md](DEPLOYMENT.md) — allowlist маршрутов для публичного теста
