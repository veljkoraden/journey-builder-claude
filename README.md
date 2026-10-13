# Journey Builder — Prefill Configuration

A small React + TypeScript app for the Avantos take-home. It fetches a form DAG
from the `action-blueprint-graph-get` endpoint, lists the forms, and lets you
view and edit the **prefill mapping** for each form's fields. Prefill sources
are pluggable: you can add, remove, or reorder them without touching consumer
code.

## Implementation roadmap

See [the phased implementation plan](docs/implementation-plan.md) for planned
improvements, acceptance criteria, and suggested commit messages. The current
application is the starter baseline; the plan describes work still to implement.

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
  button to clear it, or
- **empty** — clicking it opens the **prefill modal**.

The modal aggregates options from every registered data source:

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
    providers/
      upstreamFormFields.ts  source #1 & #2 (direct + transitive form fields)
      globalData.ts          source #3 (global properties)
      index.ts               THE REGISTRY — the single extension point
  components/              Presentational React components
    FormList.tsx           list of forms
    PrefillEditor.tsx      a form's fields + their mappings
    PrefillField.tsx       one field row (set / empty)
    PrefillModal.tsx       source picker, aggregates all providers
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

All active providers live in one array:

```ts
// src/prefill/providers/index.ts
export const prefillProviders: PrefillProvider[] = [
  upstreamFormFieldsProvider, // direct + transitive form fields
  globalDataProvider,         // global properties
];
```

This is what makes "any combination of these data sources can be used without
code changes" true: the modal iterates the array, so adding/removing/reordering
sources is an edit to this one list.

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
   compute options dynamically — that is exactly how the upstream-form provider
   walks the DAG.

2. **Register it** by appending to the array in
   `src/prefill/providers/index.ts`:

   ```ts
   export const prefillProviders: PrefillProvider[] = [
     upstreamFormFieldsProvider,
     globalDataProvider,
     tenantSettingsProvider, // <-- new source appears in the modal automatically
   ];
   ```

No components, hooks, or types need to change. The new source shows up in the
modal, is selectable, and its selection is stored and rendered like any other.

---

## Testing

```bash
npm run test:run
```

Tests cover each layer independently:

- `graph/traversal.test.ts` — direct vs transitive dependency resolution, BFS
  ordering, and de-duplication of a shared root (Form A reached via two paths).
- `prefill/providers.test.ts` — the upstream provider emits one group per
  ancestor with correct `direct`/`transitive` badges and option keys; the
  registry aggregates groups from every provider.
- `prefill/usePrefillMappings.test.ts` — set/clear semantics and node isolation.
- `components/PrefillModal.test.tsx` — the modal renders options from all
  providers and emits a correctly composed `PrefillSource` on selection.

---

## Notes & trade-offs

- **State is in memory.** `usePrefillMappings` is intentionally simple; its API
  would not change if backed by a persisted store or server.
- **`button` fields are excluded** from configurable fields (they are actions,
  not data). The filter lives in one place (`fieldUtils.ts`).
- **Styling is minimal and hand-written** — the brief states the UI "doesn't
  need to be pretty," and the emphasis is on readable, ownable code rather than
  a design system.
