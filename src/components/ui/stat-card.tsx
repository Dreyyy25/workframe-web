import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Dashboard metric tile: big display number + label, optional icon. */
export function StatCard({
  label,
  value,
  icon: Icon,
  className,
}: {
  label: string
  value: number | string
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div className={cn('rounded border-2 border-border bg-card p-5', className)}>
      <div className="flex items-start justify-between">
        <span className="font-display text-4xl font-extrabold leading-none tracking-tight">
          {value}
        </span>
        {Icon && (
          <span className="inline-flex h-9 w-9 items-center justify-center rounded border-2 border-border bg-muted text-muted-foreground">
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
