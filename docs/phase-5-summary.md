# Phase 5: Reproducible setup, extension guide, and submission handoff

Status: implemented and prepared for pull-request review. Phases 1–4 were
verified merged on 2026-10-13.

## Simple explanation: what is the benefit?

Imagine giving someone a model you built. It needs instructions that work on their
table, not just yours. This phase checks those instructions with a fresh set of
parts and explains how to add a new piece.

We installed the app into an empty temporary folder, ran its tests, and built it
without borrowing the working folder's dependencies or local settings. We then
followed the new-provider tutorial in that temporary copy and used it in a browser.

The result is a clearer handoff: someone can start the app, change source choices,
add a provider, and understand what the app does and what remains out of scope.
No new production feature or built-in provider was added in this phase.

## What changed in existing files?

| File | Before | After / benefit |
| --- | --- | --- |
| `README.md` | Setup assumed an existing checkout and used a general dependency install. Extension instructions were embedded in the long README. | Adds cloning, `npm ci`, verified Node/npm versions, test/build/preview commands, environment-versus-runtime settings, and links to focused handoff guides. Clarifies that source identity is stored but actual values are not resolved. |
| `AGENTS.md` | Claimed Git history was unavailable and suggested `npm install`. | Reflects the existing starter/phase history and lockfile-based installation. |
| `docs/implementation-plan.md` | Prior phase statuses still said pending review. | Marks verified merged phases and links to the local Phase 5 handoff. Historical phase documents remain records of their original handoffs. |
| `src/prefill/configuration.integration.test.tsx` | Demonstrated a future provider alone. | Also verifies that registration alone does not enable it and that it works in a configured combination with built-ins, with draft-before-confirm semantics. |

New files:

- `docs/provider-extension.md`: copyable implementation, import/registration,
  activation, identity rules, test steps, and synchronous-provider limits.
- `docs/submission-guide.md`: demonstration steps, requirement/evidence map,
  improvement rationale, known limitations, and pre-submission checklist.
- `src/api/client.configuration.test.ts`: default and overridden API URL tests.
- `src/prefill/configuration.deployment.test.ts`: shipped JSON, root/nested/relative
  deployment bases, and changed settings on subsequent loads.
- This phase explanation.

## Comprehensive testing and final validation

The new tests target handoff promises rather than documentation wording:

| Coverage added | Tests |
| --- | ---: |
| Default API URL without `.env`; documented VITE overrides | 2 |
| Actual shipped JSON resolves built-ins; three base paths; fresh configuration reads | 5 |
| Future provider combined with built-ins; registered-but-disabled provider | 2 |

The existing traversal, UI, lifecycle, failure, and official-fixture suites remain
in place. Total: **151 passing tests across 15 files**, up from 142 in Phase 4.

### Clean installation

On 2026-10-13, an isolated copy was created with project source and tests, without
`.env`, `node_modules`, build output, or Git metadata. It included the local Phase 5
test changes; it was not a clone of an already-published Phase 5 commit.

Environment: Node.js `22.22.2`, npm `10.9.7`.

| Command/check | Result |
| --- | --- |
| `npm ci --cache <temporary-cache> --no-audit --no-fund` | Installed 180 packages from the lockfile |
| `npm run test:run` | 151 passed across 15 files |
| `npm run typecheck` | Passed |
| `npm run build` | Passed |
| Workspace test/build run | Also passed |
| `git diff --check` | Passed |

No dependency versions, package manifest, or lockfile were changed. This was a
reproducibility check, not a dependency-security audit.

### Browser verification

The fresh production build was served locally and checked in headless Chrome
against the existing mock server on port 3000. Real HTTP/CORS, create/cancel/
replace/clear, shared-definition isolation, and configuration-only reloads passed.
There were no uncaught page errors. Empty-response and network-failure cases were
separately simulated through browser interception; the live server was untouched.

This reran the Phase 4 acceptance procedure on clean-install output. Its screenshots
are unchanged in the repository because Phase 5 does not change the UI. See the
[Phase 4 evidence](phase-4-summary.md) and [Phase 3 responsive screenshots](phase-3-summary.md).

### Tutorial verification

In the disposable copy only:

1. Copied the exact provider implementation from `provider-extension.md`.
2. Added its import and registry entry.
3. Enabled `global`, `tenant_settings`, and `direct_dependencies` in that order.
4. Passed typechecking and a production build.
5. Verified those groups appeared in order in Chrome against the real mock API.
6. Confirmed `Tenant Settings.locale` for Form D.email, then cleared it.

The modal, editor, resolver, and mapping store did not need edits. The example
provider was not added to the actual application's registry or shipped config.
Temporary browser/static-server processes were stopped. The working checkout and
existing mock server were left intact.

### Repository verification

The repository is public and its page returned HTTP 200 without credentials:
https://github.com/veljkoraden/journey-builder-claude

PRs 1–4 are merged. Phase 5 is submitted separately for review and is not yet
merged into main. No hosted deployment or submission message is included.
Local verification does not imply GitHub Actions passed; no CI result is claimed.

## Remaining risks and deferrals

- Review and merge the Phase 5 PR before claiming main contains this handoff.
  Final submission is a separate user action.
- Other Node versions, browsers, real devices, and screen readers were not certified.
- Mapping state is in memory; reload clears it. No submitted-value engine or persistence.
- Provider data is synchronous; remote asynchronous sources need a deliberate contract change.
- Full runtime API schema/DAG validation, source/target compatibility, retry controls,
  and the optional form enable switch remain deferred.
- Browser acceptance is an ad hoc local check, not a committed browser test/CI suite.
- The task receipt date is unknown, so no submission-deadline claim is made.

## Next step

All five planned implementation phases are complete and prepared for review.
After approval/merge of the Phase 5 PR, follow the
[submission checklist](submission-guide.md) and share the public repository link.
There is no additional implementation phase planned unless review finds a gap.

Suggested commit: `docs: explain prefill configuration and extension`.
