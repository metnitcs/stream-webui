import { createApp, reactive } from 'vue'
import App from './App.vue'
export const store = reactive({ token: localStorage.getItem('token') || '' })
createApp(App).mount('#app')
