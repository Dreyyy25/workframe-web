import { Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface Crumb {
  label: string
  to?: string
}

/** Compact breadcrumb trail; the last crumb renders as plain current-page text. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
      {items.map((item, i) => {
        const last = i === items.length - 1
        return (
          <Fragment key={`${item.label}-${i}`}>
            {item.to && !last ? (
              <Link to={item.to} className="transition-colors hover:text-foreground">
                {item.label}
              </Link>
            ) : (
              <span className={last ? 'font-semibold text-foreground' : undefined} aria-current={last ? 'page' : undefined}>
                {item.label}
              </span>
            )}
            {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />}
          </Fragment>
        )
      })}
    </nav>
  )
}
