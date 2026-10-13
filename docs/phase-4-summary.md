# Phase 4: Application acceptance and official mock data

Status: implemented and prepared for pull-request review. See the
[implementation plan](implementation-plan.md).

## Simple explanation: why this phase matters

Imagine checking a toy car. Earlier tests checked its wheels and steering.
This phase checks that the whole car can travel along a road, and what happens
when the road is missing.

For our app, that means loading the real challenge data, choosing forms, saving
and changing mappings, and making sure one form's changes do not affect another.
We also check what the user sees if loading fails or there are no forms.

There are three benefits:

- **More confidence in the complete flow.** Tests use the full official example,
  including fields and shared form definitions missing from the smaller fixture.
- **Clearer messages.** An empty blueprint now says it has no forms. A missing
  definition has its own message. Invalid JSON produces a readable error.
- **Protection from old responses.** If an old request finishes after a newer
  request, it cannot replace the newer graph after its cleanup has run.

## What changed in existing files?

| File | Before | After and reason |
| --- | --- | --- |
| `src/App.tsx` | Listed every node; an empty graph or missing definition could leave the generic selection hint. | Lists form nodes only, shows an empty-blueprint message, identifies a missing form definition, and marks graph-loading errors as alerts. |
| `src/api/client.ts` | JSON parsing failures surfaced raw parser errors. | Wraps invalid JSON in a readable blueprint error and retains the original cause. HTTP/network handling stays intact. |
| `src/api/useBlueprintGraph.ts` | Ignored aborted failures but could accept a stale success. | Checks the abort signal before storing success too. Tests reproduce React StrictMode's setup/cleanup sequence. |
| `README.md` | Documented Phase 3 and earlier testing. | Adds official-fixture coverage, current graph-state behavior, and the limits of JSON checking. |
| `docs/implementation-plan.md` | Phase 4 was planned. | Records local implementation and distinguishes real HTTP acceptance from simulated failures. |

These are targeted fixes supporting acceptance tests. The provider contract,
configuration resolver, picker, and mapping store were not redesigned.

## New files

- `src/App.acceptance.test.tsx`: 13 application-level tests using the official
  fixture and controlled loading/error variants.
- `src/api/client.test.ts`: 7 tests covering the configured request, abort signal,
  official response preservation, HTTP statuses, network failures, and invalid JSON.
- `src/api/useBlueprintGraph.test.tsx`: 3 tests covering loading/ready/error,
  stale StrictMode successes and failures, and unmount cancellation.
- `src/test/fixtures/officialGraph.json`: unchanged official challenge data.
- `src/test/fixtures/README.md`: source commit, checksum, and refresh instructions.
- This explanation and three screenshots in `docs/screenshots/`.

The existing small fixture remains useful for focused unit tests. The new fixture
is pinned to commit `fdfbb9c78eb8ac518f952be183a3718098005265` in the
[official mock repository](https://github.com/mosaic-avantos/frontendchallengeserver).
Tests do not access the network. They clone the fixture before creating scenarios,
so one test cannot change another test's graph.

## Acceptance coverage

| Requirement | Evidence |
| --- | --- |
| Fetch and list forms | Full official response, alphabetically sorted A–F, non-form filtering, and real HTTP browser check |
| Direct/transitive eligibility | Existing traversal/provider tests plus official D/F picker checks, excluding unrelated sources and deduplicating shared A |
| Create, cancel, replace, clear | Existing Phase 3 tests plus official-fixture flow and real-server browser flow |
| Isolation | D and E share a form definition; both receive mappings, then D is replaced/cleared while E retains its own mapping. Another D field remains intact. |
| Global data | Root Form A receives a global mapping; remount resets session-only mappings |
| Source combinations and extension | Existing Phase 2 tests continue to cover all eight combinations and a test-only provider selected/stored with unchanged UI/store code |
| Loading/failure | Delayed graph with already-loaded config, HTTP/network/JSON failures, stale responses, and abort cleanup |
| Empty/missing data | Empty graph, non-form-only graph, missing definition with recovery by choosing another form, and button-only target schema |
| Full schema | Official `multi_select` and button source fields appear; absent `completed_at` is not invented |

Tests from earlier phases are retained rather than duplicated for every already
covered requirement. The new suite concentrates on official data and gaps at the
application and API boundaries.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm run test:run` | 142 tests passed across 13 files; Phase 3 had 119 |
| `npm run build` | TypeScript checking and Vite production build passed |
| `git diff --check` | Passed |
| Official fixture checksum | SHA-256 `bef74daa5b072ccbbe408eb3b79f5377168c84c661d662a6f9812bb68dd1d19c` |
| Running server response | Byte-for-byte checksum match with the pinned fixture |
| Chrome against running mock server | Mapping flow, node isolation, and configuration-only changes passed; no uncaught page errors |

### Browser evidence and its boundaries

A local mock server was already listening on port 3000. Starting an additional
server failed because the port was occupied. The existing listener was inspected
read-only, and its graph response was compared with the official fixture. It was
not stopped or modified.

Headless Chrome loaded a temporary copy of the production build on another local
port and requested the graph from:

```text
http://localhost:3000/api/v1/1/actions/blueprints/bp_01jk766tckfwx84xjcxazggzyc/graph
```

The normal mapping checks used actual network requests, with HTTP 200 responses
and browser CORS working. They created mappings on D and E, cancelled a draft,
replaced D's mapping, cleared it, and verified E's mapping remained.

The temporary deployed JSON configuration was changed to global-only and then
no enabled sources. Reloading applied both settings without rebuilding the app.
Repository configuration and build output were not modified by this check.

Empty graph and server-unavailable screens were then simulated using browser
request interception. These prove UI behavior, not an actual outage or empty
response from the running server. The fixture files were not changed in the repo.
Temporary browser/static-server processes and the copied build were cleaned up.

Screenshots:

- [Mapping through the running server](screenshots/phase-4-live-mapping.png)
- [Empty blueprint, simulated response](screenshots/phase-4-empty-blueprint.png)
- [Server unavailable, simulated failure](screenshots/phase-4-server-unavailable.png)

## Remaining risks and deferrals

- JSON syntax is checked, but full runtime schema validation is not implemented.
  Valid JSON with an incorrect object structure can still cause rendering errors.
- The graph is assumed to satisfy the declared API types. Complete DAG validation
  and source/target type compatibility remain outside the challenge scope here.
- Chrome checks were automated on desktop; other browsers, real devices, and
  screen-reader acceptance remain unverified. Earlier narrow-screen evidence is
  recorded in the Phase 3 summary.
- There is no retry button; reload is the current recovery path.
- Mappings remain session-only; persistence and real submitted-value population
  are not implemented. The optional form enable switch remains deferred.
- The browser check was an ad hoc local acceptance run, not a new CI browser suite.

## Next phase

Phase 5 prepares the handoff: verify setup from a clean install, finish the
provider-extension tutorial and demonstration checklist, summarize improvements
and trade-offs, run final tests/build, and check the public repository after the
reviewed changes are published. Merging remains a separate review step.

Suggested commit: `test: cover prefill workflows and provider extensibility`.
