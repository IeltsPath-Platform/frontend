import type { AudioBlockData, EssayBlockData, ExerciseBlockData, PassageBlockData, Question, RawBlock, TextBlockData } from '~types/learningPath'

const isString = (value: unknown): value is string => typeof value === 'string'

function isQuestion(value: unknown): value is Question {
  if (!value || typeof value !== 'object') return false
  const question = value as Record<string, unknown>
  const optionsValid = question.options === null
    || (Array.isArray(question.options) && question.options.every((option) => option && isString(option.value) && isString(option.label)))
  return isString(question.id) && typeof question.number === 'number' && isString(question.prompt) && optionsValid
}

export function isTextBlock(block: RawBlock): block is TextBlockData {
  return block.type === 'TEXT' && isString(block.text)
}

/** Assets with a media URL (audio, video, image) have no renderer yet — except AUDIO via AudioBlock. */
export function isPassageBlock(block: RawBlock): block is PassageBlockData {
  return block.type === 'ASSET'
    && block.assetType === 'PASSAGE'
    && !block.mediaUrl
    && isString(block.title)
    && Array.isArray(block.paragraphs)
    && block.paragraphs.every((paragraph) => paragraph && isString(paragraph.text))
}

export function isAudioBlock(block: RawBlock): block is AudioBlockData {
  return block.type === 'ASSET'
    && block.assetType === 'AUDIO'
    && isString(block.mediaUrl)
    && block.mediaUrl.length > 0
}

export function isEssayBlock(block: RawBlock): block is EssayBlockData {
  return block.type === 'EXERCISE'
    && block.blockKind === 'ESSAY'
    && isString(block.questionVersionId)
    && isString(block.stem)
    && isString(block.task)
    && typeof block.minWords === 'number'
    && typeof block.passBand === 'number'
}

export function isExerciseBlock(block: RawBlock): block is ExerciseBlockData {
  return block.type === 'EXERCISE'
    && block.blockKind !== 'ESSAY'
    && isString(block.title)
    && isString(block.instructions)
    && isString(block.knowledgePointCode)
    && (block.state === 'NOT_ATTEMPTED' || block.state === 'FAILED' || block.state === 'PASSED')
    && Array.isArray(block.questions)
    && block.questions.length > 0
    && block.questions.every(isQuestion)
}
