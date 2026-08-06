/**
 * Minimal toast system — no external dependency. Bottom-center, ink-on-bg pill
 * with an icon, auto-dismissing after ~3.5s. Mirrors the prototype's WFApp.toast.
 *
 * Usage: wrap the app in <ToastProvider>, then `const { toast } = useToast()`.
 */

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem {
  id: number
  message: string
  kind: ToastKind
}

interface ToastValue {
  toast: (message: string, kind?: ToastKind) => void
}

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const toast = useCallback((message: string, kind: ToastKind = 'success') => {
    const id = (seq.current += 1)
    setItems((prev) => [...prev, { id, message, kind }])
    window.setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] flex flex-col items-center gap-2 px-4">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex items-center gap-2 rounded border-2 border-secondary bg-secondary px-4 py-2.5 text-sm font-semibold text-secondary-foreground shadow-hard"
              role="status"
            >
              {t.kind === 'success' && <Check className="h-4 w-4 text-primary" />}
              {t.kind === 'error' && <X className="h-4 w-4 text-destructive" />}
              {t.kind === 'info' && <Info className="h-4 w-4 text-primary" />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within <ToastProvider>')
  return ctx
}
