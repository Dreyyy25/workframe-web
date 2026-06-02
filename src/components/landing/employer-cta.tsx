import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { Reveal } from '@/components/motion/reveal'

export function EmployerCTA() {
  return (
    <section id="employers" className="mx-auto max-w-content px-4 py-12 sm:px-6">
      <Reveal>
        <div className="flex flex-col items-start justify-between gap-6 rounded border-2 border-border bg-foreground px-8 py-12 text-background sm:flex-row sm:items-center">
          <div>
            <h2 className="text-[clamp(1.5rem,3vw,2.25rem)] text-background">
              Hiring? Post a job in minutes.
            </h2>
            <p className="mt-2 max-w-lg text-background/75">
              Reach qualified candidates and manage every applicant in one simple console.
            </p>
          </div>
          <a href="#" className={cn(buttonVariants({ variant: 'primary', size: 'lg' }), 'shrink-0')}>
            Post a job
          </a>
        </div>
      </Reveal>
    </section>
  )
}
