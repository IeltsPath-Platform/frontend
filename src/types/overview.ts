export type OverviewSidebarTab =
  | 'overview'
  | 'detailed-stats'
  | 'favorites'
  | 'history'
  | 'orders'
  | 'support'
  | 'profile'
  | 'ranking'

export interface LearningOrbitSkill {
  name: 'Listening' | 'Reading' | 'Writing' | 'Speaking'
  band: number | null
  badgeText: 'PRIORITY FOCUS' | 'ĐANG TỐT' | 'CHƯA CÓ DỮ LIỆU'
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
  iconType: 'headphones' | 'refresh' | 'pen' | 'book' | 'mic'
  title: string
  badgeText: string
  description: string
  /** Where "Bắt đầu ngay" goes: the screen for exactly this kind of practice. */
  to: string
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
