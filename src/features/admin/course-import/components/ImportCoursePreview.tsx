import { useState, type ReactNode } from 'react'
import { BookOpen, BookOpenText, ChevronDown, ChevronRight, CircleDashed, Eye, FileText, Headphones, ListChecks, Mic, Pencil, PenLine } from 'lucide-react'
import { AdminField } from '../../components/AdminField'
import { AdminDrawer } from '../../components/AdminLayer'
import { SKILL_LABEL } from '../../courses/types'
import { importIssueLabel } from '../lib/importLabels'
import type { ImportIssue, ImportOutline, ImportSheets } from '../types'
import { ImportFields, ImportRowDrawer } from './ImportRowDrawer'
import '../../courses/courses.css'
import '../../course-drafts/course-drafts.css'
import '../../lessons/lessons.css'

type Topic = ImportOutline['topics'][number]
type Lesson = Topic['lessons'][number]
type Pkg = ImportOutline['courseTests'][number]
type Question = ImportOutline['questions'][number]
type Cells = Record<string, string>

const SKILL_ICON = { LISTENING: Headphones, READING: BookOpenText, WRITING: PenLine, SPEAKING: Mic } as const
const SKILL_NAME = { LISTENING: 'Listening', READING: 'Reading', WRITING: 'Writing', SPEAKING: 'Speaking' } as const
const KIND_LABEL: Record<string, string> = { PRACTICE_SET: 'Gói luyện tập', TOPIC_TEST: 'Thi chủ đề', COURSE_TEST: 'Thi cuối khóa', PRACTICE_TEST_MILESTONE: 'Practice test giữa khóa' }

interface Shared { errors: ImportIssue[]; warnings: ImportIssue[] }
type Edit = (sheet: string, row: number) => (column: string, value: string) => void
type Open = { sheet: string; row: number; cells: Cells }

/**
 * What the workbook would create, laid out like the course screen: the course, its topics grouped by skill, each topic
 * opening its lessons and each lesson its blocks, questions and practice sets. Everything is read from the file and
 * read-only; a mark shows where the checks found a problem, and the field that failed says why.
 */
export function ImportCoursePreview({ outline, errors, warnings, sheets, onEdit }: { outline: ImportOutline; sheets?: ImportSheets; onEdit?: (sheet: string, row: number, column: string, value: string) => void } & Shared) {
  const [topic, setTopic] = useState<Topic | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [row, setRow] = useState<Open | null>(null)
  const [folded, setFolded] = useState<ReadonlySet<string>>(new Set())
  /** The cells as they are now in the draft, which may be ahead of the outline until it is saved. */
  const live = (sheet: string, line: number, fallback: Cells): Cells => sheets?.[sheet]?.find((item) => item.number === line)?.cells ?? fallback
  const edit: Edit | undefined = onEdit ? (sheet, line) => (column, value) => onEdit(sheet, line, column, value) : undefined
  const questions = new Map(outline.questions.map((question) => [question.importRef, question]))
  /** Errors of the given rows; a row listed twice (a question used in several places) counts once. */
  const count = (keys: Array<[string, number]>) => [...new Set(keys.map(([sheet, line]) => `${sheet}:${line}`))]
    .reduce((sum, key) => sum + errors.filter((issue) => `${issue.sheet}:${issue.row}` === key).length, 0)
  const refsOf = (refs: string[]): Array<[string, number]> => refs.flatMap((ref) => { const q = questions.get(ref); return q ? [['Questions', q.row] as [string, number]] : [] })
  const lessonKeys = (item: Lesson): Array<[string, number]> => [['Lessons', item.row], ...item.blocks.flatMap((block): Array<[string, number]> => [['Blocks', block.row], ...refsOf(block.questionRefs)]),
    ...item.practiceSets.flatMap((set): Array<[string, number]> => [['PracticeSets', set.row], ...refsOf(set.questionRefs)])]
  const topicKeys = (item: Topic): Array<[string, number]> => [['Topics', item.row], ...item.lessons.flatMap(lessonKeys), ...item.tests.flatMap((test): Array<[string, number]> => [['Tests', test.row], ...refsOf(test.questionRefs)])]

  const groups = new Map<string, Topic[]>()
  outline.topics.forEach((item) => groups.set(item.skill, [...(groups.get(item.skill) ?? []), item]))
  const toggle = (key: string) => setFolded((current) => { const next = new Set(current); if (!next.delete(key)) next.add(key); return next })
  const open = (sheet: string, line: number, cells: Cells) => setRow({ sheet, row: line, cells })
  const badge = (n: number) => n ? <span className="adm-badge adm-badge--danger">{n} lỗi</span> : <span className="adm-badge adm-badge--muted">Nháp</span>

  const courseErrors = outline.course ? count([['Course', outline.course.row]]) : 0
  return (
    <section aria-label="Xem trước khóa học từ file" className="adm-ot">
      <h2 className="adm-ot__title">Khóa học sẽ được tạo</h2>
      {outline.course ? (
        <div className={`adm-ot__card adm-ot__card--course${courseErrors ? ' adm-ot__card--bad' : ''}`}>
          <div className="adm-ot__course">
            <div className="adm-ot__course-main">
              <strong className="adm-ot__course-name">{outline.course.name || 'Chưa có tên'}</strong>
              <span className="adm-ot__course-meta">
                <code>{outline.course.code || '—'}</code>
                <span className="adm-ot__pill">Band {outline.course.bandLevel || '—'}</span>
                <span className="adm-badge adm-badge--muted">Chưa kích hoạt</span>
                {courseErrors ? <span className="adm-badge adm-badge--danger">{courseErrors} lỗi</span> : null}
              </span>
            </div>
            <button className="adm-btn adm-btn--small" onClick={() => open('Course', outline.course!.row, outline.course!.cells)} type="button"><Eye aria-hidden="true" size={14} /> Xem khóa học</button>
          </div>
          {courseErrors ? <ul className="adm-ot__issues">{errors.filter((issue) => issue.sheet === 'Course' && issue.row === outline.course!.row).map((issue, index) => <li key={index}>{importIssueLabel(issue.code)}{issue.column ? ` (cột ${issue.column})` : ''}</li>)}</ul> : null}
        </div>
      ) : <p className="adm-muted">File chưa có dòng khóa học.</p>}

      <div className="adm-skill-groups">
        {[...groups.entries()].map(([skill, list]) => {
          const Icon = SKILL_ICON[skill as keyof typeof SKILL_ICON] ?? CircleDashed
          const isOpen = !folded.has(skill)
          return (
            <section className={`adm-skill-group adm-skill-group--${(skill || 'none').toLowerCase()}${isOpen ? ' is-open' : ''}`} key={skill}>
              <h3 className="adm-skill-group__title">
                <button aria-expanded={isOpen} className="adm-skill-group__toggle" onClick={() => toggle(skill)} type="button">
                  <ChevronRight aria-hidden="true" className="adm-skill-group__chevron" size={18} />
                  <Icon aria-hidden="true" className="adm-skill-group__icon" size={18} />
                  <span className="adm-skill-group__name">{SKILL_NAME[skill as keyof typeof SKILL_NAME] ?? (skill || 'Chưa chọn kỹ năng')}</span>
                  {SKILL_LABEL[skill as keyof typeof SKILL_LABEL] ? <span className="adm-skill-group__vi">{SKILL_LABEL[skill as keyof typeof SKILL_LABEL]}</span> : null}
                  <span className="adm-skill-group__count">{list.length} chủ đề</span>
                </button>
              </h3>
              {isOpen ? (
                <div className="adm-skill-group__panel">
                  <div className="adm-topic-table">
                    <div aria-hidden="true" className="adm-topic-head"><span>Chủ đề</span><span>Trạng thái</span><span /></div>
                    <ul className="adm-topic-tree">
                      {list.map((item) => (
                        <li key={item.row}>
                          <article aria-label={item.name} className={`adm-topic-node adm-topic-node--${(skill || 'none').toLowerCase()}`}>
                            <div className="adm-topic-name">
                              <span aria-hidden="true" className="adm-topic-toggle adm-topic-toggle--leaf" />
                              <div className="adm-topic-title">
                                <strong>{item.name || 'Chưa có tên'}</strong>
                                <span className="adm-topic-sub"><code>{item.code || '—'}</code><span>{item.lessons.length} bài học</span><span>thứ tự {item.sortOrder || '—'}</span></span>
                              </div>
                            </div>
                            <div className="adm-topic-meta">{badge(count(topicKeys(item)))}</div>
                            <div className="adm-topic-actions">
                              <button className="adm-btn adm-topic-open" onClick={() => setTopic(item)} type="button"><BookOpen aria-hidden="true" size={16} /> Mở bài học</button>
                              <button aria-label={`Xem chủ đề ${item.name}`} className="adm-btn adm-btn--small" onClick={() => open('Topics', item.row, item.cells)} type="button"><Eye aria-hidden="true" size={14} /></button>
                            </div>
                          </article>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}
            </section>
          )
        })}
      </div>

      {outline.courseTests.length + outline.milestones.length ? (
        <div className="adm-ot__card">
          <div className="adm-ot__head"><strong>Bài thi toàn khóa</strong></div>
          {[...outline.courseTests, ...outline.milestones].map((test) => <PackageLine key={test.row} onOpen={open} pkg={test} problems={count([['Tests', test.row], ...refsOf(test.questionRefs)])} />)}
        </div>
      ) : null}

      {topic ? (
        <AdminDrawer description={`${topic.code} · Bài học của chủ đề`} onClose={() => setTopic(null)} size="xl" title={topic.name || 'Chủ đề'}>
          {() => (
            <div className="adm-ot__drawer">
              {topic.lessons.length === 0 ? <p className="adm-muted">Chủ đề chưa có bài học.</p> : (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <caption className="adm-sr-only">Danh sách bài học</caption>
                    <thead><tr>
                      <th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Tiêu đề</th><th scope="col">Trạng thái</th>
                      <th scope="col">Block</th><th scope="col">KP</th><th scope="col">Phút</th><th className="adm-col-actions" scope="col">Hành động</th>
                    </tr></thead>
                    <tbody>
                      {topic.lessons.map((item, index) => (
                        <tr key={item.row}>
                          <td className="adm-stt">{index + 1}</td>
                          <td><code>{item.code || '—'}</code></td>
                          <td>{item.title || 'Chưa có tiêu đề'}</td>
                          <td>{badge(count(lessonKeys(item)))}</td>
                          <td>{item.blocks.length}</td>
                          <td>{item.knowledgePointCodes.length}</td>
                          <td>—</td>
                          <td className="adm-col-actions"><button aria-label={`Sửa bài học ${item.title}`} className="adm-btn adm-btn--small" onClick={() => setLesson(item)} type="button"><Pencil aria-hidden="true" size={14} /> Sửa bài học</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {topic.tests.length ? <div className="adm-ot__card"><div className="adm-ot__head"><strong>Bài thi của chủ đề</strong></div>{topic.tests.map((test) => <PackageLine key={test.row} onOpen={open} pkg={test} problems={count([['Tests', test.row], ...refsOf(test.questionRefs)])} />)}</div> : null}
            </div>
          )}
        </AdminDrawer>
      ) : null}

      {lesson ? (
        <AdminDrawer badge={badge(count(lessonKeys(lesson)))} description={onEdit ? `${lesson.code} · Sửa rồi bấm Lưu bản nháp ở trang` : `${lesson.code} · Dữ liệu từ file Excel, chỉ để xem`} onClose={() => setLesson(null)} size="xl" stacked title={lesson.title || 'Bài học'}>
          {() => (
            <div className="adm-course-draft-lesson">
              <section aria-label="Thông tin bài học" className="adm-sec">
                <div className="adm-sec__head"><h3 className="adm-sec__title">Thông tin bài học</h3></div>
                <ImportFields cells={live('Lessons', lesson.row, lesson.cells)} errors={errors} omit={['knowledgePointCodes']} onChange={edit?.('Lessons', lesson.row)} row={lesson.row} sheet="Lessons" warnings={warnings} />
              </section>
              <LessonKnowledge cells={live('Lessons', lesson.row, lesson.cells)} errors={errors} onChange={edit?.('Lessons', lesson.row)} row={lesson.row} />
              <section aria-label="Các block" className="adm-sec">
                <div className="adm-sec__head"><h3 className="adm-sec__title">Các block<span className="adm-count">{lesson.blocks.length}</span></h3></div>
                {lesson.blocks.length === 0 ? <p className="adm-muted">Bài chưa có block nào.</p> : null}
                {lesson.blocks.map((block, index) => {
                  const cells = live('Blocks', block.row, block.cells)
                  const isExercise = (cells.type ?? block.type) === 'EXERCISE'
                  return (
                    <BlockCard bad={count([['Blocks', block.row], ...refsOf(block.questionRefs)])} icon={isExercise ? ListChecks : FileText} key={block.row} summary={isExercise ? `${block.questionRefs.length} câu hỏi` : (cells.text ?? '').slice(0, 140) || '(trống)'} title={`Block ${index + 1} · ${isExercise ? 'Bài tập' : 'Văn bản'}`}>
                      <ImportFields cells={cells} errors={errors} onChange={edit?.('Blocks', block.row)} row={block.row} sheet="Blocks" warnings={warnings} />
                      <QuestionCards edit={edit} errors={errors} live={live} refs={block.questionRefs} questions={questions} warnings={warnings} />
                    </BlockCard>
                  )
                })}
              </section>
              <section aria-label="Gói luyện tập" className="adm-sec">
                <div className="adm-sec__head"><h3 className="adm-sec__title">Gói luyện tập<span className="adm-count">{lesson.practiceSets.length}</span></h3></div>
                {lesson.practiceSets.length === 0 ? <p className="adm-muted">Bài học chưa có gói luyện tập.</p> : null}
                {lesson.practiceSets.map((set) => (
                  <BlockCard bad={count([['PracticeSets', set.row], ...refsOf(set.questionRefs)])} icon={ListChecks} key={set.row} summary={`${set.questionRefs.length} câu hỏi`} title={set.title || set.code || 'Gói luyện tập'}>
                    <ImportFields cells={live('PracticeSets', set.row, set.cells)} errors={errors} onChange={edit?.('PracticeSets', set.row)} row={set.row} sheet="PracticeSets" warnings={warnings} />
                    <QuestionCards edit={edit} errors={errors} live={live} refs={set.questionRefs} questions={questions} warnings={warnings} />
                  </BlockCard>
                ))}
              </section>
              <div className="adm-form-footer"><button className="adm-btn" onClick={() => setLesson(null)} type="button">Đóng</button></div>
            </div>
          )}
        </AdminDrawer>
      ) : null}

      {row ? <ImportRowDrawer cells={live(row.sheet, row.row, row.cells)} errors={errors} onChange={edit?.(row.sheet, row.row)} onClose={() => setRow(null)} row={row.row} sheet={row.sheet} stacked warnings={warnings} /> : null}
    </section>
  )
}

/** One block of the lesson as the lesson editor draws it: icon and title, a summary line, and the fields under a fold. */
function BlockCard({ title, summary, icon: Icon, bad, children }: { title: string; summary: string; icon: typeof FileText; bad: number; children: ReactNode }) {
  const [isOpen, setOpen] = useState(true)
  return (
    <section aria-label={title} className="adm-bcard">
      <header className="adm-bcard__head">
        <span aria-hidden="true" className="adm-bcard__icon"><Icon size={16} /></span>
        <h4><button aria-expanded={isOpen} className="adm-bcard__toggle" onClick={() => setOpen(!isOpen)} type="button"><ChevronDown aria-hidden="true" size={16} />{title}</button></h4>
        {bad ? <span className="adm-badge adm-badge--danger">{bad} lỗi</span> : null}
      </header>
      {isOpen ? <><p className="ls-block__summary">{summary}</p>{children}</> : null}
    </section>
  )
}

/** The knowledge points of the lesson as a table, with the cell to change them and the reason when one is wrong. */
function LessonKnowledge({ cells, errors, row, onChange }: { cells: Cells; errors: ImportIssue[]; row: number; onChange?: (column: string, value: string) => void }) {
  const codes = (cells.knowledgePointCodes ?? '').split(/[,;]/).map((code) => code.trim()).filter(Boolean)
  const notes = errors.filter((issue) => issue.sheet === 'Lessons' && issue.row === row && issue.column === 'knowledgePointCodes').map((issue) => `${importIssueLabel(issue.code)}.`).join(' ')
  return (
    <section aria-label="Knowledge point của bài" className="adm-sec">
      <div className="adm-sec__head"><h3 className="adm-sec__title">Knowledge point của bài<span className="adm-count">{codes.length}</span></h3></div>
      {codes.length ? (
        <div className="adm-table-wrap"><table className="adm-table">
          <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th></tr></thead>
          <tbody>{codes.map((code, index) => <tr key={`${code}-${index}`}><td className="adm-stt">{index + 1}</td><td><code>{code}</code></td></tr>)}</tbody>
        </table></div>
      ) : <p className="adm-muted">Bài chưa có điểm kiến thức.</p>}
      {onChange ? <AdminField error={notes || undefined} label="Mã điểm kiến thức (cách nhau bằng dấu phẩy)"><input className="adm-input" onChange={(event) => onChange('knowledgePointCodes', event.target.value)} value={cells.knowledgePointCodes ?? ''} /></AdminField> : notes ? <p className="adm-field__error" role="alert">{notes}</p> : null}
    </section>
  )
}

function PackageLine({ pkg, problems, onOpen }: { pkg: Pkg; problems: number; onOpen: (sheet: string, row: number, cells: Cells) => void }) {
  return (
    <div className={`adm-ot__line${problems ? ' adm-ot__line--bad' : ''}`}>
      <span className="adm-ot__tag">{KIND_LABEL[pkg.kind] ?? pkg.kind}</span>
      <span className="adm-ot__body"><code>{pkg.code || '—'}</code> {pkg.title}{pkg.afterTopicSequence ? ` · sau chủ đề ${pkg.afterTopicSequence}` : ''} · {pkg.questionRefs.length} câu</span>
      {problems ? <span className="adm-badge adm-badge--danger">{problems} lỗi</span> : null}
      <button className="adm-btn adm-btn--small" onClick={() => onOpen(pkg.sheet, pkg.row, pkg.cells)} type="button"><Eye aria-hidden="true" size={14} /> Xem</button>
    </div>
  )
}

function QuestionCards({ refs, questions, errors, warnings, live, edit }: { refs: string[]; questions: Map<string, Question>; errors: ImportIssue[]; warnings: ImportIssue[]; live: (sheet: string, row: number, fallback: Cells) => Cells; edit?: Edit }) {
  return <>{refs.map((ref) => {
    const question = questions.get(ref)
    return (
      <div className="adm-ot__question" key={ref}>
        <strong>Câu hỏi <code>{ref}</code></strong>
        {question
          ? <ImportFields cells={live('Questions', question.row, question.cells)} errors={errors} onChange={edit?.('Questions', question.row)} row={question.row} sheet="Questions" warnings={warnings} />
          : <p className="adm-muted">Câu này không có trong trang tính Questions; có thể là câu đã có sẵn trong ngân hàng.</p>}
      </div>
    )
  })}</>
}
