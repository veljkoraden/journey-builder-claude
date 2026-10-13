# Prefill implementation plan

## Goal and scope

Improve the supplied Claude-generated starter in small, reviewable commits.
Fetch the mock blueprint, list its forms, and let users view, create, replace,
and clear field prefill mappings. Make direct dependencies, transitive
dependencies, and global data independently configurable, while keeping the
React UI independent of provider implementations.

The challenge requires mapping configuration, not actual form submission or
runtime value population. A graph canvas, server persistence, and pixel-perfect
styling are outside the required scope. Keep mappings in memory and document
that refreshing resets them. Do not hard-code Form D or its three pictured fields.

## Baseline

The starter already separates API loading, graph traversal, providers, mapping
state, and components. It has 15 tests. Its current gaps include a combined
direct/transitive provider, a code-only activation registry, immediate modal
commits, and a shared source/target field filter that hides the button source
shown in the reference. Existing tests do not exercise the complete app flow.

Record the imported application as a baseline commit before implementation.
Each phase below should include its relevant tests and a clear commit message.

## Phase 1: Define source eligibility

Status: implemented, pending pull-request review. Validation: 42 tests across six
files and the production build pass. Runtime configuration and modal confirmation
remain deferred to subsequent phases. No browser/mock-server acceptance is claimed.

Suggested commit: `refactor: separate direct and transitive prefill sources`

- Share traversal and field conversion utilities across independent direct and
  transitive providers. Transitive groups exclude immediate prerequisites.
- Exclude the selected node and deduplicate ancestors reached by multiple paths.
- Separate target-field eligibility from source-field enumeration. Expose
  schema-provided source fields, including button fields shown in the reference;
  document target exclusions. Do not fabricate fields missing from the schema.
- Preserve stable source node/field identity independently of display labels.

Acceptance: Form D offers B as direct and A as transitive, with no C, D, E, or
downstream sources. Tests cover roots, shared ancestors, missing references,
self references/cycles, and field eligibility.

## Phase 2: Configure provider activation

Suggested commit: `feat: configure enabled prefill data sources`

- Keep a registry of available provider implementations, separate from activation.
- Load a small runtime JSON file listing enabled source IDs in display order.
  For example: `{"enabledSourceIds":["direct_dependencies","transitive_dependencies","global"]}`.
- Resolve that configuration once at the application boundary and inject active
  providers into the generic picker. Avoid provider-specific UI branches.
- Validate configuration; show useful errors for unknown IDs and an explicit
  empty state for an empty list. Define duplicate-ID handling consistently.
- Keep global data mocked. Adding new behavior requires one provider and its
  registration; combining existing providers requires configuration only.

Acceptance: all eight subsets of the three categories work. Editing the external
configuration and reloading changes sources without editing TypeScript or
rebuilding. A test-only provider works without component or mapping-store edits.
The runtime file is loaded at startup; live configuration editing is not required.

## Phase 3: Complete mapping interactions

Suggested commit: `feat: confirm and manage prefill selections`

- Retain the form list and selected-form context. Show the Prefill heading,
  unmapped field rows, and compact mapped rows with a clear control.
- Add expandable source groups, search, visible temporary selection, Cancel,
  and Select. Select is disabled until a valid option is chosen.
- Keep selection local to the modal until confirmation. Cancel, Escape, and
  dismissal leave saved mappings unchanged. Reopening starts a fresh draft.
- Keep mappings keyed by node ID and target field. Clearing affects only that
  field. Allow replacing a configured source through the picker.
- Add labeled controls, focus containment/restoration, and responsive styling.

Acceptance: selecting Form D, choosing Form A.email, and confirming displays
`email: Form A.email`. Cancel does not save; X clears the mapping; keyboard
interaction works. Compare the browser presentation with the supplied references.

The screenshot's form-level enable switch is optional: the brief does not define
its behavior. If implemented later, preserve mappings while disabled and store
enabled state per node. Do not prioritize it over the required mapping flow.

## Phase 4: Prove the complete workflow

Suggested commit: `test: cover prefill workflows and provider extensibility`

- Add application-level tests around the fetched graph and user interactions.
- Assert exact source IDs rather than accepting either Form A or B.
- Cover create, replace, cancel, clear, navigation away/back, and isolation for
  nodes sharing a form definition.
- Cover global-only, no enabled sources, search with no matches, and a new test
  provider. Exercise loading, request failure, and empty graph behavior.
- Retain focused unit fixtures and add representative official mock-data coverage.

Acceptance: tests demonstrate observable behavior at the app boundary; the full
suite and production build pass. Manual browser validation against the mock
server is recorded separately from automated test evidence.

## Phase 5: Document and prepare the submission

Suggested commit: `docs: explain prefill configuration and extension`

- Update README setup steps, runtime configuration examples, and provider tutorial.
- Explain source eligibility, mapping identity, state lifetime, and trade-offs.
- Record each improvement and why it matters relative to the starter.
- Run `npm run test:run` and `npm run build`; demonstrate the app against the
  mock server. Capture screenshots for UI changes.
- Verify the public GitHub repository is accessible and provide its URL.

Acceptance: another developer can run the app, change source combinations, and
add a provider from the documentation. The interview demo maps D.email from
A.email, switches to global-only configuration without code edits, and explains
the provider extension point.

## Delivery discipline

Use one focused commit per phase, splitting further when that improves review.
Keep tests with the behavior they verify; phase 4 adds broader integration proof.
Do not commit local environment files, dependencies, build output, or credentials.
API validation/retry improvements can follow if time permits; avoid a rewrite.
