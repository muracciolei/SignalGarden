import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

const githubPagesBase = '/SignalGarden/'

// https://vite.dev/config/
export default defineConfig({
  base: githubPagesBase,
  build: {
    chunkSizeWarningLimit: 900,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'pwa-icon.svg', 'apple-touch-icon.svg'],
      manifest: {
        name: 'Signal Garden',
        short_name: 'Signal Garden',
        description:
          'A local-only procedural digital biosphere generated with browser signals, audio, shaders, and IndexedDB.',
        theme_color: '#02030a',
        background_color: '#02030a',
        display: 'standalone',
        orientation: 'any',
        id: githubPagesBase,
        start_url: githubPagesBase,
        scope: githubPagesBase,
        categories: ['art', 'entertainment', 'productivity'],
        icons: [
          {
            src: `${githubPagesBase}pwa-icon.svg`,
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
          {
            src: `${githubPagesBase}apple-touch-icon.svg`,
            sizes: '180x180',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest,woff2}'],
        runtimeCaching: [
          {
            urlPattern: ({ request }) =>
              request.destination === 'document' ||
              request.destination === 'script' ||
              request.destination === 'style' ||
              request.destination === 'worker',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'signal-garden-shell',
            },
          },
        ],
      },
    }),
  ],
})
