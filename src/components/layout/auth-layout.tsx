import { Link, Outlet } from 'react-router-dom'
import { ThemeToggle } from '@/components/theme/theme-toggle'

/** Centered, minimal shell for Log in / Register. */
export function AuthLayout() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-muted/30 px-4 py-12">
      <div className="absolute right-4 top-4 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <Link
        to="/"
        className="mb-8 flex items-center gap-2 font-display text-xl font-extrabold tracking-tight"
      >
        <span className="h-5 w-5 rounded bg-foreground" aria-hidden="true" />
        WORKFRAME
      </Link>
      <div className="w-full max-w-md rounded border-2 border-border bg-card p-7 shadow-hard-lg sm:p-9">
        <Outlet />
      </div>
      <Link to="/" className="mt-6 text-sm font-semibold text-muted-foreground hover:text-foreground">
        ← Back to home
      </Link>
    </div>
  )
}
