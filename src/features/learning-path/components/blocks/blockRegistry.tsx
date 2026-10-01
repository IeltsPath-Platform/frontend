import type { ReactNode } from 'react'
import type { AnswerInput, ExerciseBlockData, RawBlock } from '~types/learningPath'
import { isExerciseBlock, isPassageBlock, isTextBlock } from '../../lib/blockGuards'
import { ExerciseBlock, type GradedOutcome } from './ExerciseBlock'
import { PassageBlock } from './PassageBlock'
import { TextBlock } from './TextBlock'
import { UnsupportedBlock } from './UnsupportedBlock'

export interface BlockRenderContext {
  submitExercise: (block: ExerciseBlockData, answers: AnswerInput[]) => Promise<GradedOutcome>
}

interface BlockRenderer {
  matches: (block: RawBlock) => boolean
  render: (block: RawBlock, context: BlockRenderContext) => ReactNode
}

function renderer<T extends RawBlock>(matches: (block: RawBlock) => block is T, render: (block: T, context: BlockRenderContext) => ReactNode): BlockRenderer {
  return { matches, render: (block, context) => (matches(block) ? render(block, context) : null) }
}

/** New block kinds (essay, audio, hints) only need an entry here. */
const BLOCK_RENDERERS: BlockRenderer[] = [
  renderer(isTextBlock, (block) => <TextBlock block={block} />),
  renderer(isPassageBlock, (block) => <PassageBlock passage={block} />),
  renderer(isExerciseBlock, (block, context) => (
    <ExerciseBlock block={block} onSubmit={(answers) => context.submitExercise(block, answers)} />
  )),
]

export function renderBlock(block: RawBlock, context: BlockRenderContext): ReactNode {
  const match = BLOCK_RENDERERS.find((candidate) => candidate.matches(block))
  return match ? match.render(block, context) : <UnsupportedBlock block={block} />
}
