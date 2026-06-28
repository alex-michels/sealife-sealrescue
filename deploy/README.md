# deploy/ — infra-as-code

Конфиги инфраструктуры для деплоя на VPS. Полный runbook (provisioning, секреты, бэкапы) —
в [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

| Файл | Назначение |
| --- | --- |
| [`Caddyfile`](Caddyfile) | Reverse proxy для `sealthehunter.online`: авто-HTTPS + allowlist (наружу только игра и `/api/leaderboard*`) + rewrite корня домена в каталог игры. |
| [`sealife.service`](sealife.service) | systemd-юнит: запускает Next standalone (`node server.js`) на `127.0.0.1:3000` из `/opt/sealife/current`. |

Деплой автоматизирован в [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):
пуш в `main` → сборка Next standalone в CI → `rsync` на VPS → переключение симлинка `current` →
`systemctl restart sealife` → health-check. Single source of truth = `main`.
