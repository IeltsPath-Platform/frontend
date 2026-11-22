import { Link } from 'react-router-dom'
import { CEFR_LEVELS, SKILL_ROWS } from '../lib/overviewLabels'
import type { CoverageCell } from '../types'

const SKILL_LABEL = new Map(SKILL_ROWS.map((row) => [row.key, row.label]))
const NO_VALUE = 'NONE'

/** The skills with at least one point, in the order the rest of the page uses; points without a skill come last. */
function skillsOf(cells: readonly CoverageCell[]) {
  const present = new Set(cells.map((cell) => cell.skill))
  const keys = SKILL_ROWS.map((row) => row.key).filter((key) => present.has(key) || key !== 'ALL')
  return present.has(NO_VALUE) ? [...keys, NO_VALUE] : keys
}

function levelsOf(cells: readonly CoverageCell[]) {
  return cells.some((cell) => cell.cefrLevel === NO_VALUE) ? [...CEFR_LEVELS, NO_VALUE] : [...CEFR_LEVELS]
}

const skillText = (key: string) => (key === NO_VALUE ? 'Chưa gán kỹ năng' : SKILL_LABEL.get(key) ?? key)
const levelText = (key: string) => (key === NO_VALUE ? 'Chưa gán' : key)

/** How bad a cell is: nothing missing, less than half missing, or half or more. */
function tone(cell: CoverageCell) {
  if (cell.withoutPublishedQuestion === 0) return 'ok'
  return cell.withoutPublishedQuestion * 2 >= cell.activeKnowledgePoints ? 'high' : 'low'
}

/**
 * The active knowledge points by skill (rows) and CEFR level (columns): each cell says how many of them have no published
 * question out of how many there are, so the empty corners of the content stand out. A cell opens the graph on its skill.
 */
export function CoverageMatrix({ cells, graphPath }: { cells: readonly CoverageCell[]; graphPath: string }) {
  const byKey = new Map(cells.map((cell) => [`${cell.skill}|${cell.cefrLevel}`, cell]))
  const levels = levelsOf(cells)
  return (
    <table className="ov-matrix">
      <caption>Số KP chưa có câu hỏi trên tổng số KP, theo kỹ năng và cấp CEFR</caption>
      <thead>
        <tr>
          <td />
          {levels.map((level) => <th key={level} scope="col">{levelText(level)}</th>)}
        </tr>
      </thead>
      <tbody>
        {skillsOf(cells).map((skill) => (
          <tr key={skill}>
            <th scope="row">{skillText(skill)}</th>
            {levels.map((level) => {
              const cell = byKey.get(`${skill}|${level}`)
              if (!cell) return <td aria-label={`${skillText(skill)} ${levelText(level)}: không có KP`} className="ov-cell ov-cell--empty" key={level}>·</td>
              const label = `${skillText(skill)} ${levelText(level)}: ${cell.withoutPublishedQuestion} trên ${cell.activeKnowledgePoints} KP chưa có câu hỏi`
                + (cell.withOnePublishedQuestion > 0 ? `, ${cell.withOnePublishedQuestion} KP chỉ có một câu` : '')
              const target = skill === NO_VALUE || skill === 'ALL' ? graphPath : `${graphPath}?skill=${skill}`
              return (
                <td className={`ov-cell ov-cell--${tone(cell)}`} key={level} title={label}>
                  <Link aria-label={label} to={target}>{cell.withoutPublishedQuestion}/{cell.activeKnowledgePoints}</Link>
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
