import type { PassageBlockData, RawBlock } from '~types/learningPath'
import { isExerciseBlock, isPassageBlock } from './blockGuards'

export type BlockSegment =
  | { kind: 'single'; block: RawBlock }
  | { kind: 'split'; passage: PassageBlockData; blocks: RawBlock[] }

/** A passage followed by exercise blocks becomes one side-by-side segment on wide screens. */
export function groupBlocks(blocks: RawBlock[]): BlockSegment[] {
  const ordered = [...blocks].sort((a, b) => a.sortOrder - b.sortOrder)
  const segments: BlockSegment[] = []
  for (let index = 0; index < ordered.length; index += 1) {
    const block = ordered[index]
    if (!isPassageBlock(block)) {
      segments.push({ kind: 'single', block })
      continue
    }
    const exercises: RawBlock[] = []
    while (index + 1 < ordered.length && isExerciseBlock(ordered[index + 1])) exercises.push(ordered[++index])
    segments.push(exercises.length > 0 ? { kind: 'split', passage: block, blocks: exercises } : { kind: 'single', block })
  }
  return segments
}
