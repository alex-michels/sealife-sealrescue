# Live Researcher sources (M2-T07 / M2-T11)

The manually invoked worker uses an acyclic LangGraph workflow: select approved Sources →
Tavily search → fetch current pages → extract snapshots → model proposal → contextual validation
→ the M2-T09 authenticated writer. Every run is limited to three selected sources, five search hits
and one model call. Search results rank **existing exact URLs**; they never approve new destinations.

## Source approval

An editor/admin registers a canonical HTTPS URL in Sources and sets `trustLevel >= 0.8` after
reviewing its authority. Prefer the centre's own website, then its official social accounts,
government bodies and recognised NGOs. A high numeric score permits fetching; it does not prove
facts or assign a verified badge. Agents can submit candidate sources, but creation forces trust
to zero and a hook prevents agents/translators from changing URL, type or trust. Newly discovered
sites require human approval before the worker may fetch them. Duplicate approved URLs are rejected.

## Network and parsing boundary

Only HTTPS on the default port is accepted; URL credentials and fragments are rejected. Every DNS
answer must be public unicast; private, loopback, link-local, mapped-private and reserved addresses
are blocked. The connection is pinned to the checked IP while retaining the original TLS SNI/Host.
Redirects are rejected: an editor must approve the final canonical URL. Requests use a 15-second
timeout, a 2 MB body limit, accepted HTML/plain-text types and no compressed bodies.

Playwright parses downloaded HTML in Chromium with its OS sandbox enabled, JavaScript disabled,
service workers blocked and all browser network requests aborted. Scripts, styles, frames, objects
and templates are removed before text extraction. Empty or >100,000-character snapshots are rejected.
There is no fallback to `--no-sandbox`; the worker host must support Chromium's sandbox.

The worker assigns source ID, URL and check time, and hashes exact extracted UTF-8 text with SHA-256.
The model receives those snapshots as untrusted data and has no browser, CMS key or write tools.
Quotes must match the snapshots verbatim; output must target the operator-selected centre. A failed
fetch aborts the run before model invocation. Semantic fact checking/confidence calibration remains
M2-T08; date/hash/quote matching cannot prove a claim's meaning or source authority.

## Running

Install Chromium on the separate worker host (`npx playwright install --with-deps chromium`),
configure the M2-T09 CMS key plus `TAVILY_API_KEY`, `OPENAI_API_KEY` and an explicit
`RESEARCHER_MODEL`, and prepare an operator-owned job file:

```json
{"query":"Check the centre contact page", "targetId":101, "sourceIds":[1]}
```

IDs above are examples; use actual CMS IDs. `targetId: null` researches a new centre. No arbitrary
public-user input or staff data belongs in this file. Then run:

```sh
npx tsx scripts/researcher-run.mts job.json
```

The Responses call uses `store: false`, JSON-object output, no tools and a 6,000-token output cap;
the model is chosen in worker configuration. Provider calls time out after 60 seconds, responses are
limited to 1 MB and redirects/retries are disabled. Configure provider-side spend limits before use.
Cron, automatic retries and dollar-budget scheduling are M2-T10. External LangSmith/LangChain tracing
is refused so raw research state is not exported to a telemetry service.

Only public source material and selected centre fields go to search/model providers. Snapshots are
stored with proposals for staff review, not in audit logs. Do not put public-user submissions or
internal account information into research jobs. No paid provider call is needed by the test suite;
tests stub providers and exercise the real graph and Chromium parser.

API references checked 2026-09-10: [LangGraph](https://docs.langchain.com/oss/javascript/langgraph/graph-api),
[Tavily Search](https://docs.tavily.com/documentation/api-reference/endpoint/search),
[Playwright launch](https://playwright.dev/docs/api/class-browsertype),
[OpenAI text generation](https://developers.openai.com/api/docs/guides/text).
