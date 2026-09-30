export type SkillType = 'reading' | 'listening' | 'writing' | 'speaking'

export type PracticeMode = 'practice' | 'exam'
export type PassageAction = 'highlight' | 'note' | 'dictionary' | 'flashcard'

export interface TextHighlight {
  paragraph: string
  start: number
  end: number
}

export interface PassageSelection {
  text: string
  ranges: TextHighlight[]
}

export interface PracticeFlashcard {
  id: string
  testId: string
  word: string
  meaning: string
  example: string
  image?: string
  createdAt: string
}

export type ReadingFilterType = 'all' | 'uncompleted' | 'completed'

export type ReadingSubcategory =
  | 'passage-1'
  | 'passage-2'
  | 'passage-3'
  | 'full-test'

export type ResourceSource =
  | 'ielts-space-pro'
  | 'cambridge-10-20'
  | 'actual-tests'
  | 'other'

export interface PracticeCard {
  id: string
  title: string
  subtitle?: string
  passageBadge: string // 'Passage 1', 'Passage 2', 'Passage 3'
  tag: 'MIỄN PHÍ' | 'PRO'
  skill: SkillType
  readingType?: 'passage-1' | 'passage-2' | 'passage-3' | 'full'
  imageUrl: string
  bulletPoints: string[]
  questionsCount?: number
  partsCount?: number
  attemptsCount?: number
  votesCount?: number
  isCompleted?: boolean
  source?: ResourceSource
}

export interface PracticeNote {
  id: string
  testId: string
  title?: string
  paragraphLabel: string // e.g. 'Paragraph 1', 'Paragraph 3'
  selectedText: string
  noteText: string
  createdAt: string
  color?: string
}

export interface HeadingItem {
  id: string
  roman: string // e.g. 'i.', 'ii.', etc.
  title: string
}

export interface ParagraphQuestion {
  questionNumber: number
  paragraphLetter: string // 'C', 'D', etc.
  correctHeadingRoman?: string
  userSelectedHeadingRoman?: string
}

export interface ListeningQuestion {
  questionNumber: number
  cueStartSeconds: number
  cueEndSeconds: number
  prompt: string
  helperText: string
  placeholder: string
}

export interface WritingTaskPrompt {
  title: string
  instruction: string
  minimumWords: number
  timeLimitSeconds: number
}

export interface SpeakingCue {
  part: string
  title: string
  preparationSeconds: number
  speakingSeconds: number
  prompts: string[]
}
