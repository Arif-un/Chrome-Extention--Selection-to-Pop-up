import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }
import { AI_ORIGINS } from './src/lib/ai-targets'

export default defineManifest({
  manifest_version: 3,
  name: 'Select to Action',
  version: pkg.version,
  description: pkg.description,
  minimum_chrome_version: '116',
  icons: {
    16: 'src/assets/icons/select-logo-16.png',
    32: 'src/assets/icons/select-logo-32.png',
    48: 'src/assets/icons/select-logo-48.png',
    128: 'src/assets/icons/select-logo-128.png',
  },
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Select to Action',
    default_icon: {
      16: 'src/assets/icons/select-logo-16.png',
      32: 'src/assets/icons/select-logo-32.png',
    },
  },
  options_page: 'src/options/index.html',
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['<all_urls>'],
      all_frames: true,
      run_at: 'document_idle',
      js: ['src/content/content-script.ts'],
    },
  ],
  // declarativeNetRequestWithHostAccess (not plain declarativeNetRequest): the
  // AI-frame header rule only ever touches hosts the user granted at runtime
  // (requestDomains is scoped to grants, see service-worker.ts), and this
  // variant triggers NO permission warning — so an auto-update won't soft-disable
  // the extension pending re-consent the way the broad permission would.
  permissions: ['storage', 'contextMenus', 'sidePanel', 'declarativeNetRequestWithHostAccess'],
  host_permissions: [
    'https://translate.googleapis.com/*',
    'https://translate.google.com/*',
    'https://api.frankfurter.dev/*',
    'https://open.er-api.com/*',
    'https://freedictionaryapi.com/*',
  ],
  // AI hosts are OPTIONAL: making them required would soft-disable the whole
  // extension on auto-update pending re-approval, stopping every feature until
  // the user re-enables. Requested at runtime (Options) when the user picks a
  // framed AI mode; the DNR header rule only covers hosts actually granted
  // (see service-worker.ts).
  optional_host_permissions: AI_ORIGINS,
  web_accessible_resources: [
    {
      resources: ['src/sandbox/sandbox.html'],
      matches: ['<all_urls>'],
    },
    {
      // In-page iframe mode nests the AI through this page so the AI frame is
      // extension-initiated (matches the scoped DNR rule). Framable by any site,
      // so use_dynamic_url gives it a rotating per-session URL an attacker can't
      // guess — closes the "any page embeds the wrapper" clickjacking vector.
      resources: ['src/sidepanel/index.html'],
      matches: ['<all_urls>'],
      use_dynamic_url: true,
    },
  ],
  sandbox: {
    pages: ['src/sandbox/sandbox.html'],
  },
  content_security_policy: {
    sandbox:
      "sandbox allow-scripts; script-src 'self' 'unsafe-inline' 'unsafe-eval'; child-src 'none'; object-src 'none'",
  },
  commands: {
    'act-on-selection': {
      suggested_key: { default: 'Alt+S' },
      description: 'Act on the current text selection',
    },
  },
})
