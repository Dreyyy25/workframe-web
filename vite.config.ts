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
        // A live Django admin session on localhost:8000 would ride along and
        // trip DRF's SessionAuthentication CSRF check on our POSTs. The API
        // only ever needs the refresh cookie — strip Django's session pair.
        configure(proxy) {
          proxy.on('proxyReq', (proxyReq) => {
            const cookie = proxyReq.getHeader('cookie')
            if (typeof cookie === 'string') {
              const kept = cookie
                .split(/;\s*/)
                .filter((p) => !p.startsWith('sessionid=') && !p.startsWith('csrftoken='))
                .join('; ')
              if (kept) proxyReq.setHeader('cookie', kept)
              else proxyReq.removeHeader('cookie')
            }
          })
        },
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
