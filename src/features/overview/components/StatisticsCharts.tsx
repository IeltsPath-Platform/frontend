import type { BandPoint, SkillCompletion, StudyDay } from '../api/overviewApi'

import { skillLabels, percentLabel } from '../statisticsFormat'
const minuteLabel = (seconds: number | null) => seconds === null ? '—' : new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(seconds / 60)

export function StudyTimeChart({ days }: { days: StudyDay[] }) {
  const max = Math.max(60, ...days.flatMap((day) => [day.actualSeconds ?? 0, day.plannedSeconds ?? 0]))
  const x = (index: number) => 45 + index / Math.max(1, days.length - 1) * 690
  const y = (seconds: number) => 165 - seconds / max * 130
  return <>
    <svg viewBox="0 0 780 205" className="statistics-chart" role="img" aria-label="Thời gian học theo ngày, đơn vị phút. Bảng số liệu ở ngay sau biểu đồ.">
      <text x="8" y="18">Phút</text>
      {[0, 0.5, 1].map((ratio) => <g key={ratio}><line x1="45" x2="735" y1={y(ratio * max)} y2={y(ratio * max)} className="statistics-grid-line" /><text x="0" y={y(ratio * max) + 4}>{minuteLabel(ratio * max)}</text></g>)}
      {days.map((day, index) => <g key={day.date}>
        {day.plannedSeconds !== null && <circle cx={x(index)} cy={y(day.plannedSeconds)} r="3" className="statistics-target"><title>{day.date}: mục tiêu {minuteLabel(day.plannedSeconds)} phút</title></circle>}
        {day.actualSeconds !== null && <circle cx={x(index)} cy={y(day.actualSeconds)} r="4" className="statistics-actual"><title>{day.date}: {minuteLabel(day.actualSeconds)} phút</title></circle>}
        {index > 0 && day.actualSeconds !== null && days[index - 1].actualSeconds !== null && <line x1={x(index - 1)} y1={y(days[index - 1].actualSeconds!)} x2={x(index)} y2={y(day.actualSeconds)} className="statistics-actual-line" />}
        {index > 0 && day.plannedSeconds !== null && days[index - 1].plannedSeconds !== null && <line x1={x(index - 1)} y1={y(days[index - 1].plannedSeconds!)} x2={x(index)} y2={y(day.plannedSeconds)} className="statistics-target-line" />}
        {(days.length <= 7 || index % 5 === 0 || index === days.length - 1) && <text textAnchor="middle" x={x(index)} y="190">{day.date.slice(5)}</text>}
      </g>)}
    </svg>
    <p className="statistics-muted">● Thực tế · ◇ Mục tiêu. Dấu “—” là chưa đo/chưa có mục tiêu hoặc ngày tương lai.</p>
    <details><summary>Xem bảng thời gian</summary><div className="statistics-table-wrap"><table><thead><tr><th>Ngày</th><th>Thực tế (phút)</th><th>Mục tiêu (phút)</th><th>Ghi nhận</th></tr></thead><tbody>{days.map((day) => <tr key={day.date}><th>{day.date}</th><td>{minuteLabel(day.actualSeconds)}</td><td>{minuteLabel(day.plannedSeconds)}</td><td>{day.status === 'NOT_TRACKED' ? 'Chưa bật đo' : day.status === 'FUTURE' ? 'Ngày tương lai' : day.status === 'PARTIAL_DAY' ? 'Đang diễn ra' : 'Đã ghi nhận'}</td></tr>)}</tbody></table></div></details>
  </>
}

export function SkillCompletionChart({ skills }: { skills: SkillCompletion[] }) {
  const ordered = ['LISTENING', 'READING', 'WRITING', 'SPEAKING'].map((skill) => skills.find((value) => value.skill === skill))
  const coordinates = [[100, 28], [172, 100], [100, 172], [28, 100]]
  const complete = ordered.every((value) => value?.percent !== null && value?.percent !== undefined)
  return <div className="statistics-skills">
    {complete && <svg viewBox="0 0 200 200" className="statistics-radar" role="img" aria-label="Radar tỷ lệ bài học hoàn thành; số liệu tương ứng ở danh sách kỹ năng.">
      <polygon points="100,28 172,100 100,172 28,100" className="statistics-radar-grid" />
      <polygon points={ordered.map((value, i) => `${100 + (coordinates[i][0] - 100) * value!.percent! / 100},${100 + (coordinates[i][1] - 100) * value!.percent! / 100}`).join(' ')} className="statistics-radar-fill" />
      <text x="100" y="15" textAnchor="middle">L</text><text x="185" y="104">R</text><text x="100" y="194" textAnchor="middle">W</text><text x="8" y="104">S</text>
    </svg>}
    <ul className="statistics-skills-list">{ordered.map((item, index) => <li key={index}><strong>{skillLabels[['LISTENING', 'READING', 'WRITING', 'SPEAKING'][index]]}</strong>
      {item && item.percent !== null ? <><progress value={item.percent} max={100} aria-label={`${skillLabels[item.skill]}: ${item.completedLessons}/${item.totalLessons} bài`} /><span>{percentLabel(item.percent)} · {item.completedLessons}/{item.totalLessons} bài</span></> : <span>Chưa có nội dung</span>}
    </li>)}</ul>
  </div>
}

export function BandHistoryChart({ points }: { points: BandPoint[] }) {
  const sorted = [...points].sort((a, b) => a.submittedAt.localeCompare(b.submittedAt) || a.attemptId.localeCompare(b.attemptId))
  const first = Date.parse(sorted[0]?.submittedAt ?? '')
  const last = Date.parse(sorted.at(-1)?.submittedAt ?? '')
  const x = (point: BandPoint) => last === first ? 160 : 30 + (Date.parse(point.submittedAt) - first) / (last - first) * 260
  const y = (band: number) => 150 - band / 9 * 130
  return <>
    <svg viewBox="0 0 320 175" className="statistics-chart" role="img" aria-label="Lịch sử band của những lần thi đủ điều kiện trên trang này.">
      {[0, 3, 6, 9].map((band) => <g key={band}><line x1="30" x2="295" y1={y(band)} y2={y(band)} className="statistics-grid-line" /><text x="5" y={y(band) + 4}>{band}</text></g>)}
      <polyline points={sorted.map((p) => `${x(p)},${y(p.band)}`).join(' ')} className="statistics-actual-line" fill="none" />
      {sorted.map((p) => <circle key={p.attemptId} cx={x(p)} cy={y(p.band)} r="4" className="statistics-actual"><title>{p.submittedAt.slice(0, 10)}: band {p.band.toFixed(1)}</title></circle>)}
    </svg>
    <details><summary>Xem kết quả và nguồn chấm</summary><div className="statistics-table-wrap"><table><thead><tr><th>Ngày nộp</th><th>Band</th><th>Nguồn</th><th>Phiên bản</th></tr></thead><tbody>{sorted.map((p) => <tr key={p.attemptId}><td>{p.submittedAt.slice(0, 10)}</td><td>{p.band.toFixed(1)}</td><td>{p.gradingSource} · {p.scoringVersion}</td><td>{p.resultVersion}{p.pendingRegrade ? ' · đang chấm lại' : ''}</td></tr>)}</tbody></table></div></details>
  </>
}
