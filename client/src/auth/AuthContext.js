import { createContext, useContext } from 'react'

export const AuthContext = createContext(null)

// Returns { client, loading, login, logout }.
//   client  - the logged-in client ({ id, firstName, lastName, email, role }) or null
//   loading - true until the initial "who am I?" check finishes
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
