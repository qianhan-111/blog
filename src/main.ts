import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import { initObservability } from '@/observability'
import router from '@/router'
import { useThemeStore } from '@/stores/theme'
import '@/styles/tokens.css'
import '@/styles/index.css'
import '@/styles/markdown.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
useThemeStore(pinia).initTheme()
app.use(router)
initObservability(app, {
  enabled: import.meta.env.PROD && import.meta.env.VITE_OBSERVABILITY_ENABLED === 'true',
  endpoint: import.meta.env.VITE_OBSERVABILITY_DSN,
  release: import.meta.env.VITE_RELEASE_VERSION || undefined,
  router,
})
app.mount('#app')
