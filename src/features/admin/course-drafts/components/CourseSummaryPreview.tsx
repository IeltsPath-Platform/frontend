import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { LessonSummary } from '@/features/learning-path/components/resources/LessonSummary'
import { useAdminResource } from '../../lib/useAdminResource'
import { withVocabularyCore } from '../lib/summaryVocabulary'
import type { CourseLesson } from '../types'

/**
 * The lesson summary as the learner will read it after approval. Approval adds a "Vocabulary Core" table from the
 * lesson's words, so the preview adds it too: the senses picked from the library first, then the words proposed.
 */
export function CourseSummaryPreview({ markdown, lesson }: { markdown: string; lesson: CourseLesson }) {
  const picked = lesson.vocabularySenseIds ?? []
  const senses = useAdminResource(`course-summary-senses|${picked.join(',')}`, (signal) => getLessonVocabularySenses(picked, signal))
  if (picked.length > 0 && senses.status === 'loading') return <p className="adm-muted">Đang tải từ vựng của bài…</p>
  const words = [
    ...(senses.data ?? []).map((card) => ({ lemma: card.lemma, meaning: card.vietnameseMeaning })),
    ...(lesson.newVocabulary ?? []).map((word) => ({ lemma: word.lemma, meaning: word.vietnameseMeaning })),
  ]
  return <>
    {senses.status === 'error' ? <p className="adm-muted" role="note">Chưa đọc được từ vựng chọn từ thư viện, nên bảng dưới đây thiếu các từ đó.</p> : null}
    <LessonSummary markdown={withVocabularyCore(markdown, words) || null} />
  </>
}
