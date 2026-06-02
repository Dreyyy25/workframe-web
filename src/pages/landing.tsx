import { MotionConfig } from 'framer-motion'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Hero } from '@/components/landing/hero'
import { CategoryGrid } from '@/components/landing/category-grid'
import { FeaturedJobs } from '@/components/landing/featured-jobs'
import { ValueProps } from '@/components/landing/value-props'
import { EmployerCTA } from '@/components/landing/employer-cta'

export default function Landing() {
  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">
          <Hero />
          <CategoryGrid />
          <FeaturedJobs />
          <ValueProps />
          <EmployerCTA />
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  )
}
