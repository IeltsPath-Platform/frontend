import type { CSSProperties } from 'react'
import { formatNumber } from './format'
import type { ChartRow } from '../data/types'

const PLOT_TICKS = 4

const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)
const nameOf = (row: ChartRow) => (row.caption ? `${row.label} ${row.caption}` : row.label)

/** A top value and evenly spaced ticks that land on round numbers (0 / 1.000 / 2.000 / 3.000). */
function niceScale(max: number): { top: number; ticks: number[] } {
  const rough = Math.max(1, max) / PLOT_TICKS
  const magnitude = 10 ** Math.floor(Math.log10(rough))
  const step = Math.max(1, [1, 2, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= rough) ?? magnitude * 10)
  const top = Math.max(step, Math.ceil(max / step) * step)
  return { top, ticks: Array.from({ length: top / step + 1 }, (_, index) => index * step) }
}

function groupRows(rows: readonly ChartRow[]): { group: string; rows: ChartRow[] }[] {
  const groups: { group: string; rows: ChartRow[] }[] = []
  for (const row of rows) {
    const last = groups[groups.length - 1]
    if (last && last.group === row.group) last.rows.push(row)
    else groups.push({ group: row.group, rows: [row] })
  }
  return groups
}

/**
 * Stacked column chart, one column per batch. Each column's segments are ordered stages (one blue, darker the
 * further along). Rows are split into one panel per group, each with its own scale, because the groups are different
 * products and are not compared by size. The column total sits on the tip; every value is also in the tooltip and
 * the table.
 */
export function StackedBarChart({ title, series, rows }: {
  title: string
  series: readonly string[]
  rows: readonly ChartRow[]
}) {
  return (
    <figure aria-label={title} className="pm-chart">
      <figcaption className="pm-chart__head">
        <h2>{title}</h2>
        <ul aria-label="Chú giải" className="pm-chart__legend">
          {series.map((name, index) => (
            <li key={name}><i className={`pm-chart__key pm-chart__seg--${index + 1}`} />{name}</li>
          ))}
        </ul>
      </figcaption>

      {rows.length === 0 ? (
        <div className="adm-state"><p>Không có đợt nào trong khoảng thời gian này.</p></div>
      ) : null}

      {/* Panels share the width in proportion to their columns, so a batch is as wide in every panel. */}
      <div className="pm-chart__panels" style={{ '--pm-panel-cols': groupRows(rows).map((entry) => `minmax(0, ${entry.rows.length}fr)`).join(' ') } as CSSProperties}>
        {groupRows(rows).map(({ group, rows: groupRowsList }) => {
          const { top, ticks } = niceScale(Math.max(...groupRowsList.map((row) => sum(row.values))))
          return (
            <section aria-label={group} className="pm-panel" key={group}>
              <p className="pm-panel__title">{group}</p>
              <div className="pm-panel__plot">
                <div aria-hidden="true" className="pm-panel__axis">
                  {ticks.map((tick) => (
                    <span key={tick} style={{ bottom: `${(tick / top) * 100}%` }}>{formatNumber(tick)}</span>
                  ))}
                </div>
                <div className="pm-panel__area">
                  {ticks.map((tick) => (
                    <i aria-hidden="true" className="pm-panel__grid" key={tick} style={{ bottom: `${(tick / top) * 100}%` }} />
                  ))}
                  <div className="pm-panel__cols">
                    {groupRowsList.map((row) => {
                      const total = sum(row.values)
                      return (
                        <div className="pm-col" key={row.id}>
                          <div className="pm-col__bar" style={{ height: `${(total / top) * 100}%` }}>
                            <span className="pm-col__total">{formatNumber(total)}</span>
                            {row.values.map((value, i) => value > 0 ? (
                              <span
                                aria-label={`${nameOf(row)}, ${series[i]}: ${formatNumber(value)} key`}
                                className={`pm-chart__seg pm-chart__seg--${i + 1}`}
                                key={series[i]}
                                role="img"
                                style={{ flex: `${value} 1 0` }}
                                tabIndex={0}
                              >
                                <span className="pm-chart__tip" role="tooltip"><strong>{formatNumber(value)} key</strong>{series[i]}</span>
                              </span>
                            ) : null)}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
              <div className="pm-panel__names">
                {groupRowsList.map((row) => (
                  <span key={row.id}>
                    {row.label}
                    {row.caption ? <small>{row.caption}</small> : null}
                  </span>
                ))}
              </div>
            </section>
          )
        })}
      </div>

      <details className="pm-chart__table">
        <summary>Xem dạng bảng</summary>
        <div className="adm-table-wrap">
          <table className="adm-table">
            <thead>
              <tr>
                <th scope="col">Đợt</th>
                {series.map((name) => <th key={name} scope="col">{name}</th>)}
                <th scope="col">Tổng</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <th scope="row">{nameOf(row)}</th>
                  {row.values.map((value, i) => <td key={series[i]}>{formatNumber(value)}</td>)}
                  <td>{formatNumber(sum(row.values))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  )
}
