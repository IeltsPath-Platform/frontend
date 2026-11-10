import { useRef, useState, type KeyboardEvent } from 'react'
import type { BandPoint, BandSkill, SkillCompletion } from '../api/overviewApi'
import { bandAxis } from '../bandHistoryModel'
import { skillLabels, percentLabel } from '../statisticsFormat'
import '../chart-transitions.css'

const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
export function SkillCompletionChart({ skills }: { skills: SkillCompletion[] }) {
  const ordered = SKILLS.map((skill) => skills.find((value) => value.skill === skill))
  const coordinates = [[150, 36], [248, 122], [150, 208], [52, 122]]
  const complete = ordered.every((value) => value?.percent !== null && value?.percent !== undefined)
  return <div className="statistics-skills overview-chart-enter">
    <svg viewBox="0 0 300 244" className="statistics-radar" role="img" aria-label={complete ? 'Radar tỷ lệ bài học hoàn thành của bốn kỹ năng.' : 'Chưa đủ dữ liệu để vẽ tiến độ cả bốn kỹ năng.'}>
      {[.25, .5, .75, 1].map((ratio) => <polygon key={ratio} points={coordinates.map(([x, y]) => `${150 + (x - 150) * ratio},${122 + (y - 122) * ratio}`).join(' ')} className="statistics-radar-grid" />)}
      {coordinates.map(([x, y], index) => <line key={index} x1="150" y1="122" x2={x} y2={y} className="statistics-radar-grid" />)}
      {complete && <polygon points={ordered.map((value, i) => `${150 + (coordinates[i][0] - 150) * value!.percent! / 100},${122 + (coordinates[i][1] - 122) * value!.percent! / 100}`).join(' ')} className="statistics-radar-fill overview-chart-radar" />}
      <text x="150" y="18" textAnchor="middle">Listening</text><text x="273" y="126" textAnchor="middle">Reading</text><text x="150" y="232" textAnchor="middle">Writing</text><text x="25" y="126" textAnchor="middle">Speaking</text>
    </svg>
    <ul className="statistics-skills-list">{ordered.map((item, index) => <li key={SKILLS[index]} className={`detailed-skill-${SKILLS[index].toLowerCase()}`}><strong>{skillLabels[SKILLS[index]]}</strong>
      {item && item.percent !== null ? <><progress className="overview-chart-progress" value={item.percent} max={100} aria-label={`${skillLabels[item.skill]}: ${item.completedLessons}/${item.totalLessons} bài`} /><span>{percentLabel(item.percent)}</span><small>{item.completedLessons}/{item.totalLessons} bài</small></> : <span className="detailed-skill-unavailable">Chưa có nội dung</span>}
    </li>)}</ul>
  </div>
}

const SOURCE_LABELS: Record<string, string> = { AUTO: 'Chấm tự động', AI: 'AI chấm', HUMAN: 'Giám khảo chấm' }
const shortDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`
const fullDate = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
const bandText = (band: number) => band.toFixed(1)

// Plot geometry in viewBox units; the SVG scales with its container.
const W = 760
const H = 320
const LEFT = 46
const RIGHT = 28
const TOP = 30
const BOTTOM = 44
const PLOT_W = W - LEFT - RIGHT
const PLOT_H = H - TOP - BOTTOM
const MIN_LABEL_GAP = 52

function changeInfo(change: number | null) {
  if (change === null) return { text: 'Lần thi đầu tiên trong khoảng này' }
  if (change > 0) return { text: `Tăng ${bandText(change)} so với lần trước` }
  if (change < 0) return { text: `Giảm ${bandText(-change)} so với lần trước` }
  return { text: 'Không đổi so với lần trước' }
}

const TIP_W = 196
const tipChange = (change: number | null) => {
  if (change === null) return { text: 'Lần thi đầu tiên', tone: 'is-flat' }
  if (change > 0) return { text: `+${bandText(change)} so với lần trước`, tone: 'is-up' }
  if (change < 0) return { text: `−${bandText(-change)} so với lần trước`, tone: 'is-down' }
  return { text: 'Không đổi so với lần trước', tone: 'is-flat' }
}

export function BandHistoryChart({ points, targetBand = null, baseline = null, placementBand = null, skill = 'OVERALL' }: {
  points: BandPoint[]
  targetBand?: number | null
  baseline?: number | null
  placementBand?: number | null
  skill?: BandSkill
}) {
  const sorted = [...points].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.attemptId.localeCompare(b.attemptId))
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [focusedId, setFocusedId] = useState<string | null>(null)
  const activeId = hoveredId ?? focusedId
  const svgRef = useRef<SVGSVGElement>(null)
  if (!sorted.length) return null

  const firstTime = Date.parse(sorted[0].submittedAt)
  const lastTime = Date.parse(sorted.at(-1)!.submittedAt)
  const inner = PLOT_W - 40
  const x = (point: BandPoint) => LEFT + 20 + (lastTime === firstTime ? inner / 2 : (Date.parse(point.submittedAt) - firstTime) / (lastTime - firstTime) * inner)
  const axis = bandAxis([...sorted.map((point) => point.band), ...(targetBand != null ? [targetBand] : []), ...(placementBand != null ? [placementBand] : [])])
  const y = (band: number) => TOP + (axis.hi - band) / (axis.hi - axis.lo) * PLOT_H

  const startBand = baseline ?? sorted[0].band
  const showPlacement = placementBand != null
  // When the first measurement equals the placement band the two reference lines would overlap, so only the placement one is drawn.
  const showBaseline = sorted.length > 1 && !(showPlacement && Math.abs(placementBand - startBand) < 0.01)
  const showTarget = targetBand != null
  const hasPending = sorted.some((point) => point.pendingRegrade)
  const labelEveryPoint = sorted.length <= 12

  const activeIndex = sorted.findIndex((point) => point.attemptId === activeId)
  const showTooltip = activeIndex >= 0
  const resolvedIndex = showTooltip ? activeIndex : sorted.length - 1
  const active = sorted[resolvedIndex]
  const previous = resolvedIndex > 0 ? sorted[resolvedIndex - 1] : null
  const change = changeInfo(previous ? Math.round((active.band - previous.band) * 10) / 10 : null)

  // Date labels: always first and last, intermediate ones only when they do not crowd their neighbours.
  const xs = sorted.map(x)
  const labelled: number[] = [0]
  for (let i = 1; i < sorted.length - 1; i += 1) {
    if (xs[i] - xs[labelled.at(-1)!] >= MIN_LABEL_GAP && xs[sorted.length - 1] - xs[i] >= MIN_LABEL_GAP) labelled.push(i)
  }
  if (sorted.length > 1) {
    if (xs[sorted.length - 1] - xs[labelled.at(-1)!] < MIN_LABEL_GAP && labelled.length > 1) labelled.pop()
    labelled.push(sorted.length - 1)
  }

  const bounds = xs.map((value, i) => ({
    left: i === 0 ? LEFT : (xs[i - 1] + value) / 2,
    right: i === sorted.length - 1 ? W - RIGHT : (value + xs[i + 1]) / 2,
  }))
  const linePoints = sorted.map((point, i) => `${xs[i]},${y(point.band)}`).join(' ')
  const areaPath = `M ${xs[0]},${TOP + PLOT_H} L ${linePoints.replaceAll(' ', ' L ')} L ${xs.at(-1)},${TOP + PLOT_H} Z`

  const tip = tipChange(previous ? Math.round((active.band - previous.band) * 10) / 10 : null)
  const tipHeight = active.pendingRegrade ? 84 : 66
  const tipX = Math.min(Math.max(xs[resolvedIndex] - TIP_W / 2, LEFT), W - RIGHT - TIP_W)
  const pointY = y(active.band)
  const tipY = pointY - 18 - tipHeight >= 2 ? pointY - 18 - tipHeight : pointY + 18

  function moveFocus(event: KeyboardEvent<SVGCircleElement>, index: number) {
    const next = event.key === 'ArrowRight' ? index + 1 : event.key === 'ArrowLeft' ? index - 1 : null
    if (next === null || next < 0 || next >= sorted.length) return
    event.preventDefault()
    svgRef.current?.querySelectorAll<SVGCircleElement>('circle.statistics-actual')[next]?.focus()
  }

  return <div className={`band-chart overview-chart-enter is-${skill.toLowerCase()}`}>
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="statistics-chart" role="img" aria-label="Lịch sử band của các lần thi đủ điều kiện trên trang này."
      onPointerLeave={() => setHoveredId(null)}>
      <text x={LEFT - 8} y={16} textAnchor="end" className="band-axis-title">Band</text>
      {axis.ticks.map((band) => <g key={band}>
        <line x1={LEFT} x2={W - RIGHT} y1={y(band)} y2={y(band)} className="statistics-grid-line" />
        <text x={LEFT - 8} y={y(band) + 4} textAnchor="end" className="band-axis-label">{bandText(band)}</text>
      </g>)}
      {showBaseline && <line x1={LEFT} x2={W - RIGHT} y1={y(startBand)} y2={y(startBand)} className="band-ref-line is-start" />}
      {showPlacement && <>
        <line x1={LEFT} x2={W - RIGHT} y1={y(placementBand)} y2={y(placementBand)} className="band-ref-line is-placement" />
        <text x={LEFT + 8} y={y(placementBand) + 15} className="band-placement-label">Đầu vào {bandText(placementBand)}</text>
      </>}
      {showTarget && <>
        <line x1={LEFT} x2={W - RIGHT} y1={y(targetBand)} y2={y(targetBand)} className="band-ref-line is-target" />
        <text x={W - RIGHT} y={y(targetBand) - 6} textAnchor="end" className="band-target-label">Mục tiêu {bandText(targetBand)}</text>
      </>}
      {sorted.length > 1 && <path d={areaPath} className="band-area" />}
      {sorted.length > 1 && <polyline points={linePoints} pathLength={1} className="statistics-actual-line" fill="none" />}
      {showTooltip && <line x1={xs[resolvedIndex]} x2={xs[resolvedIndex]} y1={TOP} y2={TOP + PLOT_H} className="band-active-guide" />}
      {sorted.map((point, i) => <rect key={`hit-${point.attemptId}`} x={bounds[i].left} y={TOP} width={bounds[i].right - bounds[i].left} height={PLOT_H}
        className="band-hit" aria-hidden="true" onPointerEnter={() => setHoveredId(point.attemptId)} onClick={() => setHoveredId(point.attemptId)} />)}
      {sorted.map((point, i) => <circle tabIndex={0} key={point.attemptId} cx={xs[i]} cy={y(point.band)} r={showTooltip && i === resolvedIndex ? 7 : 5}
        className={`statistics-actual${point.pendingRegrade ? ' is-pending' : ''}${showTooltip && i === resolvedIndex ? ' is-active' : ''}`}
        onPointerEnter={() => setHoveredId(point.attemptId)} onPointerDown={(event) => event.preventDefault()}
        onFocus={() => setFocusedId(point.attemptId)} onBlur={() => setFocusedId(null)} onKeyDown={(event) => moveFocus(event, i)}>
        <title>{point.submittedAt.slice(0, 10)}: band {point.band.toFixed(1)}{point.pendingRegrade ? ', đang chấm lại' : ''}</title>
      </circle>)}
      {sorted.map((point, i) => (labelEveryPoint && (!showTooltip || i !== resolvedIndex)) && <text key={`value-${point.attemptId}`} x={xs[i]} y={y(point.band) - 13} textAnchor="middle"
        className={`band-point-label${i === resolvedIndex ? ' is-active' : ''}`}>{bandText(point.band)}</text>)}
      {labelled.map((i) => <text key={`date-${sorted[i].attemptId}`} x={xs[i]} y={H - 14} textAnchor="middle" className="band-axis-label">{shortDate(sorted[i].submittedAt)}</text>)}
      {showTooltip && <g className="band-tip" aria-hidden="true" transform={`translate(${tipX} ${tipY})`}>
        <rect width={TIP_W} height={tipHeight} rx="12" className="band-tip-box" />
        <text x="14" y="21" className="band-tip-date">{fullDate(active.submittedAt)} · {SOURCE_LABELS[active.gradingSource] ?? active.gradingSource}</text>
        <text x="14" y="45" className="band-tip-band">Band {bandText(active.band)}</text>
        <text x="14" y="62" className={`band-tip-change ${tip.tone}`}>{tip.text}</text>
        {active.pendingRegrade && <text x="14" y="78" className="band-tip-pending">Đang chấm lại</text>}
      </g>}
    </svg>
    <div className="sr-only" aria-live="polite">
      <span>Lần thi {resolvedIndex + 1}/{sorted.length} · {fullDate(active.submittedAt)}</span>
      <span>Band {bandText(active.band)}</span>
      <span>{change.text}</span>
      <span>{SOURCE_LABELS[active.gradingSource] ?? active.gradingSource}</span>
      {active.pendingRegrade && <span>Đang chấm lại, điểm có thể thay đổi</span>}
    </div>
    <ul className="band-legend" aria-label="Chú giải biểu đồ">
      <li><svg width="26" height="10" aria-hidden="true"><line x1="0" x2="26" y1="5" y2="5" className="band-legend-line" /><rect x="9.5" y="1.5" width="7" height="7" rx="3.5" className="statistics-actual" /></svg>Band mỗi lần thi</li>
      {showBaseline && <li><svg width="26" height="10" aria-hidden="true"><line x1="0" x2="26" y1="5" y2="5" className="band-ref-line is-start" /></svg>Lần đầu {bandText(startBand)}</li>}
      {showPlacement && <li><svg width="26" height="10" aria-hidden="true"><line x1="0" x2="26" y1="5" y2="5" className="band-ref-line is-placement" /></svg>Bài đầu vào {bandText(placementBand)}</li>}
      {showTarget && <li><svg width="26" height="10" aria-hidden="true"><line x1="0" x2="26" y1="5" y2="5" className="band-ref-line is-target" /></svg>Mục tiêu {bandText(targetBand)}</li>}
      {hasPending && <li><svg width="26" height="10" aria-hidden="true"><rect x="9.5" y="1.5" width="7" height="7" rx="3.5" className="statistics-actual is-pending" /></svg>Đang chấm lại</li>}
      {axis.lo > 0 && <li className="band-axis-note">Trục band hiển thị từ {bandText(axis.lo)} đến {bandText(axis.hi)}</li>}
    </ul>
    <table className="sr-only"><caption>Kết quả band của từng lần thi</caption><thead><tr><th>Ngày nộp</th><th>Band</th><th>Nguồn</th><th>Phiên bản</th></tr></thead><tbody>{sorted.map((p) => <tr key={p.attemptId}><td>{p.submittedAt.slice(0, 10)}</td><td>{p.band.toFixed(1)}</td><td>{p.gradingSource} · {p.scoringVersion}</td><td>{p.resultVersion}{p.pendingRegrade ? ' · đang chấm lại' : ''}</td></tr>)}</tbody></table>
  </div>
}
