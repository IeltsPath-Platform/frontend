import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource } from '../../lib/useAdminResource'
import { previewVersion } from '../api/packageApi'

function answerText(spec: unknown) {
  if (!spec || typeof spec !== 'object' || Array.isArray(spec)) return 'Chưa có đáp án tự chấm'
  const answer = spec as Record<string, unknown>
  if (typeof answer.correct === 'string') return `Đáp án đúng: ${answer.correct}`
  if (Array.isArray(answer.accepted)) return `Đáp án chấp nhận: ${answer.accepted.filter((item): item is string => typeof item === 'string').join(' / ')}`
  return answer.type === 'ESSAY' ? 'Bài luận được chấm theo rubric.' : 'Không có đáp án tự chấm.'
}
function mediaUrl(value: string | null) {
  try { const parsed = new URL(value ?? ''); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : undefined } catch { return undefined }
}
export function PackagePreview({ packageId, versionId, onClose }: { packageId: string; versionId: string; onClose: () => void }) {
  const preview = useAdminResource(`package-preview:${packageId}:${versionId}`, (signal) => previewVersion(packageId, versionId, signal))
  return <section className="adm-card" aria-label="Xem trước gói"><div className="adm-package-actions"><h2>Xem trước gói</h2><button className="adm-btn" type="button" onClick={onClose}>Đóng xem trước</button></div>
    {preview.status === 'loading' ? <AdminLoading label="Đang tải bản xem trước…" /> : null}
    {preview.status === 'error' ? <AdminError message={preview.error!} onRetry={preview.reload} /> : null}
    {preview.data?.sections.map((section) => <article className="adm-package-section" key={section.sectionId}>
      <h3>{section.title}</h3>{section.instructions ? <p className="adm-package-section__instructions">{section.instructions}</p> : null}
      {section.passage ? <p className="adm-package-section__instructions">{section.passage}</p> : null}
      {section.audio && mediaUrl(section.audio.mediaUrl) ? <audio controls preload="none" src={mediaUrl(section.audio.mediaUrl)}>Trình duyệt không hỗ trợ audio.</audio> : null}
      <ol>{section.items.map((item) => {
        const options = Array.isArray(item.options)
          ? [...item.options].sort((a, b) => a.sortOrder - b.sortOrder).map(({ optionKey, content }) => [optionKey, content])
          : Object.entries(item.options ?? {})
        return <li key={item.questionVersionId}><p className="adm-package-section__instructions">{item.stem}</p>{options.length ? <ul>{options.map(([key, content]) => <li key={key}><strong>{key}.</strong> {content}</li>)}</ul> : null}{item.hint ? <p>Gợi ý: {item.hint}</p> : null}</li>
      })}</ol>
      <details><summary>Đáp án và giải thích</summary>{preview.data?.answers.find((answer) => answer.sectionId === section.sectionId)?.items.map((item, index) => <div key={item.questionVersionId}><h4>Câu {index + 1}</h4><p>{answerText(item.answerSpec)}</p>{item.explanation ? <p className="adm-package-section__instructions">{item.explanation}</p> : null}</div>)}{preview.data?.answers.find((answer) => answer.sectionId === section.sectionId)?.audioTranscript ? <p className="adm-package-section__instructions">Transcript: {preview.data.answers.find((answer) => answer.sectionId === section.sectionId)?.audioTranscript}</p> : null}</details>
    </article>)}
  </section>
}
