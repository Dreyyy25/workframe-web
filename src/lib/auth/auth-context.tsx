/**
 * Real auth/session against the Django API.
 *
 * - Access token: in client.ts memory only. Refresh token: httpOnly cookie
 *   the JS never sees.
 * - On mount the provider bootstraps by silently refreshing: cookie present
 *   → hydrated user; absent/expired → logged out. `isLoading` covers the
 *   async window so RequireAuth doesn't bounce a logged-in user mid-boot.
 * - Register is two-step (create account, then PATCH the profile with the
 *   name). A failed step 2 still logs the user in — the account exists —
 *   and surfaces ProfileSaveError so the page can explain.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import {
  clearAccessToken,
  refreshAccessToken,
  setAccessToken,
  setOnSessionExpired,
} from '@/lib/api/client'
import * as authApi from '@/lib/api/auth'
import { apiPatch } from '@/lib/api/client'
import type { AuthUser, CompanyProfile } from '@/lib/api/types'
import { buildSessionUser } from './session'
import type { SessionUser } from './session'

export type { SessionUser }

/** Register succeeded but saving the display name (step 2) failed. */
export class ProfileSaveError extends Error {
  readonly cause?: unknown

  constructor(cause?: unknown) {
    super('Account created, but saving the profile name failed.')
    this.name = 'ProfileSaveError'
    this.cause = cause
  }
}

export type RegisterFormInput =
  | {
      type: 'job_seeker'
      email: string
      password: string
      firstName: string
      lastName: string
    }
  | {
      type: 'company'
      email: string
      password: string
      companyName: string
      businessStreamId: string
    }

interface AuthValue {
  user: SessionUser | null
  isLoading: boolean
  isSeeker: boolean
  isCompany: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (input: RegisterFormInput) => Promise<SessionUser>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const bootstrapped = useRef(false)

  useEffect(() => {
    // Re-registered on every (Strict Mode) mount; the client fires this only
    // when an authorized call dies on a failed refresh — a session that
    // existed has expired. Clearing the user makes RequireAuth redirect
    // declaratively (the provider sits outside the router, so no navigate()).
    setOnSessionExpired(() => {
      clearAccessToken()
      setUser(null)
    })

    // The network bootstrap must run once: the backend rotates + blacklists
    // refresh tokens, so Strict Mode's double-mount firing two refreshes
    // would blacklist the second one's cookie mid-flight.
    if (!bootstrapped.current) {
      bootstrapped.current = true
      void (async () => {
        try {
          await refreshAccessToken()
          const me = await authApi.getMe()
          setUser(await buildSessionUser({ id: me.id, email: me.email, user_type: me.user_type }))
        } catch {
          setUser(null)
        } finally {
          setIsLoading(false)
        }
      })()
    }

    return () => setOnSessionExpired(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    setAccessToken(res.tokens.access)
    const sessionUser = await buildSessionUser(res.user)
    setUser(sessionUser)
    return sessionUser
  }, [])

  const register = useCallback(async (input: RegisterFormInput) => {
    const res = await authApi.register({
      email: input.email,
      password: input.password,
      user_type: input.type,
    })
    setAccessToken(res.tokens.access)

    const finish = (name: string): SessionUser => {
      const sessionUser: SessionUser = {
        id: res.user.id,
        type: res.user.user_type,
        name: name || res.user.email,
        email: res.user.email,
      }
      setUser(sessionUser)
      return sessionUser
    }

    try {
      if (input.type === 'job_seeker') {
        await apiPatch(`/seekers/profiles/${res.user.id}/`, {
          body: { first_name: input.firstName, last_name: input.lastName },
        })
        return finish(`${input.firstName} ${input.lastName}`.trim())
      }
      const companyId = (res.profile as CompanyProfile | null)?.id
      if (!companyId) throw new Error('register response carried no company profile')
      await apiPatch(`/companies/profile/${companyId}/`, {
        body: { company_name: input.companyName, business_stream: input.businessStreamId },
      })
      return finish(input.companyName.trim())
    } catch (err) {
      // The account exists and the session is live — never strand the user
      // on a form they can't resubmit (the email is now taken).
      finish('')
      throw new ProfileSaveError(err)
    }
  }, [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch {
      // Best effort — the cookie may already be dead; local teardown matters.
    }
    clearAccessToken()
    setUser(null)
  }, [])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading,
      isSeeker: user?.type === 'job_seeker',
      isCompany: user?.type === 'company',
      login,
      register,
      logout,
    }),
    [user, isLoading, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>')
  return ctx
}

// Convenience for tests and non-component callers.
export type { AuthUser }
