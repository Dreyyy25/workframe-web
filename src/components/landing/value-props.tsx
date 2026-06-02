import { BadgeCheck, MousePointerClick, Radar, type LucideIcon } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { Spotlight, useSpotlight } from '@/components/ui/spotlight'

const PROPS = [
  {
    icon: BadgeCheck,
    title: 'Verified companies',
    body: 'Every employer is a real, active company profile — no ghost listings.',
  },
  {
    icon: MousePointerClick,
    title: 'One-click apply',
    body: 'Apply with your Workframe profile and a short cover letter in seconds.',
  },
  {
    icon: Radar,
    title: 'Track everything',
    body: 'See every application from pending to accepted in a single dashboard.',
  },
]

function PropCard({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  const { ref, bind } = useSpotlight<HTMLDivElement>()
  return (
    <div
      ref={ref}
      {...bind}
      className="group relative isolate flex h-full flex-col overflow-hidden rounded border-2 border-border bg-card p-6"
    >
      <Spotlight />
      <div className="relative z-10 flex h-full flex-col">
        <Icon className="h-7 w-7 text-primary" />
        <h3 className="mt-4 text-xl font-bold">{title}</h3>
        <p className="mt-2 text-muted-foreground">{body}</p>
      </div>
    </div>
  )
}

export function ValueProps() {
  return (
    <section className="relative">
      <div className="mx-auto max-w-content px-4 py-16 sm:px-6">
        <div className="grid gap-6 md:grid-cols-3">
          {PROPS.map((prop, i) => (
            <Reveal key={prop.title} delay={i * 0.06}>
              <PropCard icon={prop.icon} title={prop.title} body={prop.body} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
