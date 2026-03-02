import './assets/main.css'
import '@fontsource/poppins/400.css'
import '@fontsource/poppins/500.css'
import '@fontsource/poppins/700.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

try {
  localStorage.removeItem('notionui.auth')
} catch {
  // Ignore storage access errors.
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
