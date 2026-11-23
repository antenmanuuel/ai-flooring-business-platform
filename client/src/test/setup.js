// Runs before every test file (see vite.config.js).
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom has no scrolling; pages that scroll to the top after sending a form would log a warning.
window.scrollTo = () => {}

// Unmount whatever the last test rendered and reset every mock between tests.
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
