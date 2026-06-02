import { useQuery } from '@tanstack/react-query'
import {
  Briefcase,
  Code2,
  DollarSign,
  HeartPulse,
  LineChart,
  Megaphone,
  PenTool,
  Settings2,
  type LucideIcon,
} from 'lucide-react'
import { getBusinessStreams } from '@/lib/api/public'
import { SEED_STREAMS } from '@/lib/seed'
import { Reveal } from '@/components/motion/reveal'
import { Spotlight, useSpotlight } from '@/components/ui/spotlight'

const ICONS: Record<string, LucideIcon> = {
  Software: Code2,
  Design: PenTool,
  'Data & AI': LineChart,
  Marketing: Megaphone,
  Finance: DollarSign,
  Healthcare: HeartPulse,
  Operations: Settings2,
  Sales: Briefcase,
}

function CategoryCard({ name }: { name: string }) {
  const Icon = ICONS[name] ?? Briefcase
  const { ref, bind } = useSpotlight<HTMLAnchorElement>()
  return (
    <a
      ref={ref}
      {...bind}
      href="#featured"
      className="group relative isolate flex h-full flex-col overflow-hidden rounded border-2 border-border bg-card p-5 transition-transform duration-150 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-hard"
    >
      <Spotlight />
      <div className="relative z-10 flex h-full flex-col gap-3">
        <Icon className="h-6 w-6 text-foreground transition-colors group-hover:text-primary" />
        <span className="font-display font-bold">{name}</span>
      </div>
    </a>
  )
}

export function CategoryGrid() {
  const { data, isError } = useQuery({
    queryKey: ['business-streams'],
    queryFn: getBusinessStreams,
  })

  const streams =
    isError || !data || data.results.length === 0
      ? SEED_STREAMS
      : data.results.map((s) => s.business_stream_name)

  return (
    <section className="relative">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <Reveal>
          <div className="mb-6 flex items-end justify-between gap-4">
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)]">Browse by category</h2>
          </div>
        </Reveal>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {streams.map((name, i) => (
            <Reveal key={name} delay={i * 0.04}>
              <CategoryCard name={name} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
