# Deployment & Infra — sealife-sealrescue

Решения по хостингу, базам данных и окружениям. Привязан к инвариантам `CLAUDE.md` и
требованиям `COMPLIANCE_EU_DE.md`.

**Зафиксировано: 2026-06-28.** Инженерный документ, не юридическая консультация.

> 🛑 **Статус (2026-07-12): публичная альфа sealthehunter.online ВЫВЕДЕНА ИЗ ЭКСПЛУАТАЦИИ**
> (решение владельца: разработка продолжается локально в DEV, перед prod — QA-stage).
> На VPS остановлены и выключены systemd-сервисы `sealife` и `caddy`
> (`infra/ansible/shutdown.yml` через workflow **Shutdown alpha (VPS)**); сайт-блок альфы
> удалён из `deploy/Caddyfile`; **авто-деплой по push в `main` выключен** (deploy.yml —
> только ручной запуск). Бокс, Node, каталоги и `/etc/sealife/.env` сохранены — воскрешение
> см. §8.
>
> ⚠️ **VPS — ОБЩИЙ:** на боксе работают три сервиса владельца вне этого репозитория
> (контейнер `sealgram` + два личных Telegram-бота — полный список в §1a).
> НЕ выключать/не переустанавливать инстанс; box-wide изменения (Reinstall+cloud-init,
> ufw/sshd-hardening, apt-апгрейды Ansible-роли base) затрагивают и ботов. Путь
> «Reinstall с cloud-init» из §8 — ТОЛЬКО для свежего отдельного бокса. ⚠️ Побочки: Neon-ветка альфы без активности **авто-удалится через ~30
> дней** (данные лидерборда исчезнут — экспортировать заранее, если нужны); A-записи DNS на
> Namecheap остаются и могут быть удалены вручную; TLS-сертификаты не продлеваются (Caddy
> выключен) — не важно, пока домен не отдаётся.

> ⚠️ Данные с PII — только в EU/EEA (`CLAUDE.md`, COMPLIANCE). Любой выбор хостинга/БД ниже
> обязан это соблюдать. Лидерборд игры — анонимный по дизайну (`src/endpoints/leaderboard.ts`:
> хэш-ключи + алиасы, без PII), но это исключение, а не правило.

---

## 1. Хостинг: один VPS на всё

Один VPS обслуживает **оба сайта** (sealife.info + sealrescue.info), Payload-бэкенд, Postgres
(prod) и все игры. **Единый source of truth, единый деплой.** (Это целевое состояние; на текущей
**alpha** наружу отдаётся только игра, а БД — на Neon EU, см. §2.)

> **Vanity-домен Seal Run (SR-12):** `sealrun.sealife.info` — **301-редирект** на канонический путь
> `sealife.info/[locale]/games/seal-run`, НЕ отдельный standalone-origin в v1. Один публичный origin →
> Impressum/Datenschutz достижимы через футер сайта, разрыв SH-10 не повторяется. Настройка — A-record
> + handle-блок в `deploy/Caddyfile` (~5 строк). См. [game-seal-run.md](game-seal-run.md) §2.5.

* **Локация: EU/EEA (Германия или Финляндия).** Соблюдает data-residency и при этом нормально
  маршрутизируется в RU-зону (Hetzner Helsinki — обычно лучший RU-роут среди EU DC).
  **НЕ** брать non-EU DC (Армения/и т.п.) — нарушает инвариант о размещении персональных данных.
* **Рекомендуемый старт:** 4 vCPU / **8 GB RAM** / **80 GB NVMe** (напр. Hetzner CX32, ~€6.8/мес).
  8 GB позволяет крутить оба сайта + Payload + Postgres + обработку изображений (sharp) и при
  желании собирать прямо на боксе. Floor — 4 GB (только если сборка в CI).
* **Выбранный бокс:** **Contabo Cloud VPS 10 SSD** (4 vCPU / 8 GB / 150 GB, EU). Ровно floor по RAM,
  поэтому сборка — в CI (§ «Деплой» и §6), не на боксе.

### 1a. Фактическое состояние бокса (инвентаризация 2026-07-26, `ssh vps`)

> Снято живьём с бокса, а не из планов. Перепроверять при каждом изменении инфраструктуры;
> расхождение с этим разделом — баг (правило доков в `docs/README.md`).

| | Факт |
| --- | --- |
| Хост | `vmd200294`, KVM, Contabo EU |
| ОС / ядро | **Ubuntu 26.04 LTS**, kernel 7.0.0-27-generic |
| Ресурсы | 4 vCPU · **7.8 GB RAM** · 145 GB диск (занято ~5%) · **swap = 0** |
| Рантаймы | Node **v24.18.0** (npm 11.16), Python **3.14.4**, **Docker 29.1.3 + containerd** (enabled) |
| Postgres | **на боксе НЕТ** (подтверждает Neon-only, §2) |
| SSH | root-логин off, парольная аутентификация off, только ключи; fail2ban (единственный jail — `sshd`) |
| UFW | active, default deny incoming; открыты 22/80/443 (80/443 сейчас вхолостую) |
| Обновления | unattended-upgrades включён, **`Automatic-Reboot` выключен** |

**⚠️ Бокс НЕ одноарендный.** Кроме (выключенной) альфы на нём постоянно работают сервисы владельца,
не относящиеся к этому репозиторию. Их нельзя ронять; любые box-wide операции (Reinstall,
`base`-роль Ansible с apt-upgrade/ufw/sshd, ребут) затрагивают и их:

| Сервис | Как запущен | Что это |
| --- | --- | --- |
| `sealgram` | Docker, `restart: unless-stopped`, `/home/deploy/sealgram` | Репостер тюленьего контента Instagram/VK → Telegram-канал (перевод через Gemini, водяные знаки). **Отдельный репозиторий** `alex-michels/sealgram`, свой CLAUDE.md. Проектно-смежный, но НЕ часть этого репо |
| `weekly-move-bot` | **user**-systemd (`deploy`), `Linger=yes` | Личный Forex-информер в Telegram. Вне скоупа проекта |
| `hl-move-bot` | **user**-systemd (`deploy`), `Linger=yes` | Личный Hyperliquid-информер в Telegram. Вне скоупа проекта |

> `Linger=yes` у `deploy` означает, что user-юниты живут без активной сессии и **поднимаются сами
> после ребута** — как и Docker-контейнер с `unless-stopped`. Ребут для ботов безопасен.

**Расхождения, найденные инвентаризацией (todo, не сделано):**

1. **`/etc/caddy/Caddyfile` на боксе устарел** — это версия ДО decommission, с полным сайт-блоком
   `sealthehunter.online`. Configure VPS последний раз шёл 2026-07-12, PR #74 смёржен 07-20. Caddy
   сейчас `inactive`+`disabled`, наружу ничего не идёт, но **любой старт Caddy воскресит альфу**.
   Лечится прогоном **Configure VPS (Ansible)** (раскатает пустой канонический Caddyfile) — но см.
   риск `base`-роли ниже.
2. **Узкий sudo — фикция.** `/etc/sudoers.d/sealife` разрешает `deploy` только
   `systemctl restart sealife`, НО cloud-init оставил `/etc/sudoers.d/90-cloud-init-users` с
   `deploy ALL=(ALL) NOPASSWD:ALL`. Итог: SSH-ключ CI фактически имеет полный root. Комментарий
   Ansible-роли `base` («Narrow passwordless sudo for the CI restart only») вводит в заблуждение.
   Решение принимать осознанно: либо убрать cloud-init-правило (тогда Ansible понадобится
   `become_password`), либо честно задокументировать, что деплой-ключ = root.
3. **Ansible `base`-роль опасна на общем боксе** — делает box-wide apt dist-upgrade, ufw default-deny
   и sshd-hardening, т.е. заденет ботов. До первого прогона нужны теги ролей (`--skip-tags base`).
   Плюс handler `caddy` со `state: reloaded` упадёт на остановленном юните.
4. **Висит `*** System restart required ***`**, а авто-ребут отключён. Ребут безопасен (боты
   поднимутся сами), но требует решения владельца.
5. **445 МБ в `/opt/sealife`** — 5 старых релизов, `current` → `91979bd` (мёрдж PR #73). Диск занят
   на 5%, так что не срочно; штатная прунилка деплоя оставляет 5 последних.
6. **Нет swap** на 7.8 GB. Сборка на боксе (`--max-old-space-size=8000`) гарантированно уйдёт в OOM —
   ещё один аргумент за сборку в CI (уже так и есть).

> **Почему не shared cPanel (reg.am):** сборка Next 16 + Payload требует много RAM (build-скрипт
> `--max-old-space-size=8000`), 3 GB диска мало, нет Postgres (только MySQL), Passenger хрупок с
> Next 16 App Router. Маломощный shared-план не тянет полноценный SSR-стек.

### Деплой (single source of truth) — зафиксировано
* Репозиторий — единственный источник. Пуш в `main` → **GitHub Actions** собирает **Next standalone**
  → `rsync` артефакта на VPS в `/opt/sealife/releases/<sha>` → переключение симлинка `current` →
  `systemctl restart sealife` → health-check. Сборка в CI (не на боксе): 8 GB RAM + `next build`
  с `--max-old-space-size=8000` рядом с Postgres = риск OOM. См. `.github/workflows/deploy.yml`.
* **Reverse proxy — Caddy** (авто-HTTPS Let's Encrypt). Перед приложением: HTTPS + **allowlist путей**
  для публичного alpha (§4). Конфиг — `deploy/Caddyfile`; сервис — `deploy/sealife.service`.
* Артефакт = `.next/standalone` + скопированные `.next/static` и `public/` (Next их в standalone не
  кладёт; `public/` содержит саму игру). Приложение слушает `127.0.0.1:3000`, наружу — только Caddy.
  Хранятся последние 5 релизов в `/opt/sealife/releases/` (старые удаляются автоматически при деплое).
* ⚠️ Корневой `Dockerfile`/`docker-compose.yml` — **НЕ этот путь деплоя**. `Dockerfile` — неадаптированный
  boilerplate из примера Next.js `with-docker`, нигде не собирается и не используется CI/Ansible;
  `docker-compose.yml` поднимает только Postgres для локальной разработки. Реальный прод — голый
  `.next/standalone` под systemd, как описано выше.

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
  * ✅ `/api/leaderboard*` (вкл. `/start`) и `/api/game-config` (kill-switch SH-14) —
    проксируются как есть.
  * ❌ 404: `/admin*`, `/api/*` (прочее), `/graphql*`.
  * 🎮 всё остальное → **rewrite** `/* → /games/seal-hunt-v1/*` → игра отдаётся **с корня домена**
    на весь экран, с чистыми URL (`sealthehunter.online/`). Относительные ассеты и `./sw.js`
    резолвятся в каталог игры; scope SW на этом домене = `/` (вся игра) — ок.
* **Лендинг = стартовый экран игры (standalone-режим).** Игра определяет, что открыта НЕ во фрейме
  (`window.self === window.top`), и показывает то, чего нет во встраиваемой версии:
  * **Переключатель языка RU/EN** прямо на стартовом экране (во фрейме язык приходит из `?lang=`
    и переключателя нет). Стартовый язык: `?lang=` → сохранённый выбор → язык браузера (политика как
    в `src/proxy.ts`: ru→ru, иначе en — в т.ч. немецкий браузер). Выбор пишется в `localStorage`
    **только после явного клика** (COMPLIANCE: язык хранить лишь после явного выбора).
  * Анонимное **имя игрока** (приветствие) на старте — как и во фрейме.
  * **Пометка «ограниченный альфа-тест»** + контакт `feedback@sealthehunter.online` (RU/EN) — на
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
2. **Пакеты.** Node 24 LTS (совпадает с Node сборки в CI; Node 20 — EOL, Node 25 — нечётный/не-LTS,
   не использовать), Caddy (офиц. репозиторий). PostgreSQL на боксе **не нужен** на alpha —
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
7. **Сид MUST-HAVE данных.** Новый DB/ветка приходит **пустым** (schema-only) → лидерборд отвечает
   `unknown_game`, пока нет строки `games`. Засеять базовые записи (идемпотентно, find-or-create):
   * Проще всего — GitHub **Actions → «Seed database» → `baseline`** (`.github/workflows/seed.yml`;
     бежит против секрета `DATABASE_URI`).
   * Или локально: `fnm use 22 && npm run seed:baseline` (с `DATABASE_URI` на нужную БД).
   `baseline` = только обязательные записи (games) — безопасно для prod; `m1` доливает демо-контент.
   ⚠️ Сиды бегут на **Node 22**: `payload run`/tsx пока не поддерживает Node 24 (сборка/рантайм — 24).
8. **DNS (Namecheap).** На **BasicDNS** менять nameservers НЕ нужно: A-записи `@` и `www` → `<IP VPS>`,
   удалить дефолтные parking-записи. Caddy выпускает TLS автоматически после распространения DNS.
9. **Email.** Приём: Namecheap **Email Forwarding** `feedback@sealthehunter.online` → личный ящик
   (работает). Отправка «как feedback@» — отдельный mailbox (mailbox.org / Zoho free / Private Email),
   меняет MX + добавляет SPF/DKIM/DMARC; вводится позже.

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

## 8. Статус go-live (alpha) — 🛑 **decommissioned 2026-07-12** (была live: sealthehunter.online)

Альфа-тест завершён и публичная поверхность выключена — см. статус-блок в шапке дока.
**Выключение:** Actions → **Shutdown alpha (VPS)** (в confirm вписать `shutdown-alpha`) —
останавливает и выключает `sealife`+`caddy` (`infra/ansible/shutdown.yml`); бокс сохраняется.
**Воскрешение / новое окружение (QA-stage):** вернуть сайт-блок в `deploy/Caddyfile` из
git-истории (последняя живая версия — merge PR #73, `91979bd`), включить `push:`-триггер в
`deploy.yml` при желании, затем шаги 4→7 ниже. Исторический раннбук (проверен на боксе):

1. **Локально:** `ssh-keygen -t ed25519 -f ~/.ssh/sealife_deploy -N ""`; приватный ключ → секрет
   `SSH_KEY`; публичный → в `deploy/cloud-init.yaml`.
2. **Provision:** Contabo → Reinstall с Ubuntu + `deploy/cloud-init.yaml` (создаёт `deploy` + ключ +
   passwordless sudo, ufw/fail2ban, python). Никакого ручного SSH для базовой настройки.
   ⚠️ Только для СВЕЖЕГО/выделенного бокса: Reinstall стирает ВСЁ на инстансе — на текущем
   общем VPS живут боты владельца (см. статус-блок в шапке), для него этот шаг пропускается
   (бокс уже настроен), дальше сразу шаги 3–4.
3. **Секреты GitHub (Repository):** `SSH_HOST`, `SSH_USER`, `SSH_KEY`, `DATABASE_URI` (ветка Neon),
   `PAYLOAD_SECRET`.
4. **Configure:** Actions → **Configure VPS (Ansible)** — Node 24, Caddy + Caddyfile, systemd-юнит,
   `/etc/sealife/.env` из секретов (идемпотентно, day-2).
5. **DNS:** A `@`/`www` на Namecheap BasicDNS.
6. **Seed:** Actions → **Seed database → `baseline`** (или локально `fnm use 22 && npm run seed:baseline`).
7. **Deploy:** Actions → **Deploy (main → VPS)** (или push в `main`).
8. **Закрыть/открыть standalone-игру («Coming soon», SH-14):** Actions → **Toggle game
   standalone** → mode `coming_soon`/`live` + игра (админка с alpha-домена недоступна —
   allowlist; workflow пишет флаг `games.standaloneComingSoon` прямо в БД из
   `DATABASE_URI`, тот же паттерн, что Seed). Локальный эквивалент против нужной БД:
   `npm run game:standalone -- coming_soon seal-the-hunter`. Кэш конфига — до 60 с.
   iframe на sealife.info не затрагивается. Сиды флаг НЕ трогают и выбор не перетирают.

Остаётся (гейты на будущее): отправка почты «как `feedback@`»; **перед prod-сайтами/PII** —
self-hosted Postgres + off-box бэкапы (§7), Environment-секреты + staging, пересмотр build-vs-DB (§6),
снятие auto-delete у Neon-ветки alpha (иначе данные исчезнут через 30 дней).

## 9. Troubleshooting / находки (отладка go-live)

Грабли, на которые наступили, и как решено — чтобы не повторять:

* **Менеджер пакетов — npm, не pnpm.** Канонический lockfile — `package-lock.json`; `pnpm-lock.yaml`
  в `.gitignore`. CI и `npm test` — на npm (`npm ci` / `npm run build`). pnpm в CI падал
  (`pnpm install --frozen-lockfile` без pnpm-lock).
* **Сборка зависит от БД.** `next build` пре-рендерит DB-страницы (sealife home в
  `generateStaticParams` зовёт `payload.find`) → в build нужны секреты `DATABASE_URI` +
  `PAYLOAD_SECRET`; без секрета билд падает «missing secret key». (§6.)
* **Изменение схемы Payload ломало deploy-build** («relation … does not exist», инцидент PR #53):
  `next build` идёт с NODE_ENV=production → drizzle push НЕ выполняется, а новая коллекция/global
  требует новых таблиц. Решено (2026-07-02): шаг **«Sync DB schema»** в `deploy.yml` гоняет
  `echo y | npx tsx scripts/push-dev-schema.mts` против `secrets.DATABASE_URI` ДО сборки
  (идемпотентно; тот же скрипт, что в CI-jobs `test`/`e2e`). Заодно рантайм alpha (та же
  Neon-ветка) получает схему до рестарта. `echo y |` (2026-07-03, SH-11) авто-подтверждает
  data-loss prompt drizzle при **деструктивных** изменениях (удаление колонки) — иначе
  интерактивный вопрос вешает CI; принято для push-фазы, т.к. данные alpha-лидерборда анонимны
  и еженедельно прунятся. Деструктивный push также означает короткое окно (build+deploy), когда
  СТАРЫЙ рантайм ссылается на удалённую колонку — на alpha приемлемо (лидерборд ответит 500 до
  рестарта). ⚠️ Когда появится отдельный self-hosted prod Postgres (M0-T04/INFRA),
  ему понадобится свой schema-шаг И переход на миграции — см. память
  проекта «DB push-based in dev».
* **Свежий DB = schema-only.** Новая ветка Neon приходит со схемой, но без строк → лидерборд отвечает
  `unknown_game` на submit (резолв игры по slug). Решение: `seed:baseline` (§5.7 / «Seed database»).
* **tsx не поддерживает Node 24.** `payload run` (сиды) на Node 24 падает (`node:crypto` ENOENT, даже
  на последнем tsx 4.22.4). Сиды бегут на **Node 22** (workflow «Seed database» пинит 22; локально
  `fnm use 22`). Сборка и рантайм — на Node 24.
* **Node 20 action-runtime deprecation.** GitHub выводит из эксплуатации node20-рантайм экшенов → все
  экшены на node24-мажоры: `checkout@v5`, `setup-node@v5`, `setup-python@v6`, `upload-artifact@v7`,
  `download-artifact@v8`, `cache@v6`. Это рантайм экшена, НЕ Node проекта.
* **ansible.cfg: удалённый yaml-callback.** `stdout_callback = yaml` (был в community.general, удалён в
  CG 12 / ansible-core 2.21) ломал Configure → заменено на `result_format = yaml`.
* **Dependabot-уязвимости.** Пропатчено через `overrides`: undici 7.24→7.28 (high, рантайм),
  postcss→8.5.16 (унифицирован), vitest→4.1.9 (critical, dev). Остаток — esbuild (dev/build-only, нет
  upstream-фикса; deprecated `@esbuild-kit` тянет `drizzle-kit`).
* **Секреты GitHub: Repository, не Environment** (для alpha). Environment (`production` + branch-rule +
  approval) — позже, при staging/prod.
* **DNS: nameservers менять не нужно** — A-записи на Namecheap BasicDNS; Caddy сам выпускает TLS.
* **systemd-сервис стартует только на первом Deploy** — `sealife.service` enable'нут, но `current/`
  пуст до первого деплоя; стартует, когда Deploy положит код и сделает `systemctl restart`.
* **Neon connection string:** pooler-endpoint + `sslmode=require`; предупреждение pg про `verify-full`
  косметическое (можно позже сменить на `sslmode=verify-full`).
