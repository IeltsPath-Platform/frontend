import type { QuestionVersion } from '../types'
import { describeAnswerSpec } from '../lib/versionForm'
import { DIFFICULTY_LABEL, STATUS_LABEL, statusBadgeClass } from '../lib/labels'

export interface VersionCardProps {
  version: QuestionVersion
  current: boolean
  busy?: boolean
  /** Without the handlers the card only shows the version, as in the detail dialog. */
  onPublish?: (version: QuestionVersion) => void
  onArchive?: (version: QuestionVersion) => void
}

export function VersionCard({ version, current, busy = false, onPublish, onArchive }: VersionCardProps) {
  const links = version.knowledgePoints ?? []
  return (
    <article aria-label={`Phiên bản ${version.versionNumber}`} className="adm-card qb-version">
      <header className="qb-version__head">
        <h3>Phiên bản {version.versionNumber}</h3>
        <span className={statusBadgeClass(version.status)}>{STATUS_LABEL[version.status]}</span>
        {current ? <span className="adm-badge adm-badge--ok">Đang dùng</span> : null}
        <span className="adm-badge adm-badge--muted">
          {version.difficulty ? DIFFICULTY_LABEL[version.difficulty] : 'Chưa chọn độ khó'}
        </span>
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
      <p className="qb-version__stem">{version.stem}</p>
      <details>
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
    </article>
  )
}
