import type { BandPoint, SkillCompletion } from '../api/overviewApi'
import { skillLabels, percentLabel } from '../statisticsFormat'

const dateLabel = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`

const SKILLS = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'] as const
export function SkillCompletionChart({ skills }: { skills: SkillCompletion[] }) {
  const ordered = SKILLS.map((skill) => skills.find((value) => value.skill === skill))
  const coordinates = [[150, 36], [248, 122], [150, 208], [52, 122]]
  const complete = ordered.every((value) => value?.percent !== null && value?.percent !== undefined)
  return <div className="statistics-skills">
    <svg viewBox="0 0 300 244" className="statistics-radar" role="img" aria-label={complete ? 'Radar tỷ lệ bài học hoàn thành của bốn kỹ năng.' : 'Chưa đủ dữ liệu để vẽ tiến độ cả bốn kỹ năng.'}>
      {[.25, .5, .75, 1].map((ratio) => <polygon key={ratio} points={coordinates.map(([x, y]) => `${150 + (x - 150) * ratio},${122 + (y - 122) * ratio}`).join(' ')} className="statistics-radar-grid" />)}
      {coordinates.map(([x, y], index) => <line key={index} x1="150" y1="122" x2={x} y2={y} className="statistics-radar-grid" />)}
      {complete && <polygon points={ordered.map((value, i) => `${150 + (coordinates[i][0] - 150) * value!.percent! / 100},${122 + (coordinates[i][1] - 122) * value!.percent! / 100}`).join(' ')} className="statistics-radar-fill" />}
      <text x="150" y="18" textAnchor="middle">Listening</text><text x="273" y="126" textAnchor="middle">Reading</text><text x="150" y="232" textAnchor="middle">Writing</text><text x="25" y="126" textAnchor="middle">Speaking</text>
    </svg>
    <ul className="statistics-skills-list">{ordered.map((item, index) => <li key={SKILLS[index]} className={`detailed-skill-${SKILLS[index].toLowerCase()}`}><strong>{skillLabels[SKILLS[index]]}</strong>
      {item && item.percent !== null ? <><progress value={item.percent} max={100} aria-label={`${skillLabels[item.skill]}: ${item.completedLessons}/${item.totalLessons} bài`} /><span>{percentLabel(item.percent)}</span><small>{item.completedLessons}/{item.totalLessons} bài</small></> : <span className="detailed-skill-unavailable">Chưa có nội dung</span>}
    </li>)}</ul>
  </div>
}

export function BandHistoryChart({ points }: { points: BandPoint[] }) {
  const sorted = [...points].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.attemptId.localeCompare(b.attemptId))
  const first = Date.parse(sorted[0]?.submittedAt ?? '')
  const last = Date.parse(sorted.at(-1)?.submittedAt ?? '')
  const x = (point: BandPoint) => last === first ? 210 : 38 + (Date.parse(point.submittedAt) - first) / (last - first) * 340
  const y = (band: number) => 180 - band / 9 * 150
  return <>
    <svg viewBox="0 0 420 215" className="statistics-chart" role="img" aria-label="Lịch sử band của các lần thi đủ điều kiện trên trang này.">
      {[0, 3, 6, 9].map((band) => <g key={band}><line x1="38" x2="378" y1={y(band)} y2={y(band)} className="statistics-grid-line" /><text x="10" y={y(band) + 4}>{band}</text></g>)}
      {sorted.length > 1 && <polyline points={sorted.map((p) => `${x(p)},${y(p.band)}`).join(' ')} className="statistics-actual-line" fill="none" />}
      {sorted.map((p) => <circle tabIndex={0} key={p.attemptId} cx={x(p)} cy={y(p.band)} r="4" className="statistics-actual"><title>{p.submittedAt.slice(0, 10)}: band {p.band.toFixed(1)}{p.pendingRegrade ? ', đang chấm lại' : ''}</title></circle>)}
      {sorted.length > 0 && <text x="38" y="205" textAnchor="middle">{dateLabel(sorted[0].submittedAt)}</text>}
      {sorted.length > 1 && <text x="378" y="205" textAnchor="middle">{dateLabel(sorted.at(-1)!.submittedAt)}</text>}
    </svg>
    <details className="detailed-chart-details"><summary>Xem kết quả và nguồn chấm</summary><div className="statistics-table-wrap"><table><thead><tr><th>Ngày nộp</th><th>Band</th><th>Nguồn</th><th>Phiên bản</th></tr></thead><tbody>{sorted.map((p) => <tr key={p.attemptId}><td>{p.submittedAt.slice(0, 10)}</td><td>{p.band.toFixed(1)}</td><td>{p.gradingSource} · {p.scoringVersion}</td><td>{p.resultVersion}{p.pendingRegrade ? ' · đang chấm lại' : ''}</td></tr>)}</tbody></table></div></details>
  </>
}
