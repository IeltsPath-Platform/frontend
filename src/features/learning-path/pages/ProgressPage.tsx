import { learningApi } from '../api'
import { HeartsPanel } from '../components/HeartsPanel'
import { BadgeGrid } from '../components/progress/BadgeGrid'
import { LeaguePanel } from '../components/progress/LeaguePanel'
import { LevelSummary } from '../components/progress/LevelSummary'
import { ProgressSection } from '../components/progress/ProgressSection'
import { QuestList } from '../components/progress/QuestList'
import { StreakPanel } from '../components/progress/StreakPanel'
import { useApiResource } from '../lib/useApiResource'
import { ArrowUpRight, Trophy } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'

/** The learner's level, hearts, streak, quests of the day, badges and weekly league, each loaded on its own. */
export function ProgressPage({ presentation = 'default' }: { presentation?: 'default' | 'achievements' }) {
  const featured = presentation === 'achievements'
  const progress = useApiResource('progress', () => learningApi.getProgress())
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const streak = useApiResource('streak', () => learningApi.getStreak())
  const quests = useApiResource('quests', () => learningApi.getQuests())
  const badges = useApiResource('badges', () => learningApi.getBadges())
  const league = useApiResource('league', () => learningApi.getLeague())

  const badgeSection = <ProgressSection resource={badges} title="Huy hiệu" className="achievement-badges">
    {(data) => <BadgeGrid badges={data} />}
  </ProgressSection>
  const leagueSection = <ProgressSection resource={league} title="Bảng xếp hạng tuần" className="achievement-league">
    {(data) => <LeaguePanel league={data} />}
  </ProgressSection>

  const sections = <>
      <ProgressSection resource={progress} title="Cấp và XP" className="achievement-level">
        {(data) => <LevelSummary progress={data} featured={featured} />}
      </ProgressSection>

      <ProgressSection resource={hearts} title="Tim" className="achievement-hearts">
        {(data) => <HeartsPanel onChanged={hearts.reload} status={data} />}
      </ProgressSection>

      <ProgressSection resource={streak} title="Chuỗi ngày học" className="achievement-streak">
        {(data) => <StreakPanel onChanged={streak.reload} streak={data} compact={featured} />}
      </ProgressSection>

      <ProgressSection resource={quests} title="Nhiệm vụ hôm nay" className="achievement-quests">
        {(data) => <QuestList daily={data} />}
      </ProgressSection>

      {featured ? <>{leagueSection}{badgeSection}</> : <>{badgeSection}{leagueSection}</>}
    </>

  return (
    <div className="lp-page lp-progress-page">
      <header className="lp-lesson-head achievement-page-head">
        <div>
          <p className="lp-eyebrow">{featured ? <><Trophy size={15} aria-hidden="true" /> Từng bước tiến đều đáng ghi nhận</> : 'Thành tích của bạn'}</p>
          <h1>{featured ? 'Thành tích của bạn' : 'Tiến độ học'}</h1>
          {featured && <p className="achievement-page-intro">Tích lũy kinh nghiệm. Giữ nhịp học. Mở khóa những cột mốc mới.</p>}
        </div>
        {featured && <Button asChild className="achievement-continue"><Link to="/learn">Tiếp tục học <ArrowUpRight size={17} aria-hidden="true" /></Link></Button>}
      </header>
      {featured ? <div className="achievement-layout">{sections}</div> : sections}
    </div>
  )
}
