# Phase 2: Runtime source configuration

Status: implemented and prepared for pull-request review. See the [implementation plan](implementation-plan.md).

## Simple explanation: what is the benefit?

Imagine the app has three boxes of building blocks: direct form sources,
farther-back form sources, and shared global information. Phase 1 separated the
boxes. Phase 2 adds a list telling the app which boxes to open and in what order.

Before, changing that list meant editing TypeScript. Now it means editing a small
JSON settings file and reloading the page. The picker and mapping store keep doing
their usual jobs. A spelling mistake produces an error instead of quietly opening
boxes you did not choose. An empty list means no boxes are open.

Adding a completely new kind of box still requires writing and registering a
provider. Once that provider is built into the app, its activation needs only a
settings edit. This is configuration of available choices, not authorization or
actual copying of submitted form values.

## How to configure sources

During development, edit [public/prefill-config.json](../public/prefill-config.json):

```json
{
  "enabledSourceIds": [
    "direct_dependencies",
    "transitive_dependencies",
    "global"
  ]
}
```

| Desired choices | `enabledSourceIds` |
| --- | --- |
| Direct only | `["direct_dependencies"]` |
| Transitive only | `["transitive_dependencies"]` |
| Global only | `["global"]` |
| Direct and transitive | `["direct_dependencies", "transitive_dependencies"]` |
| Direct and global | `["direct_dependencies", "global"]` |
| Transitive and global | `["transitive_dependencies", "global"]` |
| All three | `["direct_dependencies", "transitive_dependencies", "global"]` |
| None | `[]` |

The array also controls display order. For example, put `global` first to show
its groups first. IDs must match exactly; duplicates, unknown IDs, unexpected
properties, and wrong value types are rejected. Duplicate implementation IDs in
the registry are also rejected rather than choosing one arbitrarily.

Vite copies the public file to `dist/prefill-config.json` on build. Edit the served
file after deployment to change combinations without rebuilding JavaScript.
Changing `public/` alone does not alter an already-built `dist/` deployment.
A subsequent build copies the public file again.

The app requests the file at startup, relative to Vite's base URL, with caching
disabled for the request. Hosting must serve that file as JSON and avoid cache
rules that override this behavior. Reload to apply changes; live editing within
an existing session is not supported. Reloading resets in-memory mappings.

## What changed in existing files?

| File | Before | After and benefit |
| --- | --- | --- |
| `src/prefill/providers/index.ts` | One array was both the catalog and the active list. | `availablePrefillProviders` is a read-only catalog. Configuration separately selects activation and order. |
| `src/App.tsx` | Passed every registered provider to the modal. | Loads settings at the application boundary and passes only resolved providers. Displays loading or configuration errors before allowing editing. |
| `src/components/PrefillModal.tsx` | All empty results used the same message. | Distinguishes no enabled sources, no eligible data for a form, and no search matches. Accepts a read-only provider list without category-specific logic. |
| Existing provider/modal tests | Imported the active registry array. | Import the renamed available catalog; existing eligibility and selection assertions remain. |
| `README.md` | Described activation as a future phase. | Explains configuration, deployment edits, validation, and the register-then-enable extension workflow. |
| `docs/implementation-plan.md` | Phase 2 was planned. | Records local implementation and verification with a link to this explanation. |

## New files and responsibilities

- `public/prefill-config.json`: deployment settings, with all three sources enabled
  by default; fetched rather than imported into the JavaScript bundle.
- `src/prefill/configuration.ts`: fetches JSON, validates unknown input, and resolves
  IDs against an injected registry. Preserves configuration order and existing
  provider objects. Invalid input does not fall back to the default providers.
- `src/prefill/usePrefillProviders.ts`: exposes loading/ready/error states; aborts
  on cleanup and ignores stale results, including React StrictMode's extra setup.
- `src/prefill/configuration.test.ts`: validation, resolution, and loading tests.
- `src/prefill/usePrefillProviders.test.tsx`: asynchronous lifecycle tests.
- `src/prefill/configuration.integration.test.tsx`: future provider integration and
  the distinction between disabled sources and enabled sources with no data.
- `src/App.test.tsx`: runtime settings exercised through the real app components
  with mocked HTTP responses.

No changes were needed to the mapping store or provider interface. A test-only
`tenant_settings` provider demonstrates configuration resolution, selection, and
storage of its opaque identity through the existing modal and store.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm run test:run` | 99 tests passed across 10 files; Phase 1 had 42 tests |
| `npm run build` | TypeScript checking and Vite production build passed |
| `git diff --check` | Passed |
| Built-file HTTP smoke check | Served a temporary copy of `dist`, changed its JSON to global-only, and fetched the new response without rebuilding; JavaScript bundle hashes stayed unchanged |

New test coverage:

- 36 configuration tests: all eight subsets, order, object identity, unchanged
  inputs, invalid shapes/types, unknown/duplicate IDs, duplicate registry IDs,
  extension, no-store request, cancellation signal forwarding, HTTP failures,
  invalid JSON/HTML fallback, and network errors.
- 16 application tests: all eight subsets in the picker, group order and mapping
  selection, delayed configuration loading, invalid settings, HTTP failure,
  changed settings on remount, and empty search results.
- 3 hook tests: stale success and failure during StrictMode cleanup, abort on
  unmount, and unexpected non-Error rejection handling.
- 2 extension tests: selecting/storing a new provider and an enabled provider with
  no eligible data.

The first build caught unsupported `exact` options in two test queries; removing
those options fixed the TypeScript errors. The final full test/build run passed.
The HTTP smoke check verified deployment-file behavior, not a real browser or
live mock-server session. Temporary server/files were cleaned up afterward.

## Remaining risks and next phase

Configuration errors currently stop application loading and require correction
plus reload; there is no retry button or configuration editor. The public file
must not contain secrets. Provider activation does not enforce permissions.
No live configuration refresh or migration of saved mappings is introduced.
Actual browser/mock-server acceptance and hosting/CDN cache behavior are unverified.

Phase 3 will add temporary selection, Select/Cancel confirmation, expandable
source groups, keyboard/focus behavior, and refined mapping rows. Broader app
workflow tests and final demonstration remain in Phases 4 and 5.

Suggested commit: `feat: configure enabled prefill data sources`.
