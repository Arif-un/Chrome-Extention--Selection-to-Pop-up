# Releasing

Releases publish to the Chrome Web Store automatically from CI when you push a
`v*` tag. No credentials live in this repo. They are stored as GitHub Actions
secrets on the repository.

## Cut a release

1. Bump the version (must be higher than the live store version) in both:
   - `package.json`
   - `manifest.config.ts`
2. Commit and push to `master`.
3. Tag and push:
   ```bash
   git tag v2.0.1
   git push origin v2.0.1
   ```
4. CI (`.github/workflows/ci.yml`) runs typecheck, lint, test, build, zips
   `dist/`, then uploads and submits the item for review with `--auto-publish`.
5. Google reviews it. Live once approved (minutes to a few days). The
   `<all_urls>` content script triggers an in-depth review, so expect a delay.

Non-tag pushes and PRs only build and attach the zip as an artifact. They never
publish.

## What CI can and cannot change

Updated on publish (read from the package):
- name, version, description, icons, permissions, localized strings

Dashboard-only (the API cannot touch these, set them once at
https://chrome.google.com/webstore/devconsole):
- store description, screenshots, promo images, category, visibility, regions
- Privacy tab (privacy policy URL) and Privacy practices tab

A publish fails until the Privacy tab and Privacy practices tab are filled.

## Maintainer setup (one time, not needed for normal releases)

Only a maintainer with store ownership does this. Never commit these values.

Required repo secrets:

| Secret | What |
| --- | --- |
| `CWS_EXTENSION_ID` | 32-char item id from the store dashboard |
| `CWS_CLIENT_ID` | OAuth client id (GCP, type: Desktop app) |
| `CWS_CLIENT_SECRET` | OAuth client secret |
| `CWS_REFRESH_TOKEN` | refresh token minted by the extension owner |

Steps:

1. Google Cloud Console: enable the **Chrome Web Store API**.
2. Create an OAuth client, application type **Desktop app**.
3. On the OAuth consent screen, set publishing status to **In production**
   (a Testing-mode token expires in 7 days).
4. Mint a refresh token (loopback flow, run as the store-owner account):
   ```bash
   npx chrome-webstore-upload-keys
   ```
   Follow the prompts, approve in the browser, copy the refresh token.
5. Set the secrets:
   ```bash
   gh secret set CWS_EXTENSION_ID   -b "<id>"
   gh secret set CWS_CLIENT_ID      -b "<client-id>"
   gh secret set CWS_CLIENT_SECRET  -b "<client-secret>"
   gh secret set CWS_REFRESH_TOKEN  -b "<refresh-token>"
   ```

### If a release fails with invalid_grant / 401

The refresh token was revoked (password change, app access revoked, ~6 months
unused, or the OAuth client was rotated). Re-mint it (step 4) and update the
`CWS_REFRESH_TOKEN` secret (step 5). The other secrets stay the same.

## Manual publish (fallback, no CI)

Requires the four values above exported locally. Do not paste them into shell
history that gets committed anywhere.

```bash
npm run zip
EXTENSION_ID=... CLIENT_ID=... CLIENT_SECRET=... REFRESH_TOKEN=... \
  npx chrome-webstore-upload-cli@3 upload \
  --source selection-to-popup.zip --auto-publish
```
