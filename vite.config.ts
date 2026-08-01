import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    // Same-origin API in dev: the browser sees only localhost:5173, so the
    // backend's refresh cookie (Path=/api/v1/accounts/, SameSite=Lax) is
    // first-party. IMPORTANT: no path rewrite — the cookie's Path attribute
    // must match the URL the browser actually requested.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    // Tests exercise the same relative base the dev proxy uses; jsdom
    // resolves it against its default origin (http://localhost:3000).
    env: {
      VITE_API_BASE_URL: '/api/v1',
    },
  },
})
