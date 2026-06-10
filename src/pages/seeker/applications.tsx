import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { FileText } from 'lucide-react'
import { listApplications, withdrawApplication } from '@/lib/mock/services'
import { useToast } from '@/components/ui/toast'
import { StatusBadge } from '@/components/ui/status-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/format'
import type { AppStatus } from '@/lib/mock/types'

const FILTERS: { label: string; value: AppStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Reviewed', value: 'reviewed' },
  { label: 'Accepted', value: 'accepted' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Withdrawn', value: 'withdrawn' },
]

export default function SeekerApplications() {
  const [filter, setFilter] = useState<AppStatus | 'all'>('all')
  const qc = useQueryClient()
  const { toast } = useToast()

  const { data: apps, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: listApplications,
  })

  const withdraw = useMutation({
    mutationFn: (id: string) => withdrawApplication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] })
      toast('Application withdrawn')
    },
  })

  const filtered = (apps ?? []).filter((a) => filter === 'all' || a.status === filter)

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-extrabold tracking-tightest">My applications</h1>
      <p className="mt-2 text-muted-foreground">Track every role you’ve applied to.</p>

      {/* filter chips */}
      <div className="mt-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-sm border-2 px-3 py-1.5 text-sm font-semibold transition-colors',
              filter === f.value
                ? 'border-border bg-secondary text-secondary-foreground'
                : 'border-border bg-background text-foreground hover:bg-muted',
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : filtered.length > 0 ? (
        <ul className="mt-6 space-y-3">
          {filtered.map((a) => (
            <li
              key={a.id}
              className="flex flex-col gap-4 rounded border-2 border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <Link
                  to={`/seeker/applications/${a.id}`}
                  className="font-display text-lg font-bold tracking-tight hover:text-primary"
                >
                  {a.job?.title ?? 'Role'}
                </Link>
                <p className="mt-1 text-sm text-muted-foreground">
                  {a.job?.company?.name} · Applied {formatDate(a.applied)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={a.status} />
                {(a.status === 'pending' || a.status === 'reviewed') && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={withdraw.isPending}
                    onClick={() => withdraw.mutate(a.id)}
                  >
                    Withdraw
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <EmptyState
            icon={FileText}
            title={filter === 'all' ? 'No applications yet' : `No ${filter} applications`}
            description="When you apply to roles, they’ll appear here."
          >
            <Link to="/jobs">
              <Button variant="outline">Browse jobs</Button>
            </Link>
          </EmptyState>
        </div>
      )}
    </div>
  )
}
