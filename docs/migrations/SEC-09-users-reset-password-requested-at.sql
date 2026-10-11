-- SEC-09 (Payload 3.85 → 3.90). Additive upgrade for databases where Payload schema push does NOT run
-- (PAYLOAD_MIGRATING=true rehearsals such as M2-T16, restored copies, a future migrations-only prod).
-- Payload ≥3.90 selects this column in every `users` query: without it login and all CRUD that touches
-- users fail with "column users.reset_password_requested_at does not exist". Run BEFORE starting 3.90.
-- Where push runs (CI, deploy.yml "Sync DB schema", npm run dev) Payload adds the same column itself.
-- psql "$DATABASE_URI" --single-transaction --set ON_ERROR_STOP=1 --file docs/migrations/SEC-09-users-reset-password-requested-at.sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_requested_at timestamp(3) with time zone;
-- Nullable, no default: existing staff rows stay NULL (no forgot-password request recorded yet).
