export type SessionStatus = 'completed' | 'today' | 'upcoming' | 'locked'

export interface ClassSession {
  id: string
  sessionNumber: number
  weekday: string
  dateLabel: string
  courseLevel: string
  title: string
  time: string
  status: SessionStatus
  progressPercentage: number
}

export interface ClassroomData {
  courseName: string
  courseRange: string
  studentName: string
  classCode: string
  teacherName: string
  schedule: string
  mentorName: string
  sessions: ClassSession[]
}
