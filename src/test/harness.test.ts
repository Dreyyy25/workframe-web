import { describe, expect, it } from 'vitest'
import { ROTATED_ACCESS_TOKEN } from './msw/fixtures'

describe('test harness', () => {
  it('MSW intercepts fetch and serves the staging-shaped contract', async () => {
    const res = await fetch('http://localhost:3000/api/v1/accounts/token/refresh/', {
      method: 'POST',
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ access: ROTATED_ACCESS_TOKEN })
  })
})
