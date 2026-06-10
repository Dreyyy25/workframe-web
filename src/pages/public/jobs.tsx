import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Search, SlidersHorizontal } from 'lucide-react'
import { listJobs, listJobTypes, listStreams } from '@/lib/mock/services'
import { JobCard } from '@/components/jobs/job-card'
import { Reveal } from '@/components/motion/reveal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Pagination } from '@/components/ui/pagination'

const PAGE_SIZE = 9

export default function Jobs() {
  const [params, setParams] = useSearchParams()
  const search = params.get('search') ?? ''
  const type = params.get('type') ?? ''
  const stream = params.get('stream') ?? ''
  const minSalary = params.get('minSalary') ?? ''
  const sort = (params.get('sort') as 'newest' | 'salary') ?? 'newest'
  const page = Number(params.get('page') ?? '1')

  const setParam = (key: string, value: string) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  }

  const { data: types } = useQuery({ queryKey: ['job-types'], queryFn: listJobTypes })
  const { data: streams } = useQuery({ queryKey: ['streams'], queryFn: listStreams })
  const { data, isLoading } = useQuery({
    queryKey: ['jobs', { search, type, stream, minSalary, sort, page }],
    queryFn: () =>
      listJobs({
        search: search || undefined,
        type: type || undefined,
        stream: stream || undefined,
        minSalary: minSalary ? Number(minSalary) : undefined,
        sort,
        page,
        pageSize: PAGE_SIZE,
      }),
  })

  const pageCount = data ? Math.ceil(data.count / PAGE_SIZE) : 0
  const hasFilters = Boolean(search || type || stream || minSalary)

  return (
    <div className="mx-auto max-w-content px-4 py-12 sm:px-6">
      <Reveal>
        <h1 className="text-3xl font-extrabold tracking-tightest sm:text-4xl">Browse jobs</h1>
        <p className="mt-2 text-muted-foreground">
          {data ? `${data.count} open ${data.count === 1 ? 'role' : 'roles'}` : 'Finding roles…'}
        </p>
      </Reveal>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        {/* filters */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded border-2 border-border bg-card p-5">
            <div className="mb-4 flex items-center gap-2 font-display text-sm font-bold">
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="f-search">Keyword</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="f-search"
                    value={search}
                    onChange={(e) => setParam('search', e.target.value)}
                    placeholder="Role, skill, company…"
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="f-type">Job type</Label>
                <Select id="f-type" value={type} onChange={(e) => setParam('type', e.target.value)}>
                  <option value="">All types</option>
                  {types?.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="f-stream">Category</Label>
                <Select
                  id="f-stream"
                  value={stream}
                  onChange={(e) => setParam('stream', e.target.value)}
                >
                  <option value="">All categories</option>
                  {streams?.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <Label htmlFor="f-salary">Min. salary (yearly)</Label>
                <Input
                  id="f-salary"
                  type="number"
                  inputMode="numeric"
                  value={minSalary}
                  onChange={(e) => setParam('minSalary', e.target.value)}
                  placeholder="e.g. 90000"
                />
              </div>

              {hasFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setParams({}, { replace: true })}
                >
                  Clear filters
                </Button>
              )}
            </div>
          </div>
        </aside>

        {/* results */}
        <div>
          <div className="mb-5 flex items-center justify-end">
            <div className="flex items-center gap-2">
              <Label htmlFor="f-sort" className="mb-0 text-muted-foreground">
                Sort
              </Label>
              <Select
                id="f-sort"
                value={sort}
                onChange={(e) => setParam('sort', e.target.value)}
                className="h-9 w-auto"
              >
                <option value="newest">Newest</option>
                <option value="salary">Highest salary</option>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="grid gap-5 sm:grid-cols-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[188px]" />
              ))}
            </div>
          ) : data && data.results.length > 0 ? (
            <>
              <div className="grid gap-5 sm:grid-cols-2">
                {data.results.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>
              <Pagination
                page={page}
                pageCount={pageCount}
                onChange={(p) => setParam('page', String(p))}
              />
            </>
          ) : (
            <EmptyState
              icon={Search}
              title="No roles match your filters"
              description="Try clearing a filter or broadening your keyword."
            >
              {hasFilters && (
                <Button variant="outline" onClick={() => setParams({}, { replace: true })}>
                  Clear filters
                </Button>
              )}
            </EmptyState>
          )}
        </div>
      </div>
    </div>
  )
}
