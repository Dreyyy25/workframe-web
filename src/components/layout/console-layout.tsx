import { useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Briefcase, Building2, Inbox, LayoutGrid, LogOut, Menu, Plus, Settings, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { ThemeToggle } from '@/components/theme/theme-toggle'

interface NavItem {
  label: string
  to: string
  icon: LucideIcon
  end?: boolean
}

const NAV: NavItem[] = [
  { label: 'Dashboard', to: '/company/dashboard', icon: LayoutGrid },
  { label: 'Job Posts', to: '/company/jobs', icon: Briefcase, end: true },
  { label: 'Post a Job', to: '/company/jobs/new', icon: Plus },
  { label: 'Applicants', to: '/company/applicants', icon: Inbox },
  { label: 'Company Profile', to: '/company/profile', icon: Building2 },
  { label: 'Settings', to: '/company/settings', icon: Settings },
]

/** Company console shell: fixed sidebar on desktop, slide-in drawer on mobile. */
export function ConsoleLayout() {
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-dvh bg-background lg:flex">
      {/* mobile scrim */}
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      <Sidebar open={open} onNavigate={() => setOpen(false)} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* topbar */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b-2 border-border bg-background/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 w-10 items-center justify-center rounded border-2 border-border bg-background hover:bg-muted lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="truncate font-display text-sm font-bold tracking-tight">
            {user?.name ?? 'Northwind Labs'}
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex h-10 items-center gap-2 rounded border-2 border-border bg-background px-3 text-sm font-semibold hover:bg-muted"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Log out</span>
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 py-8 sm:px-6 lg:px-10">
          <div className="mx-auto max-w-5xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}

function Sidebar({ open, onNavigate }: { open: boolean; onNavigate: () => void }) {
  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r-2 border-border bg-card transition-transform lg:static lg:translate-x-0',
        open ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b-2 border-border px-5">
        <Link to="/company/dashboard" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
          <span className="h-[18px] w-[18px] rounded bg-foreground" aria-hidden="true" />
          WORKFRAME
        </Link>
        <button
          type="button"
          aria-label="Close menu"
          onClick={onNavigate}
          className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-border lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {NAV.map(({ label, to, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded border-2 px-3 py-2.5 text-[15px] font-semibold transition-colors',
                isActive
                  ? 'border-border bg-background text-foreground shadow-hard'
                  : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground',
              )
            }
          >
            <Icon className="h-[18px] w-[18px]" />
            {label}
          </NavLink>
        ))}
      </nav>
      <div className="border-t-2 border-border p-3">
        <Link
          to="/"
          className="flex items-center gap-2.5 rounded px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          ← Back to site
        </Link>
      </div>
    </aside>
  )
}
