import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only precache the built app shell (JS/CSS/HTML/icons). Game state
      // travels over Supabase Realtime websockets and REST calls, which are
      // never intercepted here - there is no runtimeCaching config for the
      // Supabase origin, so live/offline game data is never cached or served
      // stale.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
      },
      manifest: {
        name: 'WordChain',
        short_name: 'WordChain',
        description: 'Multiplayer party games: Word Chain elimination & Would You Rather group reveals, live in your browser.',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#020617',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})
