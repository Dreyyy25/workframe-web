import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

/**
 * Minimal click-to-open menu (no external dependency). Closes on outside click
 * or Esc. `trigger` is rendered as-is; pass a button-like element.
 */
export function DropdownMenu({
  trigger,
  children,
  align = 'end',
  className,
}: {
  trigger: ReactNode
  children: ReactNode
  align?: 'start' | 'end'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            'absolute top-[calc(100%+8px)] z-50 min-w-[200px] rounded border-2 border-border bg-popover p-1.5 text-popover-foreground shadow-hard',
            align === 'end' ? 'right-0' : 'left-0',
            className,
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

const itemClass =
  'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm font-medium text-foreground transition-colors hover:bg-muted [&_svg]:h-4 [&_svg]:w-4 [&_svg]:text-muted-foreground'

export function DropdownItem({
  children,
  onSelect,
}: {
  children: ReactNode
  onSelect?: () => void
}) {
  return (
    <button type="button" role="menuitem" className={itemClass} onClick={onSelect}>
      {children}
    </button>
  )
}

export function DropdownLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} role="menuitem" className={itemClass}>
      {children}
    </Link>
  )
}

export function DropdownSeparator() {
  return <div className="my-1.5 h-px bg-border/40" role="separator" />
}
