import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['manifest-icon.svg'],
      manifest: {
        name: 'Matibox Kindergarten Food Logistics',
        short_name: 'Matibox',
        description: 'Kindergarten Food Logistics & Route Delivery App for Drivers and Dispatch Admins',
        theme_color: '#0f172a',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'manifest-icon.svg',
            sizes: '192x192 512x512',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5150',
        changeOrigin: true
      },
      '/hubs': {
        target: 'http://localhost:5150',
        ws: true,
        changeOrigin: true
      }
    }
  }
});
