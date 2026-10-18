import type { Badge, DailyQuests, League, LeagueHistoryEntry, LearnerProgress, StreakStatus } from '~types/learningPath'
import { ApiError } from '../apiError'
import type { LearningApi } from '../learningApi'

type GamificationApi = Pick<
  LearningApi,
  'getProgress' | 'getStreak' | 'buyStreakFreeze' | 'getQuests' | 'getBadges' | 'getLeague' | 'getLeagueHistory'
>

const PROGRESS: LearnerProgress = { totalXp: 1240, level: 2, nextLevelAt: 2000, xpToNextLevel: 760, xpToday: 60, dailyCap: 100 }

const QUESTS: DailyQuests = {
  date: '2026-10-18',
  completed: 1,
  quests: [
    { type: 'PRACTICE', required: 5, progress: 5, completed: true, xpReward: 20, pointsReward: 5, target: null },
    {
      type: 'WEAKNESS', required: 3, progress: 1, completed: false, xpReward: 30, pointsReward: 0,
      target: { knowledgePointId: '00000000-0000-4000-8000-0000000000a3', code: 'R60_TFNG_F_VS_NG', name: 'False và Not Given' },
    },
    { type: 'STREAK', required: 1, progress: 0, completed: false, xpReward: 10, pointsReward: 0, target: null },
  ],
}

const BADGES: Badge[] = [
  { code: 'STREAK_7', name: 'Chuỗi 7 ngày', description: 'Học 7 ngày liên tiếp.', rewardPoints: 5, awarded: true,
    awardedAt: '2026-10-17T14:00:00Z', progress: { current: 7, target: 7 } },
  { code: 'STREAK_30', name: 'Chuỗi 30 ngày', description: 'Học 30 ngày liên tiếp.', rewardPoints: 15, awarded: false,
    awardedAt: null, progress: { current: 7, target: 30 } },
  { code: 'COURSE_PASSED', name: 'Hoàn thành khóa học', description: 'Đạt bài kiểm tra cuối khóa.', rewardPoints: 20,
    awarded: false, awardedAt: null, progress: null },
]

const LEAGUE: League = {
  tier: 'SILVER',
  weekStart: '2026-10-18',
  closesAt: '2026-10-25T00:00:00Z',
  joined: true,
  table: [
    { rank: 1, displayName: 'Mina', weeklyXp: 340, you: false, zone: 'PROMOTION' },
    { rank: 2, displayName: 'Lan', weeklyXp: 280, you: true, zone: 'PROMOTION' },
    { rank: 3, displayName: null, weeklyXp: 120, you: false, zone: 'SAFE' },
  ],
  groupSize: 30,
  promoteTop: 7,
  demoteFrom: 23,
}

const HISTORY: LeagueHistoryEntry[] = [
  { weekStart: '2026-10-11', tier: 'BRONZE', weeklyXp: 410, finalRank: 2, outcome: 'PROMOTED' },
]

/** Fixed values for the gamification screens, plus a streak freeze that can be bought once. */
export function createMockGamification(): GamificationApi {
  let streak: StreakStatus = {
    currentDays: 7, longestDays: 16, freezeAvailable: false, nextFreezeCost: 10, activeToday: true, lostStreakDays: 0,
  }

  return {
    getProgress: async () => structuredClone(PROGRESS),
    getStreak: async () => structuredClone(streak),
    // As the server does, a second purchase is refused whatever its requestId.
    buyStreakFreeze: async () => {
      if (streak.freezeAvailable) throw new ApiError(409, 'FREEZE_ALREADY_OWNED', 'A freeze is already owned')
      streak = { ...streak, freezeAvailable: true }
      return structuredClone(streak)
    },
    getQuests: async () => structuredClone(QUESTS),
    getBadges: async () => structuredClone(BADGES),
    getLeague: async () => structuredClone(LEAGUE),
    getLeagueHistory: async (weeks) => structuredClone(HISTORY).slice(0, weeks),
  }
}
