import { useState } from 'react'
import { AdminSwitch } from '../../components/AdminSwitch'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminResource } from '../../lib/useAdminResource'
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
  /** Requests the lesson exercise ownership and preview fields. Other chooser users omit it. */
  includeOwnershipPreview?: boolean
  blockId?: string
}

const PAGE_SIZE = 25
const SEARCH_DELAY_MS = 300
type QuestionLabel = { code: string; stemExcerpt?: string }

/** Chooses questions from the published question bank. */
export function QuestionChooser({ value, onChange, known, purpose = 'LEARNING', hideSelected = false, defaultSkill,
  includeOwnershipPreview = false, blockId }: QuestionChooserProps) {
  const [skill, setSkill] = useState(() => SKILLS.includes(defaultSkill as (typeof SKILLS)[number]) ? defaultSkill as string : '')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const [onlyFree, setOnlyFree] = useState(false)
  const [labels, setLabels] = useState<Record<string, QuestionLabel>>({})
  const [previews, setPreviews] = useState<Record<string, string>>({})
  const [, setPreviewError] = useAdminError()

  const code = search.trim()
  const include = includeOwnershipPreview ? 'ownership,preview' : undefined
  const exceptBlockId = includeOwnershipPreview ? blockId : undefined
  const list = useAdminResource(`exercise-questions|${purpose}|${skill}|${code}|${page}|${include ?? ''}|${exceptBlockId ?? ''}|${onlyFree}`, async (signal) => {
    if (code) await waitForSearchDelay(signal)
    const result = await listQuestions({
      status: 'PUBLISHED', purpose, skill, code, page, size: PAGE_SIZE,
      ...(include ? { include } : {}), ...(exceptBlockId ? { exceptBlockId } : {}),
      ...(includeOwnershipPreview && onlyFree ? { onlyFree: true } : {}),
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
    return result
  })
  const questions = list.data?.content ?? []

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
    setPage(0)
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

      <label className="adm-field">
        <span>Lọc kỹ năng</span>
        <select className="adm-select" onChange={(event) => changeFilter(() => setSkill(event.target.value))} value={skill}>
          <option value="">Tất cả</option>
          {SKILLS.map((item) => <option key={item} value={item}>{SKILL_LABEL[item]}</option>)}
        </select>
      </label>

      {includeOwnershipPreview ? <AdminSwitch checked={onlyFree} onChange={(checked) => { setOnlyFree(checked); setPage(0) }}>Chỉ hiện câu còn trống</AdminSwitch> : null}

      <label className="adm-field">
        <span>Tìm theo mã câu hỏi</span>
        <input className="adm-input" onChange={(event) => changeFilter(() => setSearch(event.target.value))} value={search} />
      </label>

      {list.status === 'loading' ? <AdminLoading label="Đang tải câu hỏi đã xuất bản…" /> : null}
      {list.status === 'error' ? <AdminError message={list.error ?? 'Không tải được câu hỏi.'} onRetry={list.reload} /> : null}
      {list.status === 'success' && questions.length === 0 ? (
        <p className="adm-muted">Chưa có câu hỏi đã xuất bản dành cho bài học. Xuất bản câu hỏi ở mục Ngân hàng câu hỏi trước.</p>
      ) : null}
      <ul aria-label="Danh sách câu hỏi" className="ls-questions__list">
        {(questions ?? []).filter((question) => question.currentPublishedVersionId).map((question) => {
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
      </ul>
      {list.status === 'success' ? <nav aria-label="Phân trang câu hỏi" className="ls-questions__pagination">
        <button className="adm-btn adm-btn--small" disabled={page === 0} onClick={() => setPage((current) => Math.max(0, current - 1))} type="button">Trước</button>
        <span>Trang {list.data && list.data.totalPages > 0 ? page + 1 : 0} / {list.data?.totalPages ?? 0} · {list.data?.totalElements ?? 0} câu hỏi</span>
        <button className="adm-btn adm-btn--small" disabled={!list.data || page + 1 >= list.data.totalPages} onClick={() => setPage((current) => current + 1)} type="button">Sau</button>
      </nav> : null}
    </div>
  )
}

function waitForSearchDelay(signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', abort)
      resolve()
    }, SEARCH_DELAY_MS)
    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Request was cancelled', 'AbortError'))
    }
    signal.addEventListener('abort', abort, { once: true })
  })
}
