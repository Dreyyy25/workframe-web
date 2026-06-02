import { BadgeCheck, MousePointerClick, Radar } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'

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

export function ValueProps() {
  return (
    <section className="mx-auto max-w-content px-4 py-16 sm:px-6">
      <div className="grid gap-6 md:grid-cols-3">
        {PROPS.map((prop, i) => (
          <Reveal key={prop.title} delay={i * 0.06}>
            <div className="flex h-full flex-col rounded border-2 border-border bg-card p-6">
              <prop.icon className="h-7 w-7 text-primary" />
              <h3 className="mt-4 text-xl font-bold">{prop.title}</h3>
              <p className="mt-2 text-muted-foreground">{prop.body}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  )
}
