import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app from /<repo>/, while local dev, `vite preview`
// and the Android (Capacitor) build all serve it from the root.
const base = process.env.BASE_PATH ?? '/'

// package.json is the single source of truth for the app version. It is injected
// into the bundle below, mirrored into build.gradle by
// scripts/sync-android-version.ps1, and the GitHub release is tagged with it —
// that is what lib/update.ts compares against.
const { version } = JSON.parse(
  readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), 'package.json'), 'utf8'),
) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'KodiSalama — Usimamizi wa Wapangaji',
        short_name: 'KodiSalama',
        description:
          'Usimamizi wa vyumba, wapangaji, malipo, madeni, mikataba na risiti za SMS kwa wamiliki wa nyumba.',
        lang: 'sw',
        dir: 'ltr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#f1f5f9',
        theme_color: '#14532d',
        categories: ['business', 'finance', 'productivity'],
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: {
    host: true, // reachable from your phone over the same Wi-Fi
    port: 5173,
  },
  preview: {
    host: true,
    port: 4173,
  },
})
