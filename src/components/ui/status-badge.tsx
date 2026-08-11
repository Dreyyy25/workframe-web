import { Check, Clock, Search, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { AppStatus } from '@/lib/services'

/**
 * Application / applicant status pill. Status is conveyed by icon + text + color
 * (never color alone), per the accessibility baseline. Colors map to the
 * --success / --warning / --primary / --destructive / --muted tokens.
 */
const META: Record<AppStatus, { label: string; icon: LucideIcon; className: string }> = {
  pending: {
    label: 'Pending',
    icon: Clock,
    className: 'border-warning text-warning',
  },
  reviewed: {
    label: 'Reviewed',
    icon: Search,
    className: 'border-primary text-primary',
  },
  accepted: {
    label: 'Accepted',
    icon: Check,
    className: 'border-success text-success',
  },
  rejected: {
    label: 'Rejected',
    icon: X,
    className: 'border-destructive text-destructive',
  },
  withdrawn: {
    label: 'Withdrawn',
    icon: X,
    className: 'border-muted-foreground text-muted-foreground',
  },
}

export function StatusBadge({ status, className }: { status: AppStatus; className?: string }) {
  const { label, icon: Icon, className: tone } = META[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-[1.5px] px-2.5 py-1 text-xs font-semibold',
        tone,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  )
}
