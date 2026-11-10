import { ProgressPage } from '@/features/learning-path/pages/ProgressPage'
import '@/features/learning-path/learning-path.css'
import '../achievements.css'

/** The learner's level, streak, quests, badges and league inside the overview, with the learning path's tokens. */
export function OverviewAchievements() {
  return (
    <div className="lp-root overview-achievements">
      <ProgressPage presentation="achievements" />
    </div>
  )
}
