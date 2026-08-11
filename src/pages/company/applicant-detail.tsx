import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { getApplicantDetail, setApplicantStatus } from '@/lib/services'
import { useToast } from '@/components/ui/toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { dateRange, formatDate } from '@/lib/format'

export default function ApplicantDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data, isLoading } = useQuery({
    queryKey: ['application-detail', id],
    queryFn: () => getApplicantDetail(id),
  })

  const actions = useMutation({
    mutationFn: (status: 'reviewed' | 'accepted' | 'rejected') => setApplicantStatus(id, status),
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ['application-detail', id] })
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast(
        status === 'accepted'
          ? 'Applicant accepted'
          : status === 'rejected'
            ? 'Applicant rejected'
            : 'Marked as reviewed',
      )
    },
  })

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />
  }
  if (!data) {
    return (
      <EmptyState title="Applicant not found">
        <Link to="/company/applicants">
          <Button variant="outline">Back to applicants</Button>
        </Link>
      </EmptyState>
    )
  }

  const app = data.application
  const profile = data.profile
  const name = profile?.name || app.applicant?.name || 'Applicant'
  const status = app.status
  const showReview = status === 'pending'
  const showDecision = status === 'pending' || status === 'reviewed'

  return (
    <div>
      <Breadcrumb items={[{ label: 'Applicants', to: '/company/applicants' }, { label: name }]} />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tightest">{name}</h1>
        <StatusBadge status={status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* main */}
        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Applied to
          </h2>
          {app.job ? (
            <Link
              to={`/jobs/${app.jobId}`}
              className="mt-1 inline-block font-display text-lg font-bold hover:text-primary"
            >
              {app.job.title}
            </Link>
          ) : (
            <p className="mt-1 font-display text-lg font-bold">Role removed</p>
          )}

          {profile ? (
            <>
              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Contact
                </h2>
                <p className="mt-1 text-sm text-foreground/90">{profile.contactDetails || '—'}</p>
                {profile.resumeUrl && (
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    View resume
                  </a>
                )}
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Goals
                </h2>
                <p className="mt-2 text-sm text-foreground/90">{profile.goals || '—'}</p>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Skills
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  {profile.skills.map((s) => (
                    <span
                      key={`${s.name}-${s.level}`}
                      className="rounded-sm border-2 border-border bg-background px-2.5 py-1 text-sm font-semibold"
                    >
                      {s.name} · {s.level}
                    </span>
                  ))}
                  {profile.skills.length === 0 && (
                    <p className="text-sm text-muted-foreground">No skills listed.</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Experience
                </h2>
                <div className="mt-2 space-y-3">
                  {profile.experience.map((x) => (
                    <div key={x.id}>
                      <p className="font-semibold">
                        {x.position} — {x.company}
                      </p>
                      <p className="text-xs text-muted-foreground">{dateRange(x.start, x.end)}</p>
                    </div>
                  ))}
                  {profile.experience.length === 0 && (
                    <p className="text-sm text-muted-foreground">No experience listed.</p>
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                  Education
                </h2>
                <div className="mt-2 space-y-3">
                  {profile.education.map((e) => (
                    <div key={e.id}>
                      <p className="font-semibold">
                        {e.degree} — {e.school}
                      </p>
                      <p className="text-xs text-muted-foreground">{dateRange(e.start, e.end)}</p>
                    </div>
                  ))}
                  {profile.education.length === 0 && (
                    <p className="text-sm text-muted-foreground">No education listed.</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="mt-6 rounded border-2 border-dashed border-border p-4 text-sm text-muted-foreground">
              This candidate's profile is no longer available.
            </div>
          )}

          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Cover letter
            </h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground/90">{app.cover}</p>
            <p className="mt-2 text-xs text-muted-foreground">Applied {formatDate(app.applied)}</p>
          </div>
        </div>

        {/* sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded border-2 border-border bg-card p-6">
            <h2 className="font-display text-base font-bold tracking-tight">Update status</h2>
            <div className="mt-4 space-y-2">
              {showReview && (
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  disabled={actions.isPending}
                  onClick={() => actions.mutate('reviewed')}
                >
                  <Search className="h-4 w-4" /> Mark reviewed
                </Button>
              )}
              {showDecision && (
                <>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={actions.isPending}
                    onClick={() => actions.mutate('accepted')}
                  >
                    <Check className="h-4 w-4" /> Accept
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    disabled={actions.isPending}
                    onClick={() => actions.mutate('rejected')}
                  >
                    <X className="h-4 w-4" /> Reject
                  </Button>
                </>
              )}
              {!showDecision && (
                <p className="text-xs text-muted-foreground">
                  A final decision has been made for this applicant.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
