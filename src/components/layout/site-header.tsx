import { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutGrid, LogOut, Menu, User, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth/auth-context'
import { Button, buttonVariants } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import {
  DropdownItem,
  DropdownLink,
  DropdownMenu,
  DropdownSeparator,
} from '@/components/ui/dropdown-menu'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const NAV = [
  { label: 'Find Jobs', to: '/jobs' },
  { label: 'Companies', to: '/companies' },
  { label: 'For Employers', to: '/for-employers' },
]

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
      <span className="h-[18px] w-[18px] rounded bg-foreground" aria-hidden="true" />
      WORKFRAME
    </Link>
  )
}

function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  const { user, isSeeker, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    setOpen(false)
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-4 sm:px-6">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <NavLink
              key={item.label}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'text-[15px] font-semibold transition-colors hover:text-primary',
                  isActive ? 'text-primary' : 'text-foreground',
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          {!user && (
            <>
              <Link
                to="/login"
                className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}
              >
                Log in
              </Link>
              <Link
                to="/register"
                className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}
              >
                Sign up
              </Link>
            </>
          )}

          {user && (
            <div className="hidden sm:block">
              <DropdownMenu
                trigger={
                  <button
                    type="button"
                    aria-label="Account menu"
                    className="rounded-[5px] outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Avatar fallback={initials(user.name)} size={40} />
                  </button>
                }
              >
                <div className="px-2.5 py-1.5">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
                <DropdownSeparator />
                {isSeeker ? (
                  <>
                    <DropdownLink to="/seeker/dashboard">
                      <LayoutGrid /> Dashboard
                    </DropdownLink>
                    <DropdownLink to="/seeker/applications">
                      <User /> My applications
                    </DropdownLink>
                    <DropdownLink to="/seeker/profile">
                      <User /> Profile
                    </DropdownLink>
                  </>
                ) : (
                  <DropdownLink to="/company/dashboard">
                    <LayoutGrid /> Console
                  </DropdownLink>
                )}
                <DropdownLink to="/settings">
                  <User /> Settings
                </DropdownLink>
                <DropdownSeparator />
                <DropdownItem onSelect={handleLogout}>
                  <LogOut /> Log out
                </DropdownItem>
              </DropdownMenu>
            </div>
          )}

          <button
            type="button"
            aria-label="Menu"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex h-10 w-10 items-center justify-center rounded border-2 border-border bg-background text-foreground hover:bg-muted md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t-2 border-border bg-background px-4 py-4 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col gap-1">
            {NAV.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-2.5 text-[15px] font-semibold text-foreground hover:bg-muted"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              {!user ? (
                <>
                  <Link
                    to="/login"
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                  >
                    Log in
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}
                  >
                    Sign up
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    to={isSeeker ? '/seeker/dashboard' : '/company/dashboard'}
                    onClick={() => setOpen(false)}
                    className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}
                  >
                    {isSeeker ? 'Dashboard' : 'Console'}
                  </Link>
                  <Button variant="ghost" onClick={handleLogout} className="w-full">
                    Log out
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
