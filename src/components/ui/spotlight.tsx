import { useCallback, useRef, type MouseEvent } from 'react'
import { cn } from '@/lib/utils'

/**
 * Cursor-following spotlight (inspired by 21st.dev "Spotlight Card").
 * Tracks the pointer via CSS custom properties set on the host element, so
 * there are zero React re-renders per mouse move. Visibility is driven purely
 * by `group-hover`, which means it's inert on touch devices and naturally
 * respects the global reduced-motion transition reset.
 *
 * Usage: spread `ref` + `bind` on a `group relative isolate overflow-hidden`
 * element, drop <Spotlight /> as its first child, and wrap the content in a
 * `relative z-10` layer so it paints above the glow.
 */
export function useSpotlight<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null)
  const onMouseMove = useCallback((e: MouseEvent<T>) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
    el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
  }, [])
  return { ref, bind: { onMouseMove } }
}

export function Spotlight({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'pointer-events-none absolute inset-0 z-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100',
        className,
      )}
      style={{
        background:
          'radial-gradient(360px circle at var(--spot-x, 50%) var(--spot-y, 50%), hsl(var(--primary) / 0.12), transparent 60%)',
      }}
    />
  )
}
