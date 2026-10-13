# Repository Guidelines

## Project Structure & Module Organization

This React + TypeScript app displays a form dependency graph and configures prefill mappings. `src/App.tsx` connects data, state, and UI. Keep responsibilities separated:

- `src/api/`: API types, fetch client, and graph-loading hook.
- `src/graph/`: framework-independent traversal and form lookup.
- `src/prefill/`: mapping state, field utilities, and data-source providers.
- `src/components/`: React UI components.
- `src/mocks/sampleGraph.ts`: shared test fixture; `src/test/setup.ts`: test setup.
- `src/index.css`: shared styling; `index.html` and `src/main.tsx`: application entry points.

Tests live beside their related modules. Production output goes to `dist/`.

## Build, Test, and Development Commands

Run `npm install` to install dependencies. Start the separate `frontendchallengeserver` on port 3000 following `README.md`.

- `npm run dev`: start Vite, normally at `http://localhost:5173`.
- `npm run typecheck`: check TypeScript without emitting JavaScript.
- `npm run build`: type-check and produce a production build.
- `npm run preview`: serve the production build locally.
- `npm test`: run Vitest in watch mode.
- `npm run test:run`: run the full test suite once.

## Coding Style & Naming Conventions

Match existing code: two-space indentation, double quotes, semicolons, and trailing commas in multiline structures. Use strict TypeScript and `import type` for type-only imports. Avoid unused variables and parameters.

Use PascalCase for component files and types (`PrefillModal.tsx`), camelCase for utilities, and `use` prefixes for hooks (`usePrefillMappings.ts`). No formatter or linter is configured; follow surrounding code.

## Testing Guidelines

Use Vitest with jsdom, React Testing Library, user-event, and jest-dom. Name tests `*.test.ts` or `*.test.tsx`. Cover observable behavior: dependency ordering, provider options, mapping isolation, and user interactions. Reuse the sample graph where appropriate. No coverage threshold is configured. Run `npm run test:run` and `npm run build` before submitting changes.

## Commit & Pull Request Guidelines

Git history is unavailable in this checkout. Recommended practice: use short, imperative commit subjects describing one focused change. PRs should explain behavior changes, link relevant issues, report validation commands and results, and include screenshots for UI changes.

## Architecture & Configuration

Add prefill sources by implementing `PrefillProvider` and registering them in `src/prefill/providers/index.ts`. Keep provider-specific logic outside UI components. Mappings currently live in memory.

Copy `.env.example` to `.env` for local overrides. Never place secrets in `VITE_*` variables: they are exposed to the browser.
