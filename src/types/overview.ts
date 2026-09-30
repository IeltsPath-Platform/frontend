export type OverviewSidebarTab =
  | 'overview'
  | 'detailed-stats'
  | 'favorites'
  | 'history'
  | 'orders'
  | 'support'
  | 'profile'
  | 'ranking'

export interface UserAcademicProfile {
  username: string
  currentBand: number
  targetBand: number
  currentCourse: string
  startDate: string
  endDate: string
  courseCompletedPercent: number
  lessonsCount: number
  totalLessons: number
  remainingLessons: number
  nextLessonText: string
  journeyStart: number
  journeyCurrent: number
  journeyTarget: number
}

export interface GeneralStudyStats {
  totalStudyTime: string
  studyTimeWeeklyDiff: string
  totalStudyDays: number
  testsCompletedCount: number
  averageAccuracyRate: number
  currentStreakDays: number
  streakRecordMonth: string
}

export interface DayStreakItem {
  dayLabel: 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN'
  status: 'completed' | 'missed' | 'upcoming'
  badgeColor?: 'red' | 'blue' | 'gray'
}

export interface LearningOrbitSkill {
  name: 'Listening' | 'Reading' | 'Writing' | 'Speaking'
  band: number
  badgeText: 'PRIORITY FOCUS' | 'IMPROVE'
  badgeType: 'red' | 'green' | 'orange' | 'blue'
  percent: number
  details: { label: string; score?: string }[]
}

export interface StudyPlanItem {
  id: string
  category: 'Nghe' | 'Đọc' | 'Từ vựng' | 'Viết' | 'Nói'
  categoryColor: string
  title: string
  durationMinutes: number
  isCompleted: boolean
}

export interface SpaceAutonomyNode {
  letter: 'P' | 'E' | 'C' | 'A' | 'S'
  title: string
  scoreText: string
  level: string
}

export interface AiRecommendationItem {
  id: string
  iconType: 'headphones' | 'refresh' | 'pen'
  title: string
  badgeText: string
  description: string
}

export interface SkillProgressItem {
  skill: string
  percent: number
  status: 'Đúng tiến độ' | 'Nhanh hơn' | 'Chậm hơn'
  statusType: 'normal' | 'faster' | 'slower'
}

export interface MyCourseItem {
  id: string
  title: string
  badgeText: string
  subtitle: string
  progressText: string
  progressPercent: number
}
