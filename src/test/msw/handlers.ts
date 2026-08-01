/**
 * Default happy-path handlers for the auth endpoints, mirroring the real
 * staging backend contract:
 *  - login/register return tokens.access only (refresh lives in an
 *    httpOnly cookie the client never reads)
 *  - refresh returns {access} and rotates the cookie server-side
 *  - logout is 205 with an empty body
 * Tests override per-case with server.use(...).
 */
import { http, HttpResponse } from 'msw'
import {
  ACCESS_TOKEN,
  ROTATED_ACCESS_TOKEN,
  companyDashboard,
  seekerAccount,
  seekerAuthUser,
  seekerProfile,
} from './fixtures'

export const handlers = [
  http.post('*/api/v1/accounts/login/', () =>
    HttpResponse.json(
      { message: 'Login successful', user: seekerAuthUser, tokens: { access: ACCESS_TOKEN } },
      { status: 200 },
    ),
  ),
  http.post('*/api/v1/accounts/register/', () =>
    HttpResponse.json(
      {
        message: 'User created successfully',
        user: seekerAuthUser,
        tokens: { access: ACCESS_TOKEN },
        profile: seekerProfile({ first_name: '', last_name: '' }),
      },
      { status: 201 },
    ),
  ),
  http.post('*/api/v1/accounts/token/refresh/', () =>
    HttpResponse.json({ access: ROTATED_ACCESS_TOKEN }, { status: 200 }),
  ),
  http.post('*/api/v1/accounts/logout/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 205 }),
  ),
  http.get('*/api/v1/accounts/me/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(seekerAccount()),
  ),
  http.get('*/api/v1/seekers/profiles/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(seekerProfile()),
  ),
  http.get('*/api/v1/companies/dashboard/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(companyDashboard()),
  ),
]

/**
 * Protected endpoints reject requests without a known Bearer token, exactly
 * like the real API — otherwise a client bug that drops the Authorization
 * header would sail through every test.
 */
const AUTHED = new Set([`Bearer ${ACCESS_TOKEN}`, `Bearer ${ROTATED_ACCESS_TOKEN}`])

function denyUnlessAuthed(request: Request) {
  if (AUTHED.has(request.headers.get('authorization') ?? '')) return null
  return HttpResponse.json(
    { detail: 'Authentication credentials were not provided.' },
    { status: 401 },
  )
}
