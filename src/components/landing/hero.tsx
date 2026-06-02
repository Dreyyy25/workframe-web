import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.04 } },
}
const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } },
}

function scrollToFeatured(e: React.FormEvent) {
  e.preventDefault()
  document.getElementById('featured')?.scrollIntoView({ behavior: 'smooth' })
}

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* faint editorial grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:linear-gradient(to_right,hsl(var(--foreground))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--foreground))_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]"
      />
      <div className="relative mx-auto max-w-content px-4 py-20 sm:px-6 sm:py-28">
        <motion.div variants={container} initial="hidden" animate="show" className="max-w-3xl">
          <motion.p
            variants={item}
            className="text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground"
          >
            12,480 open roles · 900+ companies
          </motion.p>
          <motion.h1
            variants={item}
            className="mt-4 text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.97] tracking-tightest"
          >
            Find work that{' '}
            <span className="relative whitespace-nowrap text-primary">
              works
              <svg
                className="absolute -bottom-1.5 left-0 h-3 w-full text-primary"
                viewBox="0 0 200 12"
                fill="none"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="M2 8 C 50 3, 150 3, 198 7"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </span>{' '}
            for you.
          </motion.h1>
          <motion.p variants={item} className="mt-6 max-w-xl text-lg text-muted-foreground">
            Search thousands of roles from companies hiring right now — then apply in one place and
            track every application.
          </motion.p>
          <motion.form variants={item} onSubmit={scrollToFeatured} className="mt-8 flex max-w-xl flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted-foreground" />
              <Input
                aria-label="Search jobs"
                placeholder="Search role, skill or company…"
                className="pl-10"
              />
            </div>
            <Button type="submit" className="sm:w-auto">
              Search jobs
            </Button>
          </motion.form>
        </motion.div>
      </div>
    </section>
  )
}
