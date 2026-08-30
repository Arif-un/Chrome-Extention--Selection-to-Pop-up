---
name: release
description: Cut a Select to Action release — bump version, update CHANGELOG/README, run checks, push master, tag, watch CI, publish to the Chrome Web Store, and create the GitHub release. Use when the user says "release", "cut a release", "ship a version", "publish to the store", or "/release".
---

# Release Select to Action

End-to-end release flow for this Manifest V3 Chrome extension. The store publish
is automated from CI on a `v*` tag; some steps are dashboard-only and MUST be
done by the maintainer (see **Manual steps** at the bottom).

Package manager is **pnpm**. CI is `.github/workflows/ci.yml` (pnpm, publishes on
`v*` tags). Version lives only in `package.json`; `manifest.config.ts` reads it.

## Inputs to confirm first

Ask the user (or infer) before editing:

1. **Version number.** Default to semver: additive/backward-compatible features =
   minor bump (e.g. 2.0.0 -> 2.1.0). Only major-bump for a breaking schema change
   (see CLAUDE.md "Backward compatibility"). Must be higher than the live store
   version.
2. **Tag now, or files only?** If unsure, edit files and let the user review before
   the tag push triggers a live publish.

## Steps

### 1. Gather what changed
```bash
git tag --sort=-creatordate | head -1          # last release tag
git log <last-tag>..HEAD --oneline             # commits since
```
Group commits into user-facing Added / Changed / Fixed for the changelog. Ignore
pure chore/refactor noise.

### 2. Bump the version
Edit `package.json` `"version"` only (manifest inherits via `pkg.version`).
Also update `package.json` `"description"` if the short store blurb changed
(<=132 chars — this is the Web Store short description, pushed on publish).

### 3. Update CHANGELOG.md
Add a `## [x.y.z] - YYYY-MM-DD` section (Keep a Changelog format). Add a link
reference at the bottom. Curate to headline user-facing changes, not every commit.

### 4. Update README.md
- Refresh the Features list for any new capability.
- Fix/point image links to real files in `screenshots/` (broken links have bitten
  us — verify each `<img src>` exists).
- Update the SEO keyword footer if new features add search terms.

### 5. Verify locally (required — CI runs the same)
```bash
pnpm check    # format + lint + test + build. Must pass or CI fails.
```

### 6. Commit + push master
```bash
git add -A
git commit -m "release vX.Y.Z: <one-line summary>"
git push origin master
```
Wait for the master CI run to go green (validates build; publish only runs on tags):
```bash
RUN=$(gh run list --branch master --limit 1 --json databaseId -q '.[0].databaseId')
gh run watch "$RUN" --exit-status
```

### 7. Tag -> triggers auto-publish
```bash
git tag vX.Y.Z && git push origin vX.Y.Z
```
If you need to move an existing tag (e.g. after a fix commit):
```bash
git tag -d vX.Y.Z && git push origin :refs/tags/vX.Y.Z
git tag vX.Y.Z && git push origin vX.Y.Z
```

### 8. Watch the tag run through the publish step
```bash
RUN=$(gh run list --limit 10 --json databaseId,event,headBranch \
  -q '[.[] | select(.event=="push" and .headBranch=="vX.Y.Z")][0].databaseId')
gh run watch "$RUN" --exit-status
```
If **Publish to Chrome Web Store** fails with `Bad Request ... privacy
information ... Privacy practices tab`, that is the dashboard gate (Manual step
A). After the user fills it, re-run only the failed step:
```bash
gh run rerun "$RUN" --failed
gh run watch "$RUN" --exit-status
```

### 9. Create the GitHub release
```bash
sed -n '/## \[X.Y.Z\]/,/## \[/p' CHANGELOG.md | sed '$d' > /tmp/rel.md
gh release create vX.Y.Z --title "vX.Y.Z" --notes-file /tmp/rel.md
```

## Known gotchas (hit these before)

- **Publish gate:** auto-publish 400s until the Web Store **Privacy practices**
  tab is filled. CI cannot set it. This blocks the *publish* step only — the zip
  still uploads as a draft.
- **Lockfile:** repo is pnpm-only. Do NOT reintroduce `package-lock.json` — CI
  uses `pnpm install --frozen-lockfile`. If deps changed, run `pnpm install` and
  commit the updated `pnpm-lock.yaml`.
- **Manifest permissions:** adding a `permissions` entry or narrowing
  `host_permissions` can soft-disable the extension on auto-update pending
  re-consent. Prefer optional/runtime permissions (see CLAUDE.md).
- **Schema:** any `Settings` shape change needs a `SCHEMA_VERSION` bump and
  possibly an append-since for new array defaults (CLAUDE.md backward-compat).

## Manual steps (maintainer only — not automatable)

Do these at https://chrome.google.com/webstore/devconsole -> your item:

- **A. Privacy practices tab** — fill mandatory disclosures (data usage,
  single-purpose description, permission justifications). **Publish fails until
  this is saved.** Reusable permission justifications: see below.
- **B. Privacy tab** — set the privacy policy URL (repo has `PRIVACY.md`).
- **C. Store listing** — paste the long description, upload screenshots and the
  promo banner (`screenshots/banner.png`). These are dashboard-only; CI cannot
  set them. They don't block review but polish the listing.
- **D. First-time secrets only** (already set): `CWS_EXTENSION_ID`,
  `CWS_CLIENT_ID`, `CWS_CLIENT_SECRET`, `CWS_REFRESH_TOKEN`. If publish fails
  with `invalid_grant`/401, re-mint the refresh token — see `RELEASING.md`.

### Permission justifications (paste into Privacy practices tab)

- **storage** — Saves the user's settings (default action, languages, currency
  pair, search engines, custom actions, theme) and syncs them across the user's
  signed-in browsers. No browsing data collected.
- **contextMenus** — Adds the extension's actions to the right-click menu on
  selected text, an alternate trigger to the on-selection popup.
- **sidePanel** — Lets the user open results (translation, dictionary, currency,
  AI) in Chrome's side panel so answers stay visible beside the page. Used only
  when the user picks "side panel" as an action's open mode.
- **declarativeNetRequestWithHostAccess** — Strips frame-blocking response
  headers (X-Frame-Options / CSP frame-ancestors) so the user-selected AI
  assistant can load in the extension's frame/side panel. Applies only to AI
  hosts the user granted at runtime; modifies response headers only, collects no
  data.
- **host permissions** (translate/currency/dictionary) — Sends selected text to
  the chosen service's API to return a translation, definition, or converted
  amount. Text goes only to the service for the action the user picked.
- **optional host permissions** (AI hosts) — Requested at runtime only when the
  user enables an AI action, to send the selection to their chosen assistant
  (ChatGPT, Claude, Gemini, Grok).
