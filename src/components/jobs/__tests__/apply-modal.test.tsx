/**
 * ApplyModal on real services: posts the apply contract, shows a success
 * toast, calls onApplied/onClose, and refreshes the applications cache
 * (['applications'] — no dead ['has-applied', job.id] key). A 400 API error
 * renders inline and the modal is not dismissed.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { http, HttpResponse } from 'msw'
import { server } from '@/test/msw/server'
import { setAccessToken } from '@/lib/api/client'
import { ACCESS_TOKEN, APPLICATION_ID, JOB_POST_ID, SEEKER_ID, jobPost } from '@/test/msw/fixtures'
import { adaptJob } from '@/lib/services/jobs'
import { ToastProvider } from '@/components/ui/toast'
import { ApplyModal } from '../apply-modal'

function renderModal(onApplied = vi.fn(), onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
  const job = adaptJob(jobPost())
  render(
    <QueryClientProvider client={client}>
      <ToastProvider>
        <ApplyModal open onClose={onClose} job={job} onApplied={onApplied} />
      </ToastProvider>
    </QueryClientProvider>,
  )
  return { job, onApplied, onClose, invalidateSpy }
}

/**
 * Modal auto-focuses its first focusable descendant (the header's Close
 * button, which precedes the form in DOM order) ~30ms after mount. Waiting
 * for that one-shot steal to land before interacting avoids a race where it
 * fires mid-keystroke and swallows part of the typed cover letter.
 */
async function settleAutofocus() {
  await waitFor(() => expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus())
}

describe('ApplyModal', () => {
  beforeEach(() => setAccessToken(ACCESS_TOKEN))
  afterEach(() => localStorage.clear())

  it('submits the apply contract, shows a success toast, and refreshes the applications cache', async () => {
    const user = userEvent.setup()
    let body: Record<string, unknown> = {}
    server.use(
      http.post('*/api/v1/jobs/apply/', async ({ request }) => {
        body = (await request.json()) as Record<string, unknown>
        return HttpResponse.json(
          {
            message: 'Application submitted successfully',
            data: {
              id: APPLICATION_ID,
              application_status: 'pending',
              application_date: '2026-08-06T10:00:00Z',
            },
          },
          { status: 201 },
        )
      }),
    )
    const onApplied = vi.fn()
    const onClose = vi.fn()
    const { invalidateSpy } = renderModal(onApplied, onClose)
    await settleAutofocus()

    await user.type(
      screen.getByRole('textbox', { name: /cover letter/i }),
      'Hi, I would love this role!',
    )
    await user.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(await screen.findByText('Application sent to Halcyon Systems')).toBeInTheDocument()
    expect(body).toEqual({
      user_account: SEEKER_ID,
      job_post: JOB_POST_ID,
      cover_letter: 'Hi, I would love this role!',
    })
    expect(onApplied).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
    // Only the applications cache is invalidated — the dead has-applied key
    // no longer exists.
    expect(invalidateSpy).toHaveBeenCalledTimes(1)
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['applications'] })
  })

  it('renders a 400 API error inline and keeps the modal open', async () => {
    const user = userEvent.setup()
    server.use(
      http.post('*/api/v1/jobs/apply/', () =>
        HttpResponse.json({ error: 'You have already applied for this job' }, { status: 400 }),
      ),
    )
    const onApplied = vi.fn()
    const onClose = vi.fn()
    renderModal(onApplied, onClose)
    await settleAutofocus()

    await user.type(screen.getByRole('textbox', { name: /cover letter/i }), 'Hi!')
    await user.click(screen.getByRole('button', { name: 'Submit application' }))

    expect(
      await screen.findByText('You have already applied for this job'),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
    expect(onApplied).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
