import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ExternalLink } from 'lucide-react'
import { getCompany } from '@/lib/mock/services'
import { JobCard } from '@/components/jobs/job-card'
import { Breadcrumb } from '@/components/ui/breadcrumb'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'

export default function CompanyProfile() {
  const { id = '' } = useParams()
  const { data: company, isLoading } = useQuery({
    queryKey: ['company', id],
    queryFn: () => getCompany(id),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="mt-6 h-20 w-full max-w-md" />
        <Skeleton className="mt-10 h-48 w-full" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="mx-auto max-w-content px-4 py-20 sm:px-6">
        <EmptyState title="Company not found">
          <Link to="/companies">
            <Button variant="outline">Browse companies</Button>
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-content px-4 py-10 sm:px-6">
      <Breadcrumb
        items={[
          { label: 'Home', to: '/' },
          { label: 'Companies', to: '/companies' },
          { label: company.name },
        ]}
      />

      {/* header */}
      <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Avatar fallback={company.logo} size={64} />
          <div>
            <h1 className="text-3xl font-extrabold tracking-tightest">{company.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="accent">{company.stream}</Badge>
              <Badge variant="muted" className="capitalize">
                {company.status}
              </Badge>
            </div>
          </div>
        </div>
        {company.website && (
          <a href={`https://${company.website}`} target="_blank" rel="noreferrer">
            <Button variant="outline">
              Visit website <ExternalLink className="h-4 w-4" />
            </Button>
          </a>
        )}
      </div>

      <p className="mt-6 max-w-prose text-lg italic leading-relaxed text-muted-foreground">
        {company.description}
      </p>

      {/* gallery */}
      {company.images.length > 0 && (
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {company.images.map((src) => (
            <img
              key={src}
              src={src}
              alt={`${company.name} workplace`}
              loading="lazy"
              className="aspect-[4/3] w-full rounded border-2 border-border object-cover"
            />
          ))}
        </div>
      )}

      {/* open roles */}
      <h2 className="mt-12 text-xl font-bold tracking-tight">
        Open roles at {company.name}
      </h2>
      {company.openRoles.length > 0 ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {company.openRoles.map((job) => (
            <JobCard key={job.id} job={{ ...job, company }} />
          ))}
        </div>
      ) : (
        <p className="mt-4 text-muted-foreground">No open roles right now — check back soon.</p>
      )}
    </div>
  )
}
