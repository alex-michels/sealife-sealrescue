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
| [localization.md](localization.md) | Локали `ru`/`en`/`de`, мультидомен, роутинг (`proxy.ts`), локализованные legal-роуты, hreflang/sitemap |
| [agents.md](agents.md) | RBAC-роли, очередь `agent-proposals`, audit `agent-runs`, хуки, human-in-the-loop, безопасность |
| [game-seal-hunter.md](game-seal-hunter.md) | Игра «Seal The Hunter»: структура, fairness, service worker, лидерборд, анти-чит |
| [local-development.md](local-development.md) | Локальная разработка: prereqs, ENV, скрипты, БД push-режим, сиды, тесты, Docker |

## Стратегические / governance доки

| Док | О чём |
| --- | --- |
| [Roadmap.md](Roadmap.md) | Задачи по ID (M0/M1/M2…), статусы `[ ]`/`[x]`/`[~]`/`[!]` |
| [DESIGN_BRIEF.md](DESIGN_BRIEF.md) | Дизайн-направление (Foggy Coastal Utility), токены, типографика, компоненты |
| [COMPLIANCE_EU_DE.md](COMPLIANCE_EU_DE.md) | EU/DE-комплаенс: Impressum, GDPR/TDDDG, DSA, AI Act |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Хостинг (Contabo VPS), CI-деплой из `main` (Next standalone → Caddy + systemd), окружения (Neon dev / self-hosted prod), публичный alpha игры. Инфра-конфиги — [`deploy/`](../deploy/) |
| [INFRA.md](INFRA.md) | IaC-стратегия: day‑0 vs day‑2, слои (Terraform / cloud-init / Ansible / Actions / justfile), Postgres без reinstall, media на object storage, хостинг AI-агентов (OpenClaw), секреты, дорожная карта |
| [sealife-masterplan-v1.md](sealife-masterplan-v1.md) | Общий продуктовый план |

> Инварианты архитектуры (агент не публикует/не удаляет, минимизация данных, локали, DE-роуты)
> — нормативно описаны в [`CLAUDE.md`](../CLAUDE.md). Эти доки объясняют, **как** они реализованы в коде.
