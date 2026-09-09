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
row IDs are excluded from semantic comparison. A stale review form returns `proposal_changed`.

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

For an **existing pre-M2-T13 database**, stop writes, take a backup, review and run
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

The repository has no established baseline Payload migration chain (M0-T02); this is an explicit SQL
upgrade for the existing schema, not a replacement for that infrastructure. No production migration,
publication or deployment is performed by the PR.

Tests cover API authorization, malformed input, stale revisions, draft visibility, audit history,
re-review after editing, concurrent/idempotent application, rollback after a forced second-write failure,
and migration of all four operational statuses plus localized/array/relationship data. The browser test
uses the actual admin view and verifies that applying a draft leaves the public REST response unchanged.
