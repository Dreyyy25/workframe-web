/**
 * Maps ApiError (and unknown failures) onto the copy the auth pages show —
 * spec §6.7: 401 invalid credentials, 429 throttle, 400 field errors mapped
 * onto inputs, anything else a generic connection message.
 */
import { ApiError } from '@/lib/api/client'

export interface RegisterFieldErrors {
  email?: string
  password?: string
  general?: string
}

export function loginErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return 'Invalid email or password.'
    if (err.status === 429) return 'Too many attempts — try again in a minute.'
    return err.message
  }
  return 'Something went wrong. Check your connection and try again.'
}

export function registerErrors(err: unknown): RegisterFieldErrors {
  if (err instanceof ApiError) {
    if (err.status === 429) return { general: 'Too many attempts — try again in a minute.' }
    const fields: RegisterFieldErrors = {
      email: err.fieldErrors.email?.join(' '),
      password: err.fieldErrors.password?.join(' '),
    }
    if (!fields.email && !fields.password) fields.general = err.message
    return fields
  }
  return { general: 'Something went wrong. Check your connection and try again.' }
}
