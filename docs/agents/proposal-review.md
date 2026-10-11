# Human review and draft application (M2-T12 / M2-T13)

Editors and admins open **Agent review** in the Payload navigation (`/admin/agent-review`).
The view uses the existing Payload shell and supports EN/RU, status filters, pagination,
before/after tables, confidence, source links, check dates and exact quotations. Loading,
empty, error and conflict states are explicit. Other roles cannot access this view or perform
review actions. Raw source/evidence text is rendered as text, never HTML.

Pending proposals can be approved or rejected. An editor can change the proposed values in the
JSON editor, retaining the same supported fields and original `from` values. Edits return the
proposal to pending and require fresh approval. Review events retain actor ID, time, notes and
the reviewed diff inside proposal evidence. The original CMS record remains accessible.

Only valid Researcher v1 rescue-centre proposals with retained snapshots can be approved through
this workflow or automatically applied. Older/unstructured proposals remain readable and rejectable;
their contracts/evidence must be upgraded before automatic application. Other agents' apply adapters
belong to their later Roadmap tasks.

## Applying

**Apply as draft** is available after approval. The server revalidates the stored proposal, locks
its row, reads the centre's latest draft and compares every `from` value. A mismatch returns
`target_changed` and changes nothing. Edits to unrelated fields are preserved. Generated social-link
row IDs are excluded from semantic comparison; malformed before-values are never treated as empty lists.
A stale review form returns `proposal_changed`.

The centre write and transition to `applied` share one PostgreSQL transaction and request context,
with `overrideAccess: false`. Existing-centre rows are locked during comparison and version creation.
If either write fails, both roll back. Concurrent/repeated application of the same proposal returns
the same centre ID; it does not create duplicate centres. An applied proposal becomes immutable.
The generic CMS API cannot set `applied` directly. Ordinary CMS edits to an approved proposal reset
its status to pending.

Rescue centres now use native Payload drafts/versions. A proposal creates or changes a **draft**;
anonymous reads continue to show the previously published version, and a new draft is not public.
Publication remains a separate human action in Payload. Agent access to centre writes remains denied.

Approval to draft does not certify facts. Applying clears verification score and human/agent check
timestamps on the draft. The operational status becomes `needs_check`, except an explicit
`unconfirmed` or `link_broken` proposal can retain that cautionary status. Existing source relationships
are retained alongside newly cited sources. The published record's verification data remains intact.

## Database rollout

The operational `status` and publication `_status` have distinct PostgreSQL enum names. This avoids
Payload's generated-name collision when enabling drafts on a collection that already has `status`.

Classify the existing database before choosing a migration. The migration files are not an
ordered baseline chain and must not be applied blindly to every environment.

Independently of the rescue classification: Payload ≥3.90 (SEC-09) reads
`users.reset_password_requested_at` in every `users` query. Wherever schema push is disabled
(`PAYLOAD_MIGRATING=true` rehearsals, migrations-only environments), apply the additive, idempotent
[SEC-09 migration](../migrations/SEC-09-users-reset-password-requested-at.sql) before Payload
starts. Otherwise login and every Payload CRUD check fail. The 3.90.2 push leaves rescue tables
unchanged (verified in the [M2-T16 protocol](../migrations/M2-T16-verification.md)).

| Existing rescue schema | Action |
| --- | --- |
| True pre-M2-T13 schema: operational enum under its old name, no draft/version tables | Use the legacy M2-T13 migration below, once, after backup and review. |
| Empty partial M2-T13 schema: canonical operational enum and version tables exist, but main `_status`, version foreign keys/indexes and draft-compatible nullability are missing | Use the guarded M2-T16 repair below. |
| Already repaired M2-T16 schema | Re-running the M2-T16 repair preserves all records and publication states. |
| Nonempty partial schema or an unexpected object definition | Stop; review the actual data/schema and prepare a separate migration. Do not infer publication state. |
| New empty database without the existing application schema | Provision a reviewed baseline; do not run either incremental rescue migration as a baseline. |

For a **true pre-M2-T13 database**, stop writes, take a backup, review and run
[`M2-T13-rescue-center-drafts.sql`](../migrations/M2-T13-rescue-center-drafts.sql) **once**, before
starting the new code:

```sh
psql "$DATABASE_URI" --single-transaction --set ON_ERROR_STOP=1 --file docs/migrations/M2-T13-rescue-center-drafts.sql
```

This migration preserves existing operational enum values, marks previously public rows as published,
and backfills initial versions with both descriptions, social links, operating languages, relationships
and verification stamps. It does not change contacts. There is no automatic destructive down migration;
rollback requires the reviewed backup/old release. New empty databases use Payload schema creation and
do **not** run this incremental migration. Do not first push the new schema onto an existing database:
that would lose the migration's distinction between legacy public records and newly created drafts.

### Empty partial schema repair (M2-T16)

The development database audit on **2026-10-11** found the partial state described above, with no
centre records, localized descriptions, array/relationship rows or versions. The old operational
`enum_rescue_centers_status` still typed the main `status` field; the canonical
`rescue_center_operating_status` already existed for versions. Running the legacy M2-T13 migration
in this state would fail and would not safely classify any subsequently added records.

[`M2-T16-rescue-center-schema-repair.sql`](../migrations/M2-T16-rescue-center-schema-repair.sql)
repairs only that empty partial state. It validates object definitions, locks the rescue tables,
sets lock/statement timeouts and performs the repair in one transaction. It moves the main operational
field to the canonical enum, creates the separate draft/publication enum and `_status` with a
`draft` default, relaxes field nullability for incomplete drafts, and restores missing version
foreign keys and indexes. It uses no `CASCADE` drop, record backfill or publication. An ambiguous
nonempty partial schema or unexpected dependency/object definition aborts before the repair commits.
A repeat run against the repaired schema leaves data and publication states intact.

Run it first against a **full restored copy**, with Payload schema push disabled. The SQL contains
its own `BEGIN`/`COMMIT`, so do **not** add `--single-transaction`:

```sh
psql "$DATABASE_URI_TEST" --set ON_ERROR_STOP=1 --file docs/migrations/M2-T16-rescue-center-schema-repair.sql
```

The rehearsal passed on a full **local Docker copy** (PostgreSQL 18.6 + PostGIS 3.6.4, localhost only),
restored from a read-only dump of the Neon EU source. Temporary dumps/credentials are excluded
from Git. The SQL test is `tests/int/rescue-schema-repair.int.spec.ts` and requires an explicit
`DATABASE_URI_TEST`; it uses `pg` and rolls its isolated schemas back. Payload CRUD is verified
separately with push disabled.

See the [M2-T16 verification runbook](../migrations/M2-T16-verification.md) for copy isolation,
pre/post checks and the recorded rehearsal result. All 71 table data fingerprints matched before
repair; 9 repair tests and 7 Payload/legacy tests passed with schema push disabled. After rehearsal,
the same reviewed SQL repaired the development Neon EU database. All 71 data fingerprints stayed
unchanged; 11 rescue foreign keys and 32 non-primary indexes were verified. Production was not touched.
There is no automatic destructive down migration: use the reviewed pre-repair backup/release.

The repository still has no established baseline Payload migration chain (M0-T02). These explicit
SQL upgrades do not replace that infrastructure. Production migration, publication and deployment
require their own rollout.

Tests cover API authorization, malformed input, stale revisions, draft visibility, audit history,
re-review after editing, concurrent/idempotent application, rollback after a forced second-write failure,
and migration of all four operational statuses plus localized/array/relationship data. The browser test
uses the actual admin view and verifies that applying a draft leaves the public REST response unchanged.
