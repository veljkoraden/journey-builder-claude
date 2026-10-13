# Journey Builder — Prefill Configuration

A small React + TypeScript app for the Avantos take-home. It fetches a form DAG
from the `action-blueprint-graph-get` endpoint, lists the forms, and lets you
view and edit the **prefill mapping** for each form's fields. Prefill sources
are pluggable: enable, disable, or reorder existing sources through runtime JSON
configuration. New implementations are added through the provider registry.

## Implementation roadmap

See [the phased implementation plan](docs/implementation-plan.md) for planned
improvements, acceptance criteria, and suggested commit messages. Phase 1 separates
source eligibility and dependency providers. Phase 2 adds runtime configuration;
see [the Phase 2 explanation](docs/phase-2-summary.md). Phase 3 adds confirmed
selection and keyboard interaction; see [the Phase 3 explanation](docs/phase-3-summary.md).
Phase 4 adds official-fixture acceptance tests and a real mock-server browser
check; see [the Phase 4 explanation](docs/phase-4-summary.md). Final handoff remains
Phase 5.

---

## Running locally

### 1. Start the mock server

Clone and run the challenge server in a separate terminal:

```bash
git clone https://github.com/mosaic-avantos/frontendchallengeserver
cd frontendchallengeserver
npm install
npm start            # serves the blueprint graph on http://localhost:3000
```

### 2. Start this app

```bash
npm install
cp .env.example .env  # optional — defaults already point at localhost:3000
npm run dev           # http://localhost:5173
```

The endpoint URL is built from environment variables (see `.env.example`).
The mock server returns the same `graph.json` regardless of the path params,
but `VITE_TENANT_ID` / `VITE_BLUEPRINT_ID` are kept configurable so the same
client works against a real backend.

### Scripts

| Command            | Description                          |
| ------------------ | ------------------------------------ |
| `npm run dev`      | Start the dev server                 |
| `npm run build`    | Type-check and build for production  |
| `npm run preview`  | Preview the production build         |
| `npm run typecheck`| Type-check only                      |
| `npm test`         | Run tests in watch mode              |
| `npm run test:run` | Run tests once (CI)                  |

---

## How it works

Clicking a form opens its **prefill editor**, which lists the form's data
fields. Each field is either:

- **configured** — shows the mapped source (e.g. `Form A.email`) with an `×`
  button to clear it (click the mapping to choose a replacement), or
- **empty** — clicking it opens the **prefill modal**.

The modal starts with collapsed source groups. Expand a group, or search by
field/group name to reveal matches. Clicking a field creates a temporary choice;
**Select** applies it. **Cancel**, Close, Escape, or a backdrop click discards the
choice. Reopening starts with an empty draft and search, even for a mapped field.
The saved mapping remains until a replacement is confirmed or explicitly cleared.

Search can hide a draft's group without deleting the draft: the selected-source
summary stays visible so confirmation is explicit. Groups are automatically open
while searching, and their disclosure controls are disabled during search.
Keyboard focus starts in labeled search, stays within the modal, and returns to
the originating row on dismissal. Clearing returns focus to the unmapped row.

The modal aggregates options from every enabled data source:

1. Fields of forms that the selected form **directly depends on** (e.g. Form B for Form D).
2. Fields of forms it **transitively depends on** (e.g. Form A for Form D).
3. **Global data** (Action Properties, Client Organization Properties — mocked).

Direct and transitive dependencies are both produced by walking the DAG; the
modal tags each upstream form with a `direct` / `transitive` badge.

---

## Architecture

The code is organised by responsibility, with the data layer, the graph logic,
the prefill domain, and the UI kept separate.

```
src/
  api/                     Talking to the mock server
    types.ts               Response types for the blueprint graph
    client.ts              fetchActionBlueprintGraph() + URL building
    useBlueprintGraph.ts   loading / error / ready state hook
  graph/                   DAG logic (no React, no UI)
    traversal.ts           getDirectDependencyIds, getAncestorIds (BFS, cycle-safe)
    formLookup.ts          resolve a node -> its form definition
  prefill/                 The prefill domain
    types.ts               PrefillProvider / PrefillOption(Group) / PrefillSource
    fieldUtils.ts          which fields of a form are configurable
    usePrefillMappings.ts  in-memory store: node -> field -> source
    configuration.ts      runtime JSON loading, validation, provider resolution
    usePrefillProviders.ts loading / error / ready state for configuration
    providers/
      upstreamFormFields.ts  source #1 & #2 (direct + transitive form fields)
      globalData.ts          source #3 (global properties)
      index.ts               THE REGISTRY — the single extension point
  components/              Presentational React components
    FormList.tsx           list of forms
    PrefillEditor.tsx      a form's fields + their mappings
    PrefillField.tsx       one field row (set / empty)
    PrefillModal.tsx       draft selection, confirmation, and modal focus
    PrefillSourceGroup.tsx expandable group of provider-neutral choices
  App.tsx                  wires data + state + UI together
  mocks/sampleGraph.ts     fixture used by tests
```

### Key design decision: pluggable data sources

Every prefill source implements one interface:

```ts
interface PrefillProvider {
  id: string;
  label: string;
  getOptionGroups(context: PrefillProviderContext): PrefillOptionGroup[];
}
```

A provider is handed a context (the graph, the target node, and a node→form
resolver) and returns groups of selectable options. The UI never knows what a
provider does internally — it just renders whatever groups come back. Selecting
an option stores a `PrefillSource` (`providerId` + opaque `optionKey` +
display label), which is enough to resolve the actual value later.

All available implementations live in one registry:

```ts
// src/prefill/providers/index.ts
export const availablePrefillProviders: readonly PrefillProvider[] = [
  directFormFieldsProvider,
  transitiveFormFieldsProvider,
  globalDataProvider,         // global properties
];
```

The registry defines what the app knows how to use. The external configuration
selects which providers are active and their display order. `App` loads it and
passes only the selected implementations to the generic picker.

### Change sources without changing application code

Edit `public/prefill-config.json` during development and reload the page:

```json
{
  "enabledSourceIds": ["direct_dependencies", "transitive_dependencies", "global"]
}
```

Use `["global"]` for global-only data, `["transitive_dependencies", "global"]`
for indirect dependencies plus global data, or `[]` to enable no sources. Array
order controls the order of source categories. IDs are exact and case-sensitive.
Duplicate IDs, unknown IDs, extra properties, and invalid JSON are errors; there
is no fallback that silently enables other sources.

Vite copies this public file to `dist/prefill-config.json`. After building, edit
that deployed file to change combinations without rebuilding JavaScript. Editing
`public/` alone does not update an existing `dist/` deployment; a subsequent build
copies `public/` again. The file is requested under Vite's configured base URL
with `cache: "no-store"`. Configure hosting/CDN rules to serve the actual JSON
file and avoid overriding the requested cache behavior.

Configuration is loaded at startup. Reload after edits; it is not watched during
a session. Reloading also resets in-memory mappings. The file is public and must
not contain secrets. This controls source availability, not authorization.

---

## Adding a new data source

Suppose you want to add a "Tenant settings" source.

1. **Implement a provider** in `src/prefill/providers/tenantSettings.ts`:

   ```ts
   import type { PrefillProvider } from "../types";

   export const tenantSettingsProvider: PrefillProvider = {
     id: "tenant_settings",
     label: "Tenant settings",
     getOptionGroups: () => [
       {
         id: "tenant",
         label: "Tenant Settings",
         options: [
           { key: "tenant:locale", label: "locale" },
           { key: "tenant:timezone", label: "timezone" },
         ],
       },
     ],
   };
   ```

   A provider may use the `context` (graph / target node / form resolver) to
   compute options dynamically — that is exactly how the dependency providers
   walk the DAG.

2. **Register it** by appending to the array in
   `src/prefill/providers/index.ts`:

   ```ts
   export const availablePrefillProviders: readonly PrefillProvider[] = [
     directFormFieldsProvider,
     transitiveFormFieldsProvider,
     globalDataProvider,
     tenantSettingsProvider,
   ];
   ```

3. **Enable it** by adding `"tenant_settings"` to `enabledSourceIds` in
   `public/prefill-config.json`.

A new implementation requires a build/deployment. After it is registered,
activation and ordering require only configuration edits. No picker, resolver,
hook, or mapping-store changes are needed. The extension integration test shows
a test-only provider being selected and saved through the existing components.

---

## Testing

```bash
npm run test:run
```

Tests cover individual layers, runtime configuration, and application workflows:

- `App.acceptance.test.tsx` — the pinned official graph, sorted form discovery,
  loading/network/HTTP/JSON errors, empty and missing data, shared-definition
  mapping isolation, global root mapping, and session reset.
- `api/client.test.ts` and `api/useBlueprintGraph.test.tsx` — request behavior,
  error messages, abort cleanup, and stale StrictMode response protection.
- `test/fixtures/officialGraph.json` — unchanged official fixture with commit and
  checksum provenance in [the fixture notes](src/test/fixtures/README.md).

- `prefill/configuration.test.ts` — all eight subsets, order, invalid settings,
  registry identity, HTTP/network errors, and malformed JSON.
- `prefill/usePrefillProviders.test.tsx` — StrictMode cleanup, stale responses,
  cancellation, and unexpected failures.
- `App.test.tsx` — all eight subsets in the picker, loading/error/empty states,
  changed configuration on remount, order, and selection.
- `prefill/configuration.integration.test.tsx` — new provider selection and
  storage without changing UI or mapping code.

- `graph/traversal.test.ts` — direct vs transitive dependency resolution, BFS
  ordering, and de-duplication of a shared root (Form A reached via two paths).
- `prefill/providers.test.ts` — the dependency providers emit one group per
  ancestor with correct `direct`/`transitive` badges and option keys; the
  registry aggregates groups from every provider.
- `prefill/usePrefillMappings.test.ts` — set/clear semantics and node isolation.
- `components/PrefillModal.test.tsx` — the modal renders options from all
  providers and emits a correctly composed `PrefillSource` on selection.

---

## Notes & trade-offs

- **Graph loading:** request failures are shown as alerts. Invalid JSON gets a
  readable error. Empty blueprints and missing form definitions have explicit
  messages; only form nodes are listed. Full runtime schema validation is not
  implemented: syntactically valid but incorrectly shaped JSON is still a risk.

- **State is in memory.** `usePrefillMappings` is intentionally simple; its API
  would not change if backed by a persisted store or server.
- **Field eligibility is explicit.** `getTargetFields` excludes button widgets
  from editable targets. `getSourceFields` includes all schema-provided fields,
  including buttons shown in the reference picker. No absent fields are invented.
- **Dependency policy:** node `prerequisites` are authoritative. Direct sources
  take precedence over indirect paths; shared ancestors are deduplicated.
  Missing node/form references, non-form sources, and empty groups are skipped.
  Traversal can pass through non-form nodes and nodes with missing form definitions.
  Cyclic input terminates without offering the target itself; this is defensive
  traversal, not complete DAG validation.
- **Source identity:** dependency providers now use `direct_dependencies` and
  `transitive_dependencies`; option keys remain `nodeId:fieldName`. Labels do not
  determine identity. There is no persisted mapping migration: state is session-only.
- **Styling is minimal and hand-written** — the brief states the UI "doesn't
  need to be pretty," and the emphasis is on readable, ownable code rather than
  a design system.
