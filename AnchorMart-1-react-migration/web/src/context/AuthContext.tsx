import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'

interface AuthApi {
  authed: boolean
  login: () => void
  logout: () => void
}

const AuthCtx = createContext<AuthApi | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authed, setAuthed] = useState(false)
  const login = useCallback(() => setAuthed(true), [])
  const logout = useCallback(() => setAuthed(false), [])
  return <AuthCtx.Provider value={{ authed, login, logout }}>{children}</AuthCtx.Provider>
}

export function useAuth(): AuthApi {
  const ctx = useContext(AuthCtx)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
