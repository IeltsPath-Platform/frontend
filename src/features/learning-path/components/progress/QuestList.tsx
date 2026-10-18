import { CheckCircle2, Circle } from 'lucide-react'
import type { DailyQuests } from '~types/learningPath'
import { questReward, questTitle } from '../../lib/progressMeta'

/** The three quests of today. A reward is paid when a quest completes; there is nothing to claim. */
export function QuestList({ daily }: { daily: DailyQuests }) {
  return (
    <>
      <p className="lp-hint" role="status">Hoàn thành {daily.completed}/{daily.quests.length} nhiệm vụ hôm nay.</p>
      <ul className="lp-quests">
        {daily.quests.map((quest) => {
          const progress = Math.min(quest.progress, quest.required)
          return (
            <li className={`lp-quest${quest.completed ? ' is-done' : ''}`} key={quest.type}>
              <span aria-hidden="true" className="lp-quest__icon">
                {quest.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
              </span>
              <div className="lp-quest__body">
                <p className="lp-quest__title">{questTitle(quest)}</p>
                <label className="lp-quest__meter">
                  <span>{quest.completed ? 'Đã xong' : `${progress}/${quest.required}`}</span>
                  <progress max={quest.required} value={progress} />
                </label>
              </div>
              <span className="lp-quest__reward">{questReward(quest)}</span>
            </li>
          )
        })}
      </ul>
    </>
  )
}
