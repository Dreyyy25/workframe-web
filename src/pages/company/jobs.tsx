import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, X } from 'lucide-react'
import { deleteJob, getCompanyConsole, listApplications, listCompanyJobs, setJobPublished } from '@/lib/services'
import type { CompanyJobRow } from '@/lib/services'
import { useToast } from '@/components/ui/toast'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { money } from '@/lib/format'

export default function CompanyJobs() {
  const qc = useQueryClient()
  const { toast } = useToast()
  const { data: console_ } = useQuery({ queryKey: ['company-console'], queryFn: getCompanyConsole })
  const companyId = console_?.companyId
  const { data: jobs, isLoading } = useQuery({
    queryKey: ['company-jobs'],
    queryFn: () => listCompanyJobs(companyId as string),
    enabled: Boolean(companyId),
  })
  const { data: apps } = useQuery({ queryKey: ['applications'], queryFn: listApplications })
  const countByJob = new Map<string, number>()
  for (const a of apps ?? []) countByJob.set(a.jobId, (countByJob.get(a.jobId) ?? 0) + 1)

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['company-jobs'] })
    qc.invalidateQueries({ queryKey: ['company-console'] })
  }
  const toggle = useMutation({
    mutationFn: (j: CompanyJobRow) => setJobPublished(j.id, !j.published),
    onSuccess: (_d, j) => {
      invalidate()
      toast(j.published ? 'Post closed' : 'Post published')
    },
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteJob(id),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast('Post deleted')
    },
  })

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tightest">Job posts</h1>
          <p className="mt-2 text-muted-foreground">Manage your open and closed roles.</p>
        </div>
        <Link to="/company/jobs/new" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus className="h-4 w-4" /> Post a Job
        </Link>
      </div>

      {isLoading ? (
        <Skeleton className="mt-8 h-64 w-full" />
      ) : jobs && jobs.length > 0 ? (
        <div className="mt-8">
          <Table>
            <THead>
              <tr>
                <TH>Title</TH>
                <TH>Type</TH>
                <TH>Applicants</TH>
                <TH>Status</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </THead>
            <TBody>
              {jobs.map((j) => (
                <TR key={j.id}>
                  <TD>
                    <p className="font-semibold">{j.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {money(j.salaryMin, j.salaryMax, j.salaryType)}
                    </p>
                  </TD>
                  <TD className="text-muted-foreground">{j.type}</TD>
                  <TD>
                    <Link
                      to={`/company/applicants?job=${j.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      {countByJob.get(j.id) ?? 0}
                    </Link>
                  </TD>
                  <TD>
                    {j.published ? (
                      <Badge variant="accent">
                        <Check /> Published
                      </Badge>
                    ) : (
                      <Badge variant="muted">
                        <X /> Closed
                      </Badge>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center justify-end gap-2">
                      <Link to={`/company/jobs/${j.id}/edit`}>
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={toggle.isPending}
                        onClick={() => toggle.mutate(j)}
                      >
                        {j.published ? 'Close' : 'Publish'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => remove.mutate(j.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState title="No job posts yet" description="Create your first role to start hiring.">
            <Link to="/company/jobs/new" className={cn(buttonVariants({ variant: 'primary' }))}>
              <Plus className="h-4 w-4" /> Post a Job
            </Link>
          </EmptyState>
        </div>
      )}
    </div>
  )
}
