import type { BlockRequest, BlockType, LessonBlock } from '../types'

export interface BlockFormState {
  blockType: BlockType
  textContent: string
  assetId: string
  senseIds: string[]
  questionVersionIds: string[]
  knowledgePointIds: string[]
}

export const MAX_SENSES_PER_BLOCK = 100
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function initialBlockState(blockType: BlockType, block?: LessonBlock): BlockFormState {
  return {
    blockType,
    textContent: block?.textContent ?? '',
    assetId: block?.assetId ?? '',
    senseIds: block?.vocabularySenseIds ?? [],
    questionVersionIds: block?.questions.map((question) => question.questionVersionId) ?? [],
    knowledgePointIds: block?.knowledgePointIds ?? [],
  }
}

export type BlockBuildResult = { ok: true; body: BlockRequest } | { ok: false; problems: string[] }

export function buildBlockRequest(state: BlockFormState): BlockBuildResult {
  switch (state.blockType) {
    case 'TEXT': {
      if (!state.textContent.trim()) return { ok: false, problems: ['Cần nhập nội dung bài giảng.'] }
      return { ok: true, body: { blockType: 'TEXT', textContent: state.textContent, knowledgePointIds: state.knowledgePointIds } }
    }
    case 'ASSET': {
      const assetId = state.assetId.trim()
      if (!UUID.test(assetId)) return { ok: false, problems: ['Mã asset phải là một UUID hợp lệ.'] }
      return { ok: true, body: { blockType: 'ASSET', assetId } }
    }
    case 'VOCABULARY': {
      if (state.senseIds.length === 0) return { ok: false, problems: ['Chọn ít nhất một nghĩa từ vựng.'] }
      if (state.senseIds.length > MAX_SENSES_PER_BLOCK) {
        return { ok: false, problems: [`Một block có tối đa ${MAX_SENSES_PER_BLOCK} nghĩa từ vựng.`] }
      }
      return { ok: true, body: { blockType: 'VOCABULARY', vocabularySenseIds: state.senseIds } }
    }
    case 'EXERCISE': {
      if (state.questionVersionIds.length === 0) return { ok: false, problems: ['Chọn ít nhất một câu hỏi cho bài tập.'] }
      return { ok: true, body: { blockType: 'EXERCISE', questionVersionIds: state.questionVersionIds } }
    }
  }
}

/** Moves `id` one place up (`-1`) or down (`1`); an item at the edge stays where it is. */
export function moveId(ids: readonly string[], id: string, delta: -1 | 1): string[] {
  const from = ids.indexOf(id)
  const to = from + delta
  if (from < 0 || to < 0 || to >= ids.length) return [...ids]
  const next = [...ids]
  next.splice(to, 0, ...next.splice(from, 1))
  return next
}
