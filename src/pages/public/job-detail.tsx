import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { CalendarClock, Check, MapPin } from 'lucide-react'
import { getJob, listApplications } from '@/lib/services'
import { useAuth } from '@/lib/auth/auth-context'
import { ApplyModal } from '@/components/jobs/apply-modal'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { money, formatDate, place } from '@/lib/format'

export default function JobDetail() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user, isSeeker, isCompany } = useAuth()
  const [applyOpen, setApplyOpen] = useState(false)

  const { data: job, isLoading } = useQuery({ queryKey: ['job', id], queryFn: () => getJob(id) })
  const { data: applied } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
    enabled: Boolean(isSeeker && job),
    select: (apps) => apps.some((a) => a.jobId === id),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <Skeleton className="h-5 w-64" />
        <Skeleton className="mt-6 h-12 w-3/4" />
        <Skeleton className="mt-10 h-64 w-full" />
      </div>
    )
  }

  if (!job) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <EmptyState title="Role not found" description="This job may have closed or moved.">
          <Link to="/jobs">
            <Button variant="outline">Browse all jobs</Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  const salary = money(job.salaryMin, job.salaryMax, job.salaryType)

  const onApply = () => {
    if (!user) {
      navigate('/login', { state: { from: `/jobs/${job.id}` } })
      return
    }
    setApplyOpen(true)
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Jobs', to: '/jobs' },
          { label: job.title },
        ]}
      />

      <div className="mt-6 grid gap-10 lg:grid-cols-[1fr_320px]">
        {/* main */}
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">{job.type}</Badge>
            <Badge variant="outline">
              <MapPin />
              {place(job.city, job.country)}
            </Badge>
            {job.deadline && (
              <Badge variant="muted">
                <CalendarClock />
                Apply by {formatDate(job.deadline)}
              </Badge>
            )}
          </div>

          <h1 className="mt-4 text-3xl font-extrabold tracking-tightest sm:text-4xl">{job.title}</h1>
          {job.company && (
            <Link
              to={`/companies/${job.company.id}`}
              className="mt-2 inline-block font-semibold text-primary hover:underline"
            >
              {job.company.name}
            </Link>
          )}

          <div className="mt-8 max-w-prose whitespace-pre-line leading-relaxed text-foreground/90">
            {job.description}
          </div>

          {job.skills.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xl font-bold tracking-tight">Required skills</h2>
              <ul className="mt-4 flex flex-wrap gap-2.5">
                {job.skills.map((s) => (
                  <li
                    key={s.name}
                    className="inline-flex items-center gap-2 rounded-sm border-2 border-border bg-card px-3 py-1.5 text-sm font-semibold"
                  >
                    {s.name}
                    <span className="text-xs font-medium text-muted-foreground">{s.level}</span>
                    {s.required && <Badge variant="accent">Required</Badge>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded border-2 border-border bg-card p-6 shadow-hard">
            {salary && (
              <p className="font-display text-2xl font-extrabold tracking-tight text-primary">
                {salary}
              </p>
            )}
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Type" value={job.type} />
              <Row label="Location" value={place(job.city, job.country)} />
              <Row label="Posted" value={formatDate(job.posted)} />
              {job.deadline && <Row label="Deadline" value={formatDate(job.deadline)} />}
            </dl>

            {isCompany ? (
              <p className="mt-6 rounded border-2 border-dashed border-border px-4 py-3 text-center text-sm text-muted-foreground">
                You’re signed in as a company. Switch to a seeker account to apply.
              </p>
            ) : applied ? (
              <Button disabled className="mt-6 w-full">
                <Check className="h-4 w-4" /> Applied
              </Button>
            ) : (
              <>
                <Button className="mt-6 w-full" onClick={onApply}>
                  {user ? 'Apply now' : 'Log in to apply'}
                </Button>
                {!user && (
                  <p className="mt-3 text-center text-xs text-muted-foreground">
                    You’ll need an account to apply.
                  </p>
                )}
              </>
            )}
          </div>
        </aside>
      </div>

      {isSeeker && <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} job={job} />}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-semibold">{value}</dd>
    </div>
  )
}
