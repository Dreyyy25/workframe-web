import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-[1.5px] px-2.5 py-1 text-xs font-semibold [&_svg]:size-3',
  {
    variants: {
      variant: {
        outline: 'border-border text-foreground',
        accent: 'border-primary text-primary',
        muted: 'border-muted-foreground text-muted-foreground',
      },
    },
    defaultVariants: { variant: 'outline' },
  },
)

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}
