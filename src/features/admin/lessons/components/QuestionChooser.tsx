import { useEffect, useState } from 'react'
import { AdminSwitch } from '../../components/AdminSwitch'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { InfiniteCount, InfiniteSentinel } from '../../components/InfiniteSentinel'
import { useInfiniteList } from '../../lib/useInfiniteList'
import { getQuestion, listQuestions } from '../../questions/api/questionApi'
import { SKILL_LABEL, TYPE_LABEL } from '../../questions/lib/labels'
import { SKILLS } from '../../questions/types'
import type { LessonBlock } from '../types'
import { useAdminError } from '../../lib/useAdminError'

export interface QuestionChooserProps {
  value: string[]
  onChange: (next: string[]) => void
  /** The questions the block already has, so their text can be shown without another call. */
  known: LessonBlock['questions']
  purpose?: 'LEARNING' | 'EXAM' | 'PLACEMENT'
  /** The owner already lists what is picked, so only the pool to choose from is shown. */
  hideSelected?: boolean
  /** Opens the picker on the skill of the lesson's topic. */
  defaultSkill?: string | null
  /** Lists only this skill and hides the skill filter: the owner can only take questions of one skill. */
  fixedSkill?: string | null
  /** Lists only questions no lesson block or package section holds yet, so every row can be used. */
  freeOnly?: boolean
  /** Replaces the line shown when no question is on offer. */
  emptyText?: string
  /** Requests the lesson exercise ownership and preview fields. Other chooser users omit it. */
  includeOwnershipPreview?: boolean
  blockId?: string
  lessonKnowledgePointIds?: string[]
}

const PAGE_SIZE = 25
type QuestionLabel = { code: string; stemExcerpt?: string }

/** Chooses questions from the published question bank. */
export function QuestionChooser({ value, onChange, known, purpose = 'LEARNING', hideSelected = false, defaultSkill, fixedSkill, freeOnly = false, emptyText,
  includeOwnershipPreview = false, blockId, lessonKnowledgePointIds }: QuestionChooserProps) {
  const [chosenSkill, setSkill] = useState(() => SKILLS.includes(defaultSkill as (typeof SKILLS)[number]) ? defaultSkill as string : '')
  const skill = fixedSkill ?? chosenSkill
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [onlyFree, setOnlyFree] = useState(false)
  const [onlyLessonPoints, setOnlyLessonPoints] = useState(Boolean(lessonKnowledgePointIds?.length))
  const [labels, setLabels] = useState<Record<string, QuestionLabel>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [, setPreviewError] = useAdminError()

  const code = search.trim()
  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedSearch(code), 300)
    return () => window.clearTimeout(timer)
  }, [code])
  const requestCode = debouncedSearch
  const include = includeOwnershipPreview ? 'ownership,preview' : undefined
  const exceptBlockId = includeOwnershipPreview ? blockId : undefined
  const filteredPointIds = onlyLessonPoints ? lessonKnowledgePointIds ?? [] : []
  const filterKey = `exercise-questions|${purpose}|${skill}|${requestCode}|${include ?? ''}|${exceptBlockId ?? ''}|${onlyFree}|${filteredPointIds.join(',')}`
  const list = useInfiniteList(filterKey, async (page, signal) => {
    const result = await listQuestions({
      status: 'PUBLISHED', purpose, skill, code: requestCode, page, size: PAGE_SIZE,
      ...(include ? { include } : {}), ...(exceptBlockId ? { exceptBlockId } : {}),
      ...((freeOnly || (includeOwnershipPreview && onlyFree)) ? { onlyFree: true } : {}),
      ...(filteredPointIds.length ? { knowledgePointIds: filteredPointIds } : {}),
    }, signal)
    if (!signal.aborted) {
      setLabels((existing) => {
        const next = { ...existing }
        for (const question of result.content) {
          if (question.currentPublishedVersionId) {
            next[question.currentPublishedVersionId] = {
              code: question.code,
              ...(question.stemExcerpt ? { stemExcerpt: question.stemExcerpt } : {}),
            }
          }
        }
        return next
      })
    }
    return { content: result.content, page: result.page, totalElements: result.totalElements, totalPages: result.totalPages }
  })
  const questions = list.items

  async function preview(questionId: string) {
    setPreviewError(null)
    try {
      const detail = await getQuestion(questionId)
      const current = detail.versions?.find((version) => version.id === detail.currentPublishedVersionId)
      setPreviews((existing) => ({ ...existing, [questionId]: current?.stem ?? '(không có nội dung)' }))
    } catch (reason) {
      setPreviewError(adminErrorMessage(reason))
    }
  }

  function changeFilter(change: () => void) {
    change()
  }

  function toggle(versionId: string, checked: boolean) {
    onChange(checked ? [...value, versionId] : value.filter((id) => id !== versionId))
  }

  return (
    <div className="ls-questions">
      {hideSelected ? null : <section aria-label="Câu hỏi đã chọn" className="ls-questions__selection">
        <h4>Câu hỏi đã chọn ({value.length})</h4>
        {value.length === 0 ? <p className="adm-muted">Chưa chọn câu hỏi nào.</p> : null}
        <ol>
          {value.map((versionId) => {
            const label = labels[versionId]
            const existing = known.find((question) => question.questionVersionId === versionId)
            return (
              <li key={versionId}>
                {label ? <><code>{label.code}</code>{label.stemExcerpt ? ` · ${label.stemExcerpt}` : ''}</> : existing?.stem ?? `Phiên bản ${versionId}`}
                <button aria-label={`Bỏ câu hỏi ${label?.code ?? versionId}`} className="adm-btn adm-btn--small" onClick={() => toggle(versionId, false)} type="button">Bỏ</button>
              </li>
            )
          })}
        </ol>
      </section>}

      {fixedSkill ? null : <label className="adm-field">
        <span>Lọc kỹ năng</span>
        <select className="adm-select" onChange={(event) => changeFilter(() => setSkill(event.target.value))} value={skill}>
          <option value="">Tất cả</option>
          {SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}
        </select>
      </label>}

      {includeOwnershipPreview ? <AdminSwitch checked={onlyFree} onChange={setOnlyFree}>Chỉ hiện câu còn trống</AdminSwitch> : null}
      {lessonKnowledgePointIds?.length ? <AdminSwitch checked={onlyLessonPoints} onChange={setOnlyLessonPoints}>Chỉ câu thuộc điểm kiến thức của bài</AdminSwitch> : null}

      <label className="adm-field">
        <span>Tìm theo mã câu hỏi</span>
        <input className="adm-input" onChange={(event) => setSearch(event.target.value)} value={search} />
      </label>

      {list.status === 'loading' && questions.length === 0 ? <AdminLoading label="Đang tải câu hỏi đã xuất bản…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được câu hỏi.'} onRetry={list.reload} /> : null}
      {list.status === 'success' && questions.length === 0 ? (
        <p className="adm-muted">{emptyText ?? 'Chưa có câu hỏi đã xuất bản dành cho bài học. Xuất bản câu hỏi ở mục Ngân hàng câu hỏi trước.'}</p>
      ) : null}
      <ul aria-label="Danh sách câu hỏi" className="ls-questions__list">
        <InfiniteCount as="li" items={questions.length} noun="câu hỏi" total={list.total} />
        {questions.filter((question) => question.currentPublishedVersionId).map((question) => {
          const versionId = question.currentPublishedVersionId as string
          const owned = includeOwnershipPreview && question.ownedElsewhere === true && !value.includes(versionId)
          return (
            <li className={owned ? 'is-owned' : undefined} key={question.id}>
              <label className="adm-check">
                <input checked={value.includes(versionId)} disabled={owned} onChange={(event) => toggle(versionId, event.target.checked)} type="checkbox" />
                <span>
                  {TYPE_LABEL[question.questionType] ?? question.questionType}
                  {question.skill ? ` · ${SKILL_LABEL[question.skill] ?? question.skill}` : ''} · <code>{question.code}</code>
                  {owned ? <span className="ls-questions__owned">Đã dùng ở nơi khác</span> : null}
                </span>
              </label>
              {includeOwnershipPreview && question.stemExcerpt ? <p className="ls-questions__excerpt" title={question.stemExcerpt}>{question.stemExcerpt}</p> : null}
              {includeOwnershipPreview && (question.knowledgePoints?.length ?? 0) > 0 ? <div aria-label="Knowledge point" className="ls-questions__knowledge-points">
                {question.knowledgePoints?.map((point) => <span className="adm-badge" key={point.code} title={point.name}>{point.code}</span>)}
                {question.knowledgePointTotal ? <span className="adm-muted">+{question.knowledgePointTotal - (question.knowledgePoints?.length ?? 0)}</span> : null}
              </div> : null}
              {previews[question.id] ? (
                <p className="ls-questions__stem">{previews[question.id]}</p>
              ) : (
                <button className="adm-btn adm-btn--small" onClick={() => void preview(question.id)} type="button">Xem nội dung</button>
              )}
            </li>
          )
        })}
        <InfiniteSentinel as="li" hasMore={list.hasMore} itemCount={questions.length} loadingMore={list.loadingMore} moreError={list.moreError} noun="câu hỏi" onReachEnd={list.loadMore} onRetry={list.retryMore} resetKey={filterKey} />
      </ul>
    </div>
  )
}

