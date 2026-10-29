import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import { getQuestion } from '../../questions/api/questionApi'

export interface QuestionStemRef { questionId: string; versionId: string }

/**
 * Reads each listed question once when the list shows and answers its text by version id. The bank list does not carry
 * the text, so the question itself is read; one that cannot be read is simply missing from the answer and the row says so.
 */
export function useQuestionStems(refs: readonly QuestionStemRef[]): AdminResource<Map<string, string>> {
  return useAdminResource(`course-question-stems|${refs.map((ref) => ref.versionId).join(',')}`, async (signal) => {
    const settled = await Promise.allSettled(refs.map((ref) => getQuestion(ref.questionId, signal)))
    const stems = new Map<string, string>()
    refs.forEach((ref, index) => {
      const result = settled[index]
      const version = result?.status === 'fulfilled' ? result.value?.versions?.find((item) => item.id === ref.versionId) : undefined
      if (version) stems.set(ref.versionId, version.stem?.trim() ?? '')
    })
    return stems
  })
}
