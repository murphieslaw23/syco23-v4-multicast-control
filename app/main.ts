import { createApp } from 'vue'
import App from './app.vue'

const container = document.getElementById('app')
if (container) {
  createApp(App).mount(container)
}
