import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { buttonVariants } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/theme-toggle'

const NAV = [
  { label: 'Find Jobs', href: '#featured' },
  { label: 'Companies', href: '#' },
  { label: 'For Employers', href: '#employers' },
]

function Brand() {
  return (
    <a href="/" className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
      <span className="h-[18px] w-[18px] rounded bg-foreground" aria-hidden="true" />
      WORKFRAME
    </a>
  )
}

export function SiteHeader() {
  const [open, setOpen] = useState(false)
  return (
    <header className="sticky top-0 z-40 border-b-2 border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between gap-6 px-4 sm:px-6">
        <Brand />

        <nav aria-label="Primary" className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-[15px] font-semibold text-foreground transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <a href="#" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'hidden sm:inline-flex')}>
            Log in
          </a>
          <a href="#" className={cn(buttonVariants({ variant: 'primary', size: 'sm' }), 'hidden sm:inline-flex')}>
            Sign up
          </a>
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
              <a
                key={item.label}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-2.5 text-[15px] font-semibold text-foreground hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2">
              <a href="#" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                Log in
              </a>
              <a href="#" className={cn(buttonVariants({ variant: 'primary' }), 'w-full')}>
                Sign up
              </a>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
