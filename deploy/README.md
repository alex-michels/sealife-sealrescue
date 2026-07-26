# deploy/ — infra-as-code

Конфиги инфраструктуры для деплоя на VPS. Полный runbook (provisioning, секреты, бэкапы) —
в [`docs/DEPLOYMENT.md`](../docs/DEPLOYMENT.md).

| Файл | Назначение |
| --- | --- |
| [`Caddyfile`](Caddyfile) | Reverse proxy: авто-HTTPS + проксирование на приложение (`127.0.0.1:3000`). Сайт-блоки для `sealife.info` и `sealrescue.info` лежат закомментированными — публичная поверхность сейчас выключена. |
| [`sealife.service`](sealife.service) | systemd-юнит: запускает Next standalone (`node server.js`) на `127.0.0.1:3000` из `/opt/sealife/current`. |

**Домены проекта — только `sealife.info` и `sealrescue.info` (плюс их поддомены, напр.
`sealrun.sealife.info`).** Оба сайта и игры обслуживает одно приложение; маршрутизация по хосту —
внутри Next.

Деплой автоматизирован в [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml):
ручной запуск (авто-деплой по пушу в `main` пока выключен) → сборка Next standalone в CI →
`rsync` на VPS → переключение симлинка `current` → `systemctl restart sealife` → health-check по
адресу из инпута `health_url`. Single source of truth = `main`.
