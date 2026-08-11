/**
 * Post/edit job page on real services: create-mode location+post+skill POST
 * sequencing with the wire asymmetry (empty salary type/deadline -> ''/null
 * on the wire), edit-mode prefill with disabled persisted-skill names,
 * partial-failure (JobSaveError) recovery, inline field-error mapping, the
 * required city/country inputs, and the non-field-error generic-toast guard
 * (ApiError.fieldErrors is always assigned — must check non-empty, not just
 * truthy).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import {
  ACCESS_TOKEN, JOB_POST_ID, JOB_TYPES_LIST,
  jobLocationDto, jobPost, jobSkillDto,
} from '@/test/msw/fixtures'
import { ToastProvider } from '@/components/ui/toast'
import PostJob from '../post-job'

function renderPostJob(path: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/company/jobs/new" element={<PostJob />} />
            <Route path="/company/jobs/:id/edit" element={<PostJob />} />
            <Route path="/company/jobs" element={<div>Jobs list screen</div>} />
          </Routes>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

// Title/Description/City/Country labels render a `*` suffix span (Label's
// `required` prop), which breaks exact-text label matching — use substring
// matching for those four only. Other fields (Skill/Level/Job type/Salary/
// Deadline) have no asterisk, so they use the default exact matcher; note
// the "Remove skill" button's aria-label also matches "Skill" as a
// substring, so exact matching is required there to disambiguate.
const lbl = { exact: false }

describe('PostJob', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
  afterEach(() => localStorage.clear())

  it('create: submits location POST, job-post POST (wire asymmetry), one skill POST per row, then navigates to /company/jobs', async () => {
    const user = userEvent.setup()
    const events: string[] = []
    let locationBody: unknown
    let postBody: unknown
    const skillBodies: unknown[] = []
    const NEW_LOCATION_ID = 'new-loc-id'
    const NEW_JOB_ID = 'new-job-id'
    server.use(
      http.post('*/api/v1/jobs/job-locations/', async ({ request }) => {
        events.push('location')
        locationBody = await request.json()
        return HttpResponse.json(jobLocationDto({ id: NEW_LOCATION_ID }), { status: 201 })
      }),
      http.post('*/api/v1/jobs/job-posts/', async ({ request }) => {
        events.push('post')
        postBody = await request.json()
        return HttpResponse.json(jobPost({ id: NEW_JOB_ID }), { status: 201 })
      }),
      http.post('*/api/v1/jobs/job-skills/', async ({ request }) => {
        events.push('skill')
        skillBodies.push(await request.json())
        return HttpResponse.json(jobSkillDto(), { status: 201 })
      }),
    )

    renderPostJob('/company/jobs/new')

    await user.type(await screen.findByLabelText('Title', lbl), 'Backend Engineer')
    await user.type(screen.getByLabelText('Description', lbl), 'Ship APIs.')
    await waitFor(() => expect(screen.getByRole('option', { name: 'Contract' })).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Job type'), 'Contract')
    await user.type(screen.getByLabelText('City', lbl), 'Lisbon')
    await user.type(screen.getByLabelText('Country', lbl), 'Portugal')
    await user.type(screen.getByLabelText('Salary min'), '60000')
    await user.type(screen.getByLabelText('Salary max'), '90000')
    // salary type left at default "Not specified" and deadline left empty —
    // exercises the wire asymmetry (salary_type: '', deadline_date: null).

    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    await user.type(screen.getByLabelText('Skill'), 'Go')
    await user.selectOptions(screen.getByLabelText('Level'), 'Advanced')

    await user.click(screen.getByRole('button', { name: 'Publish job' }))

    await waitFor(() => expect(screen.getByText('Jobs list screen')).toBeInTheDocument())

    expect(events).toEqual(['location', 'post', 'skill'])
    expect(locationBody).toEqual({ city: 'Lisbon', country: 'Portugal' })
    expect(postBody).toEqual({
      job_title: 'Backend Engineer',
      job_description: 'Ship APIs.',
      job_type: JOB_TYPES_LIST[1].id, // Contract
      salary_min: 60000,
      salary_max: 90000,
      salary_type: '', // WIRE ASYMMETRY: "Not specified" -> ''
      deadline_date: null, // WIRE ASYMMETRY: empty -> null
      is_published: true,
      job_location: NEW_LOCATION_ID,
    })
    expect(skillBodies).toEqual([
      { job_post: NEW_JOB_ID, skill_name: 'Go', skill_level: 'Advanced', is_required: true },
    ])
  })

  it('edit: loads the job, prefills the form, and disables persisted skill-row names while new rows stay editable', async () => {
    const user = userEvent.setup()
    renderPostJob(`/company/jobs/${JOB_POST_ID}/edit`)

    expect(await screen.findByDisplayValue('Machine Learning Engineer')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Build models.')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Berlin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Germany')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('120000')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2026-09-01')).toBeInTheDocument()

    const persistedNameInput = screen.getByDisplayValue('Python')
    expect(persistedNameInput).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    const skillInputs = screen.getAllByLabelText('Skill')
    const newRowInput = skillInputs[skillInputs.length - 1]
    expect(newRowInput).not.toBeDisabled()
    expect(persistedNameInput).toBeDisabled() // unaffected by adding a new row
  })

  it('partial failure: skill POST 500 shows the recovery toast and navigates to the edit page for the newly created job', async () => {
    const user = userEvent.setup()
    const NEW_JOB_ID = 'new-job-id-2'
    server.use(
      http.post('*/api/v1/jobs/job-locations/', () =>
        HttpResponse.json(jobLocationDto(), { status: 201 })),
      http.post('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json(jobPost({ id: NEW_JOB_ID, job_title: 'Data Analyst' }), { status: 201 })),
      http.post('*/api/v1/jobs/job-skills/', () =>
        HttpResponse.json({ detail: 'boom' }, { status: 500 })),
      http.get('*/api/v1/jobs/job-posts/:id/', ({ params }) =>
        params.id === NEW_JOB_ID
          ? HttpResponse.json(jobPost({ id: NEW_JOB_ID, job_title: 'Data Analyst' }))
          : HttpResponse.json({ detail: 'not found' }, { status: 404 })),
    )

    renderPostJob('/company/jobs/new')

    await user.type(await screen.findByLabelText('Title', lbl), 'Data Analyst')
    await user.type(screen.getByLabelText('Description', lbl), 'Crunch numbers.')
    await user.type(screen.getByLabelText('City', lbl), 'Lisbon')
    await user.type(screen.getByLabelText('Country', lbl), 'Portugal')
    await user.click(screen.getByRole('button', { name: 'Add skill' }))
    await user.type(screen.getByLabelText('Skill'), 'Excel')

    await user.click(screen.getByRole('button', { name: 'Publish job' }))

    expect(
      await screen.findByText('Job saved, but some skills failed — review and retry'),
    ).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Edit job' })).toBeInTheDocument()
    await waitFor(() => expect(screen.getByDisplayValue('Data Analyst')).toBeInTheDocument())
  })

  it('edit: unknown job id renders a not-found state instead of an empty create form', async () => {
    server.use(
      http.get('*/api/v1/jobs/job-posts/:id/', () =>
        HttpResponse.json({ detail: 'No JobPost matches the given query.' }, { status: 404 })),
    )
    renderPostJob('/company/jobs/unknown-job-id/edit')

    expect(await screen.findByText('Job not found')).toBeInTheDocument()
    expect(screen.queryByLabelText('Title', lbl)).not.toBeInTheDocument()
  })

  it('field errors: job-post 400 renders at the title input; location 400 renders at the city input', async () => {
    const user = userEvent.setup()

    // job-post POST 400 -> title
    server.use(
      http.post('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ job_title: ['Too long'] }, { status: 400 })),
    )
    renderPostJob('/company/jobs/new')
    await user.type(await screen.findByLabelText('Title', lbl), 'X')
    await user.type(screen.getByLabelText('Description', lbl), 'Y')
    await user.type(screen.getByLabelText('City', lbl), 'Berlin')
    await user.type(screen.getByLabelText('Country', lbl), 'Germany')
    await user.click(screen.getByRole('button', { name: 'Publish job' }))

    const titleError = await screen.findByText('Too long')
    const titleInput = screen.getByLabelText('Title', lbl)
    expect(titleInput.parentElement).toContainElement(titleError)
    expect(screen.queryByText('This field is required.')).not.toBeInTheDocument()
  })

  it('field errors: location 400 renders at the city input', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/jobs/job-locations/', () =>
        HttpResponse.json({ city: ['This field is required.'] }, { status: 400 })),
    )
    renderPostJob('/company/jobs/new')
    await user.type(await screen.findByLabelText('Title', lbl), 'X')
    await user.type(screen.getByLabelText('Description', lbl), 'Y')
    await user.type(screen.getByLabelText('City', lbl), 'Nowhere')
    await user.type(screen.getByLabelText('Country', lbl), 'Germany')
    await user.click(screen.getByRole('button', { name: 'Publish job' }))

    const cityError = await screen.findByText('This field is required.')
    const cityInput = screen.getByLabelText('City', lbl)
    expect(cityInput.parentElement).toContainElement(cityError)
  })

  it('city and country inputs are required', async () => {
    renderPostJob('/company/jobs/new')
    expect(await screen.findByLabelText('City', lbl)).toBeRequired()
    expect(screen.getByLabelText('Country', lbl)).toBeRequired()
  })

  it('non-field ApiError (500 with {detail}) shows the generic toast and renders no inline field errors', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/jobs/job-posts/', () =>
        HttpResponse.json({ detail: 'Server error' }, { status: 500 })),
    )
    renderPostJob('/company/jobs/new')
    await user.type(await screen.findByLabelText('Title', lbl), 'X')
    await user.type(screen.getByLabelText('Description', lbl), 'Y')
    await user.type(screen.getByLabelText('City', lbl), 'Berlin')
    await user.type(screen.getByLabelText('Country', lbl), 'Germany')
    await user.click(screen.getByRole('button', { name: 'Publish job' }))

    expect(await screen.findByText('Could not save the job — try again')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
