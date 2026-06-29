# Ansible — day-2 configuration of the app server

Idempotent, convergent configuration you can **re-run safely on a live box** (the day-2 layer in
[`docs/INFRA.md`](../../docs/INFRA.md)). This replaces the manual SSH runbook in
[`DEPLOYMENT.md`](../../docs/DEPLOYMENT.md) §5 and is where the future `postgres` / `backups` roles
plug in — adding Postgres later is a new role + re-run, **never a reinstall**.

> ⚠️ **Scaffold — review and dry-run before trusting it.** It hasn't been run against a live box yet.
> Always `just configure-check` (`--check --diff`) first.

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
- **Later: a CI workflow** (`workflow_dispatch`) that runs the playbook from a Linux runner using the
  `SSH_KEY` secret — so you never need WSL. (Not added yet; ask and I'll wire it up.)

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
