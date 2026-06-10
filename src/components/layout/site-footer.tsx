const COLUMNS = [
  { title: 'For Seekers', links: ['Browse jobs', 'Companies'] },
  { title: 'For Companies', links: ['Post a job', 'Sign up'] },
  { title: 'Workframe', links: ['Home', 'About'] },
]

export function SiteFooter() {
  return (
    <footer className="relative mt-24 before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-border/55 before:to-transparent">
      <div className="mx-auto flex max-w-content flex-wrap justify-between gap-10 px-4 py-12 sm:px-6">
        <div className="max-w-xs">
          <div className="flex items-center gap-2 font-display text-lg font-extrabold tracking-tight">
            <span className="h-[18px] w-[18px] rounded bg-foreground" aria-hidden="true" />
            WORKFRAME
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Find work that works for you. A two-sided job marketplace.
          </p>
        </div>
        {COLUMNS.map((col) => (
          <div key={col.title}>
            <h4 className="mb-3 font-display text-sm font-bold">{col.title}</h4>
            <ul className="space-y-2">
              {col.links.map((link) => (
                <li key={link}>
                  <a href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </footer>
  )
}
