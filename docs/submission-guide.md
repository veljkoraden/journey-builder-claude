# Submission and interview demonstration

Repository: https://github.com/veljkoraden/journey-builder-claude

The challenge asks for a GitHub repository link. This file prepares that handoff;
it does not send the submission or claim a hosted deployment. The receipt date
was not provided, so the four-business-day deadline is not calculated here.

## What to demonstrate

Run the server and app using [README](../README.md). The default configuration
must enable direct dependencies, transitive dependencies, and global data.

1. Select **Form D**, then **Email**. Explain that B is a direct prerequisite
   and A is an indirect prerequisite; unrelated C/E and D itself are not sources.
2. Search `email`, choose **Form A → email**, and point out that it is only a draft.
   Press **Select**. The field now reads `Email: Form A.email`.
3. Reopen it, choose **Form B → email**, and press **Cancel**. A's mapping remains.
4. Repeat and press Select to replace it. Switch to Form E and back to show isolation.
5. Press X to clear D's email mapping. Other mappings remain unchanged.
6. Edit `public/prefill-config.json` to `{"enabledSourceIds":["global"]}` and reload.
   Only global groups remain. Explain that reload also clears session mappings.
7. Explain the provider tutorial: implement, register, enable. No source-specific
   branch belongs in the modal or store. Registration requires code; activation
   of already registered sources requires configuration only.
8. Restore the original configuration after the demo. Show the test results and
   discuss limitations honestly.

For a production-build demonstration, edit the served `dist/prefill-config.json`
instead. Changing the source `public/` file does not update an already-built copy.

## Explain the improvements over the starter

| Phase | Improvement | Why it matters |
| --- | --- | --- |
| 1 | Separate direct/transitive providers and source/target field policies | Independent composition and correct source eligibility |
| 2 | Runtime activation/order configuration with validation | Source combinations change without application-code edits |
| 3 | Draft + Select/Cancel, groups, keyboard/focus handling | Users can inspect choices without accidentally saving them |
| 4 | Official-fixture acceptance, loading/empty/error handling, stale-response fix | Complete workflows and recovery states have evidence |
| 5 | Clean-install verification, extension/deployment tests, final documentation | Another developer can reproduce and extend the solution |

The supplied Claude-generated starter remains identifiable in Git history. AI
assistance was used for implementation and testing. Be ready to explain the
provider contract, traversal, draft state, mapping identity, and each trade-off.

## Requirement and evidence map

| Requirement | Where to inspect |
| --- | --- |
| Fetch graph and list forms | `src/api/`, `App.tsx`, API and acceptance tests |
| View/edit/clear mappings | Editor, field, modal, mapping hook, application tests |
| Direct/transitive sources | Graph utilities and upstream providers with tests |
| Global data | `providers/globalData.ts` |
| Any combination | Runtime JSON + resolver; all eight subsets tested |
| Future sources | Provider tutorial and extension integration tests |
| Readable organization | API, graph, prefill domain, and components are separate |
| Setup/documentation | README, fixture provenance, phase summaries |

## Checks before sharing the link

- Run `npm ci`, `npm run test:run`, `npm run typecheck`, and `npm run build`.
- Run the demonstration against the mock server; check keyboard interaction.
- Ensure `public/prefill-config.json` is restored to the intended submission default.
- Review and publish the final documentation/tests through a PR; do not assume
  uncommitted local changes are visible to the reviewer.
- Confirm the public repository's main branch contains the approved work and opens
  without repository-owner credentials.
- Share the repository URL through the requested submission channel yourself.

## Evidence and limits

See [Phase 5](phase-5-summary.md) for the clean-install and final verification
record. Phase 3 includes desktop/mobile-width Chrome screenshots; Phase 4 records
real mock-server HTTP/CORS checks, with empty/error simulations labeled separately.
Automated local tests and browser checks are not remote CI, deployment, or
screen-reader certification.

Known limits: in-memory mappings; synchronous providers; no full API schema or
DAG validation; no type compatibility enforcement; no submitted-value engine;
no retry button; no form-level enable switch. Other browsers, real devices, and
screen readers need separate acceptance. Keep these limits visible in discussion.
