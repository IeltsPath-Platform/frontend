import { CheckCircle2, CircleDot, Flag, Lock, PlayCircle, type LucideIcon } from 'lucide-react'
import type { LessonStatus, TestStatus, TopicStatus } from '~types/learningPath'

export type StatusTone = 'success' | 'primary' | 'accent' | 'locked'

export interface StatusMeta {
  label: string
  tone: StatusTone
  icon: LucideIcon
}

export const TOPIC_STATUS: Record<TopicStatus, StatusMeta> = {
  PASSED: { label: 'Đã qua', tone: 'success', icon: CheckCircle2 },
  IN_PROGRESS: { label: 'Đang học', tone: 'primary', icon: PlayCircle },
  LOCKED: { label: 'Chưa mở', tone: 'locked', icon: Lock },
}

export const LESSON_STATUS: Record<LessonStatus, StatusMeta> = {
  COMPLETED: { label: 'Đã xong', tone: 'success', icon: CheckCircle2 },
  AVAILABLE: { label: 'Đang mở', tone: 'primary', icon: CircleDot },
  LOCKED: { label: 'Đang khóa', tone: 'locked', icon: Lock },
}

export const TEST_STATUS: Record<TestStatus, StatusMeta> = {
  PASSED: { label: 'Đã đạt', tone: 'success', icon: CheckCircle2 },
  AVAILABLE: { label: 'Sẵn sàng', tone: 'accent', icon: Flag },
  LOCKED: { label: 'Đang khóa', tone: 'locked', icon: Lock },
}

const UNKNOWN: StatusMeta = { label: 'Không rõ', tone: 'locked', icon: Lock }

export const topicStatusMeta = (status: string) => TOPIC_STATUS[status as TopicStatus] ?? UNKNOWN
export const lessonStatusMeta = (status: string) => LESSON_STATUS[status as LessonStatus] ?? UNKNOWN
export const testStatusMeta = (status: string) => TEST_STATUS[status as TestStatus] ?? UNKNOWN
