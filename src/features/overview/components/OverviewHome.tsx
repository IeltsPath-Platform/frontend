import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/authSession'
import { useOverviewData } from '../hooks/useOverviewData'
import { heroCourses } from '../overviewViewModel'
import { dashboardBand } from '../overviewDashboardModel'
import { OverviewGeneralStats } from './OverviewGeneralStats'
import { OverviewHeroBanner } from './OverviewHeroBanner'
import { OverviewSkillsAndCourses } from './OverviewSkillsAndCourses'
import { OverviewBlockStatus } from './OverviewBlockStatus'

export function OverviewHome() {
  const navigate = useNavigate()
  const { userName, userId, email } = useAuthSession()
  const data = useOverviewData()
  const band = dashboardBand(data.report.data, data.profile.data?.selfReportedBand)
  const courses = heroCourses(data.progress.data)
  const heroSources = [data.profile, data.progress, data.report]
  return (
    <div className="overview-home-shell">
      <OverviewHeroBanner key={userId ?? email ?? 'guest'} username={data.profile.data?.displayName || userName} band={band} bandSourceLabel={band.sourceLabel} journeyStart={data.report.data?.placementBand ?? null} courses={courses} courseLoading={data.progress.loading && !data.progress.data} courseError={!!data.progress.error} onContinueStudy={(course) => navigate(course ? `/learn/courses/${course.id}` : '/learn')} />
      <OverviewBlockStatus loading={heroSources.some((resource) => resource.loading)} error={heroSources.find((resource) => resource.error)?.error ?? null} onRetry={() => heroSources.forEach((resource) => { if (resource.error) resource.reload() })} />
      <OverviewGeneralStats learning={data.learning} time={data.time} streak={data.streak} today={data.today} courses={courses} />
      <OverviewSkillsAndCourses report={data.report.data} courses={courses} reportSource={data.report} courseSource={data.progress} />
    </div>
  )
}
