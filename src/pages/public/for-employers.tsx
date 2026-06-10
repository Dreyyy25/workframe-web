import { Link } from 'react-router-dom'
import { ClipboardList, LineChart, Users } from 'lucide-react'
import { Reveal } from '@/components/motion/reveal'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const FEATURES = [
  {
    icon: Users,
    title: 'Reach the right people',
    body: 'Your roles land in front of candidates who already work in your field — no shouting into the void.',
  },
  {
    icon: ClipboardList,
    title: 'Review in one place',
    body: 'Every applicant, cover letter, and status lives on one screen. Move people forward without the inbox chaos.',
  },
  {
    icon: LineChart,
    title: 'Decide with clarity',
    body: 'See applicant counts and momentum per post, so you know which roles need a nudge and which are flying.',
  },
]

const STEPS = [
  { n: 1, title: 'Create your company', body: 'Set up a profile that tells candidates who you are and why you’re worth joining.' },
  { n: 2, title: 'Post a role', body: 'Describe the job, the skills, and the compensation. Publish in minutes.' },
  { n: 3, title: 'Review and hire', body: 'Track applicants through pending, reviewed, and accepted — all from your console.' },
]

export default function ForEmployers() {
  return (
    <div>
      {/* hero */}
      <section className="mx-auto max-w-content px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            For companies
          </p>
          <h1 className="mt-4 max-w-3xl text-[clamp(2.25rem,6vw,4rem)] font-extrabold leading-[0.98] tracking-tightest">
            Hire people who are <span className="text-primary">actually a fit.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Post roles, manage applicants, and make decisions — all in one calm, fast console built
            for small teams that hire with intent.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/company/jobs/new" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }))}>
              Post a job
            </Link>
            <Link to="/register" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
              Create a company account
            </Link>
          </div>
        </Reveal>
      </section>

      {/* features */}
      <section className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 0.06}>
              <div className="h-full rounded border-2 border-border bg-card p-6">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded border-2 border-border bg-muted text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* steps */}
      <section className="mx-auto max-w-content px-4 py-12 sm:px-6">
        <Reveal>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Up and running in three steps</h2>
        </Reveal>
        <div className="mt-8 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.06}>
              <div className="h-full rounded border-2 border-border bg-card p-6">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded border-2 border-border font-display text-xl font-extrabold text-primary shadow-hard">
                  {s.n}
                </span>
                <h3 className="mt-4 font-display text-lg font-bold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mt-12 bg-secondary text-secondary-foreground">
        <div className="mx-auto flex max-w-content flex-col items-start gap-6 px-4 py-16 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to meet your next hire?</h2>
            <p className="mt-2 max-w-lg text-secondary-foreground/70">
              Create your company account and post your first role today.
            </p>
          </div>
          <Link
            to="/register"
            className="inline-flex h-12 items-center justify-center rounded border-2 border-primary bg-primary px-6 font-display text-base font-bold text-primary-foreground shadow-[3px_3px_0_hsl(var(--primary-foreground))] transition-transform hover:-translate-x-px hover:-translate-y-px"
          >
            Get started
          </Link>
        </div>
      </section>
    </div>
  )
}
