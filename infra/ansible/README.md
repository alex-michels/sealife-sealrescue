# Ansible — day-2 configuration of the app server

Idempotent, convergent configuration you can **re-run safely on a live box** (the day-2 layer in
[`docs/INFRA.md`](../../docs/INFRA.md)). This replaces the manual SSH runbook in
[`DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) §5 and is where the future `postgres` / `backups` roles
plug in — adding Postgres later is a new role + re-run, **never a reinstall**.

> ℹ️ Has been run successfully against the live alpha box (`sealthehunter.online`) as part of go-live —
> see `docs/DEPLOYMENT.md` §8 step 4. Still review with `just configure-check` (`--check --diff`) before
> any change that touches roles/vars, since it's idempotent but not exhaustively tested against every
> possible prior state.

## Roles
| Role | Does |
|---|---|
| `base` | apt upgrade, base packages, `deploy` user + authorized keys, narrow CI sudo, ufw, fail2ban, unattended-upgrades, sshd hardening |
| `node` | Node `{{ node_major }}` via NodeSource at `/usr/bin/node` |
| `caddy` | install Caddy + deploy the canonical `deploy/Caddyfile` |
| `app`  | `/opt/sealife` dirs, `/etc/sealife/.env` scaffold (created once), the `deploy/sealife.service` unit |

## Control node (where you run Ansible)
Ansible's control node must be **Linux/macOS/WSL — not native Windows**. Options:
- **WSL (Ubuntu)** on your machine, or any Linux box.
- **CI (no WSL needed):** the [`Configure VPS (Ansible)`](../../.github/workflows/configure.yml)
  workflow runs this playbook from a Linux runner on `workflow_dispatch`. It uses the deploy secrets
  (`SSH_*`) and writes `/etc/sealife/.env` from `DATABASE_URI` / `PAYLOAD_SECRET` on first apply. No
  sudo password needed — `deploy` gets passwordless sudo from [`deploy/cloud-init.yaml`](../../deploy/cloud-init.yaml).
  Trigger it from the Actions tab (or `gh workflow run "Configure VPS (Ansible)"`).

## One-time setup
```bash
ansible-galaxy collection install -r requirements.yml   # community.general, ansible.posix
cp inventory.ini inventory.ini.local   # or edit in place: set YOUR_VPS_IP
# put the deploy public key into group_vars/all.yml -> deploy_authorized_keys
```
The `deploy` user + its SSH key must already exist on the box (cloud-init bootstrap, or DEPLOYMENT.md
§5 steps 1-3) before Ansible can connect as `deploy`.

## Run
```bash
just configure-check     # dry run (no changes) — do this first
just configure           # apply
just ping                # connectivity check
```
Or directly: `ansible-playbook site.yml --check --diff` then without `--check`.

## Secrets
`DATABASE_URI` / `PAYLOAD_SECRET` are **not** stored here. The `app` role writes
`/etc/sealife/.env` once with placeholders and never overwrites it — fill the real values on the box,
or pass `--extra-vars` / use `ansible-vault`. Never commit real secret values.
