import type { ReactNode } from 'react'
import type { QuestionVersion } from '../types'
import { describeAnswerSpec, formStateFromVersion } from '../lib/versionForm'
import { VersionForm } from './VersionForm'
import { STATUS_LABEL, statusBadgeClass } from '../lib/labels'

export interface VersionCardProps {
  version: QuestionVersion
  current: boolean
  busy?: boolean
  /** Opens the options, answer and explanation at once, for a card that is only read. */
  defaultOpen?: boolean
  /** Without the handlers the card only shows the version, as in the detail dialog. */
  onPublish?: (version: QuestionVersion) => void
  onArchive?: (version: QuestionVersion) => void
  /** Shown under the details, for what belongs to the version but is not part of it (the prompt image of a Writing task). */
  extra?: ReactNode
  /** Lists every field of the version, labelled and always visible, instead of the stem with a "Chi tiết" fold. */
  full?: boolean
  /** The type of the question, needed to lay out the answer fields of the full view. */
  questionType?: string
  /** The skill of the question, for the knowledge point field of the full view. */
  skill?: string | null
}

export function VersionCard({ version, current, busy = false, defaultOpen = false, onPublish, onArchive, extra, full = false, questionType, skill }: VersionCardProps) {
  const links = version.knowledgePoints ?? []
  return (
    <article aria-label={`Phiên bản ${version.versionNumber}`} className={full ? 'qb-version qb-version--full' : 'adm-card qb-version'}>
      <header className="qb-version__head">
        <h3>Phiên bản {version.versionNumber}</h3>
        {current ? <span className="adm-badge adm-badge--ok">Đang dùng</span> : <span className={statusBadgeClass(version.status)}>{STATUS_LABEL[version.status]}</span>}
        <span className="qb-version__actions">
          {version.status === 'DRAFT' && onPublish ? (
            <button className="adm-btn adm-btn--primary adm-btn--small" disabled={busy} onClick={() => onPublish(version)} type="button">
              Xuất bản
            </button>
          ) : null}
          {version.status === 'PUBLISHED' && onArchive ? (
            <button className="adm-btn adm-btn--small adm-btn--danger" disabled={busy} onClick={() => onArchive(version)} type="button">
              Lưu trữ
            </button>
          ) : null}
        </span>
      </header>
      {full && questionType ? <VersionForm initialState={formStateFromVersion(questionType, version, version.versionNumber)} nextVersionNumber={version.versionNumber} onCancel={() => undefined} onSubmit={async () => undefined} questionType={questionType} readOnly skill={skill} /> : <>
      <p className="qb-version__stem">{version.stem}</p>
      <details open={defaultOpen}>
        <summary>Chi tiết</summary>
        {version.options && version.options.length > 0 ? (
          <ol className="qb-version__options">
            {version.options.map((option) => (
              <li key={option.optionKey}><code>{option.optionKey}</code> {option.content}</li>
            ))}
          </ol>
        ) : null}
        <p>{describeAnswerSpec(version.answerSpecJson)}</p>
        {version.explanation ? <p><strong>Giải thích:</strong> {version.explanation}</p> : null}
        {version.hint ? <p><strong>Gợi ý:</strong> {version.hint}</p> : null}
        <p className="adm-muted">{links.length} KP liên quan</p>
      </details>
      </>}
      {extra}
    </article>
  )
}
