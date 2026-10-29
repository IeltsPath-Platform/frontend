import { useState } from 'react'
import { Eye, Search, Sparkles, X } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminResource, type AdminResource } from '../../lib/useAdminResource'
import type { PackageListItem } from '../../packages/types'
import { listFittingPracticeSets } from '../api/courseDraftApi'
import { useCourseDraftCatalog } from '../lib/courseDraftCatalog'
import { COURSE_NEW_SET_LIMIT, type CoursePracticeSet } from '../types'
import { CoursePackageDetail } from './CoursePackageDetail'
import { CoursePracticeSetDetail } from './CoursePracticeSetDetail'
import { CoursePracticeSetGenerator } from './CoursePracticeSetGenerator'

const LIMIT = 20

/**
 * The practice sets a lesson ends with: what is attached, as a table with a remove button per row, and a dialog to
 * choose more from the published sets that are not tied to a lesson yet. A set already used elsewhere in the draft is
 * shown but cannot be ticked. The dialog offers only the sets whose questions measure one of the lesson's knowledge
 * points; the others stay behind a link, and an attached set that measures none of them is flagged. When the fit cannot
 * be told (no points, or the check failed) every set is offered. When no set fits, the model can write one from the
 * lesson's reading knowledge points; it joins the table as a proposal to read, and approving the course creates it as a draft.
 */
export function CoursePackagePicker({ value, onChange, catalog, usedIds, knowledgePointIds, lessonTitle, vocabularySenseIds, newWordLemmas, newSets, onNewSetsChange, disabled }: {
  value: string[]; onChange: (next: string[]) => void; catalog: AdminResource<PackageListItem[]>; usedIds: readonly string[]
  knowledgePointIds: readonly string[]; lessonTitle: string
  /** The lesson's words, handed to the model so a set it writes uses them. */
  vocabularySenseIds: readonly string[]; newWordLemmas: readonly string[]
  newSets: readonly CoursePracticeSet[]
  onNewSetsChange: (next: CoursePracticeSet[]) => void; disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [text, setText] = useState('')
  const [viewing, setViewing] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [viewingNew, setViewingNew] = useState<number | null>(null)
  const { knowledge } = useCourseDraftCatalog()
  const knowledgeById = new Map((knowledge.data?.nodes ?? []).map((node) => [node.id, node]))
  /** The model writes passages, not audio, so only reading points can have a set written for them. */
  const readingPoints = knowledgePointIds.flatMap((id) => {
    const node = knowledgeById.get(id)
    return node?.skill === 'READING' ? [{ id, code: node.code, name: node.name }] : []
  })
  const total = value.length + newSets.length
  const fitting = useAdminResource(`course-fitting-sets|${knowledgePointIds.join(',')}`, (signal) => listFittingPracticeSets(knowledgePointIds, signal))
  const fits = fitting.status === 'success' && knowledgePointIds.length > 0 ? new Set(fitting.data ?? []) : null
  const packages = (catalog.data ?? []).filter((item) => !item.lessonId && !item.courseId)
  // Only the sets that measure the lesson's points are offered; the rest stay behind a link, and an attached one is never hidden.
  const hideMisfits = fits !== null && !showAll
  const offered = hideMisfits ? packages.filter((item) => fits.has(item.id) || value.includes(item.id)) : packages
  const hiddenCount = packages.length - offered.length
  const needle = text.trim().toLowerCase()
  const shown = offered.filter((item) => !needle || item.code.toLowerCase().includes(needle) || item.title.toLowerCase().includes(needle))
  const atLimit = total >= LIMIT
  const canGenerate = !disabled && readingPoints.length > 0 && newSets.length < COURSE_NEW_SET_LIMIT && !atLimit
  const isTaken = (item: PackageListItem) => !value.includes(item.id) && usedIds.includes(item.id)
  const available = shown.filter((item) => !isTaken(item))
  const free = fits ? [...available.filter((item) => fits.has(item.id)), ...available.filter((item) => !fits.has(item.id))] : available
  const taken = shown.filter(isTaken)
  /** Why no set is marked, so that "none fits" is not mistaken for "could not tell". */
  const fitNote = knowledgePointIds.length === 0 ? 'Bài chưa chọn điểm kiến thức nên chưa gợi ý được gói khớp.'
    : fitting.status === 'error' ? 'Chưa kiểm tra được gói nào khớp điểm kiến thức của bài.'
    : fits && !packages.some((item) => fits.has(item.id)) ? 'Không có gói nào khớp điểm kiến thức của bài.' : null

  /** A set the author can tick, or one used by another lesson of the draft, with a button to read it. */
  const row = (item: PackageListItem) => {
    const checked = value.includes(item.id)
    return <li className="adm-pkg-item" key={item.id}>
      <label className="adm-kp-card">
        <input checked={checked} disabled={disabled || isTaken(item) || (!checked && atLimit)} onChange={(event) => onChange(event.target.checked ? [...value, item.id] : value.filter((id) => id !== item.id))} type="checkbox" />
        <span className="adm-kp-card__text">
          <span className="adm-kp-card__title">{item.title}</span>
          <small><code>{item.code}</code></small>
        </span>
        {fits?.has(item.id) ? <span className="adm-badge adm-badge--ok">Khớp điểm kiến thức</span> : null}
      </label>
      <span className="adm-kp-table__remove adm-qrow__tools">
        <button aria-label={`Xem chi tiết gói ${item.code} trong hộp chọn`} onClick={() => setViewing(item.id)} type="button"><Eye aria-hidden="true" size={16} /></button>
      </span>
    </li>
  }

  return <section aria-label="Gói luyện tập của bài" className="adm-sec">
    <div className="adm-sec__head">
      <h5 className="adm-sec__title">Gói luyện tập<span className="adm-count">{total}/{LIMIT}</span></h5>
      <div className="adm-sec__tools">
        <button className="adm-btn adm-btn--small" disabled={!canGenerate}
          onClick={() => setGenerating(true)} title={readingPoints.length === 0 ? 'Bài cần có điểm kiến thức kỹ năng đọc để AI viết gói luyện.' : undefined} type="button"><Sparkles aria-hidden="true" size={14} />Tạo gói luyện bằng AI</button>
        <button className="adm-btn adm-btn--small" disabled={disabled || catalog.status !== 'success'} onClick={() => { setShowAll(false); setOpen(true) }} type="button">{value.length ? 'Sửa lựa chọn' : 'Chọn gói luyện tập'}</button>
      </div>
    </div>
    {catalog.status === 'loading' ? <AdminLoading label="Đang tải gói luyện tập…" /> : null}
    {catalog.status === 'error' ? <AdminError message={catalog.error ?? 'Không tải được gói luyện tập.'} onRetry={catalog.reload} /> : null}
    {catalog.status === 'success' || newSets.length > 0 ? <div className="adm-table-wrap adm-kp-table">
      <table aria-label="Gói luyện tập đã chọn" className="adm-table">
        <thead><tr><th className="adm-stt" scope="col">STT</th><th scope="col">Mã</th><th scope="col">Tên gói</th><th aria-label="Thao tác" scope="col" /></tr></thead>
        <tbody>{total === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={4}>Chưa gắn gói luyện tập nào.</td></tr> : null}
          {value.map((id, index) => {
          const item = packages.find((candidate) => candidate.id === id)
          return <tr key={id}>
            <td className="adm-stt">{index + 1}</td><td><code>{item?.code ?? id.slice(0, 8)}</code></td>
            <td>{item?.title ?? <span className="adm-muted">Gói không còn trong danh sách đã xuất bản</span>}{item && fits && !fits.has(id) ? <span className="adm-badge adm-badge--warn adm-pkg-flag">Không khớp điểm kiến thức</span> : null}</td>
            <td className="adm-kp-table__remove adm-qrow__tools">
              {item ? <button aria-label={`Xem chi tiết gói ${item.code}`} onClick={() => setViewing(item.id)} type="button"><Eye aria-hidden="true" size={16} /></button> : null}
              <button aria-label={`Gỡ gói ${item?.code ?? id}`} disabled={disabled} onClick={() => onChange(value.filter((selected) => selected !== id))} type="button"><X aria-hidden="true" size={16} /></button>
            </td>
          </tr>
        })}
          {newSets.map((set, index) => <tr key={`new-${index}`}>
            <td className="adm-stt">{value.length + index + 1}</td>
            <td><span className="adm-badge adm-badge--warn">AI viết · nháp</span></td>
            <td>{set.title}<span className="adm-muted adm-pkg-flag">{set.questions.length} câu</span></td>
            <td className="adm-kp-table__remove adm-qrow__tools">
              <button aria-label={`Xem chi tiết gói AI viết ${index + 1}`} onClick={() => setViewingNew(index)} type="button"><Eye aria-hidden="true" size={16} /></button>
              <button aria-label={`Gỡ gói AI viết ${index + 1}`} disabled={disabled} onClick={() => onNewSetsChange(newSets.filter((_, position) => position !== index))} type="button"><X aria-hidden="true" size={16} /></button>
            </td>
          </tr>)}</tbody>
      </table>
    </div> : null}
    {open ? <AdminModal title="Chọn gói luyện tập" size="lg" onClose={() => setOpen(false)} stacked>
      {(close) => <>
        <div className="adm-kp-dialog__bar">
          <label className="adm-kp-search">
            <Search aria-hidden="true" size={16} />
            <input aria-label="Lọc gói luyện tập" className="adm-input" onChange={(event) => setText(event.target.value)} placeholder="Tìm theo mã hoặc tên" type="search" value={text} />
          </label>
        </div>
        <div className="adm-kp-dialog__list">
          {packages.length === 0 ? <p className="adm-muted adm-kp-dialog__empty">Chưa có gói luyện tập nào đã xuất bản và chưa gắn bài học.</p> : null}
          {offered.length > 0 && shown.length === 0 ? <p className="adm-muted adm-kp-dialog__empty">Không có gói khớp bộ lọc.</p> : null}
          {fitNote && packages.length > 0 ? <p className="adm-muted adm-pkg-note">{fitNote}
            {fits && canGenerate && !packages.some((item) => fits.has(item.id)) ? <> Bạn có thể <button className="adm-link" onClick={() => { close(); setGenerating(true) }} type="button">tạo gói luyện bằng AI</button> từ điểm kiến thức của bài.</> : null}</p> : null}
          {free.length ? <ul className="adm-pkg-list">{free.map(row)}</ul> : null}
          {taken.length ? <>
            <h3 className="adm-pkg-taken">Đã dùng ở bài khác trong bản nháp<span>{taken.length}</span></h3>
            <ul className="adm-pkg-list">{taken.map(row)}</ul>
          </> : null}
          {fits && (showAll || hiddenCount > 0) ? <p className="adm-pkg-more">
            <button className="adm-link" onClick={() => setShowAll(!showAll)} type="button">{showAll ? 'Chỉ hiện gói khớp điểm kiến thức' : `Hiện thêm ${hiddenCount} gói không khớp điểm kiến thức`}</button>
          </p> : null}
        </div>
        <footer className="adm-kp-dialog__footer">
          <span aria-live="polite" className="adm-muted">{total}/{LIMIT} đã chọn{atLimit ? ' · đã đạt tối đa' : ''}</span>
          <div className="adm-kp-dialog__actions"><button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button></div>
        </footer>
      </>}
    </AdminModal> : null}
    {viewing ? <CoursePackageDetail onClose={() => setViewing(null)} packageId={viewing} /> : null}
    {generating ? <CoursePracticeSetGenerator lessonTitle={lessonTitle} newWordLemmas={newWordLemmas} onClose={() => setGenerating(false)}
      vocabularySenseIds={vocabularySenseIds}
      onGenerated={(set) => onNewSetsChange([...newSets, set])} points={readingPoints} /> : null}
    {viewingNew !== null && newSets[viewingNew] ? <CoursePracticeSetDetail disabled={disabled} onClose={() => setViewingNew(null)}
      onChange={(next) => onNewSetsChange(newSets.map((set, position) => position === viewingNew ? next : set))} set={newSets[viewingNew]} /> : null}
  </section>
}
