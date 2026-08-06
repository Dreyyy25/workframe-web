import { useSearchParams } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Briefcase, Building2, Search } from 'lucide-react'
import { listCompanies, listStreams } from '@/lib/services'
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value'
import { Reveal } from '@/components/motion/reveal'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Spotlight, useSpotlight } from '@/components/ui/spotlight'
import type { CompanyListItem } from '@/lib/services'

export default function Companies() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const stream = params.get('stream') ?? ''

  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const debouncedSearch = useDebouncedValue(search)

  const { data: streams } = useQuery({
    queryKey: ['streams'],
    queryFn: listStreams,
    staleTime: Infinity,
  })
  const { data, isLoading } = useQuery({
    queryKey: ['companies', { search: debouncedSearch, stream }],
    queryFn: () =>
      listCompanies({ search: debouncedSearch || undefined, stream: stream || undefined }),
    placeholderData: keepPreviousData,
  })

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
      <Reveal>
        <h1 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">Companies</h1>
        <p className="mt-2 text-muted-foreground">
          Discover teams hiring on Workframe and the roles they’re filling.
        </p>
      </Reveal>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search companies"
            value={search}
            onChange={(e) => setParam('search', e.target.value)}
            placeholder="Search companies…"
            className="pl-10"
          />
        </div>
        <div className="sm:w-56">
          <Label htmlFor="c-stream" className="sr-only">
            Category
          </Label>
          <Select id="c-stream" value={stream} onChange={(e) => setParam('stream', e.target.value)}>
            <option value="">All categories</option>
            {streams?.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : data && data.length > 0 ? (
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      ) : (
        <div className="mt-8">
          <EmptyState
            icon={Building2}
            title="No companies found"
            description="Try a different search or category."
          />
        </div>
      )}
    </div>
  )
}

function CompanyCard({ company }: { company: CompanyListItem }) {
  const { ref, bind } = useSpotlight<HTMLAnchorElement>()
  return (
    <Link
      ref={ref}
      {...bind}
      to={`/companies/${company.id}`}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded border-2 border-border bg-card p-6 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
    >
      <Spotlight />
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex items-center gap-3">
          <Avatar fallback={company.logo} size={48} />
          <div className="min-w-0">
            <h3 className="truncate font-display text-base font-bold tracking-tight">
              {company.name}
            </h3>
            <Badge variant="muted" className="mt-1">
              {company.stream}
            </Badge>
          </div>
        </div>
        <p className="mt-4 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
          {company.description}
        </p>
        <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <Briefcase className="h-4 w-4 text-muted-foreground" />
          {company.openRolesCount} open {company.openRolesCount === 1 ? 'role' : 'roles'}
        </div>
      </div>
    </Link>
  )
}
