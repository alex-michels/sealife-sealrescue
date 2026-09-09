# Researcher runner (M2-T09)

`runResearcher()` in `src/agents/researcherWriter.ts` is the executable boundary between
research and the CMS queue. It authenticates a **role=agent** account through REST, creates
an `agent-runs` record, validates the result with `prepareResearcherProposal()`, and creates
only a `pending` proposal linked to that run. Cited snapshots are retained in proposal evidence
for human review; audit logs contain only event codes and record IDs. `null` records a successful
abstention with zero proposals. Neither this runner nor its client applies or publishes content.

## Manual operation

An administrator creates a dedicated internal Users account with role `agent` and enables its
API key in Payload. Keep the key in the worker's environment, never in arguments or committed
files. Rotate it by replacing the key in the account and worker environment; disable the account's
API key to revoke access. Staff account email is internal authentication data, not public-user input.

Set `AGENT_CMS_URL` to the CMS origin and `RESEARCHER_API_KEY` to that account's key. HTTPS is
required except for loopback development. Redirects are rejected, so credentials stay on the
configured origin. Requests time out after 30 seconds.

For an operator-controlled result and separately obtained trusted snapshots:

```sh
npx tsx scripts/researcher-write.mts output.json snapshots.json
```

`snapshots.json` is an array of `{sourceId,url,checkedAt,text}` from the trusted fetcher, **never
from the model**. The checked-in contract example uses fictitious IDs and is only a test fixture;
do not submit it to a real CMS. The callback API allows the live fetcher/model pipeline to run
inside the same audited operation. That integration is M2-T07.

## Failure and retry semantics

A rejected output creates no proposal and records a failed run. A network error after a POST
may mean the server committed before the response was lost. There are **no automatic POST retries**.
Check the run and proposals linked by `agentRun` before rerunning. If finishing the audit fails,
the runner reports the run ID for reconciliation; a recorded proposal ID is retained. This is a
manual, single-run worker, not the idempotent cron/budget scheduler planned in M2-T10.

The generic Payload REST queue retains its existing RBAC and required-sources checks; it does
not independently verify externally supplied snapshot text. The worker is the trusted validator
boundary. Keep model output separate from worker credentials, snapshots and transport configuration.

Unit tests cover validation, abstention, role restrictions, redaction, ambiguous network failures
and audit failures. The Playwright REST test authenticates with a real service key and verifies queue
writes, run linkage, and denied approval/deletion/centre writes plus forced content drafts.
