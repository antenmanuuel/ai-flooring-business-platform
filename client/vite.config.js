import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { configDefaults } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Forward /api requests to the Spring Boot server during development. API_URL points it at
    // another server; the Playwright tests use that to run their own copy on port 5060.
    proxy: {
      '/api': process.env.API_URL || 'http://localhost:5050',
    },
  },
  // Tests (npm test): Vitest with a browser-like DOM; see src/test/setup.js.
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    // e2e/ holds the Playwright tests (npm run test:e2e), which Vitest doesn't run.
    exclude: [...configDefaults.exclude, 'e2e/**'],
  },
})
