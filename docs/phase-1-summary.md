# Phase 1: Source eligibility and dependency providers

Status: implemented and prepared for pull-request review. See the
[implementation plan](implementation-plan.md) for the remaining phases.

## A simple explanation

Imagine each form is a worksheet with empty boxes, such as an email box.
A prefill mapping is a note that says: **"For this box, use the answer from
that other worksheet."** Our app lets you choose that note. It does not yet
copy real submitted answers into the boxes.

Think of this chain:

```text
Form A → Form B → Form D
```

For Form D, Form B is one step back. We call it a **direct** source.
Form A is farther back, through B. We call it a **transitive** source.
There is also **global** data: shared information, such as an organization name.

### 1. What are the benefits?

- **We can choose the groups separately.** Before, the one-step-back and
  farther-back sources came in one package. Now they are separate, like two
  boxes of building blocks. The picker can use either box or both. Choosing
  the boxes still requires a small code edit today; Phase 2 will let us choose
  them through a settings file.
- **The source list avoids some bad choices.** A form cannot offer itself as
  an earlier source. Missing forms are skipped. If two paths reach the same
  earlier form, it appears once. The old code already removed repeated
  ancestors; we kept that behavior and added checks for more tricky cases.
- **The two field lists have different jobs.** The list of places we can take
  information from is separate from the list of boxes we can configure.
  Button fields can now appear in the source picker, matching the reference
  picture, while buttons stay out of the target rows we edit.
- **Future changes are easier to maintain.** Both source groups share the
  instructions for turning fields into choices. We can fix those instructions
  in one place. The picker already understood the common provider interface,
  so it did not need new drawing code for the two groups.
- **We have more checks to catch mistakes.** Tests are little automatic checks:
  "Did Form D get Form B and Form A?", "Did we accidentally include Form D?",
  and "Did clicking Form A.email really choose that exact field?" The full
  suite now has 42 passing tests, compared with 15 before this phase.

The identity rule was already useful, and we kept it: a field has an internal
name tag made from its form node ID and field key. Changing the visible name
does not change that tag. New tests check this, including two forms made from
the same template.

### 2. What changed in the old files?

The table below lists files that existed before Phase 1. A **provider** is a
small helper that prepares a group of source choices. The **registry** is the
list of helpers the app uses.

| Existing file | Before | After | Why it helps |
| --- | --- | --- | --- |
| `src/graph/traversal.ts` | Found immediate dependencies and earlier forms. A loop could put the selected form in its own results; missing IDs could also appear. | Filters missing IDs and self references, removes repeated direct dependencies, and adds a helper for farther-back dependencies only. Keeps the nearest-first order. | Gives providers clearer, separate lists of earlier forms. |
| `src/prefill/providers/upstreamFormFields.ts` | One helper offered both direct and transitive form sources. | Two helpers offer the groups independently and share the code that creates field choices. They skip non-form sources, missing definitions, and empty groups. | Lets us choose either source group without rewriting the picker. |
| `src/prefill/providers/index.ts` | Listed the combined form helper and the global helper. | Lists direct, transitive, and global helpers separately. | Gives each group its own place in the list. External settings come in Phase 2. |
| `src/prefill/fieldUtils.ts` | One function made both lists and removed buttons from both. | `getSourceFields` includes all fields supplied by the schema; `getTargetFields` excludes button widgets. | Stops a rule for editable targets from hiding choices in the source picker. |
| `src/App.tsx` | Used the shared field function to find the field being edited. | Uses `getTargetFields`. | Keeps the selected field tied to the editable target list. |
| `src/components/PrefillEditor.tsx` | Used the shared field function to build its rows. | Uses `getTargetFields`. | Keeps button widgets out of the rows being configured, even though they can now be sources. |
| `src/graph/traversal.test.ts` | Had four checks for the sample dependency graph. | Has 14 checks covering normal paths, roots, missing nodes, repeats, cycles, and other edge cases. | Catches mistakes in how we find earlier forms. |
| `src/prefill/providers.test.ts` | Checked the combined helper and expected button sources to be hidden. | Checks separate groups, button sources, stable identities, missing data, and shared form templates. | Proves that each helper offers the intended choices. |
| `src/components/PrefillModal.test.tsx` | The selection check accepted either Form A.email or Form B.email. | Checks the exact Form A.email choice and tests each dependency provider alone, including button sources. | A wrong selection can no longer pass just because it came from either form. |
| `README.md` | Described a combined provider and a shared button filter; overstated configuration without code changes. | Explains the separate helpers, field rules, IDs, and the Phase 2 configuration work still needed. | Helps the next developer understand what works now and what is still planned. |
| `docs/implementation-plan.md` | Described Phase 1 as planned work. | Records it as implemented locally, awaiting review, with validation results. | Makes progress and remaining work easy to see. |

We also added two new test files: `fieldUtils.test.ts` checks the two field
lists, and `PrefillEditor.test.tsx` checks editable rows and field selection.
This summary is a new documentation file. The picker implementation and mapping
store did not need changes for Phase 1; confirming a choice with Select/Cancel
is still planned for a later phase.

## Purpose

Phase 1 makes direct and transitive form sources independently composable and
clarifies which fields can be sources versus editable targets. It preserves the
starter's separation between graph logic, providers, mapping state, and React UI.

This prepares the application for configurable source activation in Phase 2.
It does not yet deliver source combinations without application code changes:
the active providers are still listed in a TypeScript registry.

## Changes and rationale

### Independent dependency providers

The combined upstream provider was replaced by `directFormFieldsProvider` and
`transitiveFormFieldsProvider`. Both use the same factory for converting upstream
form fields into picker options, avoiding duplicated provider logic.

| Provider ID | Eligible sources for Form D |
| --- | --- |
| `direct_dependencies` | Form B |
| `transitive_dependencies` | Form A |
| `global` | Existing mocked global properties |

The registry now contains all three providers. The picker continues to consume
the existing `PrefillProvider` interface without provider-specific rendering.
Tests demonstrate that either dependency provider works alone in the picker.

### Explicit traversal rules

Node `prerequisites` remain the authoritative dependency relationship. Traversal:

- Returns existing direct prerequisites in their declared order.
- Returns all ancestors in breadth-first order, nearest first.
- Defines transitive sources as ancestors excluding immediate prerequisites.
- Gives direct membership precedence when a node is reachable by both routes.
- Deduplicates shared ancestors and repeated prerequisites.
- Excludes the selected node, including self references and cycles through it.
- Skips dangling node references and terminates on upstream cycles.

Providers omit non-form nodes, missing form definitions, and empty source groups.
Traversal can still reach earlier ancestors through a non-form node or a node
whose form definition is missing. These are defensive behaviors, not full graph
validation; malformed cycles are not reported as errors.

### Separate source and target field policies

The former `getConfigurableFields` helper filtered both source options and target
rows. That hid button sources even though the challenge's picker shows them.

- `getSourceFields` exposes every field present in the form schema, including
  button fields. It does not invent fields absent from the response.
- `getTargetFields` excludes button widgets from editable target rows, preserving
  the starter's target policy because buttons represent actions.
- `App` and `PrefillEditor` now use the target-specific helper.

Unknown widget types remain eligible. Field titles fall back to schema keys when
absent. Source eligibility does not imply source/target type compatibility;
compatibility filtering is outside this phase.

### Stable source identity

Option keys remain `nodeId:fieldName`. Renaming a form or changing a field's
display title does not change its option key. Nodes sharing a form definition
still produce distinct options because their node IDs differ.

Dependency provider IDs changed from `form_field` to the two category IDs above.
There is no persisted mapping migration: mappings currently live only in memory.
This phase does not change mapping storage or introduce persistence.

## Files changed

| Area | Files | Responsibility |
| --- | --- | --- |
| Traversal | `src/graph/traversal.ts` | Direct, ancestor, and transitive eligibility |
| Providers | `src/prefill/providers/upstreamFormFields.ts`, `src/prefill/providers/index.ts` | Shared factory, independent providers, registration |
| Field policy | `src/prefill/fieldUtils.ts` | Separate source enumeration and target filtering |
| Consumers | `src/App.tsx`, `src/components/PrefillEditor.tsx` | Use target-specific eligibility |
| Updated tests | `src/graph/traversal.test.ts`, `src/prefill/providers.test.ts`, `src/components/PrefillModal.test.tsx` | Traversal, provider behavior, exact selections |
| New tests | `src/prefill/fieldUtils.test.ts`, `src/components/PrefillEditor.test.tsx` | Field policy and target-row behavior |
| Documentation | `README.md`, `docs/implementation-plan.md`, `docs/phase-1-summary.md` | Current behavior, phase status, and rationale |

## Validation evidence

The implementation validation run completed successfully:

| Check | Result |
| --- | --- |
| `npm run test:run` | 42 tests passed across 6 files; starter baseline was 15 tests |
| `npm run build` | TypeScript checking and Vite production build passed |
| `git diff --check` | Passed |

Test coverage by file:

| Test file | Tests | Behaviors covered |
| --- | ---: | --- |
| `traversal.test.ts` | 14 | All fixture nodes, roots, unknown nodes, ordering, overlapping paths, duplicates, dangling references, cycles, empty graphs, input immutability |
| `providers.test.ts` | 14 | Exact eligible groups, source fields, shared form definitions, renamed labels, missing definitions, non-form nodes, empty groups, cycles, category separation, global data |
| `fieldUtils.test.ts` | 6 | Button source/target distinction, field order, title fallback, unknown widgets, empty schemas, no fabricated fields, fresh results |
| `PrefillModal.test.tsx` | 4 | Combined groups, exact Form A.email mapping, independent direct/transitive button selection |
| `PrefillEditor.test.tsx` | 1 | Button targets excluded and target selection uses the schema key |
| `usePrefillMappings.test.ts` | 3 | Existing initial state, set/clear behavior, and node isolation |

These results are from the Phase 1 implementation run. Adding this summary is a
documentation-only change; it does not represent a new test run. Manual browser
validation against the running mock server has not been performed for this phase.

## Remaining work

- Phase 2: external runtime configuration for provider activation and validation
  of all eight source combinations, including no enabled sources.
- Phase 3: temporary modal selection, Select/Cancel confirmation, and keyboard
  accessibility improvements. The current picker still applies choices immediately.
- Phase 4: complete application workflow tests and broader integration evidence.
- Phase 5: final setup/extension documentation and a browser demonstration.

API response validation, complete DAG validation, persistence, actual submitted
value population, and type compatibility enforcement are not implemented here.

Suggested commit after review: `refactor: separate direct and transitive prefill sources`.
