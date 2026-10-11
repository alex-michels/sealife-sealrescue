# M2-T16 — rescue-centers schema repair: verification and rollout

## Result recorded on 2026-10-11

The schema mismatch is repaired in the **development Neon EU database**. Production, VPS services,
DNS and public deployment were not touched. The source database was changed only after a full local
restore rehearsal, SQL review and passing migration / Payload tests.

| Check | Result |
| --- | --- |
| Source | Development Neon Frankfurt, PostgreSQL 18.6 / PostGIS 3.6.0 |
| Rehearsal | Local Docker, PostgreSQL 18.6 / PostGIS 3.6.4, port bound to 127.0.0.1 |
| Backup | Full custom-format pg_dump 18, 448,912 bytes; consistent exported read-only snapshot |
| Restore | pg_restore --exit-on-error --single-transaction --no-owner --no-acl succeeded |
| Data equivalence before repair | All 71 public tables: counts and complete row fingerprints matched |
| Migration on restored copy | One transaction committed; no records created, changed or published |
| Corrected rescue shape | 11 foreign keys / 32 non-primary indexes across 10 rescue tables |
| Native lifecycle | status uses rescue_center_operating_status; _status uses enum_rescue_centers_status, default draft |
| Retry | Already repaired schema verified without changing records or history |
| Development rollout | Same reviewed DDL committed after rehearsal; all 71 data fingerprints remained unchanged |
| Production rollout | Not performed |

The PostGIS patch versions differ. Both contain the same reference-table data in this rehearsal;
all 71 data fingerprints matched. This confirms this SQL repair and the tested CMS behavior, not
production readiness or equivalence of every PostGIS function between those patch versions.

The dev and copy databases contained **zero rows in every rescue table** before repair. Missing
_status, old main operational enum, draft-incompatible NOT NULL fields, and missing version FK/indexes
were the observed partial state. After tests cleaned their fixtures, all 10 local rescue tables were
empty again. Development still has no centres or versions; this task did not seed or publish content.

## Migration choice and protections

Use [the rollout classification](../agents/proposal-review.md#database-rollout), not an unconditional
Payload push or a sequence of all SQL files:

- True pre-drafts legacy: reviewed M2-T13 migration, which preserves previously public data.
- Observed empty partial schema: [M2-T16 SQL](M2-T16-rescue-center-schema-repair.sql).
- Complete repaired schema: M2-T16 checks it and returns without data changes.
- Nonempty partial / unknown schema: stop and review; M2-T16 refuses to invent publication states.

M2-T16 owns BEGIN/COMMIT, locks all 10 rescue tables before testing emptiness, and sets 5-second
lock / 120-second statement timeouts. It validates columns, enum values, nullability, defaults,
sequence ownership, primary keys, FK targets/actions and named index definitions. It rejects
unexpected enum dependencies using DROP TYPE RESTRICT, without CASCADE. The finished shape is
validated again before commit. No content DML, publication, history backfill or destructive down
migration is included. After commit, rollback needs the reviewed pre-repair backup/release.

This explicit repair does not establish the baseline Payload migration chain; M0-T02 remains open.

## Rehearsal procedure

1. Identify the source as development and provision an isolated local or approved EU/EEA target.
   Source and target connection settings must differ. Stop application writers before a real rollout;
   do not terminate unrelated sessions to force a copy. Keep staff data and authentication hashes
   inside the approved destination and outside Git/logs.
2. Use PostgreSQL 18 clients for this PostgreSQL 18 source. Take a custom-format dump in a consistent
   read-only transaction / exported snapshot, using TLS verify-full for the remote source. Restore
   with no-owner / no-acl into the copy, with the required PostGIS extension available. Fail on the
   first restore error. Verify the restored data before executing any repair.
3. Load private copy credentials from an ignored file. Set DATABASE_URI_TEST explicitly and
   PAYLOAD_MIGRATING=true before importing payload.config. The Postgres adapter (3.85.1 when this
   was recorded; unchanged in 3.90.2) uses that guard to disable automatic Drizzle push; otherwise a
   test could silently repair its own subject. CI's test job also explicitly sets DATABASE_URI_TEST
   to its ephemeral service database.
   **Since Payload 3.90 (SEC-09)** every `users` query selects `reset_password_requested_at`. A copy
   of a database that predates the upgrade does not have it, and with push disabled nothing adds it,
   so every Payload CRUD suite fails before reaching rescue logic. Apply the additive, idempotent
   [SEC-09 migration](SEC-09-users-reset-password-requested-at.sql) to the copy first. It touches
   only `users`, so it does not change the rescue-schema classification.
4. Run the SQL against the copy with ON_ERROR_STOP=1. Do not add --single-transaction: this file
   already contains its transaction. Run the targeted suites below, then run the SQL a second time.
5. Confirm lifecycle defaults, constraints/indexes, anonymous draft visibility, preservation of
   published data, and cleanup of test records. Only after review and successful rehearsal, apply
   the same file to the confirmed development target; recheck table fingerprints and schema.

Commands below assume private COPY connection settings are already loaded; they contain no
credential values. psql / pg_dump / pg_restore can read standard PG* environment settings.

```sh
pg_dump --format=custom --no-owner --no-acl --file .db-work/m2t16/source.dump
pg_restore --exit-on-error --single-transaction --no-owner --no-acl --dbname sealrescue_copy .db-work/m2t16/source.dump
psql --set ON_ERROR_STOP=1 --file docs/migrations/M2-T16-rescue-center-schema-repair.sql
psql --single-transaction --set ON_ERROR_STOP=1 --file docs/migrations/SEC-09-users-reset-password-requested-at.sql
npm run test:int -- tests/int/rescue-schema-repair.int.spec.ts
npm run test:int -- tests/int/proposal-review.int.spec.ts tests/int/rescue-draft-migration.int.spec.ts
```

For fingerprint comparison use UTC and binary collation C on both databases. A locale-dependent
sort produced misleading differences even with identical rows in this rehearsal. Compare each
table separately; never print its contents to the report:

```sql
BEGIN READ ONLY;
SET LOCAL TIME ZONE 'UTC';
SELECT count(*),
  md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY to_jsonb(t)::text COLLATE "C"), ''))
FROM public.rescue_centers AS t;
ROLLBACK;
```

## Validation

**16 tests passed: 9 schema-repair tests + 6 proposal-review tests + 1 legacy-migration test.**
Final reviewed SQL SHA256: `7fa45efb77879d6cff9a8a914ee24802785c926bf59f36a50e7b80465a530ab7`.
The final file was also rechecked as a no-op on both the restored copy and repaired development DB.

The new pure-pg suite requires an explicit DATABASE_URI_TEST and runs its fixtures / migration
inside isolated rolled-back schemas. It does not boot Payload or fall back to the development URI.
It covers repair and incomplete-draft defaults; exact preservation on retry with draft/published
records, localized descriptions, arrays, relationships and version history; refusal with partial
records or orphan children; unexpected enum / external enum dependency; wrong FK / index shape,
including UNIQUE NULLS NOT DISTINCT; and full catalogue/data rollback on every guarded failure.

The existing proposal-review suite validates actual Payload operations over the repaired database:
new drafts stay private, edits leave published data intact, concurrent apply is idempotent, failed
second writes roll back, stale targets are rejected and agent decisions are denied. The legacy
migration test also passes, covering all four operational statuses and bilingual/array/source data.
Payload schema push remained disabled throughout the copy's CMS tests.

Types were regenerated; TypeScript passed. The changed test passed ESLint. The unmodified full
npm run lint encountered the pre-existing ignored-by-Git Playwright cache, including copied vendor
bundles. Re-running ESLint across source files with playwright/.cache/** and .db-work/** excluded
passed with zero errors (15 existing warnings). No broad lint-rule change was made for this task.

## Re-verification on Payload 3.90.2 (SEC-09, 2026-10-11)

Done on throwaway local PostGIS 17-3.5 databases, not on Neon or a restored dev copy:

- **Rescue schema shape is unchanged.** A database pushed by Payload 3.85.1 and then pushed by
  3.90.2 differs from the 3.85.1 schema-only dump in one line: `users.reset_password_requested_at`.
  All ten rescue tables, both enums, foreign keys and indexes are identical. A fresh 3.90.2 push is
  identical to the upgraded one apart from that column's position. A later push therefore does not
  touch a repaired rescue schema.
- **The M2-T16 SQL accepts 3.90.2 schemas.** Run twice on a fresh 3.90.2 database and on the
  upgraded one, it reported "repaired schema verified; no changes" both times. The schema dumps
  were byte-identical afterwards. The committed file still hashes to the SHA256 recorded above
  (a CRLF working copy on Windows hashes differently; psql runs it the same way).
- **The push-disabled procedure needs the SEC-09 column.** With `PAYLOAD_MIGRATING=true` on a
  3.85.1-shaped database, `proposal-review.int.spec.ts` failed before any test with
  `column users.reset_password_requested_at does not exist` (6 skipped). After the SEC-09 migration
  (run twice; the second run is a no-op), still with push disabled,
  `rescue-schema-repair` (9), `proposal-review` (6), `rescue-draft-migration` (1) and
  `users-credentials` all passed, and no push ran. The schema matched the 3.90.2 push result exactly.

## Local review artifacts

The backup, CA bundle, aggregate fingerprints and verification metadata are under the ignored
.db-work/m2t16/ directory; the local copy URI is in ignored .env.m2t16.local. Neither should be
committed or attached publicly. PostgreSQL listens only on localhost. The rehearsal container
sealrescue-m2t16-local is stopped after verification; restart it with docker start when needed.
The dump remains available for reviewing or restoring the pre-repair state. No second remote
copy database was created.
