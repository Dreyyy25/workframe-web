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
