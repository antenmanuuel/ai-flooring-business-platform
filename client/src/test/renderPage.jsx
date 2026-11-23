import { render } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router'
import { vi } from 'vitest'
import { AuthContext } from '../auth/AuthContext'

// Test users, shaped like the API's logged-in client.
export const testClient = {
  id: 5,
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@demo.com',
  role: 'client',
  address: '4521 Woodward Ave',
  city: 'Detroit',
  state: 'MI',
  zipCode: '48201',
}
export const testAdmin = { id: 1, firstName: 'Anna', lastName: 'Johnson', email: 'anna@example.com', role: 'admin' }

// Shows which page a redirect or link went to.
function CurrentPath() {
  return <p data-testid="current-path">{useLocation().pathname}</p>
}

// Renders a page at a URL with a fake logged-in user (or none). Other paths render a stub,
// so a redirect or navigation shows up in the "current-path" test id.
export function renderPage(element, { path = '/', route = path, client = null, auth = {} } = {}) {
  const value = {
    client,
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    ...auth,
  }
  const utils = render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={element} />
          <Route path="*" element={<CurrentPath />} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
  return { ...utils, auth: value }
}
