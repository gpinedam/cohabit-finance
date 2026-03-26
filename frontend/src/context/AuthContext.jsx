import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { getMe, getPinStatus } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [coupleId, setCoupleId] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    try {
      const res = await getMe()
      setUser(res.data)
      // Couple id stored separately after login
      const stored = localStorage.getItem('coupleId')
      if (stored) setCoupleId(Number(stored))
    } catch {
      localStorage.removeItem('token')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUser() }, [loadUser])

  const login = useCallback((token, userData, cId) => {
    localStorage.setItem('token', token)
    if (cId) { localStorage.setItem('coupleId', String(cId)); setCoupleId(cId) }
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    localStorage.clear()
    setUser(null)
    setCoupleId(null)
  }, [])

  const lockScreen = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, coupleId, loading, login, logout, lockScreen, setUser, setCoupleId }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
