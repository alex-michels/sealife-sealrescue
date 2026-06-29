# One control surface for the project's ops. Install: `winget install Casey.Just` (or `brew install just`).
# List recipes: `just`  ·  Architecture: docs/INFRA.md

set shell := ["bash", "-cu"]

ansible_dir := "infra/ansible"

# Show available recipes
default:
    @just --list

# Dry-run the server config (no changes) — run this before `configure`
configure-check:
    cd {{ansible_dir}} && ansible-playbook site.yml --check --diff

# Apply the server config (idempotent; safe on a live box)
configure *ARGS:
    cd {{ansible_dir}} && ansible-playbook site.yml {{ARGS}}

# Connectivity check to the box(es)
ping:
    cd {{ansible_dir}} && ansible all -m ping

# Snapshot the VPS via Contabo before a risky change:  just snapshot <instanceId> "before postgres"
snapshot id name:
    cntb create snapshot {{id}} --name "{{name}}"

# Trigger the deploy workflow manually (normally automatic on push to main)
deploy:
    gh workflow run "Deploy (main → VPS)"

# SSH in as deploy:  just ssh <host-or-ip>
ssh host:
    ssh -i ~/.ssh/sealife_deploy deploy@{{host}}
