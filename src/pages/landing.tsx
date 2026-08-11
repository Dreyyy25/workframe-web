import { Hero } from '@/components/landing/hero'
import { EditorialField } from '@/components/ui/editorial-field'
import { CategoryGrid } from '@/components/landing/category-grid'
import { FeaturedJobs } from '@/components/landing/featured-jobs'
import { ValueProps } from '@/components/landing/value-props'
import { EmployerCTA } from '@/components/landing/employer-cta'

export default function Landing() {
  return (
    <>
      <Hero />
      {/* one continuous ambient surface behind every below-hero section */}
      <div className="relative isolate">
        <EditorialField />
        <CategoryGrid />
        <FeaturedJobs />
        <ValueProps />
        <EmployerCTA />
      </div>
    </>
  )
}
