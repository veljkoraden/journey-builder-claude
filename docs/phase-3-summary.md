# Phase 3: Confirmed prefill selection and accessible interactions

Status: implemented and prepared for pull-request review. See the
[implementation plan](implementation-plan.md).

## A simple explanation

Think of choosing a source like writing a note in pencil. You can change your
mind before keeping it. Before this phase, clicking a source immediately saved
the note. Now clicking a source makes a draft, and **Select** saves it.

**Cancel**, the close button, Escape, or clicking outside the picker throws away
only the draft. An existing saved mapping stays where it was. Clicking **X** on
the saved mapping is the separate action that removes it.

The source groups act like little drawers. Open a drawer to see its fields.
Searching opens matching drawers for you. The selected-source summary tells you
exactly which field will be used, even if you search for something else afterward.

Keyboard users can navigate the picker without accidentally moving into the
page behind it. When it closes, focus returns to the field they were editing.

## Behavior delivered

1. Select a form and click an unmapped or mapped field.
2. The picker opens with labeled search focused, collapsed groups, and Select
   disabled. Saved mappings are not automatically copied into the draft.
3. Expand a group or search by source group/field name. Search ignores case and
   leading/trailing spaces; matching groups automatically expand while searching.
4. Click an option to select a draft. Its pressed state and the summary identify
   the choice. Choosing another option replaces only the draft.
5. Select commits the exact provider/option identity and closes the picker.
6. Cancel/dismiss leaves mappings unchanged. Reopening clears draft and search.
7. Clicking the clear control removes only that field's mapping and focuses the
   now-unmapped row. Other fields and form nodes retain their mappings.

Search does not erase a valid draft when its group is filtered out. A source
removed from the available options cannot be confirmed. This is a defensive
check; runtime configuration still loads only at startup.

## Changes to existing files

| File | Before | After / benefit |
| --- | --- | --- |
| `src/components/PrefillModal.tsx` | Option clicks immediately saved mappings; all groups were expanded. | Stores a draft, validates it against current options, and saves only on Select. Adds summary, Cancel, labeled search, Escape, focus containment/restoration, and body-scroll restoration. |
| `src/components/PrefillField.tsx` | Field and source appeared on separate lines; clearing could leave focus on a removed control. | Displays a compact `Email: Form A.email` row and returns focus to the field before clearing. |
| `src/components/PrefillEditor.tsx` | Displayed the form name and a small Prefill label. | Retains form context and adds a Prefill heading, explanatory subtitle, and empty-target message. |
| `src/App.tsx` | Mounted the modal without a target-specific key. | Keys the modal by node and field so another editing target starts a fresh draft and focus lifecycle. |
| `src/index.css` | Fixed two-column layout and no selected-option presentation. | Adds compact mapping rows, visible focus outlines, selected-option styling, footer controls, hidden collapsed lists, and narrow-screen layout. |
| `src/components/PrefillModal.test.tsx` | Asserted immediate selections. | Verifies draft confirmation, disclosures, cancellation, search, source identity, invalidated choices, and focus behavior. |
| `src/App.test.tsx` | Covered runtime configuration and immediate selection. | Updates confirmation expectations and adds creation, replacement, cancellation, navigation, clearing, isolation, and keyboard-only flows. |
| `src/prefill/configuration.integration.test.tsx` | Selected a future provider immediately. | Expands its group and confirms its choice through the same generic picker. |
| README and implementation plan | Described earlier behavior and planned Phase 3. | Document current interaction rules and local acceptance evidence. |

New files:

- `src/components/PrefillSourceGroup.tsx`: a reusable provider-neutral disclosure
  with unique control IDs, expanded state, and selectable field buttons.
- This explanation and three screenshots under `docs/screenshots/`.

The provider contract, runtime configuration format, traversal, and mapping store
remain unchanged. There are no new package dependencies. Provider IDs and opaque
option keys are preserved; the UI does not branch on source category.

## Keyboard and focus rules

- Focus starts in search; it has a persistent text label.
- Tab/Shift+Tab wrap within the dialog, skipping disabled and collapsed controls.
- Enter/Space activate disclosure and option buttons through native button behavior.
- Search opens matching groups and disables disclosure toggles until search clears.
- Escape dismisses without saving. An outside focus attempt is redirected into search.
- Closing restores focus to the original field when it still exists; clearing
  focuses that field rather than leaving focus on the removed clear button.
- Background scrolling is locked while the picker is open and restored on cleanup.

These checks improve keyboard behavior; they are not a complete screen-reader or
cross-browser accessibility certification.

## Validation evidence

| Check | Result |
| --- | --- |
| `npm run test:run` | 119 tests passed across 10 files; Phase 2 had 99 |
| `npm run build` | TypeScript checking and Vite production build passed |
| `git diff --check` | Passed |
| Headless Chrome, 1280 × 900 and 390 × 844 | Draft, confirm, cancel, replacement, clear, focus wrapping/restoration, and viewport checks passed; no page errors |

The modal suite now contains 18 tests. It covers initial state, independent
providers, exact selection, later draft choices, all four dismissal paths,
inside clicks, keyboard disclosure, case-insensitive search, hidden drafts,
removed providers, reused keys across providers, focus wrapping, focus restoration,
and scroll cleanup. The 22 application tests include the existing configuration
coverage and six added workflow cases, including a keyboard-only flow and node
isolation for shared form definitions.

The first test run used a matcher unsupported by the installed Vitest version.
Replacing it with separate call-count and argument assertions fixed the test;
the final complete suite and build passed.

Browser validation served the built app locally and intercepted its graph request
with the official mock graph fixture. It did not start the separate challenge
server. Temporary browser/server processes were stopped after the checks.

Screenshots:

- [Desktop picker with draft selection](screenshots/phase-3-picker-desktop.png)
- [Desktop mapped field](screenshots/phase-3-mapping-desktop.png)
- [Narrow-screen picker](screenshots/phase-3-picker-mobile.png)

The screenshots were reviewed against the supplied references for grouped source
selection, mapped rows, and Select/Cancel. Styling remains intentionally simple;
this is not a pixel-for-pixel recreation.

## Remaining risks and deferrals

- Real devices, other browsers, screen readers, and the separately running mock
  server still need acceptance checks. Small viewport testing is browser emulation.
- Mapping state remains in memory. Reload resets mappings and reads configuration.
- Full graph/API validation, persistence, value population, and type compatibility
  enforcement are outside this phase.
- The reference's form-level enable switch remains optional and deferred.
- Phase 3 is submitted for review; merging remains a separate step.

## Next phase

Phase 4 will close remaining application-level gaps: fetched-data loading/error/
empty behavior, broader official-fixture coverage, mapping isolation across all
relevant operations, and extension scenarios. Reuse the workflow tests added here
rather than duplicating them. Record real mock-server acceptance separately.

Suggested commit: `feat: confirm and manage prefill selections`.
