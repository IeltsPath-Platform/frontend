export const SKILLS = ["READING", "LISTENING", "WRITING", "SPEAKING"] as const

export type ExamSkill = (typeof SKILLS)[number]
export type QuestionType =
  | "MULTIPLE_CHOICE"
  | "MATCHING_HEADINGS"
  | "TRUE_FALSE_NOT_GIVEN"
  | "FILL_IN_THE_BLANK"

export interface Question {
  id: string
  number: number
  type: QuestionType
  prompt: string
  options?: string[]
  answer?: string
}

export interface Passage {
  id: string
  title: string
  content: string
  questions: Question[]
}

export interface ListeningSection {
  id: string
  title: string
  transcript: string
  audioLabel: string
  questions: Question[]
}

export interface WritingTask {
  id: string
  title: string
  prompt: string
  minimumWords: number
}

export interface SpeakingPrompt {
  part: 1 | 2 | 3
  topic: string
  prompts: string[]
}

export interface Exam {
  id: string
  title: string
  collection: string
  description: string
  skill: ExamSkill | "FULL_TEST"
  durationMinutes: number
  questionCount: number
  attemptCount: number
  averageBand: number
  level: string
}

export interface Submission {
  id: string
  examTitle: string
  completedAt: string
  overallBand: number
  skills: Record<ExamSkill, number>
}
