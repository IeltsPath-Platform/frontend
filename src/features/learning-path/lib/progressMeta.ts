import type { LeagueOutcome, LeagueTier, LeagueZone, LearnerProgress, Quest } from '~types/learningPath'

/**
 * How far through the current level the learner is, 0 to 1. The server gives the XP where the next level starts and the
 * level, and a level is the same number of XP long, so the start of this level is one level length below that.
 */
export function levelFraction(progress: LearnerProgress) {
  const levelLength = progress.nextLevelAt / progress.level
  if (!(levelLength > 0)) return 0
  const levelStart = progress.nextLevelAt - levelLength
  return Math.min(1, Math.max(0, (progress.totalXp - levelStart) / levelLength))
}

/** What a quest asks of the learner, in one line. */
export function questTitle(quest: Quest) {
  switch (quest.type) {
    case 'PRACTICE':
    case 'PRACTICE_PLUS':
      return `Làm ${quest.required} câu trắc nghiệm`
    case 'WEAKNESS':
      return quest.target
        ? `Luyện ${quest.required} câu ở điểm yếu “${quest.target.name}”`
        : `Luyện ${quest.required} câu ở điểm yếu`
    case 'STREAK':
      return 'Làm ít nhất một câu hôm nay'
  }
}

export function questReward(quest: Quest) {
  const parts = [`+${quest.xpReward} XP`]
  if (quest.pointsReward > 0) parts.push(`+${quest.pointsReward} điểm`)
  return parts.join(' · ')
}

const TIER_LABEL: Record<LeagueTier, string> = {
  BRONZE: 'Bronze',
  SILVER: 'Silver',
  GOLD: 'Gold',
  SAPPHIRE: 'Sapphire',
  DIAMOND: 'Diamond',
  RUBY: 'Ruby',
  AMETHYST: 'Amethyst',
}

export function leagueTierLabel(tier: LeagueTier) {
  return TIER_LABEL[tier] ?? tier
}

const ZONE_LABEL: Record<LeagueZone, string> = {
  PROMOTION: 'Lên hạng',
  SAFE: 'Giữ hạng',
  DEMOTION: 'Xuống hạng',
}

export function leagueZoneLabel(zone: LeagueZone) {
  return ZONE_LABEL[zone] ?? zone
}

const OUTCOME_LABEL: Record<LeagueOutcome, string> = {
  PROMOTED: 'Lên hạng',
  STAYED: 'Giữ hạng',
  DEMOTED: 'Xuống hạng',
}

export function leagueOutcomeLabel(outcome: LeagueOutcome) {
  return OUTCOME_LABEL[outcome] ?? outcome
}

/** A league week starts on a Sunday in UTC; show the date it names, not the learner's local reading of midnight. */
export function formatUtcDate(isoDate: string) {
  const date = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
  return date.toLocaleDateString('vi-VN', { timeZone: 'UTC' })
}
