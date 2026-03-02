// https://nuxt.com/docs/api/configuration/nuxt-config
import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  modules: ['@nuxt/fonts'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  runtimeConfig: {
    public: {
      noteServiceBase: process.env.NOTE_SERVICE_BASE_URL || 'http://localhost:3003',
    },
  },

  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
