import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiTarget = 'http://localhost:5080'

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': apiTarget,
      '/health': apiTarget,
    },
  },
})
