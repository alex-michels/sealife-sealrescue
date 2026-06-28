# Deployment & Infra — sealife-sealrescue

Решения по хостингу, базам данных и окружениям. Привязан к инвариантам `CLAUDE.md` и
требованиям `COMPLIANCE_EU_DE.md`.

**Зафиксировано: 2026-06-28.** Инженерный документ, не юридическая консультация.

> ⚠️ Данные с PII — только в EU/EEA (`CLAUDE.md`, COMPLIANCE). Любой выбор хостинга/БД ниже
> обязан это соблюдать. Лидерборд игры — анонимный по дизайну (`src/endpoints/leaderboard.ts`:
> хэш-ключи + алиасы, без PII), но это исключение, а не правило.

---

## 1. Хостинг: один VPS на всё

Один VPS обслуживает **оба сайта** (sealife.info + sealrescue.info), Payload-бэкенд, Postgres
(prod) и все игры. **Единый source of truth, единый деплой.**

* **Локация: EU/EEA (Германия или Финляндия).** Соблюдает data-residency и при этом нормально
  маршрутизируется в RU-зону (Hetzner Helsinki — обычно лучший RU-роут среди EU DC).
  **НЕ** брать non-EU DC (Армения/и т.п.) — нарушает инвариант о размещении персональных данных.
* **Рекомендуемый старт:** 4 vCPU / **8 GB RAM** / **80 GB NVMe** (напр. Hetzner CX32, ~€6.8/мес).
  8 GB позволяет крутить оба сайта + Payload + Postgres + обработку изображений (sharp) и при
  желании собирать прямо на боксе. Floor — 4 GB (только если сборка в CI).
* **Почему не shared cPanel (reg.am):** сборка Next 16 + Payload требует много RAM (build-скрипт
  `--max-old-space-size=8000`), 3 GB диска мало, нет Postgres (только MySQL), Passenger хрупок с
  Next 16 App Router. Маломощный shared-план не тянет полноценный SSR-стек.

### Деплой (single source of truth)
* Репозиторий — единственный источник. Пуш в `main` → CI собирает → артефакт на VPS → рестарт
  (PM2 или systemd). Сборку держать в CI (GitHub Actions), чтобы не упираться в RAM на боксе.
* Reverse proxy (nginx/Caddy) перед приложением: HTTPS, и при необходимости **allowlist путей**
  (см. §4 про публичный alpha игры).

---

## 2. База данных: разные БД по окружениям

| Окружение | БД | Где | Зачем |
|---|---|---|---|
| **dev / test** | **Neon** (serverless Postgres) | EU-регион (Frankfurt) | ноль ops, ветки БД, free-tier; быстрый старт. Уже настроено в `.env` (`DATABASE_URI`). |
| **production** | **Self-hosted Postgres** | на том же VPS | $0 marginal, localhost-латентность (нет cold-start на лидерборде), чистый GDPR (нет US-субпроцессора), один бокс. |

Переключение — только сменой `DATABASE_URI`. Миграция dev→prod при текущем объёме = один
`pg_dump | pg_restore` (минуты).

> **Почему Neon только для dev/test:** Neon — US-компания; для prod с потенциальным PII это лишний
> Schrems-II/transfer-разбор. Для разработки и анонимного теста — ок. Prod-данные держим на своём
> EU-боксе.

### ⚠️ Production Postgres = обязательны бэкапы
Self-hosted БД без рабочих бэкапов — катастрофа в ожидании. Перед тем как доверить prod-боксу
что-либо реальное:

* Ночной `pg_dump` → **off-box** (Hetzner Storage Box / Backblaze B2), ротация.
* **Проверить восстановление** хотя бы один раз (бэкап без проверенного restore не считается).
* Тюнинг конфигурации под 8 GB (shared_buffers, work_mem и т.п.).

---

## 3. Секреты и окружения
* Секреты — не в гите; `.env.example` без значений. Ключи: `DATABASE_URI`, `PAYLOAD_SECRET`,
  `SERVER_URL`, `NEXT_PUBLIC_PLAUSIBLE_SRC`.
* `PAYLOAD_SECRET` на prod **должен отличаться** от dev (он же подписывает анти-чит play-token
  лидерборда — см. `src/endpoints/leaderboard.ts`).

---

## 4. Публичный alpha-тест игры (sealthehunter.online)

Отдельный публичный тест «Seal The Hunter» среди тюлень-сообществ. Тот же репозиторий и тот же
деплой-пайплайн (single source of truth) — пуш в `main` доезжает и сюда.

**Требование: наружу доступны ТОЛЬКО игра и лидерборд.** `/admin`, GraphQL и остальной
Payload REST (`/api/[...slug]`) — недоступны с публичного теста.

* **Механизм:** allowlist на reverse proxy (или `.htaccess`, если когда-то shared):
  * ✅ разрешить `/games/seal-hunt-v1/*` и `/api/leaderboard*` (включая `/start`).
  * ❌ блок/404: `/admin`, `/api/graphql*`, `/api/[...slug]` и прочее.
* **Лендинг:** стартовый экран игры открывается сразу на весь экран, с пометкой «Alpha / публичный
  тест» и контактом `feedback@sealthehunter.online` (локализовано RU/EN). Это **отображаемый**
  контакт оператора (как в Impressum), не форма сбора email — соответствует COMPLIANCE
  (email с публичных пользователей не собираем).
* Правки текста/копирайта — в `public/games/seal-hunt-v1/` (`i18n.js`, `index.html`), едут тем же
  пайплайном.

---

## Открытые шаги (когда дойдут руки)
- [ ] Выбрать и поднять VPS (EU, 8 GB) + базовый hardening.
- [ ] CI (GitHub Actions): build → deploy на `main`.
- [ ] Reverse proxy + HTTPS + allowlist для публичного теста игры.
- [ ] Self-hosted Postgres на prod + `pg_dump`-бэкапы off-box + проверка restore.
- [ ] Alpha-копия лендинга игры (RU/EN) + `feedback@sealthehunter.online`.
