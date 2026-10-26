import { questTitle } from '@/features/learning-path/lib/progressMeta'
import type { Badge, DailyQuests, GamificationSummary, HeartsStatus, LearnerProgress, Suggestion } from '~types/learningPath'

export type OwlTab = 'quests' | 'badges' | 'suggestions'

export interface OwlMessage {
  id: string
  text: string
  /** The tab of the detail panel the bubble opens. */
  tab: OwlTab
  mood: 'info' | 'celebrate' | 'warn'
}

/** Everything the owl knows about the learner; a part is `null` until it loaded. */
export interface OwlSnapshot {
  progress: LearnerProgress | null
  hearts: HeartsStatus | null
  quests: DailyQuests | null
  badges: Badge[] | null
}

/** A badge counts as "about to unlock" once half of it is done, or when only a few steps are left. */
const NEAR_RATIO = 0.5
const NEAR_REMAINING = 3
const MAX_BADGE_MESSAGES = 2
/** At this many hearts or fewer the owl warns after a mistake. */
const LOW_HEARTS = 1

/** Badges still to earn that have a counter, nearest to done first. */
export function badgesToEarn(badges: Badge[]) {
  return badges
    .filter((badge) => !badge.awarded && badge.progress && badge.progress.target > 0)
    .map((badge) => {
      const { current, target } = badge.progress!
      return { badge, current: Math.min(current, target), target, remaining: target - current, ratio: Math.min(current, target) / target }
    })
    .sort((a, b) => b.ratio - a.ratio)
}

function questMessage(daily: DailyQuests): OwlMessage | null {
  const total = daily.quests.length
  if (total === 0) return null
  const pending = daily.quests.filter((quest) => !quest.completed)
  if (pending.length === 0) {
    return { id: 'quests-done', text: 'Xong hết nhiệm vụ hôm nay rồi, giỏi quá! 🎉', tab: 'quests', mood: 'celebrate' }
  }
  // The quest closest to done is the cheapest one to finish next.
  const next = pending.reduce((best, quest) => (
    quest.progress / quest.required > best.progress / best.required ? quest : best
  ))
  const text = pending.length === total
    ? `Hôm nay bạn có ${total} nhiệm vụ. Bắt đầu với “${questTitle(next)}” nhé!`
    : `Còn ${pending.length}/${total} nhiệm vụ hôm nay. Tiếp theo: “${questTitle(next)}” (${Math.min(next.progress, next.required)}/${next.required}).`
  return { id: 'quests-pending', text, tab: 'quests', mood: 'info' }
}

function badgeMessages(badges: Badge[]): OwlMessage[] {
  return badgesToEarn(badges)
    .filter(({ remaining, ratio }) => remaining > 0 && (ratio >= NEAR_RATIO || remaining <= NEAR_REMAINING))
    .slice(0, MAX_BADGE_MESSAGES)
    .map(({ badge, current, target, remaining }): OwlMessage => ({
      id: `badge-${badge.code}`,
      text: `Sắp mở khóa huy hiệu “${badge.name}”: chỉ còn ${remaining} nữa (${current}/${target})!`,
      tab: 'badges',
      mood: 'info',
    }))
}

/** What the owl says today: the state of the daily quests, then the badges the learner is about to unlock. */
export function buildOwlMessages(daily: DailyQuests | null, badges: Badge[] | null): OwlMessage[] {
  const quest = daily ? questMessage(daily) : null
  return [...(quest ? [quest] : []), ...(badges ? badgeMessages(badges) : [])]
}

/**
 * The once-a-day nudge about the optional suggestions, or `null` when there are none. It only offers; the wording
 * keeps it a question so skipping it feels fine.
 */
export function buildSuggestionReminder(suggestions: Suggestion[]): OwlMessage | null {
  const [first] = suggestions
  if (!first) return null
  const text = suggestions.length === 1
    ? `Hôm nay có 1 việc nhỏ giúp bạn chắc hơn: “${first.title}”. Xem thử nhé?`
    : `Hôm nay có ${suggestions.length} việc nhỏ giúp bạn chắc hơn. Bắt đầu với “${first.title}” nhé?`
  return { id: 'suggestions-today', text, tab: 'suggestions', mood: 'info' }
}

/**
 * What a submission just changed, as news for the owl: a new level, badges earned, quests completed and low hearts,
 * most important first. `before` is what the owl knew before the submission and `after` what it knows now; a part
 * that is missing on either side is skipped, since there is nothing to compare.
 */
export function buildAnnouncements(before: OwlSnapshot, after: OwlSnapshot, summary: GamificationSummary): OwlMessage[] {
  const news: OwlMessage[] = []

  if (summary.leveledUp) {
    news.push({ id: `level-${summary.level}`, text: `Lên cấp ${summary.level}! Tim đã được hồi đầy.`, tab: 'quests', mood: 'celebrate' })
  }

  if (before.badges && after.badges) {
    const held = new Set(before.badges.filter((badge) => badge.awarded).map((badge) => badge.code))
    for (const badge of after.badges) {
      if (!badge.awarded || held.has(badge.code)) continue
      const reward = badge.rewardPoints > 0 ? ` (+${badge.rewardPoints} điểm)` : ''
      news.push({ id: `badge-earned-${badge.code}`, text: `Bạn vừa nhận huy hiệu “${badge.name}”!${reward}`, tab: 'badges', mood: 'celebrate' })
    }
  }

  // A new day starts new quests, so quests are only compared within the same day.
  if (before.quests && after.quests && before.quests.date === after.quests.date) {
    const done = new Set(before.quests.quests.filter((quest) => quest.completed).map((quest) => quest.type))
    const finished = after.quests.quests.filter((quest) => quest.completed && !done.has(quest.type))
    const allDone = after.quests.quests.length > 0 && after.quests.quests.every((quest) => quest.completed)
    if (allDone && finished.length > 0) {
      news.push({ id: 'quests-all-done', text: 'Xong hết nhiệm vụ hôm nay rồi, giỏi quá! 🎉', tab: 'quests', mood: 'celebrate' })
    } else {
      for (const quest of finished) {
        news.push({ id: `quest-done-${quest.type}`, text: `Hoàn thành nhiệm vụ “${questTitle(quest)}”! +${quest.xpReward} XP`, tab: 'quests', mood: 'celebrate' })
      }
    }
  }

  const { heartsLost, heartsRemaining } = summary
  if ((heartsLost ?? 0) > 0 && heartsRemaining !== null && heartsRemaining <= LOW_HEARTS) {
    news.push({
      id: 'hearts-low',
      text: heartsRemaining === 0 ? 'Hết tim rồi! Nghỉ một chút, tim sẽ hồi dần nhé.' : 'Chỉ còn 1 tim thôi, làm cẩn thận nhé!',
      tab: 'quests',
      mood: 'warn',
    })
  }

  return news
}
