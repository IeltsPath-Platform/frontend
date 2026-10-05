import type { ReactNode } from 'react'
import type { AnswerInput, EssayBlockData, ExerciseBlockData, WritingSubmissionResult } from '~types/learningPath'
import { isAudioBlock, isEssayBlock, isExerciseBlock, isPassageBlock, isTextBlock } from '../../lib/blockGuards'
import { AudioBlock } from './AudioBlock'
import { EssayBlock } from './EssayBlock'
import { ExerciseBlock, type GradedOutcome } from './ExerciseBlock'
import { PassageBlock } from './PassageBlock'
import { TextBlock } from './TextBlock'
import { UnsupportedBlock } from './UnsupportedBlock'
import type { RawBlock } from '~types/learningPath'

export interface BlockRenderContext {
  pointsBalance: number
  submitExercise: (block: ExerciseBlockData, answers: AnswerInput[]) => Promise<GradedOutcome>
  submitEssay: (block: EssayBlockData, essayText: string) => Promise<WritingSubmissionResult>
}

interface BlockRenderer {
  matches: (block: RawBlock) => boolean
  render: (block: RawBlock, context: BlockRenderContext) => ReactNode
}

function renderer<T extends RawBlock>(matches: (block: RawBlock) => block is T, render: (block: T, context: BlockRenderContext) => ReactNode): BlockRenderer {
  return { matches, render: (block, context) => (matches(block) ? render(block, context) : null) }
}

const BLOCK_RENDERERS: BlockRenderer[] = [
  renderer(isTextBlock, (block) => <TextBlock block={block} />),
  renderer(isPassageBlock, (block) => <PassageBlock passage={block} />),
  renderer(isAudioBlock, (block) => <AudioBlock audio={block} />),
  renderer(isEssayBlock, (block, context) => (
    <EssayBlock
      block={block}
      pointsBalance={context.pointsBalance}
      onSubmit={(essayText) => context.submitEssay(block, essayText)}
    />
  )),
  renderer(isExerciseBlock, (block, context) => (
    <ExerciseBlock block={block} onSubmit={(answers) => context.submitExercise(block, answers)} />
  )),
]

export function renderBlock(block: RawBlock, context: BlockRenderContext): ReactNode {
  const match = BLOCK_RENDERERS.find((candidate) => candidate.matches(block))
  return match ? match.render(block, context) : <UnsupportedBlock block={block} />
}
