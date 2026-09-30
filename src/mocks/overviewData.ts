import type {
  UserAcademicProfile,
  GeneralStudyStats,
  DayStreakItem,
  LearningOrbitSkill,
  StudyPlanItem,
  SpaceAutonomyNode,
  AiRecommendationItem,
  SkillProgressItem,
  MyCourseItem,
} from '@/types/overview'

export const MOCK_USER_PROFILE: UserAcademicProfile = {
  username: 'Username',
  currentBand: 5.0,
  targetBand: 7.0,
  currentCourse: 'IELTS 7.0',
  startDate: '14/07/2026',
  endDate: '14/09/2026',
  courseCompletedPercent: 37.5,
  lessonsCount: 12,
  totalLessons: 32,
  remainingLessons: 20,
  nextLessonText: 'Bài 13 · Thứ Sáu 18:00',
  journeyStart: 4.5,
  journeyCurrent: 5.5,
  journeyTarget: 7.0,
}

export const MOCK_GENERAL_STATS: GeneralStudyStats = {
  totalStudyTime: '47h 20m',
  studyTimeWeeklyDiff: '+2h tuần này',
  totalStudyDays: 38,
  testsCompletedCount: 124,
  averageAccuracyRate: 76,
  currentStreakDays: 28,
  streakRecordMonth: 'tháng 7',
}

export const MOCK_WEEKLY_STREAK: DayStreakItem[] = [
  { dayLabel: 'T2', status: 'completed', badgeColor: 'red' },
  { dayLabel: 'T3', status: 'completed', badgeColor: 'blue' },
  { dayLabel: 'T4', status: 'completed', badgeColor: 'red' },
  { dayLabel: 'T5', status: 'completed', badgeColor: 'red' },
  { dayLabel: 'T6', status: 'completed', badgeColor: 'red' },
  { dayLabel: 'T7', status: 'upcoming', badgeColor: 'gray' },
  { dayLabel: 'CN', status: 'upcoming', badgeColor: 'gray' },
]

export const MOCK_ORBIT_SKILLS: Record<string, LearningOrbitSkill> = {
  listening: {
    name: 'Listening',
    band: 5.0,
    badgeText: 'PRIORITY FOCUS',
    badgeType: 'red',
    percent: 70,
    details: [
      { label: 'Part 1', score: '5/10' },
      { label: 'Part 2', score: '5/10' },
      { label: 'Part 3', score: '5/10' },
      { label: 'Part 4', score: '5/10' },
    ],
  },
  reading: {
    name: 'Reading',
    band: 5.5,
    badgeText: 'PRIORITY FOCUS',
    badgeType: 'green',
    percent: 65,
    details: [
      { label: 'Part 1' },
      { label: 'Part 2' },
      { label: 'Part 3' },
    ],
  },
  writing: {
    name: 'Writing',
    band: 5.5,
    badgeText: 'IMPROVE',
    badgeType: 'orange',
    percent: 55,
    details: [
      { label: 'Task Achievement/Response' },
      { label: 'Coherence & Cohesion' },
      { label: 'Lexical Resource' },
      { label: 'Grammatical Range & Accuracy' },
    ],
  },
  speaking: {
    name: 'Speaking',
    band: 5.5,
    badgeText: 'IMPROVE',
    badgeType: 'blue',
    percent: 55,
    details: [
      { label: 'Fluency & Coherence' },
      { label: 'Lexical Resource' },
      { label: 'Grammatical Range & Accuracy' },
      { label: 'Pronunciation' },
    ],
  },
}

export const MOCK_STUDY_PLAN_TASKS: StudyPlanItem[] = [
  {
    id: 'sp-1',
    category: 'Nghe',
    categoryColor: '#2563eb',
    title: 'Unit 4 – Listening Practice',
    durationMinutes: 30,
    isCompleted: true,
  },
  {
    id: 'sp-2',
    category: 'Đọc',
    categoryColor: '#10b981',
    title: 'Reading Passage: Education',
    durationMinutes: 20,
    isCompleted: true,
  },
  {
    id: 'sp-3',
    category: 'Từ vựng',
    categoryColor: '#f59e0b',
    title: 'Ôn 24 từ – Space Repetition',
    durationMinutes: 10,
    isCompleted: false,
  },
  {
    id: 'sp-4',
    category: 'Viết',
    categoryColor: '#8b5cf6',
    title: 'Writing Task 2 – Line Graph Essay',
    durationMinutes: 45,
    isCompleted: false,
  },
  {
    id: 'sp-5',
    category: 'Nói',
    categoryColor: '#3b82f6',
    title: 'Speaking Part 2 – Hometown',
    durationMinutes: 15,
    isCompleted: false,
  },
]

export const MOCK_SPACE_AUTONOMY_NODES: SpaceAutonomyNode[] = [
  { letter: 'P', title: 'Probe', scoreText: '2/3', level: 'Guided' },
  { letter: 'E', title: 'Evaluate', scoreText: '2/3', level: 'Guided' },
  { letter: 'C', title: 'Communicate', scoreText: '3/3', level: 'Independent' },
  { letter: 'A', title: 'Assemble', scoreText: '3/3', level: 'Independent' },
  { letter: 'S', title: 'Scope', scoreText: '3/3', level: 'Independent' },
]

export const MOCK_AI_RECOMMENDATIONS: AiRecommendationItem[] = [
  {
    id: 'rec-1',
    iconType: 'headphones',
    title: 'Luyện nghe',
    badgeText: 'Ưu tiên cao',
    description: 'Đề luyện nghe môn trắc nghiệm, chủ đề Lifestyle – ưu tiên cao',
  },
  {
    id: 'rec-2',
    iconType: 'refresh',
    title: 'Ôn Flashcard Hôm Nay',
    badgeText: 'Cần ôn hôm nay',
    description: '24 từ theo lịch Spaced Repetition cá nhân hoá cần ôn hôm nay',
  },
  {
    id: 'rec-3',
    iconType: 'pen',
    title: 'Writing Task 2 Practice',
    badgeText: 'Điểm yếu',
    description: 'Essay chủ đề Education – điểm yếu cần cải thiện gấp, hãy tích cực ôn',
  },
]

export const MOCK_SKILL_PROGRESS: SkillProgressItem[] = [
  { skill: 'Listening', percent: 62, status: 'Đúng tiến độ', statusType: 'normal' },
  { skill: 'Reading', percent: 80, status: 'Nhanh hơn', statusType: 'faster' },
  { skill: 'Writing', percent: 48, status: 'Chậm hơn', statusType: 'slower' },
  { skill: 'Speaking', percent: 20, status: 'Chậm hơn', statusType: 'slower' },
]

export const MOCK_MY_COURSES: MyCourseItem[] = [
  {
    id: 'course-1',
    title: 'IELTS 6.0 Intensive',
    badgeText: 'Intermediate',
    subtitle: 'Khoá chính · 32 buổi',
    progressText: '12 / 32 buổi',
    progressPercent: 37,
  },
  {
    id: 'course-2',
    title: 'Ngữ Pháp Nâng Cao',
    badgeText: 'Upper-Inter',
    subtitle: 'Writing & Speaking · 20 buổi',
    progressText: '13 / 20 buổi',
    progressPercent: 65,
  },
  {
    id: 'course-3',
    title: 'Từ Vựng Academic',
    badgeText: 'Advanced',
    subtitle: 'IELTS Word list · 20 buổi',
    progressText: '4 / 20 buổi',
    progressPercent: 20,
  },
  {
    id: 'course-4',
    title: 'Speaking Masterclass',
    badgeText: 'Intermediate',
    subtitle: 'Phát âm & Fluency · 16 buổi',
    progressText: '8 / 16 buổi',
    progressPercent: 50,
  },
]
