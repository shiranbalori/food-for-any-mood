import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'

const manifest = JSON.parse(readFileSync('./public/manifest.webmanifest', 'utf-8'))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.svg', 'pwa-192x192.png', 'pwa-512x512.png', 'manifest.webmanifest'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2,webmanifest}'],
        navigateFallback: 'index.html',
        skipWaiting: false,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
})
