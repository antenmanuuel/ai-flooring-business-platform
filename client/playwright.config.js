import { defineConfig, devices } from '@playwright/test'

// End-to-end tests (npm run test:e2e): a real browser against the real website and Spring Boot server.
// They start their own copies on separate ports, with their own database, so they never touch
// your dev servers (5173/5050) or your data. Accounts get unique emails, so runs don't clash.
const API_PORT = 5060
const WEB_PORT = 5180

export const E2E_ADMIN = { email: 'admin@e2e.test', password: 'E2eAdmin123' }

export default defineConfig({
  testDir: './e2e',
  // One worker: the tests share one server (and its login-attempt limits).
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      // Creates the e2e database, its tables and its admin, then starts the server.
      command: 'npm run db:setup && npm run dev',
      cwd: '../server',
      url: `http://localhost:${API_PORT}/api/health`,
      env: {
        ...process.env,
        PORT: String(API_PORT),
        DB_NAME: 'anna_flooring_springboot_e2e',
        ADMIN_EMAIL: E2E_ADMIN.email,
        ADMIN_PASSWORD: E2E_ADMIN.password,
        APP_UPLOADSDIR: 'target/e2e-uploads', // app.uploads-dir: keep test photos out of uploads/
      },
      timeout: 240_000, // the first run downloads Maven dependencies
      reuseExistingServer: false,
      stdout: 'ignore',
    },
    {
      command: `npx vite --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { ...process.env, API_URL: `http://localhost:${API_PORT}` },
      reuseExistingServer: false,
    },
  ],
})
