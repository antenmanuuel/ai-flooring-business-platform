import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { AuthContext } from './AuthContext'

// Keeps track of who is logged in. The login token lives in an httpOnly cookie the browser
// sends automatically, so here we only store the client details returned by the API.
function AuthProvider({ children }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  // On page load, ask the server who is logged in (401 means nobody).
  useEffect(() => {
    api
      .get('/auth/me')
      .then(({ data }) => setClient(data.client))
      .catch(() => setClient(null))
      .finally(() => setLoading(false))
  }, [])

  // If any request comes back 401 (session expired, account deleted or disabled), forget the
  // logged-in client so protected pages send the user to the login page.
  useEffect(() => {
    const id = api.interceptors.response.use(undefined, (err) => {
      if (err.response?.status === 401) setClient(null)
      return Promise.reject(err)
    })
    return () => api.interceptors.response.eject(id)
  }, [])

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password })
    setClient(data.client)
    return data.client
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout')
    } finally {
      setClient(null)
    }
  }, [])

  const value = useMemo(() => ({ client, loading, login, logout }), [client, loading, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
