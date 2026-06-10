import { Route, Routes } from 'react-router-dom'

import { MarketingLayout } from '@/components/layout/marketing-layout'
import { AuthLayout } from '@/components/layout/auth-layout'
import { ConsoleLayout } from '@/components/layout/console-layout'
import { RequireAuth } from '@/components/layout/require-auth'

import Landing from '@/pages/landing'
import Jobs from '@/pages/public/jobs'
import JobDetail from '@/pages/public/job-detail'
import Companies from '@/pages/public/companies'
import CompanyProfile from '@/pages/public/company-profile'
import ForEmployers from '@/pages/public/for-employers'
import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import SeekerDashboard from '@/pages/seeker/dashboard'
import SeekerApplications from '@/pages/seeker/applications'
import ApplicationDetail from '@/pages/seeker/application-detail'
import SeekerProfilePage from '@/pages/seeker/profile'
import CompanyDashboard from '@/pages/company/dashboard'
import CompanyJobs from '@/pages/company/jobs'
import PostJob from '@/pages/company/post-job'
import CompanyApplicants from '@/pages/company/applicants'
import ApplicantDetail from '@/pages/company/applicant-detail'
import CompanyProfilePage from '@/pages/company/profile'
import Settings from '@/pages/settings'
import NotFound from '@/pages/not-found'

/**
 * Route map. Public + seeker pages live under the marketing shell; the company
 * area lives under the console shell (role-guarded). Screens not yet built
 * render <Placeholder> so every link is live while the area is filled in.
 */
export function AppRoutes() {
  return (
    <Routes>
      {/* Public + seeker (marketing shell) */}
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
        <Route path="/companies" element={<Companies />} />
        <Route path="/companies/:id" element={<CompanyProfile />} />
        <Route path="/for-employers" element={<ForEmployers />} />

        <Route element={<RequireAuth role="job_seeker" />}>
          <Route path="/seeker/dashboard" element={<SeekerDashboard />} />
          <Route path="/seeker/applications" element={<SeekerApplications />} />
          <Route path="/seeker/applications/:id" element={<ApplicationDetail />} />
          <Route path="/seeker/profile" element={<SeekerProfilePage />} />
        </Route>

        <Route element={<RequireAuth />}>
          <Route path="/settings" element={<Settings />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Auth (centered shell) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>

      {/* Company (console shell, role-guarded) */}
      <Route element={<RequireAuth role="company" />}>
        <Route element={<ConsoleLayout />}>
          <Route path="/company/dashboard" element={<CompanyDashboard />} />
          <Route path="/company/jobs" element={<CompanyJobs />} />
          <Route path="/company/jobs/new" element={<PostJob />} />
          <Route path="/company/jobs/:id/edit" element={<PostJob />} />
          <Route path="/company/applicants" element={<CompanyApplicants />} />
          <Route path="/company/applicants/:id" element={<ApplicantDetail />} />
          <Route path="/company/profile" element={<CompanyProfilePage />} />
          <Route path="/company/settings" element={<Settings />} />
        </Route>
      </Route>
    </Routes>
  )
}
