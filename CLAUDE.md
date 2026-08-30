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

**Before every commit: run `pnpm check`.** Keep coverage 90%+ on the logic
modules in `src/lib/` and `src/services/` (checked with `pnpm vitest run
--coverage`). UI files (`content`/`popup`/`options`/`components`) are largely
untested by design, so whole-repo coverage is much lower — do not read the "All
files" number as the gate. Any new/changed `lib`/`services` module ships with a
`tests/<module>.test.ts`.

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

## Backward compatibility — DO NOT break existing users on update

Users carry state across updates. Every install already has a stored `settings`
object (one key in `chrome.storage.sync`) plus custom actions, AI actions, and
search engines they configured. Breaking any of the following silently corrupts
or resets live user data on the next auto-update. Treat these as hard rules.

- **Settings load = one-way `deepMerge(DEFAULT_SETTINGS, stored)` + schema bump**
  (`lib/settings.ts:68`). It only *backfills* missing object/scalar fields and
  *overlays* stored values. It does **not** reshape, rename, coerce, or validate
  types. There is no per-version migration framework.
- **Any schema change bumps `SCHEMA_VERSION`** (`lib/defaults.ts:59`). Adding a
  new field to `Settings` (`lib/types.ts`) with a default is safe — deepMerge
  backfills it. Nothing else is automatic.
- **Never rename or remove a field's type.** Changing a scalar to an object (or
  vice-versa) passes the stored old-typed value through unvalidated and new code
  reads the wrong type. If you must reshape a field, add an explicit migration
  step in `getSettings` keyed on the stored `schema` — deepMerge won't do it.
- **New defaults inside an ARRAY do not reach existing users automatically.**
  deepMerge replaces arrays wholesale with the stored value. Only
  `search.engines` has append logic (`ENGINE_SINCE` gating, `settings.ts:73-79`,
  `defaults.ts:54-57`) so a new default engine reaches old installs without
  resurrecting one the user deleted. `aiActions` and `customActions` have **no**
  such append — a new entry added to `DEFAULT_AI_ACTIONS` will never appear for
  existing users. Add a matching `since`-append when you ship new array defaults.
- **Never rename a builtin key or the `ai:`/`custom:`/`__more__` action-token
  prefixes.** The context-menu ↔ content routing contract is the stringly-typed
  action token (`store.ts`, `service-worker.ts`, `lib/actions.ts`), outside the
  type system — a rename breaks routing with zero compiler help. `actionTokens`
  (`lib/actions.ts`) self-heals order (drops stale tokens, appends new ones
  before `__more__`), so add builtins there, don't reorder the token grammar.
- **`chrome.storage.sync` is ~8KB/item.** All settings share one key. Options
  surfaces `QUOTA_BYTES_PER_ITEM` rejections; other writers (`content/store.ts`,
  `popup/Popup.tsx`) do not — don't add large fields to the synced blob.
- **Manifest changes gate updates.** Adding a `permissions` entry or narrowing
  `host_permissions` in `manifest.config.ts` can disable the extension pending
  user re-consent or drop granted hosts. Prefer optional permissions requested
  at runtime (`lib/ai-permissions.ts`) over widening manifest perms.
- **Legacy MV2 migration (`migrateLegacy`, `settings.ts:36-63`) runs once, only
  when no `settings` key exists.** Leave it in place.

## Gotchas

- MV3 background is a module service worker — no persistent state, no DOM.
- crxjs HMR needs the fixed port 5173 (`strictPort`).
- `unsafe-eval` is allowed *only* in the sandbox page; run untrusted custom JS there, never in content/background.
- Playwright e2e (`tests/e2e/`) is excluded from the tsconfig typecheck and needs a build first.
