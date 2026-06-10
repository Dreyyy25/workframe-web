import * as React from 'react'
import { cn } from '@/lib/utils'

export const Label = React.forwardRef<
  HTMLLabelElement,
  React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }
>(({ className, required, children, ...props }, ref) => (
  <label
    ref={ref}
    className={cn('mb-1.5 block text-sm font-semibold text-foreground', className)}
    {...props}
  >
    {children}
    {required && <span className="ml-0.5 text-destructive">*</span>}
  </label>
))
Label.displayName = 'Label'
