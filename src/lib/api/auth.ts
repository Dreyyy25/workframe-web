/**
 * Typed calls to /accounts/*. Login/register/refresh run with auth: false so
 * a 401 from them is a real answer, never a trigger for the silent-refresh
 * loop. Logout DOES send the Bearer token — the backend requires it — and the
 * refresh cookie rides along automatically on every call.
 */
import { apiGet, apiPost, refreshAccessToken } from './client'
import type {
  LoginResponse,
  RegisterInput,
  RegisterResponse,
  UserAccount,
} from './types'

export function login(email: string, password: string): Promise<LoginResponse> {
  return apiPost<LoginResponse>('/accounts/login/', {
    body: { email, password },
    auth: false,
  })
}

export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>('/accounts/register/', {
    body: input,
    auth: false,
  })
}

/** 205 with an empty body; blacklists the cookie's refresh token server-side. */
export function logout(): Promise<void> {
  return apiPost('/accounts/logout/')
}

export function getMe(): Promise<UserAccount> {
  return apiGet<UserAccount>('/accounts/me/')
}

/** Single-flight; shared with the silent-refresh path inside the client. */
export const refresh = refreshAccessToken
