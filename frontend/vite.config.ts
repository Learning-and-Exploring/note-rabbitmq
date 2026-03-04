import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import tailwindcss from '@tailwindcss/vite'


// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // Route all frontend API calls through API gateway.
      // Default points to edge-nginx (docker-compose) on :8080.
      '/api': {
        target: process.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
      '/auth-api': {
        target: process.env.VITE_GATEWAY_BASE_URL || 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
