# Инфраструктура как код (IaC) — стратегия

Как управляем серверами и облачными ресурсами проекта **декларативно, из репозитория, одним
интерфейсом** — чтобы не переключаться между порталами/терминалами. Привязано к инвариантам
[`CLAUDE.md`](../CLAUDE.md) (агент предлагает через `agent-proposals`, не публикует/не удаляет;
минимизация данных; PII только EU/EEA; секреты не в гите) и к текущему рантайму
[`DEPLOYMENT.md`](DEPLOYMENT.md).

> **Статус:** стратегический документ + дорожная карта. На alpha реализована только часть (§6–§7);
> остальное вводим по мере необходимости, без оверинжиниринга.

## 1. Принцип: day‑0 (provisioning) ≠ day‑2 (config)

Главное, что определяет выбор инструментов:

* **cloud-init** — только **первый boot** (bootstrap). Это **не** система управления конфигурацией и
  **не** механизм непрерывной сходимости/устранения дрейфа. Повторное применение ⇒ переустановка ⇒
  потеря running-данных (например, БД).
* **Ansible** — **day‑2** конфигурация: agentless по SSH (на боксе нужен только Python),
  **идемпотентно и безопасно повторно прогонять на ЖИВОМ сервере** (поставить Postgres позже, тюнить,
  добавить сайт) **без переустановки**.
* **Terraform** — жизненный цикл **облачных ресурсов** (VPS, DNS, бакеты), а не конфиг внутри ОС.

> Поэтому «поставить Postgres на prod позже» = **новая Ansible-роль, прогнанная на живом боксе**,
> а НЕ reinstall/cloud-init.

## 2. Слои (всё в одном репо, один интерфейс)

| Слой | Инструмент | Где в репо | Что описывает |
|---|---|---|---|
| Облачные ресурсы | **Terraform** (провайдеры Contabo + Namecheap) | `infra/terraform/` | VPS, **DNS**, object-storage бакеты, позже agent-VPS |
| Первый boot | **cloud-init** (минимальный) | `deploy/cloud-init.yaml` | users + SSH-ключи + python → передать управление Ansible |
| Конфиг (day‑2) | **Ansible** | `infra/ansible/` | хардненинг, Node 24, Caddy, app systemd/env, **позже Postgres**, бэкапы, media |
| Деплой приложения | **GitHub Actions** (готово) | `.github/workflows/` | build → rsync → симлинк → systemd restart |
| Обвязка | **`justfile`/Makefile** | корень репо | `just provision / configure / deploy / snapshot / ssh` |

`justfile` — это и есть «один проект, не переключать инструменты»: запускаешь команды репозитория, а
Terraform/Ansible/`cntb`/`gh` — детали реализации под ними. DNS Namecheap становится записью Terraform
(не клики в портале), `cntb` вызывается из `just snapshot` перед рискованным изменением.

> **Состояние Terraform** — НЕ в гите. Хранить в Contabo Object Storage (S3-backend) или Terraform
> Cloud (free). Секреты — тоже не в гите (GitHub Secrets + env-файл на боксе, позже secret manager).

Полностью свести всё к одному инструменту — не лучшая практика: у каждого слоя свой специалист
(Terraform — ресурсы, Ansible — конфиг, cloud-init — bootstrap, Actions — деплой). «Единый проект»
достигается **одним репо + одной командной обёрткой (`justfile`) + CI**, а не одним инструментом.

## 3. Postgres для prod — без переустановки

1. `just snapshot` → `cntb create snapshot <id>` — точка отката (конфиг бокса; данные — отдельно).
2. Ansible-роль `postgres` (install, тюнинг под 8 GB, БД/роль) + роль `backups` (ночной `pg_dump`
   → Contabo Object Storage off-site — тот самый отложенный бэкап, см. DEPLOYMENT.md §7).
3. `just configure` → `ansible-playbook` **сходится на живом боксе**, приложение не падает.
   Миграция Neon → self-hosted = `pg_dump | pg_restore` + смена `DATABASE_URI` (DEPLOYMENT.md §2).

## 4. Media (будущее)

**Contabo Object Storage** (S3-совместимое, EU), НЕ диск app-бокса. Бакет — через Terraform; доступ —
S3 SDK + presigned URLs; опционально CDN (Bunny) перед origin. Расцепление media от compute — чтобы
reinstall/snapshot бокса не трогали media. Это Contabo-аналог прежнего плана M0‑T04 (Hetzner + Bunny).

## 5. AI-агенты и OpenClaw

Принцип: **control-plane агентов отделён от data-plane prod** (blast radius, конкуренция за ресурсы,
безопасность; инвариант — агент предлагает через `agent-proposals`, человек одобряет; least privilege).

* **Сейчас (alpha): без сервера агентов.** Инфра-проверки — **по расписанию в GitHub Actions /
  Claude Code routines**: dependency currency, `npm audit`, срок TLS, свежесть бэкапа, диск. Результат
  — PR/`agent-proposals`, одобряет человек. Ноль новой инфры/затрат, scoped-токены.
* **Позже (M3): отдельный «agentic» VPS**, отдельно от prod. Сюда хорошо ложится **OpenClaw** —
  self-hosted 24/7 AI-агент на Contabo VPS (модель-агностик: Claude/GPT/local, 50+ интеграций). Дать
  **scoped `cntb` API-токен**, read-mostly доступ к БД, без prod-SSH. **Не на prod-боксе.**
* **GPU не нужен:** агенты вызывают облачные LLM-API, не крутят локальные модели. Contabo GPU Cloud —
  только если когда-нибудь будем self-host модели.
* OpenClaw на текущем боксе — **избегать** для prod (always-on агент + широкие интеграции рядом с
  данными); ок только на одноразовом боксе для экспериментов.

## 6. Секреты (GitHub Actions)

* **Repository secrets** — выбор для **alpha**: просто, работает сразу; workflow и так триггерится
  только на push в `main`; fork-PR секреты не получают. Текущий выбор.
* **Environment secrets** (`production` environment) — позже: branch-rule «только `main`», опц.
  required-reviewer (ручной gate), узкий scope под deploy-джобы. Требует `environment: production` в
  джобах workflow.
* Прод-секреты приложения (`DATABASE_URI` prod, `PAYLOAD_SECRET` prod) живут в `/etc/sealife/.env` на
  боксе, **не** в CI. В CI — только `SSH_*` и build-time `DATABASE_URI`/`PAYLOAD_SECRET`. См.
  DEPLOYMENT.md §6.

## 7. Дорожная карта (now / next / later)

* **Сейчас:** `deploy/cloud-init.yaml` (bootstrap) + текущий CI + `justfile`. Опционально Ansible
  `base/node/caddy/app` (заменяет ручной SSH-runbook DEPLOYMENT.md §5 и готовит почву под Postgres).
* **Перед prod-сайтами / Postgres:** Ansible-роли `postgres` + `backups`; Terraform для DNS +
  object storage; миграция Neon → self-hosted.
* **На M3 (агенты):** отдельный agent-VPS / OpenClaw, scoped creds, интеграция с `agent-proposals`.

## 8. Чего не делать

* Не использовать reinstall/cloud-init для **day‑2** изменений на боксе с running-БД.
* Не держать Terraform state и любые секреты в гите.
* Не сажать агентов с infra-правами на prod-бокс; не давать агентам publish/delete (CLAUDE.md).
* Не брать GPU без self-host моделей.

## Связанные доки

* [DEPLOYMENT.md](DEPLOYMENT.md) — текущий рантайм (Contabo VPS, CI, Caddy, systemd, Neon), runbook.
* [Roadmap.md](Roadmap.md) — задачи M0/M3 (агенты, бэкапы, media).
* Инварианты — [`CLAUDE.md`](../CLAUDE.md); инфра-конфиги — [`deploy/`](../deploy/).
