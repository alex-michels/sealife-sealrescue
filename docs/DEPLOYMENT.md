# Deployment & Infra — sealife-sealrescue

Решения по хостингу, базам данных и окружениям. Привязан к инвариантам `CLAUDE.md` и
требованиям `COMPLIANCE_EU_DE.md`.

**Зафиксировано: 2026-06-28.** Инженерный документ, не юридическая консультация.

> 🌐 **Домен-политика (решение владельца, 2026-07-26): у проекта ровно два домена.**
> `sealife.info` (+ любые `*.sealife.info`) и `sealrescue.info` (+ любые `*.sealrescue.info`).
> Игры живут **маршрутами или поддоменами под этими двумя апексами** (вэнити-поддомен
> `sealrun.sealife.info` из SR-12 — 301 на канонический путь, см. §1). Отдельный корневой
> домен, на котором крутилась публичная альфа игры, **закрыт 2026-07-19/20 и больше не
> используется**. Любое новое окружение (QA-stage, prod, вэнити-хост) поднимается только под
> этими двумя апексами — третьих доменов не заводим.

> 🛑 **Статус (2026-07-12): публичная альфа игры ВЫВЕДЕНА ИЗ ЭКСПЛУАТАЦИИ**
> (решение владельца: разработка продолжается локально в DEV, перед prod — QA-stage).
> На VPS остановлены и выключены systemd-сервисы `sealife` и `caddy`
> (`infra/ansible/shutdown.yml` через workflow **Shutdown alpha (VPS)**); сайт-блок альфы
> удалён из `deploy/Caddyfile`; **авто-деплой по push в `main` выключен** (deploy.yml —
> только ручной запуск). Бокс, Node, каталоги и `/etc/sealife/.env` сохранены и
> переиспользуются под будущий QA-stage — раннбук в §8.
>
> ⚠️ **VPS — ОБЩИЙ:** на боксе работают три сервиса владельца вне этого репозитория
> (контейнер `sealgram` + два личных Telegram-бота — полный список в §1a).
> НЕ выключать/не переустанавливать инстанс; box-wide изменения (Reinstall+cloud-init,
> ufw/sshd-hardening, apt-апгрейды Ansible-роли base) затрагивают и ботов. Путь
> «Reinstall с cloud-init» из §8 — ТОЛЬКО для свежего отдельного бокса. ⚠️ Побочки: Neon-ветка бывшей альфы без активности **авто-удалится через ~30
> дней** (данные лидерборда исчезнут — экспортировать заранее, если нужны); DNS-записи и
> почтовый форвардинг закрытого домена снимаются вместе с ним; TLS-сертификаты не
> продлеваются (Caddy выключен) — наружу ничего не отдаётся.

> ⚠️ Данные с PII — только в EU/EEA (`CLAUDE.md`, COMPLIANCE). Любой выбор хостинга/БД ниже
> обязан это соблюдать. Лидерборд игры — анонимный по дизайну (`src/endpoints/leaderboard.ts`:
> хэш-ключи + алиасы, без PII), но это исключение, а не правило.

---

## 1. Хостинг: один VPS на всё

Один VPS обслуживает **оба сайта** (sealife.info + sealrescue.info), Payload-бэкенд, Postgres
(prod) и все игры — на этих же двух доменах и их поддоменах (домен-политика в шапке).
**Единый source of truth, единый деплой.** (Это целевое состояние; сейчас публичных поверхностей
нет — альфа выключена, БД разработки — на Neon EU, см. §2.)

> **Вэнити-поддомен Seal Run (SR-12):** `sealrun.sealife.info` — **301-редирект** на канонический путь
> `sealife.info/[locale]/games/seal-run`, НЕ отдельный standalone-origin. Один публичный origin →
> Impressum/Datenschutz достижимы через футер сайта, разрыв SH-10 не повторяется. Это и есть
> канонический способ дать игре «короткий адрес» — поддомен апекса, а не новый корневой домен.
> Настройка — A-record + handle-блок в `deploy/Caddyfile` (~5 строк).
> См. [game-seal-run.md](game-seal-run.md) §2.5.

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
| `sealgram` | Docker, `restart: unless-stopped`, `/home/deploy/sealgram` | Репостер тюленьего контента Instagram/VK → Telegram-канал. **Отдельный репозиторий** `alex-michels/sealgram`, свой CLAUDE.md, свой стек. Соседствует по железу — и только: **к этому проекту отношения не имеет и подключаться к нему не будет** (в т.ч. его AI-провайдер — не AI-стек этого репо). Источником контента для CMS не является: канал ≠ сайт |
| `weekly-move-bot` | **user**-systemd (`deploy`), `Linger=yes` | Личный Forex-информер в Telegram. Вне скоупа проекта |
| `hl-move-bot` | **user**-systemd (`deploy`), `Linger=yes` | Личный Hyperliquid-информер в Telegram. Вне скоупа проекта |

> `Linger=yes` у `deploy` означает, что user-юниты живут без активной сессии и **поднимаются сами
> после ребута** — как и Docker-контейнер с `unless-stopped`. Ребут для ботов безопасен.

**Расхождения, найденные инвентаризацией** (п. 1 закрывается текущей зачисткой домена, п. 2–6 — todo):

1. ~~Устаревший `/etc/caddy/Caddyfile` с сайт-блоком закрытого домена~~ — **ИСПРАВЛЕНО 2026-07-26**
   в рамках доменной зачистки: канонический `deploy/Caddyfile` (без сайт-блоков) залит на бокс
   напрямую, `caddy validate` пройден. Прогон **Configure VPS (Ansible)** для этого не
   потребовался — и это к лучшему, см. риск `base`-роли ниже.
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
5. ~~445 МБ старых релизов в `/opt/sealife`~~ — **ИСПРАВЛЕНО 2026-07-26**: артефакты
   остановленного сервиса удалены вместе с зашитым в них закрытым доменом (осталось 8 КБ,
   пустой `releases/`). Следующий деплой создаст релиз заново.
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
* **Reverse proxy — Caddy** (авто-HTTPS Let's Encrypt). Перед приложением: HTTPS + при необходимости
  **allowlist путей** для game-only окружения (§4). Конфиг — `deploy/Caddyfile`; сервис —
  `deploy/sealife.service`.
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
| **окружение игры** (была alpha, будет QA-stage) | **Neon — отдельная ветка** | EU-регион (Frankfurt) | данные лидерборда анонимны (без PII) → US-субпроцессор не задействует GDPR; ноль ops; **бэкапы Neon (PITR) бесплатно**. Выделенная ветка, чтобы старт был чистым (без PII). |
| **production (сайты)** | **Self-hosted Postgres** | на том же VPS | $0 marginal, localhost-латентность (нет cold-start), чистый GDPR (нет US-субпроцессора), один бокс. Обязательно **до** появления PII. |

Переключение — только сменой `DATABASE_URI`. Миграция Neon→self-hosted при текущем объёме = один
`pg_dump | pg_restore` (минуты).

> **Почему Neon ОК для игрового окружения, но не для prod-сайтов:** Neon — US-компания. Лидерборд
> **анонимен** (`game-scores`: ни email, ни аккаунтов, ни сырого seed, ни IP — см.
> `src/endpoints/leaderboard.ts`), поэтому персональных данных там нет и Schrems-II/transfer-вопрос
> не возникает. Как только появится PII (staff-аккаунты с реальными email, пользовательский контент,
> аккаунты/лидерборды с PII) — переезжаем на self-hosted EU Postgres. Игровую ветку держим **чистой
> от PII** (только строка `games` + `game-scores`); ветка Neon — copy-on-write от родителя, поэтому
> либо ветвимся от пустого состояния, либо очищаем не-игровые таблицы на ветке.

### Бэкапы
* **Игровое окружение на Neon:** бэкапы обеспечивает Neon (point-in-time restore на free-tier) —
  отдельный off-box `pg_dump` не нужен.
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

## 4. Паттерн «наружу — только игра» (allowlist на reverse proxy)

Так была устроена выключенная публичная альфа игры. **Живого хоста с такой конфигурацией сейчас
нет**; описание сохранено как готовый шаблон на случай, если будущему QA-stage снова понадобится
отдать наружу одну игру и ничего больше. Поднимать такой хост можно **только под `*.sealife.info`**
(домен-политика в шапке); репозиторий и деплой-пайплайн — те же (single source of truth).

**Требование: наружу доступны ТОЛЬКО игра, её лидерборд и game-config.** `/admin`, GraphQL и
остальной Payload REST (`/api/[...slug]`) — недоступны.

* **Механизм:** allowlist в `deploy/Caddyfile` (handle-блоки, first-match):
  * ✅ `/api/leaderboard*` (вкл. `/start`) и `/api/game-config` (kill-switch SH-14) —
    проксируются как есть.
  * ❌ 404: `/admin*`, `/api/*` (прочее), `/graphql*`.
  * 🎮 всё остальное → **rewrite** `/* → /games/seal-hunt-v1/*` → игра отдаётся **с корня хоста**
    на весь экран, с чистыми URL. Относительные ассеты и `./sw.js` резолвятся в каталог игры;
    scope SW на таком хосте = `/` (вся игра) — ок.
* **Лендинг = стартовый экран игры (standalone-режим).** Игра определяет, что открыта НЕ во фрейме
  (`window.self === window.top`), и показывает то, чего нет во встраиваемой версии:
  * **Переключатель языка RU/EN** прямо на стартовом экране (во фрейме язык приходит из `?lang=`
    и переключателя нет). Стартовый язык: `?lang=` → сохранённый выбор → язык браузера (политика как
    в `src/proxy.ts`: ru→ru, иначе en — в т.ч. немецкий браузер). Выбор пишется в `localStorage`
    **только после явного клика** (COMPLIANCE: язык хранить лишь после явного выбора).
  * Анонимное **имя игрока** (приветствие) на старте — как и во фрейме.
  * **Пометка о тестовом статусе** + **отображаемый** контакт оператора из Impressum / Legal Notice
    (RU/EN) — на стартовом экране И на финальном экране с лидербордом. Это показ контакта, а не
    форма сбора email (COMPLIANCE: email с публичных пользователей не собираем).
* **⚠️ Урок SH-10 — почему это запасной, а не основной путь:** хост, отдающий только игру, не отдаёт
  футер сайта, поэтому Impressum/Datenschutz с него недостижимы. Штатный способ дать игре «свой
  адрес» — вэнити-поддомен с 301 на канонический путь сайта (SR-12, §1). Если allowlist-хост всё же
  поднимается под QA-stage, ссылки на legal-страницы `sealife.info` обязаны быть на стартовом и
  финальном экранах игры.
* **Зависимость данных:** лидерборд резолвит игру по slug `seal-the-hunter` → в БД окружения (ветка
  Neon) должна быть строка коллекции `games` с этим slug (см. сидинг в §5). Таблица `game-scores`
  создаётся push'ем при первом старте (схема пока push-based, см. CLAUDE.md / память проекта).
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
   не использовать), Caddy (офиц. репозиторий). PostgreSQL на боксе **не нужен**, пока БД на Neon
   (см. ниже). Self-hosted Postgres ставим позже, перед prod-сайтами (§2, §7).
3. **БД — Neon (EU, Frankfurt).** Создать **выделенную ветку** под окружение (free-tier). Ветка Neon
   copy-on-write от родителя → держать её **чистой от PII**: ветвиться от пустого состояния или
   очистить не-игровые таблицы. Взять connection string ветки для `DATABASE_URI` (шаг 4).
4. **Каталоги и окружение.**
   * `/opt/sealife/{releases,current}` (владелец `deploy`); `current` — симлинк на активный релиз.
   * `/etc/sealife/.env` (root:deploy, `640`): `DATABASE_URI` (**connection string ветки Neon**, с
     `sslmode=require`), `PAYLOAD_SECRET` (**новый prod-секрет, ≠ dev** — он подписывает play-token
     лидерборда), `SERVER_URL=https://<хост окружения>` (только `*.sealife.info` /
     `*.sealrescue.info` — домен-политика в шапке), `NEXT_PUBLIC_PLAUSIBLE_SRC=` (пусто вне prod),
     **`MEDIA_DIR=/opt/sealife/shared/media`** — абсолютный путь ВНЕ `releases/` (§7a; без него
     загрузки уедут в каталог релиза и исчезнут на следующем деплое).
   * ⚠️ Ansible создаёт `/etc/sealife/.env` из шаблона с `force: false` — то есть **только один
     раз**. На уже поднятом боксе добавление ключа в `env.j2` ничего не меняет: строку
     `MEDIA_DIR=` нужно дописать в файл руками. Шаг деплоя «Verify MEDIA_DIR» проверяет это
     перед активацией релиза и отказывается активировать, если ключ пуст, относителен или ведёт
     внутрь `releases/` (CR-18).
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
   ⚠️ **Workflow требует подтверждения (CR-03):** имя сида набирается руками в поле `confirm` и
   сверяется с выбранным. До этого запуск был тремя кликами против единственного репозиторного
   `DATABASE_URI`, и ничто не отличало прод-БД от dev-БД в момент нажатия.
   ⚠️ **`seed:m1` больше не затирает работу человека (CR-03).** Он делает upsert по slug, и раньше
   первая же настоящая статья под одним из 12 занятых slug'ов умирала при следующем прогоне: текст
   заменён, публикация снята, авторство переписано на AI — молча, с отчётом «updated». Теперь сид
   обновляет запись, только если она всё ещё выглядит так, как он её оставил; опубликованное,
   вычитанное человеком и отредактированное пропускается с причиной в логе. Осознанный откат
   демо-набора к эталону — только через `force`.
8. **DNS (Namecheap).** Записи заводим только на `sealife.info` / `sealrescue.info` (домен-политика
   в шапке). На **BasicDNS** менять nameservers НЕ нужно: A-записи `@`/`www` (или A нужного
   поддомена) → `<IP VPS>`, удалить дефолтные parking-записи. Caddy выпускает TLS автоматически
   после распространения DNS.
9. **Email.** Контакт оператора живёт в Impressum и заводится на домене проекта. Приём: Namecheap
   **Email Forwarding** (`<адрес>@sealife.info`) → личный ящик. Отправка «как этот адрес» — отдельный
   mailbox (mailbox.org / Zoho free / Private Email), меняет MX + добавляет SPF/DKIM/DMARC; вводится
   позже.

## 6. CI/CD: секреты GitHub Actions (`.github/workflows/deploy.yml`)

| Secret | Значение |
|---|---|
| `SSH_HOST` | IP/хост VPS |
| `SSH_USER` | `deploy` |
| `SSH_KEY` | приватный ключ (ed25519); публичный — в `~deploy/.ssh/authorized_keys` |
| `DATABASE_URI` | **Neon** (EU) — только для build-time чтений (главная sealife пре-рендерится статически и читает `content`). Лучше **отдельная build-ветка**, НЕ живая ветка окружения (сборка не должна трогать данные лидерборда). |
| `PAYLOAD_SECRET` | любое непустое build-time значение (реальный prod-секрет — в `/etc/sealife/.env`) |

> **Почему build-time нужна БД:** `src/app/(frontend)/[site]/[locale]/page.tsx` (sealife home)
> попадает в `generateStaticParams` и вызывает `payload.find` при сборке. В game-only окружении (§4)
> главная наружу не отдаётся (Caddy отдаёт только игру), поэтому собрать против Neon-ветки
> безопасно. **Перед запуском prod-сайтов** пересмотреть стратегию (ISR/`force-dynamic` или
> выделенная build-БД).

## 7. Бэкапы

* **Игровые окружения (Neon EU):** бэкапы обеспечивает Neon — point-in-time restore на free-tier.
  Отдельный off-box `pg_dump` не нужен; данные лидерборда анонимны и без PII
  (`src/endpoints/leaderboard.ts`).
* **Self-hosted prod (когда появится):** до запуска prod-сайтов / появления любого PII (CMS-контент,
  staff-аккаунты) — ночной `pg_dump` → off-box (EU, напр. Backblaze B2 Amsterdam) + ротация +
  **проверенный** restore (M0-T06). Self-hosted prod-БД без рабочих бэкапов — недопустима.
* **Загруженные медиа — отдельный носитель, отдельный бэкап.** Файлы лежат НЕ в БД, а в
  `/opt/sealife/shared/media` (см. §7a); `pg_dump` их не покрывает. Восстановление одной только БД
  даст записи `media` с рабочими путями и отсутствующими файлами — то есть битые обложки на всех
  страницах. Бэкапить каталог вместе с дампом.

### 7a. Загруженные медиа: где лежат и почему именно там (CR-04, CR-18)

**Каталог задаётся переменной `MEDIA_DIR` и обязан лежать ВНЕ `releases/`.**

```
MEDIA_DIR=/opt/sealife/shared/media
```

Почему это не деталь вкуса: systemd-юнит указывает `WorkingDirectory=/opt/sealife/current`, а это
симлинк, который деплой перекидывает на свежий `releases/<sha>`, залитый `rsync --delete`, после
чего релизы старше пятого удаляются `rm -rf`. Payload без явного `staticDir` резолвит каталог
загрузок от рабочего каталога процесса — то есть внутрь релиза. Загрузки исчезали бы на следующем
деплое, и **локально это работает идеально**, поэтому обнаружилось бы только после наполнения
сайтов контентом.

Что сделано, чтобы это не вернулось:

* `staticDir` вычисляется в `src/media/storage.ts` и всегда абсолютный; относительный `MEDIA_DIR`
  отвергается с ошибкой (относительный резолвился бы ровно от того симлинка);
* при `NODE_ENV=production` без `MEDIA_DIR` приложение пишет предупреждение в лог при старте
  (`journalctl -u sealife`);
* шаг деплоя делает `mkdir -p /opt/sealife/shared/media` и никогда не трогает содержимое;
* `tests/int/media-upload.int.spec.ts` проверяет, что файл реально пишется в настроенный каталог
  и что путь не содержит `/releases/`.

**Обработка при загрузке.** Оригинал пережимается в webp (≤ 2400 px по ширине, без растягивания) и
получает три производных размера — `thumbnail` 400, `card` 800, `hero` 1600. Пережатие заодно
снимает EXIF: без него файл отдавался байт-в-байт вместе с GPS-координатами со смартфона.
⚠️ Всё это работает только потому, что `sharp` **явно передан** в `buildConfig`. Без этой строки
Payload пишет предупреждение в лог и молча игнорирует `imageSizes`/`formatOptions` — производные не
создаются, оригинал сохраняется как есть. Пакет в зависимостях был, не хватало передачи.

**Отдача файлов** идёт через приложение (`/api/media/file/**`), не статикой Caddy. Если публичная
поверхность когда-нибудь снова сузится до allowlist (как было на альфе, §4), этот путь нужно
внести в список — иначе все картинки отдадут 404.

**Три уровня защиты (CR-18).** Раньше был один, и он был самым слабым:

| Где | Что делает | Когда срабатывает |
| --- | --- | --- |
| `infra/ansible` (`env.j2` + `media_dir`) | заводит ключ сразу правильным | только при ПЕРВОМ создании `.env` (`force: false`) |
| шаг деплоя «Verify MEDIA_DIR» | отказывается активировать релиз | каждый деплой; единственная защита для уже поднятого бокса |
| `mediaDirWarning()` в рантайме | пишет в `journalctl` | старт сервиса |

Рантайм намеренно **не бросает исключение**: упавший старт хуже, чем работающий сайт с
предупреждением — потеря загрузок не мешает страницам рендериться. Громкий отказ живёт в деплое,
где он ничего не роняет: текущий релиз продолжает работать, новый просто не активируется.

Проверка смотрит на РЕЗУЛЬТАТ резолва, а не на наличие переменной, поэтому ловит и случай
«`MEDIA_DIR` задан, но указывает внутрь `releases/`» — раньше он проходил молча.

## 8. Runbook: поднять новое окружение (QA-stage / prod)

Публичных окружений сейчас нет: альфа выключена 2026-07-12, её домен закрыт (шапка дока).
**Выключение окружения:** Actions → **Shutdown alpha (VPS)** (в confirm вписать `shutdown-alpha`) —
останавливает и выключает `sealife`+`caddy` (`infra/ansible/shutdown.yml`); бокс сохраняется.

**Поднять новое окружение:** добавить сайт-блок нужного хоста в `deploy/Caddyfile` — **только под
`sealife.info` / `sealrescue.info` или их поддоменами** (полный proxy для сайтов; allowlist по §4 —
если наружу отдаётся одна игра), при желании включить `push:`-триггер в `deploy.yml`, затем шаги
4→7. Шаги ниже проверены на боксе:

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
5. **DNS:** A-записи нужного хоста на Namecheap BasicDNS (домены проекта — только два, см. шапку).
6. **Seed:** Actions → **Seed database → `baseline`** (или локально `fnm use 22 && npm run seed:baseline`).
7. **Deploy:** Actions → **Deploy (main → VPS)** (или push в `main`).
8. **Закрыть/открыть standalone-игру («Coming soon», SH-14):** Actions → **Toggle game
   standalone** → mode `coming_soon`/`live` + игра (с game-only хоста админка недоступна —
   allowlist; workflow пишет флаг `games.standaloneComingSoon` прямо в БД из
   `DATABASE_URI`, тот же паттерн, что Seed). Локальный эквивалент против нужной БД:
   `npm run game:standalone -- coming_soon seal-the-hunter`. Кэш конфига — до 60 с.
   iframe на sealife.info не затрагивается. Сиды флаг НЕ трогают и выбор не перетирают.

Остаётся (гейты на будущее): отправка почты «как контакт оператора» с домена проекта; **перед
prod-сайтами/PII** — self-hosted Postgres + off-box бэкапы (§7), Environment-секреты + staging,
пересмотр build-vs-DB (§6), снятие auto-delete у Neon-ветки бывшей альфы (иначе её данные исчезнут
через 30 дней).

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
  (идемпотентно; тот же скрипт, что в CI-jobs `test`/`e2e`). Заодно рантайм окружения (та же
  Neon-ветка) получает схему до рестарта. `echo y |` (2026-07-03, SH-11) авто-подтверждает
  data-loss prompt drizzle при **деструктивных** изменениях (удаление колонки) — иначе
  интерактивный вопрос вешает CI; принято для push-фазы, т.к. данные игрового лидерборда анонимны
  и еженедельно прунятся. Деструктивный push также означает короткое окно (build+deploy), когда
  СТАРЫЙ рантайм ссылается на удалённую колонку — вне prod приемлемо (лидерборд ответит 500 до
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
* **Секреты GitHub: Repository, не Environment** (как было на альфе). Environment (`production` +
  branch-rule + approval) — позже, при staging/prod.
* **DNS: nameservers менять не нужно** — A-записи на Namecheap BasicDNS; Caddy сам выпускает TLS.
* **systemd-сервис стартует только на первом Deploy** — `sealife.service` enable'нут, но `current/`
  пуст до первого деплоя; стартует, когда Deploy положит код и сделает `systemctl restart`.
* **Neon connection string:** pooler-endpoint + `sslmode=require`; предупреждение pg про `verify-full`
  косметическое (можно позже сменить на `sslmode=verify-full`).
