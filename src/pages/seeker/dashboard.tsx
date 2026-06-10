import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight, Clock, FileText, Search } from 'lucide-react'
import { listApplications, listJobs } from '@/lib/mock/services'
import { useAuth } from '@/lib/auth/auth-context'
import { JobCard } from '@/components/jobs/job-card'
import { StatCard } from '@/components/ui/stat-card'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { formatDate } from '@/lib/format'

export default function SeekerDashboard() {
  const { user } = useAuth()
  const firstName = user?.name.split(' ')[0] ?? 'there'

  const { data: apps, isLoading: appsLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
  })
  const { data: recommended } = useQuery({
    queryKey: ['jobs', 'recommended'],
    queryFn: () => listJobs({ pageSize: 3 }),
  })

  const stats = {
    total: apps?.length ?? 0,
    pending: apps?.filter((a) => a.status === 'pending').length ?? 0,
    reviewed: apps?.filter((a) => a.status === 'reviewed').length ?? 0,
    accepted: apps?.filter((a) => a.status === 'accepted').length ?? 0,
  }
  const recent = apps?.slice(0, 5) ?? []

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tightest">Welcome back, {firstName}</h1>
      <p className="mt-2 text-muted-foreground">Here’s where your job search stands today.</p>

      {/* stats */}
      <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {appsLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard label="Total applications" value={stats.total} icon={FileText} />
            <StatCard label="Pending" value={stats.pending} icon={Clock} />
            <StatCard label="Reviewed" value={stats.reviewed} icon={Search} />
            <StatCard label="Accepted" value={stats.accepted} icon={FileText} />
          </>
        )}
      </div>

      <div className="mt-12 grid gap-12 lg:grid-cols-[1fr_360px]">
        {/* recommended */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold tracking-tight">Recommended for you</h2>
            <Link to="/jobs" className="text-sm font-semibold text-primary hover:underline">
              Browse all
            </Link>
          </div>
          <div className="mt-5 grid gap-5 sm:grid-cols-2">
            {recommended?.results.map((job) => <JobCard key={job.id} job={job} />)}
          </div>
        </section>

        {/* recent applications */}
        <section>
          <h2 className="text-xl font-bold tracking-tight">Recent applications</h2>
          {recent.length > 0 ? (
            <ul className="mt-5 space-y-3">
              {recent.map((a) => (
                <li key={a.id}>
                  <Link
                    to={`/seeker/applications/${a.id}`}
                    className="flex items-center gap-3 rounded border-2 border-border bg-card p-4 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-sm font-bold">
                        {a.job?.title ?? 'Role'}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {a.job?.company?.name} · {formatDate(a.applied)}
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-5">
              <EmptyState
                icon={FileText}
                title="No applications yet"
                description="Find a role and apply — it’ll show up here."
              >
                <Link to="/jobs">
                  <Button variant="outline">Browse jobs</Button>
                </Link>
              </EmptyState>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
