import { useState } from 'react'
import { profileApi } from '@/features/profile/api/profileApi'
import { overviewApi } from '../api/overviewApi'
import { daysAgo, isoDate } from '../overviewViewModel'
import { useStatisticsResource } from './useStatisticsResource'

const STUDY_WINDOW_DAYS = 90

/**
 * Everything the overview shows, one resource per source so a slow or failing source only affects its own block.
 * Recent study days supply activity evidence; the owner-service overview supplies lifetime totals.
 */
export function useOverviewData() {
  const [today] = useState(() => new Date())
  const todayKey = isoDate(today)
  const studyFrom = isoDate(daysAgo(today, STUDY_WINDOW_DAYS - 1))

  return {
    today,
    profile: useStatisticsResource('overview-profile', () => profileApi.getProfile()),
    report: useStatisticsResource('overview-report', (signal) => overviewApi.report(signal)),
    streak: useStatisticsResource('overview-streak', (signal) => overviewApi.streak(signal)),
    progress: useStatisticsResource('overview-progress-all', (signal) => overviewApi.allProgress(signal)),
    time: useStatisticsResource(`overview-time:${studyFrom}:${todayKey}`, (signal) => overviewApi.time(studyFrom, todayKey, '', signal)),
    learning: useStatisticsResource('overview-learning', (signal) => overviewApi.learningOverview(signal)),
  }
}

export type OverviewData = ReturnType<typeof useOverviewData>
