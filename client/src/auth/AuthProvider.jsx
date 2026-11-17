import { useCallback, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import { AuthContext } from './AuthContext'

// Keeps track of who is logged in. The login token lives in an httpOnly cookie the browser
// sends automatically, so here we only store the client details returned by the API.
function AuthProvider({ children }) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    api
      .get('/auth/me')
      .then(({ data }) => !cancelled && setClient(data.client))
      .catch(() => !cancelled && setClient(null))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
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
