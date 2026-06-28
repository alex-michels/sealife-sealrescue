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
(prod) и все игры. **Единый source of truth, единый деплой.** (Это целевое состояние; на текущей
**alpha** наружу отдаётся только игра, а БД — на Neon EU, см. §2.)

* **Локация: EU/EEA (Германия или Финляндия).** Соблюдает data-residency и при этом нормально
  маршрутизируется в RU-зону (Hetzner Helsinki — обычно лучший RU-роут среди EU DC).
  **НЕ** брать non-EU DC (Армения/и т.п.) — нарушает инвариант о размещении персональных данных.
* **Рекомендуемый старт:** 4 vCPU / **8 GB RAM** / **80 GB NVMe** (напр. Hetzner CX32, ~€6.8/мес).
  8 GB позволяет крутить оба сайта + Payload + Postgres + обработку изображений (sharp) и при
  желании собирать прямо на боксе. Floor — 4 GB (только если сборка в CI).
* **Выбранный бокс:** **Contabo Cloud VPS 10 SSD** (4 vCPU / 8 GB / 150 GB, EU). Ровно floor по RAM,
  поэтому сборка — в CI (§ «Деплой» и §6), не на боксе.
* **Почему не shared cPanel (reg.am):** сборка Next 16 + Payload требует много RAM (build-скрипт
  `--max-old-space-size=8000`), 3 GB диска мало, нет Postgres (только MySQL), Passenger хрупок с
  Next 16 App Router. Маломощный shared-план не тянет полноценный SSR-стек.

### Деплой (single source of truth) — зафиксировано
* Репозиторий — единственный источник. Пуш в `main` → **GitHub Actions** собирает **Next standalone**
  → `rsync` артефакта на VPS в `/opt/sealife/releases/<sha>` → переключение симлинка `current` →
  `systemctl restart sealife` → health-check. Сборка в CI (не на боксе): 8 GB RAM + `next build`
  с `--max-old-space-size=8000` рядом с Postgres = риск OOM. См. `.github/workflows/deploy.yml`.
* **Reverse proxy — Caddy** (авто-HTTPS Let's Encrypt). Перед приложением: HTTPS + **allowlist путей**
  для публичного alpha (§4). Конфиг — `deploy/Caddyfile`; сервис — `deploy/sealife.service`.
* Артефакт = `.next/standalone` + скопированные `.next/static` и `public/` (Next их в standalone не
  кладёт; `public/` содержит саму игру). Приложение слушает `127.0.0.1:3000`, наружу — только Caddy.

---

## 2. База данных: разные БД по окружениям

| Окружение | БД | Где | Зачем |
|---|---|---|---|
| **dev / test** | **Neon** (serverless Postgres) | EU-регион (Frankfurt) | ноль ops, ветки БД, free-tier; быстрый старт. Уже настроено в `.env` (`DATABASE_URI`). |
| **alpha игры** (sealthehunter.online) | **Neon — отдельная ветка** | EU-регион (Frankfurt) | данные лидерборда анонимны (без PII) → US-субпроцессор не задействует GDPR; ноль ops; **бэкапы Neon (PITR) бесплатно**. Выделенная ветка, чтобы старт был чистым (без PII). |
| **production (сайты)** | **Self-hosted Postgres** | на том же VPS | $0 marginal, localhost-латентность (нет cold-start), чистый GDPR (нет US-субпроцессора), один бокс. Обязательно **до** появления PII. |

Переключение — только сменой `DATABASE_URI`. Миграция Neon→self-hosted при текущем объёме = один
`pg_dump | pg_restore` (минуты).

> **Почему Neon ОК для alpha, но не для prod-сайтов:** Neon — US-компания. Лидерборд **анонимен**
> (`game-scores`: ни email, ни аккаунтов, ни сырого seed, ни IP — см. `src/endpoints/leaderboard.ts`),
> поэтому персональных данных там нет и Schrems-II/transfer-вопрос не возникает. Как только появится
> PII (staff-аккаунты с реальными email, пользовательский контент, аккаунты/лидерборды с PII) —
> переезжаем на self-hosted EU Postgres. Ветку alpha держим **чистой от PII** (только строка `games`
> + `game-scores`); ветка Neon — copy-on-write от родителя, поэтому либо ветвимся от пустого
> состояния, либо очищаем не-игровые таблицы на ветке.

### Бэкапы
* **Alpha на Neon:** бэкапы обеспечивает Neon (point-in-time restore на free-tier) — отдельный
  off-box `pg_dump` не нужен.
* **Self-hosted prod (когда появится):** ночной `pg_dump` → **off-box** (EU, напр. Backblaze B2
  Amsterdam) + ротация + **проверенный** restore; тюнинг под 8 GB (shared_buffers, work_mem).
  Self-hosted БД без рабочих бэкапов — недопустима. См. §7.

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

* **Механизм:** allowlist в `deploy/Caddyfile` (handle-блоки, first-match):
  * ✅ `/api/leaderboard*` (вкл. `/start`) — проксируется как есть.
  * ❌ 404: `/admin*`, `/api/*` (прочее), `/graphql*`.
  * 🎮 всё остальное → **rewrite** `/* → /games/seal-hunt-v1/*` → игра отдаётся **с корня домена**
    на весь экран, с чистыми URL (`sealthehunter.online/`). Относительные ассеты и `./sw.js`
    резолвятся в каталог игры; scope SW на этом домене = `/` (вся игра) — ок.
* **Лендинг = стартовый экран игры (standalone-режим).** Игра определяет, что открыта НЕ во фрейме
  (`window.self === window.top`), и показывает то, чего нет во встраиваемой версии:
  * **Переключатель языка RU/EN/DE** прямо на стартовом экране (во фрейме язык приходит из `?lang=`
    и переключателя нет). Стартовый язык: `?lang=` → сохранённый выбор → язык браузера (политика как
    в `src/proxy.ts`: ru→ru, de→de, иначе en). Выбор пишется в `localStorage` **только после явного
    клика** (COMPLIANCE: язык хранить лишь после явного выбора).
  * Анонимное **имя игрока** (приветствие) на старте — как и во фрейме.
  * **Пометка «ограниченный альфа-тест»** + контакт `feedback@sealthehunter.online` (RU/EN/DE) — на
    стартовом экране И на финальном экране с лидербордом. Email — **отображаемый** контакт оператора
    (как в Impressum), не форма сбора email (COMPLIANCE: email с публичных пользователей не собираем).
* **Зависимость данных:** лидерборд резолвит игру по slug `seal-the-hunter` → в БД alpha (ветка Neon)
  должна быть строка коллекции `games` с этим slug (см. сидинг в §5). Таблица `game-scores` создаётся
  push'ем при первом старте (схема пока push-based, см. CLAUDE.md / память проекта).
* Правки текста/копирайта — в `public/games/seal-hunt-v1/` (`i18n.js`, `index.html`), едут тем же
  пайплайном (после правки ассетов бампать версию кэша в `sw.js`).

---

## 5. Runbook: первичная настройка VPS (one-time)

Бокс: **Contabo Cloud VPS 10 SSD** (4 vCPU / 8 GB / 150 GB, EU). Изначально есть только `root`.

1. **Hardening.** Создать non-root `deploy` (sudo, вход по SSH-ключу); отключить вход root по SSH и
   пароли; `ufw allow 22,80,443`; `fail2ban`; `unattended-upgrades`.
   Узкий sudo для деплоя — `/etc/sudoers.d/sealife`:
   `deploy ALL=(root) NOPASSWD: /usr/bin/systemctl restart sealife`.
2. **Пакеты.** Node 20 LTS, Caddy (офиц. репозиторий). PostgreSQL на боксе **не нужен** на alpha —
   БД на Neon (см. ниже). Self-hosted Postgres ставим позже, перед prod-сайтами (§2, §7).
3. **БД — Neon (EU, Frankfurt).** Создать **выделенную ветку** под alpha (free-tier). Ветка Neon
   copy-on-write от родителя → держать её **чистой от PII**: ветвиться от пустого состояния или
   очистить не-игровые таблицы. Взять connection string ветки для `DATABASE_URI` (шаг 4).
4. **Каталоги и окружение.**
   * `/opt/sealife/{releases,current}` (владелец `deploy`); `current` — симлинк на активный релиз.
   * `/etc/sealife/.env` (root:deploy, `640`): `DATABASE_URI` (**connection string ветки Neon**, с
     `sslmode=require`), `PAYLOAD_SECRET` (**новый prod-секрет, ≠ dev** — он подписывает play-token
     лидерборда), `SERVER_URL=https://sealthehunter.online`, `NEXT_PUBLIC_PLAUSIBLE_SRC=` (пусто на alpha).
5. **systemd.** Скопировать `deploy/sealife.service` → `/etc/systemd/system/`, затем
   `daemon-reload && enable --now sealife` (слушает `127.0.0.1:3000`).
6. **Caddy.** Положить `deploy/Caddyfile` (можно `import` из `/etc/caddy/Caddyfile`), `systemctl reload
   caddy`. HTTPS выпустится автоматически после того, как DNS укажет на бокс.
7. **Сид игры.** Один раз создать строку `games` со slug `seal-the-hunter` в ветке Neon
   (`pnpm seed:m1` или точечный сид) — иначе лидерборд вернёт пустую доску (`unknown_game` на submit).
   Таблицы создаёт push при первом подключении (схема пока push-based).
8. **DNS (Namecheap).** `A sealthehunter.online → <IP VPS>` (+ `www`). После распространения Caddy
   выпустит сертификаты.
9. **Email.** Включить форвардинг `feedback@sealthehunter.online` (Namecheap Email Forwarding) —
   вручную, вне репозитория.

## 6. CI/CD: секреты GitHub Actions (`.github/workflows/deploy.yml`)

| Secret | Значение |
|---|---|
| `SSH_HOST` | IP/хост VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | приватный ключ (ed25519); публичный — в `~deploy/.ssh/authorized_keys` |
| `DATABASE_URI` | **Neon** (EU) — только для build-time чтений (главная sealife пре-рендерится статически и читает `content`). Лучше **отдельная build-ветка**, НЕ живая alpha-ветка (сборка не должна трогать данные лидерборда). |
| `PAYLOAD_SECRET` | любое непустое build-time значение (реальный prod-секрет — в `/etc/sealife/.env`) |

> **Почему build-time нужна БД:** `src/app/(frontend)/[site]/[locale]/page.tsx` (sealife home)
> попадает в `generateStaticParams` и вызывает `payload.find` при сборке. На alpha главная наружу не
> отдаётся (Caddy отдаёт только игру), поэтому собрать против Neon-ветки безопасно. **Перед запуском
> prod-сайтов** пересмотреть стратегию (ISR/`force-dynamic` или выделенная build-БД).

## 7. Бэкапы

* **Alpha (Neon EU):** бэкапы обеспечивает Neon — point-in-time restore на free-tier. Отдельный
  off-box `pg_dump` не нужен; данные лидерборда анонимны и без PII (`src/endpoints/leaderboard.ts`).
* **Self-hosted prod (когда появится):** до запуска prod-сайтов / появления любого PII (CMS-контент,
  staff-аккаунты) — ночной `pg_dump` → off-box (EU, напр. Backblaze B2 Amsterdam) + ротация +
  **проверенный** restore (M0-T06). Self-hosted prod-БД без рабочих бэкапов — недопустима.

## Остаточные ручные шаги
- [ ] Прогнать §5 (provisioning) на боксе.
- [ ] Завести 5 секретов GitHub (§6).
- [ ] Namecheap: A-запись + форвардинг `feedback@`.
- [ ] (Гейт перед prod-сайтами) Бэкапы Postgres off-box + restore-тест.
