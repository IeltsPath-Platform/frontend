import { useState } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { AdminModal } from '../../components/AdminLayer'
import { CEFR_LEVELS, type CefrLevel, type TreeNode } from '../../knowledge-graph/types'

/**
 * The big picker for the knowledge points of a course request: every point on offer at a glance, searchable, grouped by
 * level, ticked in place. `offered` is already narrowed to the band and skills and ordered highest level first.
 */
export function CourseKnowledgeDialog({ offered, picked, limit, description, onChange, onClose }: {
  offered: readonly TreeNode[]; picked: readonly string[]; limit: number; description: string
  onChange: (next: string[]) => void; onClose: () => void
}) {
  const [text, setText] = useState('')
  const [level, setLevel] = useState<CefrLevel | 'ALL'>('ALL')
  const [folded, setFolded] = useState<readonly CefrLevel[]>([])
  const levels = CEFR_LEVELS.filter((item) => offered.some((node) => node.cefrLevel === item)).reverse()
  const needle = text.trim().toLowerCase()
  const shown = offered.filter((node) => (level === 'ALL' || node.cefrLevel === level)
    && (!needle || node.code.toLowerCase().includes(needle) || node.name.toLowerCase().includes(needle)))
  const groups = levels.map((item) => ({ level: item, nodes: shown.filter((node) => node.cefrLevel === item) })).filter((group) => group.nodes.length)
  const atLimit = picked.length >= limit

  function fold(item: CefrLevel) {
    setFolded((current) => (current.includes(item) ? current.filter((entry) => entry !== item) : [...current, item]))
  }

  function toggle(id: string, checked: boolean) {
    onChange(checked ? [...picked, id] : picked.filter((item) => item !== id))
  }

  /** Ticks the points of one level that are on the list now, as many as the limit leaves room for; unticks them all when every one is ticked. */
  function toggleGroup(nodes: readonly TreeNode[]) {
    const ids = nodes.map((node) => node.id)
    if (ids.every((id) => picked.includes(id))) { onChange(picked.filter((id) => !ids.includes(id))); return }
    onChange([...picked, ...ids.filter((id) => !picked.includes(id)).slice(0, limit - picked.length)])
  }

  return <AdminModal title="Chọn điểm kiến thức" description={description} size="lg" stacked onClose={onClose}>
    {(close) => <>
      <div className="adm-kp-dialog__bar">
        <label className="adm-kp-search">
          <Search aria-hidden="true" size={16} />
          <input aria-label="Lọc điểm kiến thức" className="adm-input" onChange={(event) => setText(event.target.value)} placeholder="Tìm theo mã hoặc tên" type="search" value={text} />
        </label>
        <div aria-label="Lọc theo cấp độ" className="adm-kp-levels" role="group">
          <button aria-pressed={level === 'ALL'} className="adm-kp-level" onClick={() => setLevel('ALL')} type="button">Tất cả <span>{offered.length}</span></button>
          {levels.map((item) => <button aria-pressed={level === item} className="adm-kp-level" key={item} onClick={() => setLevel(item)} type="button">
            {item} <span>{offered.filter((node) => node.cefrLevel === item).length}</span>
          </button>)}
        </div>
      </div>
      <div className="adm-kp-dialog__list">
        {groups.length ? groups.map((group) => {
          const pickedHere = group.nodes.filter((node) => picked.includes(node.id)).length
          const all = pickedHere === group.nodes.length
          const closed = folded.includes(group.level)
          return <section aria-label={`Cấp ${group.level}`} className={`adm-kp-group${closed ? ' is-folded' : ''}`} key={group.level}>
          <div className="adm-kp-group__head">
            <input aria-label={`Chọn tất cả cấp ${group.level}`} checked={all} disabled={!all && atLimit}
              onChange={() => toggleGroup(group.nodes)} ref={(box) => { if (box) box.indeterminate = pickedHere > 0 && !all }} type="checkbox" />
            <h3>{group.level}<span>{pickedHere > 0 ? `${pickedHere}/${group.nodes.length} điểm đã chọn` : `${group.nodes.length} điểm`}</span></h3>
            <button aria-controls={`kp-level-${group.level}`} aria-expanded={!closed} aria-label={`${closed ? 'Mở' : 'Thu gọn'} cấp ${group.level}`} className="adm-kp-group__fold" onClick={() => fold(group.level)} type="button">
              <ChevronDown aria-hidden="true" size={18} />
            </button>
          </div>
          <div className="adm-kp-group__panel" id={`kp-level-${group.level}`} inert={closed}><div className="adm-kp-group__panel-inner"><ul>{group.nodes.map((node) => {
            const checked = picked.includes(node.id)
            return <li key={node.id}><label className="adm-kp-card">
              <input checked={checked} disabled={!checked && atLimit} onChange={(event) => toggle(node.id, event.target.checked)} type="checkbox" />
              <span className="adm-kp-card__text">
                <span className="adm-kp-card__title"><code>{node.code}</code> {node.name}</span>
                {node.canDo ? <small>{node.canDo}</small> : null}
              </span>
            </label></li>
          })}</ul></div></div>
        </section>
        }) : <p className="adm-muted adm-kp-dialog__empty">Không có điểm kiến thức khớp bộ lọc.</p>}
      </div>
      <footer className="adm-kp-dialog__footer">
        <span aria-live="polite" className="adm-muted">{picked.length}/{limit} đã chọn{atLimit ? ' · đã đạt tối đa' : ''}</span>
        <div className="adm-kp-dialog__actions">
          <button className="adm-btn" disabled={!picked.length} onClick={() => onChange([])} type="button">Bỏ chọn tất cả</button>
          <button className="adm-btn adm-btn--primary" onClick={close} type="button">Lưu</button>
        </div>
      </footer>
    </>}
  </AdminModal>
}
