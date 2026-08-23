# Selection To PopUp

Select text on any page and act on it instantly: **Search, Copy, Translate, Define, Currency convert**, plus your own **custom actions**.

Trigger it three ways: on selection (popup), from the right-click **context menu**, or with a **keyboard shortcut** (default `Alt+S`, editable at `chrome://extensions/shortcuts`).

[Chrome Web Store](https://chrome.google.com/webstore/detail/selection-to-popup/ehiiodgjjgibclbmfbiflepipnlmbkkc)

## Stack (v2)

Manifest V3 · Vite 8 · Preact · TypeScript · Tailwind CSS v4. Built with [@crxjs/vite-plugin](https://crxjs.dev).

- **Background service worker** — context menus, hotkey, and network requests (translate / dictionary / currency).
- **Content script** — renders the selection popup as a Preact component inside a **Shadow DOM** (styles isolated from the host page).
- **Sandbox iframe** — runs user-defined JS custom actions with no page or extension access.
- **Popup + Options** — Preact + Tailwind.

APIs: unofficial Google Translate endpoint · [freedictionaryapi.com](https://freedictionaryapi.com) · [frankfurter.dev](https://frankfurter.dev) (currency).

## Develop

```bash
npm install
npm run dev        # HMR dev build in dist/
npm run build      # production build to dist/
npm run zip        # build + package selection-to-popup.zip for the Web Store
npm run typecheck  # tsc --noEmit
npm run lint       # eslint
npm test           # vitest
```

Load `dist/` via `chrome://extensions` → **Load unpacked** (enable Developer mode).

## Custom actions

- **URL** — a template with `%s` for the selection, e.g. `https://github.com/search?q=%s`.
- **JS** — a function body with `input = { text, url, title }` in scope; `return` a string (shown inline) or an `http(s)` URL (opened). Runs sandboxed.

## Upgrading from v1.x

Settings from v1 (`primaryTranslate`, `primaryCurrency`, `pop_win`) migrate automatically on first run. Currencies unsupported by frankfurter.dev (e.g. BDT) fall back to the default.
