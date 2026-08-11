import * as React from 'react'
import { cn } from '@/lib/utils'

interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string
  /** Fallback shown when there's no image — typically initials. */
  fallback: string
  size?: number
}

/**
 * Square editorial avatar (2px border, sharp corners). Renders the image when
 * present, otherwise centered initials on a muted tile. Falls back to initials
 * if the image fails to load.
 */
export function Avatar({ src, fallback, size = 40, className, style, ...props }: AvatarProps) {
  const [failed, setFailed] = React.useState(false)
  const showImg = src && !failed
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded border-2 border-border bg-muted font-display text-sm font-bold uppercase text-foreground',
        className,
      )}
      style={{ width: size, height: size, ...style }}
      aria-hidden={!props['aria-label']}
      {...props}
    >
      {showImg ? (
        <img
          src={src}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        fallback
      )}
    </span>
  )
}
