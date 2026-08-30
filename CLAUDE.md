# CLAUDE.md

Guidance for working in this repo.

## Project

**Select to Action** (`selection-to-popup`) — a Manifest V3 Chrome extension
that runs quick actions on selected text: Search, Copy, Translate, Dictionary,
Currency, and user-defined custom actions. Requires Chrome 116+.

Stack: Vite 8 (rolldown) + `@crxjs/vite-plugin`, Preact 10, TypeScript 5.7
(strict), Tailwind 4, Vitest 2 for unit, Playwright for e2e.

## Commands

Package manager: **pnpm**.

| Command | Use |
| --- | --- |
| `pnpm dev` | Vite dev server, HMR on port 5173. Load `dist/` unpacked in Chrome. |
| `pnpm build` | `tsc --noEmit && vite build` → bundles to `dist/`. |
| `pnpm typecheck` | Type-check only. |
| `pnpm lint` | ESLint. |
| `pnpm format` | Prettier write over `src`. |
| `pnpm test` | Unit tests (`vitest run`). |
| `pnpm vitest run --coverage` | Unit tests with coverage report. |
| `pnpm test:e2e` | Build then Playwright e2e. |
| `pnpm check` | Pre-commit gate: format + lint + test + build. |
| `pnpm zip` | Build + zip `dist/` for store upload. |

**Before every commit: run `pnpm check` and ensure coverage stays 90%+.**

## Layout (`src/`)

- `background/service-worker.ts` — MV3 service worker (context menus, `Alt+S` command).
- `content/` — content script + in-page Preact UI: `content-script.ts` (entry), `selection.ts`, `anchor.ts`, `store.ts` (state), `Tooltip.tsx`, `Result.tsx`, `Handle.tsx`/`Handles.tsx`, `run-js.ts` (custom-JS runner).
- `popup/` — toolbar popup. `options/` — options page.
- `components/` — shared Preact components; `components/ui/` — primitives (Button, Input, Select, Switch, ...).
- `lib/` — shared logic: `types.ts` (central `Settings` model), `settings.ts`, `defaults.ts`, `useSettings.ts`, `messages.ts` (typed messaging), `actions.ts`, `builtins.ts`, `langs.ts`, `theme.ts`, `appearance.ts`, helpers (`cn.ts`, `arr.ts`).
- `services/` — external API clients: `translate.ts`, `dictionary.ts`, `currency.ts`.
- `sandbox/` — CSP-isolated page that executes user custom-JS actions.
- `styles/`, `assets/icons/`.

Manifest is code, not JSON: `manifest.config.ts` (MV3, `defineManifest`).
Permissions: `storage`, `contextMenus`, `sidePanel`, `declarativeNetRequest`. Host
perms cover the translate / currency / dictionary APIs plus the AI assistant hosts
(ChatGPT, Claude, Gemini, Grok) needed for the sidebar / in-page iframe modes.

## Rules

- **90%+ test coverage before commit.** New or changed logic ships with tests. Unit tests live in `tests/**/*.test.ts` (node env), named `<module>.test.ts` mirroring `src/lib` / `src/services` / `src/content`. Check with `pnpm vitest run --coverage`.
- **One component/export per file.** PascalCase `.tsx` for Preact components, camelCase `.ts` for logic modules. Keep files small.
- **Modular.** Logic goes in `lib/` and `services/`; UI (`content`/`popup`/`options`/`components`) stays thin and consumes shared modules. External calls only in `services/`.
- **DRY.** Reuse existing `lib` helpers and `types.ts` before writing new code — no duplicated action, lang, or settings logic. Use `cn()` for class composition.
- **Preact, not React.** Import from `preact`; `react`/`react-dom` are aliased to `preact/compat`. TS is strict — no shortcuts around it.
- **Style is Prettier-authoritative:** no semicolons, single quotes, 100 cols, trailing commas. Keep ESLint clean.

## Gotchas

- MV3 background is a module service worker — no persistent state, no DOM.
- crxjs HMR needs the fixed port 5173 (`strictPort`).
- `unsafe-eval` is allowed *only* in the sandbox page; run untrusted custom JS there, never in content/background.
- Playwright e2e (`tests/e2e/`) is excluded from the tsconfig typecheck and needs a build first.
