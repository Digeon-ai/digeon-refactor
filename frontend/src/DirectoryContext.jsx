import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { useAuth } from './AuthContext.jsx'

const API = import.meta.env.VITE_API_URL
const DirectoryContext = createContext(null)

export function DirectoryProvider({ children }) {
  const { token } = useAuth()
  const [rows, setRows] = useState(null)   // null = not loaded yet
  const [loading, setLoading] = useState(false)

  const fetchDirectory = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(
        `${API}/api/directory`,
        token ? { headers: { Authorization: `Bearer ${token}` } } : {}
      )
      const data = await res.json()
      setRows(data)
    } catch {
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  // prefetch as soon as the app mounts (and re-run if auth changes,
  // so a user's own ratings get merged once they log in)
  useEffect(() => {
    fetchDirectory()
  }, [fetchDirectory])

  return (
    <DirectoryContext.Provider value={{ rows, loading, refetch: fetchDirectory }}>
      {children}
    </DirectoryContext.Provider>
  )
}

export function useDirectory() {
  return useContext(DirectoryContext)
}