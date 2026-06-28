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
с временной меткой.
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
| `token_age` | 422 | сыграно < 50 c или токену > 30 мин |
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

## 2. Авто REST + GraphQL Payload

Payload генерирует REST и GraphQL из коллекций (catch-all `app/(payload)/api/[...slug]/route.ts`):

- **REST:** `/api/<collection>` (find/create), `/api/<collection>/<id>` (get/update/delete),
  `/api/<collection>/<id>?locale=ru|en`. Доступ ограничен `access` каждой коллекции (см. [data-model.md](data-model.md)).
- **GraphQL:** `/api/graphql`, playground `/api/graphql-playground`.
- **Media:** `/api/media/file/**` (см. `next.config.ts` localPatterns).

Эти маршруты исключены из `proxy.ts` matcher — Payload обслуживает их сам. Чтение публикуемого контента
публично (`read: () => true` или `readPublishedOrStaff`), запись/админ-операции — по RBAC.

## 3. Route guards (фронтенд)

Жёсткие гарантии маршрутизации (инвариант + тесты `tests/e2e/`):

- **Контент-локали — `/ru`, `/en`, `/de`** (равноправны). Нет локали в пути → авто-redirect (без forced по языку).
- **Legal-роуты локализованы:** slug общий, заголовок зависит от локали — `/de/legal-notice` рендерится как «Impressum», `/de/privacy` — как «Datenschutz».
- **404:** неизвестная локаль (не `ru`/`en`/`de`) или несуществующий slug.
- **`/admin`** — админка Payload (staff, аутентификация по email).

## Связанные доки
- [localization.md](localization.md) — как proxy.ts строит маршруты
- [game-seal-hunter.md](game-seal-hunter.md) — клиент лидерборда и анти-чит
- [DEPLOYMENT.md](DEPLOYMENT.md) — allowlist маршрутов для публичного теста
