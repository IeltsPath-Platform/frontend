import { useState } from 'react'
import { profileApi } from '@/features/profile/api/profileApi'
import { overviewApi } from '../api/overviewApi'
import { daysAgo, isoDate } from '../overviewViewModel'
import { useStatisticsResource } from './useStatisticsResource'

const STUDY_WINDOW_DAYS = 90
const PLACEMENT_WINDOW_DAYS = 365

/**
 * Everything the overview shows, one resource per source so a slow or failing source only affects its own block.
 * Study time is read for the last 90 days: it covers the calendar's recent months and the totals.
 */
export function useOverviewData() {
  const [today] = useState(() => new Date())
  const todayKey = isoDate(today)
  const studyFrom = isoDate(daysAgo(today, STUDY_WINDOW_DAYS - 1))
  const placementFrom = isoDate(daysAgo(today, PLACEMENT_WINDOW_DAYS - 1))

  return {
    today,
    profile: useStatisticsResource('overview-profile', () => profileApi.getProfile()),
    report: useStatisticsResource('overview-report', (signal) => overviewApi.report(signal)),
    streak: useStatisticsResource('overview-streak', (signal) => overviewApi.streak(signal)),
    progress: useStatisticsResource('overview-progress', (signal) => overviewApi.progress(0, '', signal)),
    time: useStatisticsResource(`overview-time:${studyFrom}:${todayKey}`, (signal) => overviewApi.time(studyFrom, todayKey, '', signal)),
    practice: useStatisticsResource('overview-practice', (signal) => overviewApi.practiceHistory(signal)),
    notebook: useStatisticsResource('overview-notebook', (signal) => overviewApi.notebook(signal)),
    placement: useStatisticsResource(`overview-placement:${placementFrom}`, (signal) =>
      overviewApi.bands(placementFrom, todayKey, 'OVERALL', 'PLACEMENT', '', signal)),
  }
}

export type OverviewData = ReturnType<typeof useOverviewData>
