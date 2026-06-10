import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getApplication } from '@/lib/mock/services'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { cn } from '@/lib/utils'
import { formatDate, money, place } from '@/lib/format'
import type { AppStatus } from '@/lib/mock/types'

export default function ApplicationDetail() {
  const { id = '' } = useParams()
  const { data: app, isLoading } = useQuery({
    queryKey: ['application', id],
    queryFn: () => getApplication(id),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-6 h-48 w-full" />
      </div>
    )
  }

  if (!app) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <EmptyState title="Application not found">
          <Link to="/seeker/applications">
            <Button variant="outline">Back to applications</Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  const job = app.job
  const salary = job ? money(job.salaryMin, job.salaryMax, job.salaryType) : null

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'My applications', to: '/seeker/applications' },
          { label: job?.title ?? 'Application' },
        ]}
      />

      <div className="mt-6 rounded border-2 border-border bg-card p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            {job ? (
              <Link
                to={`/jobs/${job.id}`}
                className="font-display text-2xl font-extrabold tracking-tight hover:text-primary"
              >
                {job.title}
              </Link>
            ) : (
              <h1 className="font-display text-2xl font-extrabold tracking-tight">Role removed</h1>
            )}
            {job && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="accent">{job.type}</Badge>
                <Badge variant="outline">{place(job.city, job.country)}</Badge>
                {job.company && <span className="text-sm text-muted-foreground">{job.company.name}</span>}
              </div>
            )}
          </div>
          <StatusBadge status={app.status} />
        </div>

        {salary && (
          <p className="mt-5 font-display text-xl font-extrabold tracking-tight text-primary">
            {salary}
          </p>
        )}

        {job && (
          <Link to={`/jobs/${job.id}`} className="mt-4 inline-block">
            <Button variant="outline" size="sm">
              View job
            </Button>
          </Link>
        )}

        {/* cover letter */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Your cover letter
          </h2>
          <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground/90">{app.cover}</p>
        </div>

        {/* timeline */}
        <div className="mt-8">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Status</h2>
          <Timeline status={app.status} applied={app.applied} />
        </div>
      </div>
    </div>
  )
}

function Timeline({ status, applied }: { status: AppStatus; applied: string }) {
  const reviewedDone = ['reviewed', 'accepted', 'rejected'].includes(status)
  const decided = status === 'accepted' || status === 'rejected'
  const withdrawn = status === 'withdrawn'

  const steps = [
    { label: 'Applied', sub: formatDate(applied), done: true },
    {
      label: 'Reviewed',
      sub: reviewedDone ? 'Your application was reviewed' : 'Waiting for the company to review',
      done: reviewedDone,
    },
    {
      label: withdrawn ? 'Withdrawn' : 'Decision',
      sub: withdrawn
        ? 'You withdrew this application'
        : status === 'accepted'
          ? 'Accepted — congratulations!'
          : status === 'rejected'
            ? 'Not moving forward this time'
            : 'Pending a final decision',
      done: decided || withdrawn,
    },
  ]

  return (
    <ul className="mt-4 space-y-5 border-l-2 border-border pl-6">
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span
            className={cn(
              'absolute -left-[31px] top-0.5 h-3.5 w-3.5 rounded-full border-2',
              s.done ? 'border-primary bg-primary' : 'border-border bg-background',
            )}
          />
          <p className="font-display text-sm font-bold">{s.label}</p>
          <p className="text-sm text-muted-foreground">{s.sub}</p>
        </li>
      ))}
    </ul>
  )
}
