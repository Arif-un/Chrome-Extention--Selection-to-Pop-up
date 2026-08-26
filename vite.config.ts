import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config.ts'

// Preact via esbuild's automatic JSX runtime (no preset needed, robust on Vite 8).
export default defineConfig({
  // rolldown-vite (Vite 8) reads JSX config from oxc, not esbuild.
  oxc: {
    jsx: { runtime: 'automatic', importSource: 'preact' },
  },
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
    },
  },
  plugins: [tailwindcss(), crx({ manifest })],
  server: {
    // crxjs HMR websocket needs a stable port
    port: 5173,
    strictPort: true,
    hmr: { port: 5173 },
  },
})
