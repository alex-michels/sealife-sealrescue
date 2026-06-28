# Игра «Seal The Hunter» (seal-hunt-v1)

Мини-игра про тюленя: лови рыбу за 60 секунд. Vanilla **HTML/CSS/Canvas2D**, без фреймворка и сборки —
файлы лежат как есть в `public/games/seal-hunt-v1/` и отдаются статикой. Встраивается на странице
`app/(frontend)/[site]/[locale]/games/[slug]/page.tsx`; язык интерфейса передаётся через `?lang=ru|en|de`.

## Структура файлов
```
public/games/seal-hunt-v1/
  index.html                # разметка: HUD, canvas, overlay, board
  style.css
  game.js                   # игровой цикл, состояние, ввод-вывод
  i18n.js                   # словарь ru/en/de; язык из ?lang=, window.SealI18n.{lang,t,dict}
  manifest.webmanifest      # PWA-манифест
  sw.js                     # service worker (network-first)
  favicon.svg
  core/
    alias.js                # анонимная идентичность игрока (seed) + рендер имени
    leaderboard.js          # клиент лидерборда (fetch к /api/leaderboard*)
    balance.js              # тюнинг темпа/баланса
    input.js                # клавиатура/тач
    theme.js                # цвета/токены под бренд
  entities/{seal,prey}.js   # сущности: тюлень, добыча
  render/scenery.js         # фон/декор (брендовый арт-пасс)
```

## Fairness (честность)
Фиксированное разрешение игрового поля → одинаковые условия независимо от размера экрана (SH-01..03).
Раунд всегда **60 секунд** (`ROUND_MS = 60000`). Доски разделены на `desktop`/`mobile` (грубо, по
`pointer: coarse`) — без пиксельных размеров, чтобы не было fingerprint.

## Service worker (`sw.js`)
**Network-first**, scoped к `/games/seal-hunt-v1/`. Кэш `seal-hunt-static-v3`: на каждый успешный GET
сеть обновляет кэш; offline → отдаётся последняя копия. Так апдейты всегда «доезжают» (важно при деплое
из `main` — игрок не залипает на старой версии). Старые кэши чистятся на `activate`.

## Анонимная идентичность игрока (`core/alias.js`)
- **`seed`** — случайный opaque-идентификатор, хранится в `localStorage` (`getSeed`/`setSeed`). Это
  **не** PII и **не** source of truth для очков — только стабильная локальная идентичность, чтобы строки
  игрока за неделю дедуплицировались. Source of truth (очки, доска) — **сервер**.
- Имя строится детерминированно из `(seed, game)` PRNG (`makeParts`) → набор индексов частей; рисуется
  на языке зрителя (`renderName(parts, lang)`). Имена варьируются по шаблонам (Adj/Mod/Pref-/-Suf + Noun),
  пространство ~40k без чисел.

> ⚠️ **Списки имён, `PATTERNS`, `mulberry32` и порядок бросков ДОЛЖНЫ совпадать** между
> `core/alias.js` (клиент) и `src/endpoints/leaderboard.ts` (сервер) — иначе имя на старте разойдётся с
> доской. В серверном файле об этом есть «KEEP IN SYNC».

## Лидерборд (`core/leaderboard.js` ↔ `src/endpoints/leaderboard.ts`)
Server-authoritative. Поток раунда:

1. **Старт:** `startRound(gameSlug)` → `GET /api/leaderboard/start?game=&board=` → получает **play-token**
   (фиксируется board). Токен берётся именно на старте, чтобы серверу было видно реально отыгранное время.
2. **Сабмит:** `mountAfterPlay()` → `POST /api/leaderboard` c `{game, score, durationMs:60000, board, seed, token}`.
   Токен одноразовый.
3. **Чтение/пагинация:** `GET /api/leaderboard?game=&board=&page=` (страница 50, скролл до строки игрока,
   «показать ещё» до 500).

> **Устойчивость:** `startRound` ретраит запрос токена один раз; если сабмит всё же не прошёл (потерянный
> play-token), `mountAfterPlay` показывает доску в **режиме чтения**, а не «доска недоступна». Имена строк
> рендерятся на языке зрителя (`ru`/`en`/`de`) из частей — сервер хранит индексы + canonical EN-alias.

Контракт endpoints, коды ошибок — в [api.md](api.md).

### Анти-чит (SH-08) — на сервере
- **Play-token:** подписанный HMAC (секрет = `PAYLOAD_SECRET`), привязан к `game/board`, с временной меткой.
  Проверяется подпись, возраст (сыграно ≥ 50 c, токену ≤ 30 мин), одноразовость (nonce в памяти).
- **Плаузибилити-капы:** `durationMs` ∈ 50000..70000; `score` ≤ ⌈сек·3⌉+8 (потолок поимок/с).
- **Rate-limit:** ≤ 30 запросов/мин с IP — **transient, в памяти, IP в БД не хранится**.
- Всё это поднимает планку: счёт нельзя залить, не «прожив» раунд; токен — на один раз.

### Идентичность и сезоны
- **`season`** = ISO-неделя (`YYYY-Www`); доска **сбрасывается еженедельно**. `resetAt` = ближайший
  понедельник 00:00 UTC.
- **`playerKey`** = `sha256(seed:game:season)` (24 hex) — недельный односторонний ключ для дедупа строки;
  ротируется и удаляется при сбросе → долговременного идентификатора нет.
- Одна строка на `(game, playerKey, board, season)`, хранится **максимум** счёта. Коллизия base-имени с
  другим игроком → суффикс уникальности («Triton Loaf 2»).
- **Ленивая очистка:** прошлые сезоны удаляются (не чаще раза в час на процесс) — минимизация данных.

## EU-чистота
Нет PII: ни email, ни аккаунтов, ни сырого seed на сервере, IP не хранится. `game-scores` — анонимная
коллекция (см. [data-model.md](data-model.md)). Это позволяет лидерборду работать до появления аккаунтов
(требование COMPLIANCE: лидерборды до аккаунтов — анонимные/псевдонимные без email).

## Публичный alpha-тест (sealthehunter.online)
Игра + лидерборд планируются как отдельный публичный тест среди тюлень-сообществ, тем же деплоем из `main`,
с allowlist маршрутов (наружу — только игра и `/api/leaderboard*`, без `/admin` и прочего API). Стартовый
экран — с пометкой «Alpha» и контактом `feedback@sealthehunter.online` (RU/EN). Детали и инфраструктура —
в [DEPLOYMENT.md](DEPLOYMENT.md) §4.

## Связанные доки
- [api.md](api.md) — контракт endpoints лидерборда
- [data-model.md](data-model.md) — коллекции `games` / `game-scores`
- [DEPLOYMENT.md](DEPLOYMENT.md) — публичный тест и деплой
