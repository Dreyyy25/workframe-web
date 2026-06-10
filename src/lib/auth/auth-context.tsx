/**
 * Mock auth/session. There is no backend yet, so "logging in" just stores a
 * lightweight user in localStorage and flips the UI to the right role. Demo
 * shortcuts let reviewers walk both sides (seeker / company) instantly.
 *
 * When the real API lands, replace the bodies of login/register/logout with
 * calls to /accounts/* and token handling; the surface (useAuth) stays the same.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { SEEKER } from '@/lib/mock/data'
import type { UserType } from '@/lib/mock/types'

export interface SessionUser {
  type: UserType
  name: string
  email: string
}

interface AuthValue {
  user: SessionUser | null
  isSeeker: boolean
  isCompany: boolean
  loginDemo: (role: UserType) => void
  login: (email: string, password: string) => void
  register: (input: { type: UserType; name: string; email: string }) => void
  logout: () => void
}

const STORAGE_KEY = 'wf-auth'
const AuthContext = createContext<AuthValue | null>(null)

const DEMO: Record<UserType, SessionUser> = {
  job_seeker: {
    type: 'job_seeker',
    name: `${SEEKER.firstName} ${SEEKER.lastName}`,
    email: SEEKER.email,
  },
  company: { type: 'company', name: 'Northwind Labs', email: 'team@northwind.dev' },
}

function read(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as SessionUser) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => read())

  useEffect(() => {
    if (user) localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    else localStorage.removeItem(STORAGE_KEY)
  }, [user])

  const loginDemo = useCallback((role: UserType) => setUser(DEMO[role]), [])
  const login = useCallback((email: string) => {
    // Mock: any credentials succeed as the demo seeker, keyed to the email typed.
    setUser({ ...DEMO.job_seeker, email: email || DEMO.job_seeker.email })
  }, [])
  const register = useCallback(
    (input: { type: UserType; name: string; email: string }) =>
      setUser({ type: input.type, name: input.name, email: input.email }),
    [],
  )
  const logout = useCallback(() => setUser(null), [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isSeeker: user?.type === 'job_seeker',
      isCompany: user?.type === 'company',
      loginDemo,
      login,
      register,
      logout,
    }),
    [user, loginDemo, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}
