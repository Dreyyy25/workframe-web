import { describe, expect, it } from 'vitest'
import { ApiError } from '@/lib/api/client'
import { loginErrorMessage, registerErrors } from '../auth-errors'

describe('loginErrorMessage', () => {
  it('maps 401 to the invalid-credentials copy', () => {
    expect(loginErrorMessage(new ApiError(401, { error: 'Invalid credentials' }))).toBe(
      'Invalid email or password.',
    )
  })

  it('maps 429 to the throttle copy', () => {
    expect(loginErrorMessage(new ApiError(429, { detail: 'Request was throttled.' }))).toBe(
      'Too many attempts — try again in a minute.',
    )
  })

  it('passes through other ApiError messages', () => {
    expect(loginErrorMessage(new ApiError(400, { error: 'Email and password are required' }))).toBe(
      'Email and password are required',
    )
  })

  it('uses the generic copy for non-ApiError failures', () => {
    expect(loginErrorMessage(new TypeError('fetch failed'))).toMatch(/Check your connection/)
  })
})

describe('registerErrors', () => {
  it('maps DRF field errors onto email and password', () => {
    const err = new ApiError(400, {
      email: ['user account with this email already exists.'],
      password: ['This password is too short.', 'This password is too common.'],
    })
    expect(registerErrors(err)).toEqual({
      email: 'user account with this email already exists.',
      password: 'This password is too short. This password is too common.',
      general: undefined,
    })
  })

  it('falls back to the message for non-field 400s', () => {
    const out = registerErrors(new ApiError(400, { error: 'nope' }))
    expect(out.general).toBe('nope')
    expect(out.email).toBeUndefined()
  })

  it('maps 429 to the throttle copy', () => {
    expect(registerErrors(new ApiError(429, { detail: 'throttled' })).general).toMatch(
      /Too many attempts/,
    )
  })

  it('uses the generic copy for unknown failures', () => {
    expect(registerErrors(new Error('boom')).general).toMatch(/Check your connection/)
  })
})
