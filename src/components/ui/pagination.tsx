import { cn } from '@/lib/utils'

/** Numbered pager — square 2px-bordered buttons, ink-filled current page. */
export function Pagination({
  page,
  pageCount,
  onChange,
}: {
  page: number
  pageCount: number
  onChange: (page: number) => void
}) {
  if (pageCount <= 1) return null
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1)
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-1.5">
      <PageButton disabled={page === 1} onClick={() => onChange(page - 1)} label="Previous page">
        ‹
      </PageButton>
      {pages.map((p) => (
        <PageButton key={p} active={p === page} onClick={() => onChange(p)} label={`Page ${p}`}>
          {p}
        </PageButton>
      ))}
      <PageButton disabled={page === pageCount} onClick={() => onChange(page + 1)} label="Next page">
        ›
      </PageButton>
    </nav>
  )
}

function PageButton({
  children,
  active,
  disabled,
  onClick,
  label,
}: {
  children: React.ReactNode
  active?: boolean
  disabled?: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-current={active ? 'page' : undefined}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-10 min-w-10 items-center justify-center rounded border-2 border-border px-3 font-display text-sm font-bold transition-colors disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-muted',
      )}
    >
      {children}
    </button>
  )
}
