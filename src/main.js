import * as Pinia from 'pinia'
import { createSSRApp } from 'vue'
import App from './App.vue'
import router from './router'
import 'uno.css'

export function createApp() {
  const app = createSSRApp(App)

  const store = Pinia.createPinia()
  app.use(store)

  app.use(router)

  return {
    app,
    Pinia,
  }
}
