import { Link, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Inbox } from 'lucide-react'
import { listApplicants, listCompanyJobs, setApplicantStatus } from '@/lib/mock/services'
import { useToast } from '@/components/ui/toast'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { formatDate } from '@/lib/format'
import type { AppStatus } from '@/lib/mock/types'

export default function CompanyApplicants() {
  const [params, setParams] = useSearchParams()
  const jobId = params.get('job') ?? ''
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: jobs } = useQuery({ queryKey: ['company-jobs'], queryFn: listCompanyJobs })
  const { data: applicants, isLoading } = useQuery({
    queryKey: ['applicants', jobId],
    queryFn: () => listApplicants(jobId || undefined),
  })

  const decide = useMutation({
    mutationFn: ({ id, status }: { id: string; status: AppStatus }) => setApplicantStatus(id, status),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: ['applicants'] })
      qc.invalidateQueries({ queryKey: ['applicant'] })
      toast(v.status === 'accepted' ? 'Applicant accepted' : 'Applicant rejected')
    },
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tightest">Applicants</h1>
          <p className="mt-2 text-muted-foreground">Review and move candidates forward.</p>
        </div>
        <div className="w-56">
          <Label htmlFor="a-job" className="sr-only">
            Filter by role
          </Label>
          <Select
            id="a-job"
            value={jobId}
            onChange={(e) =>
              setParams(e.target.value ? { job: e.target.value } : {}, { replace: true })
            }
          >
            <option value="">All roles</option>
            {jobs?.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : applicants && applicants.length > 0 ? (
        <ul className="mt-8 space-y-3">
          {applicants.map((a) => {
            const decided = a.status === 'accepted' || a.status === 'rejected'
            return (
              <li
                key={a.id}
                className="flex flex-col gap-4 rounded border-2 border-border bg-card p-5 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0">
                  <Link
                    to={`/company/applicants/${a.id}`}
                    className="font-display text-lg font-bold tracking-tight hover:text-primary"
                  >
                    {a.name}
                  </Link>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {a.title} · {a.experienceYears} yrs · Applied {formatDate(a.applied)}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="muted">{a.job?.title ?? 'Role'}</Badge>
                    <StatusBadge status={a.status} />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={`/company/applicants/${a.id}`}>
                    <Button variant="outline" size="sm">
                      View
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={decided || decide.isPending}
                    onClick={() => decide.mutate({ id: a.id, status: 'accepted' })}
                  >
                    Accept
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={decided || decide.isPending}
                    onClick={() => decide.mutate({ id: a.id, status: 'rejected' })}
                  >
                    Reject
                  </Button>
                </div>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={Inbox}
            title="No applicants"
            description="When candidates apply, they’ll show up here."
          />
        </div>
      )}
    </div>
  )
}
