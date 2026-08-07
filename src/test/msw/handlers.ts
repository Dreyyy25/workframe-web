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
  APPLICATION_ID,
  BUSINESS_STREAMS_LIST,
  JOB_POST_ID,
  JOB_TYPES_LIST,
  PUBLIC_COMPANY_ID,
  ROTATED_ACCESS_TOKEN,
  SEEKER_SKILL_ID,
  applicationDto,
  companyDashboard,
  educationDto,
  experienceDto,
  jobPost,
  paginated,
  publicCompany,
  publicCompanyDetail,
  seekerAccount,
  seekerAuthUser,
  seekerDashboard,
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
  http.get('*/api/v1/jobs/job-posts/', () =>
    HttpResponse.json(paginated([jobPost()])),
  ),
  http.get('*/api/v1/jobs/job-posts/:id/', ({ params }) =>
    params.id === JOB_POST_ID
      ? HttpResponse.json(jobPost())
      : HttpResponse.json({ detail: 'No JobPost matches the given query.' }, { status: 404 }),
  ),
  http.get('*/api/v1/jobs/job-types/', () => HttpResponse.json(paginated(JOB_TYPES_LIST))),
  http.get('*/api/v1/companies/business-streams/', () =>
    HttpResponse.json(paginated(BUSINESS_STREAMS_LIST)),
  ),
  http.get('*/api/v1/companies/public/', () =>
    HttpResponse.json(paginated([publicCompany()])),
  ),
  http.get('*/api/v1/companies/public/:id/', ({ params }) =>
    params.id === PUBLIC_COMPANY_ID
      ? HttpResponse.json(publicCompanyDetail())
      : HttpResponse.json({ detail: 'No Company matches the given query.' }, { status: 404 }),
  ),
  http.get('*/api/v1/seekers/dashboard/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(seekerDashboard()),
  ),
  http.patch('*/api/v1/seekers/profiles/:id/', async ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json(seekerProfile({ ...(await request.json()) as object })),
  ),
  http.patch('*/api/v1/accounts/me/', async ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ ...seekerAccount(), ...(await request.json()) as object }),
  ),
  http.post('*/api/v1/accounts/change-password/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/education/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(educationDto(), { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/education/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/experience/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(experienceDto(), { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/experience/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.post('*/api/v1/seekers/seeker-skills/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ id: SEEKER_SKILL_ID, skill_set: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', skill_level: 'Advanced' }, { status: 201 }),
  ),
  http.delete('*/api/v1/seekers/seeker-skills/:id/', ({ request }) =>
    denyUnlessAuthed(request) ?? new HttpResponse(null, { status: 204 }),
  ),
  http.get('*/api/v1/jobs/job-applications/', ({ request }) =>
    denyUnlessAuthed(request) ?? HttpResponse.json(paginated([applicationDto()])),
  ),
  http.get('*/api/v1/jobs/job-applications/:id/', ({ request, params }) =>
    denyUnlessAuthed(request) ??
    (params.id === APPLICATION_ID
      ? HttpResponse.json(applicationDto())
      : HttpResponse.json({ detail: 'No JobPostActivity matches the given query.' }, { status: 404 })),
  ),
  http.patch('*/api/v1/jobs/job-applications/:id/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json({ id: APPLICATION_ID, application_status: 'withdrawn' }),
  ),
  http.post('*/api/v1/jobs/apply/', ({ request }) =>
    denyUnlessAuthed(request) ??
    HttpResponse.json(
      { message: 'Application submitted successfully',
        data: { id: APPLICATION_ID, application_status: 'pending', application_date: '2026-08-06T10:00:00Z' } },
      { status: 201 },
    ),
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
