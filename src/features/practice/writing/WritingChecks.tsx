import type { OutlineRole, QuestionPartCoverage, WritingDataChecks, WritingTaskChecks } from './writingApi'

const COVERAGE: Record<QuestionPartCoverage, { label: string; tone: 'ok' | 'part' | 'miss' }> = {
  FULL: { label: 'Đã trả lời đủ', tone: 'ok' },
  PARTIAL: { label: 'Mới trả lời một phần', tone: 'part' },
  NONE: { label: 'Chưa trả lời', tone: 'miss' },
}

const ROLE: Record<OutlineRole, string> = { INTRODUCTION: 'Mở bài', BODY: 'Thân bài', CONCLUSION: 'Kết bài' }

/** A yes/no line of a checklist. A flag the model did not give is not shown: absence is not an answer. */
function Check({ ok, yes, no }: { ok: boolean | undefined; yes: string; no: string }) {
  if (ok === undefined) return null
  return <li className={ok ? 'is-ok' : 'is-miss'}><span aria-hidden="true">{ok ? '✓' : '✗'}</span> {ok ? yes : no}</li>
}

function Quote({ text, onShow }: { text: string; onShow: (excerpt: string) => void }) {
  return <button type="button" className="wr-quote" onClick={() => onShow(text)}>“{text}”</button>
}

/** Task 1: what the essay wrote that the chart does not show, how many figures were right, and the parts the task expects. */
export function DataChecksView({ checks, onShow }: { checks: WritingDataChecks; onShow: (excerpt: string) => void }) {
  const hasChecklist = [checks.hasOverview, checks.overviewAccurate, checks.hasPersonalOpinion].some((flag) => flag !== undefined)
  if (checks.wrong.length === 0 && checks.correctCount === 0 && !hasChecklist) return null
  return (
    <section className="wr-checks" aria-label="Kiểm tra số liệu so với biểu đồ">
      <h3>Số liệu trong bài so với biểu đồ</h3>
      {checks.correctCount > 0 && <p className="wr-muted">{checks.correctCount} câu số liệu đúng.</p>}
      {checks.wrong.length > 0 && (
        <table className="wr-table">
          <thead><tr><th scope="col">Bạn viết</th><th scope="col">Biểu đồ cho thấy</th></tr></thead>
          <tbody>
            {checks.wrong.map((figure, index) => (
              <tr key={`${figure.excerpt}-${index}`}>
                <td><Quote text={figure.excerpt} onShow={onShow} /></td>
                <td>{figure.expected}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {hasChecklist && (
        <ul className="wr-checklist">
          <Check ok={checks.hasOverview} yes="Có đoạn tổng quan" no="Chưa có đoạn tổng quan" />
          {checks.hasOverview !== false && <Check ok={checks.overviewAccurate} yes="Tổng quan nêu đúng xu hướng chính" no="Tổng quan chưa nêu đúng xu hướng chính" />}
          <Check ok={checks.hasPersonalOpinion === undefined ? undefined : !checks.hasPersonalOpinion} yes="Không có ý kiến cá nhân" no="Có ý kiến cá nhân (Task 1 chỉ mô tả số liệu)" />
        </ul>
      )}
    </section>
  )
}

/** Task 2: the parts of the question and whether the essay answered each, the position, the conclusion and the outline. */
export function TaskChecksView({ checks, onShow }: { checks: WritingTaskChecks; onShow: (excerpt: string) => void }) {
  const parts = checks.questionParts ?? []
  const outline = checks.outline ?? []
  const position = checks.position
  const showsPosition = position?.required === true
  if (parts.length === 0 && outline.length === 0 && !showsPosition && !checks.noConclusion) return null
  return (
    <section className="wr-checks" aria-label="Kiểm tra theo yêu cầu của đề">
      {parts.length > 0 && (
        <>
          <h3>Đề yêu cầu và bài bạn đã làm</h3>
          <table className="wr-table">
            <thead><tr><th scope="col">Đề yêu cầu</th><th scope="col">Bài bạn đã làm</th></tr></thead>
            <tbody>
              {parts.map((part, index) => {
                const coverage = COVERAGE[part.addressed] ?? COVERAGE.NONE
                return (
                  <tr key={`${part.part}-${index}`}>
                    <td>{part.part}</td>
                    <td>
                      <span className={`wr-coverage wr-coverage-${coverage.tone}`}>{coverage.label}</span>
                      {part.excerpt && <> <Quote text={part.excerpt} onShow={onShow} /></>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      {(showsPosition || checks.noConclusion) && (
        <ul className="wr-checklist">
          {showsPosition && (
            <li className={position.stated ? 'is-ok' : 'is-miss'}>
              <span aria-hidden="true">{position.stated ? '✓' : '✗'}</span>{' '}
              {position.stated ? 'Có nêu quan điểm' : 'Đề hỏi ý kiến nhưng bài chưa nêu quan điểm rõ ràng'}
              {position.stated && position.excerpt && <> <Quote text={position.excerpt} onShow={onShow} /></>}
            </li>
          )}
          {checks.inconsistentPosition && (
            <li className="is-miss">
              <span aria-hidden="true">✗</span> Quan điểm chưa nhất quán giữa các đoạn
              {position?.conflictExcerpt && <> <Quote text={position.conflictExcerpt} onShow={onShow} /></>}
            </li>
          )}
          {checks.noConclusion && <li className="is-miss"><span aria-hidden="true">✗</span> Chưa có đoạn kết bài</li>}
        </ul>
      )}
      {outline.length > 0 && (
        <>
          <h3>Dàn ý bài của bạn</h3>
          <ol className="wr-outline">
            {outline.map((item, index) => (
              <li key={`${item.role}-${index}`}>
                <b>{ROLE[item.role] ?? item.role}</b>: {item.mainIdea}
                <span className={`wr-coverage wr-coverage-${item.developed ? 'ok' : 'part'}`}>{item.developed ? 'Đã triển khai' : 'Chưa triển khai'}</span>
                {item.excerpt && <> <Quote text={item.excerpt} onShow={onShow} /></>}
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  )
}
