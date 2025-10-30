import { createApp, reactive } from 'vue'
import App from './App.vue'
export const store = reactive({ 
  token: localStorage.getItem('token') || '',
  activeStreamId: null,
  streamStatus: '',
  channelsUpdated: 0 // trigger for channel refresh
})
createApp(App).mount('#app')
