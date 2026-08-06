import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export default function NotFound() {
  return (
    <section className="mx-auto flex min-h-[70vh] max-w-content flex-col items-center justify-center px-4 py-20 text-center sm:px-6">
      <p className="font-display text-[clamp(5rem,18vw,11rem)] font-extrabold leading-none tracking-tightest">
        4<span className="text-primary">0</span>4
      </p>
      <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        This page took a different job
      </h1>
      <p className="mt-3 max-w-md text-muted-foreground">
        The page you’re looking for moved on. Let’s get you back to the good stuff.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link to="/" className={cn(buttonVariants({ variant: 'primary' }))}>
          Back to home
        </Link>
        <Link to="/jobs" className={cn(buttonVariants({ variant: 'outline' }))}>
          Browse jobs
        </Link>
      </div>
    </section>
  )
}
