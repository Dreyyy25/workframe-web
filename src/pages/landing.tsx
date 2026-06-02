import { MotionConfig } from 'framer-motion'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import { Hero } from '@/components/landing/hero'
import { EditorialField } from '@/components/ui/editorial-field'
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
          {/* one continuous ambient surface behind every below-hero section */}
          <div className="relative isolate">
            <EditorialField />
            <CategoryGrid />
            <FeaturedJobs />
            <ValueProps />
            <EmployerCTA />
          </div>
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  )
}
