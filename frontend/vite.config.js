import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * Vite Dev Server Configuration
 * 
 * The proxy setup forwards /api/* requests to the Flask backend
 * running on port 5000. This avoids CORS issues during development
 * and mirrors how the app would work in production behind a reverse proxy.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  }
})
