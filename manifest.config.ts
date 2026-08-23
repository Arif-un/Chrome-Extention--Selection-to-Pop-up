import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json' with { type: 'json' }

export default defineManifest({
  manifest_version: 3,
  name: 'Selection To PopUp',
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
    default_title: 'Selection To PopUp',
    default_icon: {
      16: 'src/assets/icons/select-logo-16.png',
      32: 'src/assets/icons/select-logo-32.png',
    },
  },
  options_page: 'src/options/index.html',
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
  permissions: ['storage', 'contextMenus'],
  host_permissions: [
    'https://translate.googleapis.com/*',
    'https://translate.google.com/*',
    'https://api.frankfurter.dev/*',
    'https://open.er-api.com/*',
    'https://freedictionaryapi.com/*',
  ],
  web_accessible_resources: [
    {
      resources: ['src/sandbox/sandbox.html'],
      matches: ['<all_urls>'],
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
