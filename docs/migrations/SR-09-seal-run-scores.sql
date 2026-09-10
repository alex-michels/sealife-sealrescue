-- SR-09/SR-20. Additive upgrade; review and run once before using ranked Seal Run on an existing DB.
-- psql "$DATABASE_URI" --single-transaction --set ON_ERROR_STOP=1 --file docs/migrations/SR-09-seal-run-scores.sql
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS distance numeric;
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS lives_remaining numeric;
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS fish_collected numeric;
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS course_seed varchar;
ALTER TABLE game_scores ADD COLUMN IF NOT EXISTS levels_completed numeric;
-- Existing Hunter rows remain NULL in all five optional fields.
