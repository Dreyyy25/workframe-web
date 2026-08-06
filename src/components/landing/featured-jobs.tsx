import { useQuery } from '@tanstack/react-query'
import { ArrowUpRight, MapPin } from 'lucide-react'
import { getJobPosts } from '@/lib/api/public'
import { money } from '@/lib/format'
import { SEED_FEATURED, type JobCardData } from '@/lib/seed'
import { Badge } from '@/components/ui/badge'
import { Reveal } from '@/components/motion/reveal'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Spotlight, useSpotlight } from '@/components/ui/spotlight'

async function loadFeatured(): Promise<JobCardData[]> {
  const posts = await getJobPosts({ page_size: 6, ordering: '-created_at' })
  return posts.results.map((p) => ({
    id: p.id,
    title: p.job_title,
    company: p.company.company_name,
    location: [p.job_location.city, p.job_location.country !== '—' ? p.job_location.country : null]
      .filter(Boolean)
      .join(', ') || '—',
    type: p.job_type.job_type_name,
    salary: money(
      p.salary_min == null ? null : Number(p.salary_min),
      p.salary_max == null ? null : Number(p.salary_max),
      p.salary_type || null,
    ),
  }))
}

function JobCard({ job }: { job: JobCardData }) {
  const { ref, bind } = useSpotlight<HTMLAnchorElement>()
  return (
    <a
      ref={ref}
      {...bind}
      href="#"
      className="group relative isolate flex h-full flex-col overflow-hidden rounded border-2 border-border bg-card p-6 transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
    >
      <Spotlight />
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="outline">{job.type}</Badge>
          <Badge variant="outline">
            <MapPin />
            {job.location}
          </Badge>
        </div>
        <h3 className="mt-4 text-lg font-bold leading-snug">{job.title}</h3>
        {job.company && <div className="mt-0.5 text-sm text-muted-foreground">{job.company}</div>}
        <div className="mt-5 flex items-center justify-between">
          {job.salary && <span className="font-display text-base font-extrabold text-primary">{job.salary}</span>}
          <span className="inline-flex items-center gap-1 font-display text-sm font-bold text-foreground transition-colors group-hover:text-primary">
            View role <ArrowUpRight className="h-4 w-4" />
          </span>
        </div>
      </div>
    </a>
  )
}

function SkeletonCard() {
  return (
    <div className="h-[176px] animate-pulse rounded border-2 border-border bg-muted" aria-hidden="true" />
  )
}

export function FeaturedJobs() {
  const { data, isLoading, isError } = useQuery({ queryKey: ['featured-jobs'], queryFn: loadFeatured })
  const jobs = isError || !data || data.length === 0 ? SEED_FEATURED : data

  return (
    <section id="featured" className="relative">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <Reveal>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)]">Featured roles</h2>
            <a href="#" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
              View all
            </a>
          </div>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
            : jobs.map((job, i) => (
                <Reveal key={job.id} delay={i * 0.05}>
                  <JobCard job={job} />
                </Reveal>
              ))}
        </div>
      </div>
    </section>
  )
}
