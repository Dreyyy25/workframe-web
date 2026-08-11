import { forwardRef } from 'react'
import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Spotlight, useSpotlight } from '@/components/ui/spotlight'
import { money, place } from '@/lib/format'
import type { JobWithCompany } from '@/lib/services'

/** Role-centric job card used across Browse, Company profile, and dashboards. */
export const JobCard = forwardRef<HTMLAnchorElement, { job: JobWithCompany }>(({ job }, _ref) => {
  const { ref, bind } = useSpotlight<HTMLAnchorElement>()
  const salary = money(job.salaryMin, job.salaryMax, job.salaryType)
  return (
    <Link
      ref={ref}
      {...bind}
      to={`/jobs/${job.id}`}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded border-2 border-border bg-card p-6 transition-transform hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
    >
      <Spotlight />
      <div className="relative z-10 flex flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">{job.type}</Badge>
          <Badge variant="outline">
            <MapPin />
            {place(job.city, job.country)}
          </Badge>
        </div>
        <h3 className="mt-4 font-display text-lg font-bold leading-snug tracking-tight">
          {job.title}
        </h3>
        {job.company && <p className="mt-1 text-sm text-muted-foreground">{job.company.name}</p>}
        <div className="mt-auto flex items-center justify-between pt-5">
          {salary && (
            <span className="font-display text-sm font-extrabold text-primary">{salary}</span>
          )}
          <span className="text-sm font-semibold text-foreground transition-colors group-hover:text-primary">
            View role →
          </span>
        </div>
      </div>
    </Link>
  )
})
JobCard.displayName = 'JobCard'
