import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Briefcase, Inbox, Plus, TrendingUp } from 'lucide-react'
import { getCompanyStats, listApplicants } from '@/lib/mock/services'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'

export default function CompanyDashboard() {
  const { data: stats, isLoading } = useQuery({ queryKey: ['company-stats'], queryFn: getCompanyStats })
  const { data: applicants } = useQuery({ queryKey: ['applicants'], queryFn: () => listApplicants() })
  const recent = applicants?.slice(0, 5) ?? []

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-extrabold tracking-tightest">Dashboard</h1>
        <Link to="/company/jobs/new" className={cn(buttonVariants({ variant: 'primary' }))}>
          <Plus className="h-4 w-4" /> Post a Job
        </Link>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Active posts" value={stats?.activePosts ?? 0} icon={Briefcase} />
            <StatCard label="Total applicants" value={stats?.totalApplicants ?? 0} icon={Inbox} />
            <StatCard label="New this week" value={stats?.newThisWeek ?? 0} icon={TrendingUp} />
          </>
        )}
      </div>

      <h2 className="mt-12 text-xl font-bold tracking-tight">Recent applicants</h2>
      {recent.length > 0 ? (
        <div className="mt-4">
          <Table>
            <THead>
              <tr>
                <TH>Candidate</TH>
                <TH>Role</TH>
                <TH>Applied</TH>
                <TH>Status</TH>
                <TH className="text-right">Action</TH>
              </tr>
            </THead>
            <TBody>
              {recent.map((a) => (
                <TR key={a.id}>
                  <TD className="font-semibold">{a.name}</TD>
                  <TD className="text-muted-foreground">{a.job?.title ?? '—'}</TD>
                  <TD className="text-muted-foreground">{formatDate(a.applied)}</TD>
                  <TD>
                    <StatusBadge status={a.status} />
                  </TD>
                  <TD className="text-right">
                    <Link
                      to={`/company/applicants/${a.id}`}
                      className="font-semibold text-primary hover:underline"
                    >
                      View
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      ) : (
        <div className="mt-4">
          <EmptyState icon={Inbox} title="No applicants yet" description="Post a role to start receiving applications." />
        </div>
      )}
    </div>
  )
}
