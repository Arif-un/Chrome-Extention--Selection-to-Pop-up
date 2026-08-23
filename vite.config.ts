import { defineConfig } from 'vite'
import { crx } from '@crxjs/vite-plugin'
import tailwindcss from '@tailwindcss/vite'
import manifest from './manifest.config.ts'

// Preact via esbuild's automatic JSX runtime (no preset needed, robust on Vite 8).
export default defineConfig({
  esbuild: {
    jsx: 'automatic',
    jsxImportSource: 'preact',
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
