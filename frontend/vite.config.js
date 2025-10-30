import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins:[vue()],
  define: { __BACKEND__: JSON.stringify(process.env.VITE_BACKEND_URL || 'http://localhost:5000') }
})
