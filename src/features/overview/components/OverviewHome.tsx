import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthSession } from '@/features/auth/authSession'
import { useOverviewData } from '../hooks/useOverviewData'
import {
  bandSummary,
  calendarStatuses,
  currentCourse,
  orbitSkills,
  recommendations,
} from '../overviewViewModel'
import { OverviewActivityCalendar } from './OverviewActivityCalendar'
import { OverviewAiRecommendations } from './OverviewAiRecommendations'
import { OverviewGeneralStats } from './OverviewGeneralStats'
import { OverviewHeroBanner } from './OverviewHeroBanner'
import { OverviewLearningOrbit } from './OverviewLearningOrbit'

/** The "Tổng quát" tab: every block reads the learner's own data and degrades to dashes when a source has nothing. */
export const OverviewHome: React.FC = () => {
  const navigate = useNavigate()
  const { userName } = useAuthSession()
  const data = useOverviewData()

  const band = bandSummary(data.report.data, data.profile.data?.selfReportedBand)
  const course = currentCourse(data.progress.data)

  return (
    <div className="overview-flow-sections">
      <OverviewHeroBanner
        username={data.profile.data?.displayName || userName}
        band={band}
        journeyStart={data.placement.data?.baseline ?? null}
        course={course}
        onContinueStudy={() => navigate(course ? `/learn/courses/${course.id}` : '/learn')}
      />

      <OverviewGeneralStats time={data.time} practice={data.practice} streak={data.streak} today={data.today} />

      <OverviewActivityCalendar
        statuses={data.time.data ? calendarStatuses(data.time.data.days) : {}}
        currentStreakDays={data.streak.data?.currentDays ?? null}
        trackedFrom={data.time.data?.dataFrom ?? null}
        loading={data.time.loading && !data.time.data}
        error={data.time.error}
        onRetry={data.time.reload}
      />

      <OverviewLearningOrbit skills={orbitSkills(data.report.data)} band={band} />

      <OverviewAiRecommendations
        recommendations={recommendations(data.report.data, data.notebook.data)}
        onAction={(item) => navigate(item.to)}
      />
    </div>
  )
}
