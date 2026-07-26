# Документация — sealife-sealrescue

Технические dev-доки проекта. Стратегические/governance-доки и тех-доки лежат здесь, в `docs/`.
В корне репозитория остаются только конвенционные файлы: [`README.md`](../README.md) (быстрый старт),
[`CLAUDE.md`](../CLAUDE.md) и [`AGENTS.md`](../AGENTS.md) (правила для AI-агентов).

> **Эти доки обязаны всегда отражать текущее состояние проекта.** Любая новая фича, изменение
> бизнес-логики или иное значимое изменение документируется в соответствующем файле здесь **в том же
> PR**; удаление задокументированного — так же зеркалится (запись убрать/обновить). Док,
> рассинхронизированный с кодом, — баг. Правило закреплено в
> [`CLAUDE.md`](../CLAUDE.md) → Dev best practices → Рабочий процесс.

## Технические доки (как устроен проект)

| Док | О чём |
| --- | --- |
| [architecture.md](architecture.md) | Общая картина: два сайта на одном Payload-в-Next, жизненный цикл запроса, провенанс, инварианты |
| [data-model.md](data-model.md) | Все коллекции Payload: назначение, ключевые поля, связи, матрица доступа (RBAC) |
| [api.md](api.md) | Endpoints (лидерборд), авто-REST/GraphQL Payload, какие маршруты публичны, route guards |
| [localization.md](localization.md) | Контентные локали `ru`/`en` + legal-only `de` (Impressum/Datenschutz), мультидомен, роутинг (`proxy.ts`), legal-роуты, hreflang/sitemap |
| [agents.md](agents.md) | RBAC-роли, очередь `agent-proposals`, audit `agent-runs`, хуки, human-in-the-loop, безопасность |
| [game-seal-hunter.md](game-seal-hunter.md) | Игра «Seal The Hunter»: структура, fairness, service worker, лидерборд, анти-чит, **статический бэкдроп + анимированная сцена**, финальный interstitial |
| [game-seal-hunter-worklog.md](game-seal-hunter-worklog.md) | Журнал работ: full-screen + 2:1 clamp (PR #25), fairness-харнесс, prey-решение (PR #26), **визуал-цикл: leaderboard-фиксы (#28–31) + статический бэкдроп (#32)** |
| [game-seal-run.md](game-seal-run.md) | Игра «Seal Run»: side-scroll Phaser 4-раннер, свободный Y + banded-контент, сид-детерминированная трасса, лидерборд, SR-01..SR-15 |
| [game-seal-run-spec.md](game-seal-run-spec.md) | Нормативная спека механик Seal Run v1 (SR-01): единицы/детерминизм, физика free-Y, полосы, ярусы препятствий, автомат стамины, формат чанков + `generateCourse`, формула очков, серверные проверки |
| [local-development.md](local-development.md) | Локальная разработка: prereqs, ENV, скрипты, БД push-режим, сиды, тесты, Docker |

## Стратегические / governance доки

| Док | О чём |
| --- | --- |
| [Roadmap.md](Roadmap.md) | Задачи по ID (M0/M1/M2…), статусы `[ ]`/`[x]`/`[~]`/`[!]`; сквозные треки SEC/EU/**BIO**/DESIGN/QA. Сверен с кодом аудитом 2026-07-26 — приписки «— **аудит 2026-07-26:**» в задачах |
| [DESIGN_BRIEF.md](DESIGN_BRIEF.md) | Дизайн-направление (Foggy Coastal Utility), токены, типографика, компоненты |
| [COMPLIANCE_EU_DE.md](COMPLIANCE_EU_DE.md) | EU/DE-комплаенс: Impressum, GDPR/TDDDG, DSA, AI Act |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Хостинг (Contabo VPS), CI-деплой из `main` (Next standalone → Caddy + systemd), окружения (Neon dev / self-hosted prod), публичный alpha игры. Инфра-конфиги — [`deploy/`](../deploy/) |
| [INFRA.md](INFRA.md) | IaC-стратегия: day‑0 vs day‑2, слои (Terraform / cloud-init / Ansible / Actions / justfile), Postgres без reinstall, media на object storage, хостинг AI-агентов (OpenClaw), секреты, дорожная карта |
| [sealife-masterplan-v1.md](sealife-masterplan-v1.md) | Исходное продуктовое видение (frozen v1) — «почему» продукта; при расхождении с остальными доками верить им |
| [sealgames-online-game-ideas.md](sealgames-online-game-ideas.md) | Брейншторм игрового портала `sealgames.online`: catchy browser game ideas, retention loops, co-op/social systems, Seal The Hunter upgrades |

> Инварианты архитектуры (агент не публикует/не удаляет, минимизация данных, две контентные локали
> `ru`/`en`, legal-only DE-роуты) — нормативно описаны в [`CLAUDE.md`](../CLAUDE.md).
> Эти доки объясняют, **как** они реализованы в коде.
