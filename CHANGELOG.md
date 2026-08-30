# Changelog

All notable changes to **Select to Action** are documented here. This project
follows [Semantic Versioning](https://semver.org) and the
[Keep a Changelog](https://keepachangelog.com) format.

## [2.1.0] - 2026-08-31

### Added

- **AI assistant actions** — send the selection to ChatGPT, Claude, Gemini, or
  Grok. Open the answer in a new tab, a popup window, the browser side panel, or
  an in-page iframe. Configurable presets and prompt templates, with AI host
  permissions requested at runtime (never widened in the manifest).
- **Side panel** — view results and AI answers in Chrome's native side panel
  without leaving the page.
- **Draggable selection handles** — fine-tune the highlighted range with
  on-screen handles; live preview of handle appearance in Options.
- **Configurable search engines** — add and pick from multiple search engines,
  not just one.
- **Custom action icons and open modes** — give custom actions their own icons
  and choose how each one opens (inline, tab, popup, side panel).
- **Onboarding tour** — a guided first-run walkthrough in the Options page.
- **Popup overflow menu** with a unified action order shared across the
  on-selection popup, context menu, and toolbar popup.
- **"Open in Google Translate"** link in the translation result panel.
- **Selection count** builtin and clearer builtin labels.

### Changed

- Reworked the on-selection popup, appearance settings, and result/preview
  frame for a cleaner, macOS-native look with light/dark/system theming.
- Popup now anchors at the cursor and coalesces repositioning while you adjust
  the selection.
- Options page rebuilt with drag-to-reorder actions and a section table of
  contents.

### Fixed

- Currency conversion now picks the amount nearest the currency indicator when
  several numbers are selected.
- Restored full-row click-to-toggle on action triggers in the popup.

### Notes

- Backward compatible: existing settings, custom actions, and search engines are
  preserved on update. No permission re-consent is required — AI hosts are
  optional and requested only when you enable a framed AI mode.

## [2.0.0]

- Full rewrite on Manifest V3 with Vite, Preact, TypeScript, and Tailwind CSS.
- Core quick actions: Search, Copy, Translate, Dictionary, Currency, and custom
  actions (URL templates and sandboxed JS).
- Automatic migration of v1.x settings on first run.

[2.1.0]: https://github.com/Arif-un/Chrome-Extention--Selection-to-Pop-up/releases/tag/v2.1.0
[2.0.0]: https://github.com/Arif-un/Chrome-Extention--Selection-to-Pop-up/releases/tag/v2.0.0
