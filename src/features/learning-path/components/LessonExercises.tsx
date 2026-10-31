import { useState } from 'react'
import type {
  AnswerInput,
  AudioBlockData,
  ExerciseBlockData,
  GamificationSummary,
  LessonBlock,
  PassageBlockData,
} from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { newRequestId } from '../lib/requestId'
import { reportApiError } from '../lib/reviewGate'
import { useApiResource } from '../lib/useApiResource'
import { AudioBlock } from './blocks/AudioBlock'
import { ExerciseBlock, type GradedOutcome } from './blocks/ExerciseBlock'
import { PassageBlock } from './blocks/PassageBlock'
import { HeartsPanel } from './HeartsPanel'
import { RewardSummary } from './RewardSummary'

interface LessonExercisesProps {
  lessonId: string
  blocks: LessonBlock[]
  /** Called after an answer was graded, so the page can refresh the lesson and the side navigation. */
  onChanged: () => void
  refreshAudioUrl?: (blockId: string) => Promise<string | null>
}

/** The lesson's passages, audio and exercises, in the order Content gives them. Passing every exercise completes the lesson. */
export function LessonExercises({ lessonId, blocks, onChanged, refreshAudioUrl }: LessonExercisesProps) {
  // The hearts are an extra: if they cannot be read, the exercises still open and the server refuses them when needed.
  const hearts = useApiResource('hearts', () => learningApi.getHearts())
  const [rewards, setRewards] = useState<Record<string, GamificationSummary | null>>({})

  async function submit(block: ExerciseBlockData, answers: AnswerInput[]): Promise<GradedOutcome> {
    try {
      const result = await learningApi.submitLessonExercise(lessonId, block.id, { requestId: newRequestId(), answers })
      setRewards((current) => ({ ...current, [block.id]: result.gamification }))
      // Wrong answers cost hearts, so what is left has changed.
      if ((result.gamification?.heartsLost ?? 0) > 0) hearts.reload()
      onChanged()
      const correctCount = result.results.filter((item) => item.correct).length
      const totalCount = block.questions.length
      return {
        passed: result.blockPassed,
        percent: totalCount === 0 ? 0 : Math.round((correctCount / totalCount) * 100),
        correctCount,
        totalCount,
        results: result.results,
      }
    } catch (reason) {
      const apiError = toApiError(reason)
      reportApiError(apiError)
      if (apiError.code === 'HEARTS_DEPLETED') hearts.reload()
      throw apiError
    }
  }

  const exercises = blocks.filter(isExercise)
  if (exercises.length === 0) {
    return <p className="lp-empty">Bài học này chưa có bài tập. Bấm “Hoàn thành bài” để ghi nhận tiến độ.</p>
  }

  const hasPassage = blocks.some(isPassage)
  const heartsNotice = hearts.data?.hearts === 0 ? <HeartsPanel onChanged={hearts.reload} status={hearts.data} /> : null
  const exerciseNodes = (block: ExerciseBlockData) => (
    <div key={block.id}>
      <ExerciseBlock block={block} onSubmit={(answers) => submit(block, answers)} />
      <RewardSummary gamification={rewards[block.id] ?? null} />
    </div>
  )

  // With a passage, the text stays in a sticky column beside the exercises, as in Practice, so the learner can
  // re-read it while answering instead of scrolling back up.
  if (hasPassage) {
    return (
      <section className="lp-split" aria-label="Bài đọc và bài tập">
        <div className="lp-split__passage">
          {blocks.filter(isAudio).map((block) => <AudioBlock key={block.id} audio={block}
            refreshAudioUrl={refreshAudioUrl ? () => refreshAudioUrl(block.id) : undefined} />)}
          {blocks.filter(isPassage).map((block) => (
            <PassageBlock key={block.id} passage={block} />
          ))}
        </div>
        <div className="lp-split__work">
          {heartsNotice}
          {blocks.filter(isExercise).map(exerciseNodes)}
        </div>
      </section>
    )
  }

  return (
    <div className="lp-lesson-exercises">
      {heartsNotice}
      {blocks.map((block) => {
        if (isExercise(block)) return exerciseNodes(block)
        if (isAudio(block)) return <AudioBlock key={block.id} audio={block}
          refreshAudioUrl={refreshAudioUrl ? () => refreshAudioUrl(block.id) : undefined} />
        return isPassage(block) ? <PassageBlock key={block.id} passage={block} /> : null
      })}
    </div>
  )
}

function isExercise(block: LessonBlock): block is ExerciseBlockData {
  return block.type === 'EXERCISE'
}

function isAudio(block: LessonBlock): block is AudioBlockData {
  return block.type === 'ASSET' && block.assetType === 'AUDIO'
}

function isPassage(block: LessonBlock): block is PassageBlockData {
  return block.type === 'ASSET' && block.assetType === 'PASSAGE'
}
