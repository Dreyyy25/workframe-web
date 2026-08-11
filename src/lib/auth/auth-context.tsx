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
import { useQueryClient } from '@tanstack/react-query'
import {
  ApiError,
  SESSION_HINT_KEY,
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
      /** Absent when streams couldn't load — the backend keeps its default. */
      businessStreamId?: string
    }

export interface AuthValue {
  user: SessionUser | null
  isLoading: boolean
  isSeeker: boolean
  isCompany: boolean
  login: (email: string, password: string) => Promise<SessionUser>
  register: (input: RegisterFormInput) => Promise<SessionUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<SessionUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const bootstrapped = useRef(false)
  // Bumped whenever login/register/logout establishes newer session state, so
  // a slow bootstrap that settles afterwards can tell its result is stale and
  // must not clobber the fresh session.
  const sessionGen = useRef(0)

  useEffect(() => {
    // Re-registered on every (Strict Mode) mount; the client fires this only
    // when an authorized call dies on a failed refresh — a session that
    // existed has expired. Clearing the user makes RequireAuth redirect
    // declaratively (the provider sits outside the router, so no navigate()).
    setOnSessionExpired(() => {
      clearAccessToken()
      setUser(null)
      // A different account may log in next; stale cached data (applications,
      // company console, etc.) from this session must not survive it.
      queryClient.clear()
    })

    // The network bootstrap must run once: the backend rotates + blacklists
    // refresh tokens, so Strict Mode's double-mount firing two refreshes
    // would blacklist the second one's cookie mid-flight.
    if (!bootstrapped.current) {
      bootstrapped.current = true
      // A first-time guest has no session hint: skip the refresh probe
      // entirely (no doomed network call, no console 401). The httpOnly
      // cookie stays the source of truth — the hint only gates the attempt.
      if (!localStorage.getItem(SESSION_HINT_KEY)) {
        setIsLoading(false)
      } else {
        void (async () => {
          const gen = sessionGen.current
          try {
            await refreshAccessToken()
            const me = await authApi.getMe()
            const sessionUser = await buildSessionUser({
              id: me.id,
              email: me.email,
              user_type: me.user_type,
            })
            if (gen === sessionGen.current) setUser(sessionUser)
          } catch (err) {
            if (gen === sessionGen.current) {
              // Don't leave an orphaned access token (refresh ok, /me/ failed)
              // lying around for a "guest" session.
              clearAccessToken()
              setUser(null)
              // clearAccessToken() also drops the session hint. That's right
              // when the refresh gave a terminal 401/400 verdict — the cookie
              // is dead, so treating this as a fresh guest is correct. Any
              // other failure (network blip, 5xx, 429 throttle, or a /me/
              // error after a successful refresh) is transient: the cookie
              // may still be alive, so restore the hint and let the next load
              // retry the probe instead of silently downgrading to logged-out.
              if (!(err instanceof ApiError && (err.status === 401 || err.status === 400))) {
                localStorage.setItem(SESSION_HINT_KEY, '1')
              }
            }
          } finally {
            setIsLoading(false)
          }
        })()
      }
    }

    return () => setOnSessionExpired(null)
  }, [queryClient])

  const login = useCallback(async (email: string, password: string) => {
    const res = await authApi.login(email, password)
    sessionGen.current++
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
    sessionGen.current++
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
        body: {
          company_name: input.companyName,
          // Omitted when streams couldn't load; the signal-assigned default
          // ("Uncategorized") stays until the profile is edited.
          ...(input.businessStreamId ? { business_stream: input.businessStreamId } : {}),
        },
      })
      return finish(input.companyName.trim())
    } catch (err) {
      // The account exists and the session is live — never strand the user
      // on a form they can't resubmit (the email is now taken).
      finish('')
      throw new ProfileSaveError(err)
    }
  }, [])

  /**
   * Re-fetches /me/ + the role profile and rebuilds the session user (e.g.
   * after a profile edit changes the display name). Mirrors the bootstrap's
   * sessionGen guard so a stale in-flight call can't clobber newer state.
   */
  const refreshUser = useCallback(async () => {
    const gen = sessionGen.current
    const me = await authApi.getMe()
    const sessionUser = await buildSessionUser({
      id: me.id,
      email: me.email,
      user_type: me.user_type,
    })
    if (gen === sessionGen.current) setUser(sessionUser)
  }, [])

  const logout = useCallback(async () => {
    // apiFetch captures the Authorization header synchronously, so the local
    // teardown right after dispatch can't strip the token off this request.
    // Local teardown must never wait on the network (header logout is
    // fire-and-forget) — the UI flips immediately even if the call hangs.
    const request = authApi.logout()
    sessionGen.current++
    clearAccessToken()
    setUser(null)
    // The next login may be a different account — stale cached data
    // (applications, company console, etc.) must not survive into it.
    queryClient.clear()
    try {
      await request
    } catch {
      // Best effort — the cookie may already be dead; local teardown matters.
    }
  }, [queryClient])

  const value = useMemo<AuthValue>(
    () => ({
      user,
      isLoading,
      isSeeker: user?.type === 'job_seeker',
      isCompany: user?.type === 'company',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, login, register, logout, refreshUser],
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
