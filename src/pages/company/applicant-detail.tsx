import { Link, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Search, X } from 'lucide-react'
import { getApplicant, setApplicantStatus } from '@/lib/mock/services'
import { useToast } from '@/components/ui/toast'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Button } from '@/components/ui/button'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format'
import type { AppStatus } from '@/lib/mock/types'

export default function ApplicantDetail() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: a, isLoading } = useQuery({
    queryKey: ['applicant', id],
    queryFn: () => getApplicant(id),
  })

  const decide = useMutation({
    mutationFn: (status: AppStatus) => setApplicantStatus(id, status),
    onSuccess: (_d, status) => {
      qc.invalidateQueries({ queryKey: ['applicant', id] })
      qc.invalidateQueries({ queryKey: ['applicants'] })
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
  if (!a) {
    return (
      <EmptyState title="Applicant not found">
        <Link to="/company/applicants">
          <Button variant="outline">Back to applicants</Button>
        </Link>
      </EmptyState>
    )
  }

  const decided = a.status === 'accepted' || a.status === 'rejected'

  return (
    <div>
      <Breadcrumb
        items={[{ label: 'Applicants', to: '/company/applicants' }, { label: a.name }]}
      />

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tightest">{a.name}</h1>
          <p className="mt-1 text-muted-foreground">
            {a.title} · {a.email}
          </p>
        </div>
        <StatusBadge status={a.status} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* main */}
        <div className="rounded border-2 border-border bg-card p-6">
          <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Applied to
          </h2>
          {a.job ? (
            <Link to={`/jobs/${a.job.id}`} className="mt-1 inline-block font-display text-lg font-bold hover:text-primary">
              {a.job.title}
            </Link>
          ) : (
            <p className="mt-1 font-display text-lg font-bold">Role removed</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {a.experienceYears} years of experience
          </p>

          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Skills</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {a.skills.map((s) => (
                <span
                  key={s}
                  className="rounded-sm border-2 border-border bg-background px-2.5 py-1 text-sm font-semibold"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-6">
            <h2 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Cover letter
            </h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed text-foreground/90">{a.cover}</p>
          </div>
        </div>

        {/* sidebar */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded border-2 border-border bg-card p-6">
            <h2 className="font-display text-base font-bold tracking-tight">Update status</h2>
            <div className="mt-4 space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={decide.isPending || a.status === 'reviewed' || decided}
                onClick={() => decide.mutate('reviewed')}
              >
                <Search className="h-4 w-4" /> Mark reviewed
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={decide.isPending || decided}
                onClick={() => decide.mutate('accepted')}
              >
                <Check className="h-4 w-4" /> Accept
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start"
                disabled={decide.isPending || decided}
                onClick={() => decide.mutate('rejected')}
              >
                <X className="h-4 w-4" /> Reject
              </Button>
            </div>
            {decided && (
              <p className="mt-3 text-xs text-muted-foreground">
                A final decision has been made for this applicant.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  )
}
