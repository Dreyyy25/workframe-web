import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

/** Dashed-border empty/zero state — centered icon, title, optional CTA. */
export function EmptyState({ icon: Icon, title, description, children, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded border-2 border-dashed border-border px-6 py-14 text-center',
        className,
      )}
    >
      {Icon && (
        <span className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded border-2 border-border bg-muted text-muted-foreground">
          <Icon className="h-6 w-6" />
        </span>
      )}
      <h2 className="font-display text-lg font-bold tracking-tight">{title}</h2>
      {description && <p className="mt-1.5 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  )
}
