import { createContext, useContext, useId } from 'react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Lightweight controlled tabs. The parent owns `value`/`onValueChange`, so tab
 * state can live in the URL or local state. Underline-active styling matches
 * the prototype's `.tab` (2px bottom rule, accent active border).
 */
interface TabsCtx {
  value: string
  setValue: (v: string) => void
  base: string
}
const Ctx = createContext<TabsCtx | null>(null)

export function Tabs({
  value,
  onValueChange,
  children,
  className,
}: {
  value: string
  onValueChange: (v: string) => void
  children: ReactNode
  className?: string
}) {
  const base = useId()
  return (
    <Ctx.Provider value={{ value, setValue: onValueChange, base }}>
      <div className={className}>{children}</div>
    </Ctx.Provider>
  )
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      role="tablist"
      className={cn('flex gap-1 overflow-x-auto border-b-2 border-border', className)}
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('TabsTrigger must be used within <Tabs>')
  const active = ctx.value === value
  return (
    <button
      type="button"
      role="tab"
      id={`${ctx.base}-tab-${value}`}
      aria-selected={active}
      aria-controls={`${ctx.base}-panel-${value}`}
      onClick={() => ctx.setValue(value)}
      className={cn(
        '-mb-0.5 whitespace-nowrap border-b-[3px] px-3 py-2.5 text-[15px] font-semibold transition-colors',
        active
          ? 'border-primary text-foreground'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('TabsContent must be used within <Tabs>')
  if (ctx.value !== value) return null
  return (
    <div role="tabpanel" id={`${ctx.base}-panel-${value}`} aria-labelledby={`${ctx.base}-tab-${value}`}>
      {children}
    </div>
  )
}
