import * as React from 'react'
import { cn } from '@/lib/utils'

/** Styled native checkbox: 2px border, primary fill via accent-color. */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={cn(
      'h-[18px] w-[18px] shrink-0 cursor-pointer rounded-[3px] border-2 border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background',
      className,
    )}
    {...props}
  />
))
Checkbox.displayName = 'Checkbox'
