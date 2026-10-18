import { learningApi } from '../api'
import { HeartsPanel } from '../components/HeartsPanel'
import { LearnTrail } from '../components/LearnTrail'
import { BadgeGrid } from '../components/progress/BadgeGrid'
import { LeaguePanel } from '../components/progress/LeaguePanel'
import { LevelSummary } from '../components/progress/LevelSummary'
import { ProgressSection } from '../components/progress/ProgressSection'
import { QuestList } from '../components/progress/QuestList'
import { StreakPanel } from '../components/progress/StreakPanel'
import { useApiResource } from '../lib/useApiResource'

/** The learner's level, hearts, streak, quests of the day, badges and weekly league, each loaded on its own. */
export function ProgressPage() {
  const progress = useApiResource('progress', () => learningApi.getProgress())
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const streak = useApiResource('streak', () => learningApi.getStreak())
  const quests = useApiResource('quests', () => learningApi.getQuests())
  const badges = useApiResource('badges', () => learningApi.getBadges())
  const league = useApiResource('league', () => learningApi.getLeague())

  return (
    <div className="lp-page lp-progress-page">
      <LearnTrail items={[{ label: 'Khóa học', to: '/learn' }, { label: 'Thành tích' }]} />
      <header className="lp-lesson-head">
        <p className="lp-eyebrow">Thành tích của bạn</p>
        <h1>Tiến độ học</h1>
      </header>

      <ProgressSection resource={progress} title="Cấp và XP">
        {(data) => <LevelSummary progress={data} />}
      </ProgressSection>

      <ProgressSection resource={hearts} title="Tim">
        {(data) => <HeartsPanel onChanged={hearts.reload} status={data} />}
      </ProgressSection>

      <ProgressSection resource={streak} title="Chuỗi ngày học">
        {(data) => <StreakPanel onChanged={streak.reload} streak={data} />}
      </ProgressSection>

      <ProgressSection resource={quests} title="Nhiệm vụ hôm nay">
        {(data) => <QuestList daily={data} />}
      </ProgressSection>

      <ProgressSection resource={badges} title="Huy hiệu">
        {(data) => <BadgeGrid badges={data} />}
      </ProgressSection>

      <ProgressSection resource={league} title="Bảng xếp hạng tuần">
        {(data) => <LeaguePanel league={data} />}
      </ProgressSection>
    </div>
  )
}
