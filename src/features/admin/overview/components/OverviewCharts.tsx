import type { ReactNode } from 'react'
import { formatCount } from '../lib/overviewLabels'

/*
 * Charts of the overview page, drawn with plain SVG and CSS: the data is a handful of counts, so a chart library
 * would cost more than it draws. Every chart states its numbers as text (legend, labels or the aria-label), so
 * nothing depends on colour or on the picture alone.
 */

export type Slice = { key: string; label: string; value: number; color: string }

const sum = (slices: readonly Slice[]) => slices.reduce((total, slice) => total + slice.value, 0)
const share = (value: number, total: number) => (total === 0 ? '0%' : `${Math.round((value / total) * 100)}%`)

/** Legend that doubles as the chart's data table: one row per slice with its count and share. */
function Legend({ slices, total }: { slices: readonly Slice[]; total: number }) {
  return (
    <ul className="ov-legend">
      {slices.map((slice) => (
        <li key={slice.key}>
          <span aria-hidden="true" className="ov-swatch" style={{ background: slice.color }} />
          <span className="ov-legend__label">{slice.label}</span>
          <strong>{formatCount(slice.value)}</strong>
          <span className="adm-muted">{share(slice.value, total)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Two or more slices of one whole, with the headline figure in the middle. */
export function DonutChart({ slices, centerValue, centerLabel, summary }: {
  slices: readonly Slice[]
  centerValue: string
  centerLabel: string
  summary: string
}) {
  const total = sum(slices)
  const radius = 52
  const circumference = 2 * Math.PI * radius
  let offset = 0
  return (
    <div className="ov-donut">
      <svg aria-label={summary} className="ov-donut__svg" role="img" viewBox="0 0 140 140">
        <circle className="ov-donut__track" cx="70" cy="70" r={radius} />
        {total > 0 ? slices.filter((slice) => slice.value > 0).map((slice) => {
          const length = (slice.value / total) * circumference
          const start = offset
          offset += length
          return (
            <circle
              className="ov-donut__arc"
              cx="70" cy="70" r={radius}
              key={slice.key}
              stroke={slice.color}
              strokeDasharray={`${Math.max(length - 1.5, 0.5)} ${circumference}`}
              strokeDashoffset={-start}
              transform="rotate(-90 70 70)"
            >
              <title>{`${slice.label}: ${formatCount(slice.value)}`}</title>
            </circle>
          )
        }) : null}
        <text className="ov-donut__value" textAnchor="middle" x="70" y="73">{centerValue}</text>
        <text className="ov-donut__caption" textAnchor="middle" x="70" y="90">{centerLabel}</text>
      </svg>
      <Legend slices={slices} total={total} />
    </div>
  )
}

/** Horizontal bars sharing one scale, with the value written at the end of each bar. */
export function BarList({ rows, summary, unit }: {
  rows: readonly (Slice & { hint?: ReactNode })[]
  summary: string
  unit?: string
}) {
  const max = Math.max(1, ...rows.map((row) => row.value))
  const total = sum(rows)
  return (
    <ul aria-label={summary} className="ov-bars">
      {rows.map((row) => (
        <li key={row.key}>
          <span className="ov-bars__label">{row.label}</span>
          <span aria-hidden="true" className="ov-bars__track">
            <span className="ov-bars__fill" style={{ width: `${(row.value / max) * 100}%`, background: row.color }} />
          </span>
          <strong className="ov-bars__value">{formatCount(row.value)}{unit ? ` ${unit}` : ''}</strong>
          <span className="adm-muted ov-bars__share">{share(row.value, total)}</span>
        </li>
      ))}
    </ul>
  )
}

/** Vertical columns for an ordered scale such as CEFR levels; each column carries its own value above it. */
export function ColumnChart({ columns, summary }: { columns: readonly (Slice & { muted?: boolean })[]; summary: string }) {
  const max = Math.max(1, ...columns.map((column) => column.value))
  const width = 300
  const height = 150
  const base = 122
  const slot = width / columns.length
  const barWidth = Math.min(30, slot - 12)
  return (
    <svg aria-label={summary} className="ov-columns" role="img" viewBox={`0 0 ${width} ${height}`}>
      <line className="ov-columns__base" x1="0" x2={width} y1={base} y2={base} />
      {columns.map((column, index) => {
        const barHeight = column.value === 0 ? 0 : Math.max(3, (column.value / max) * (base - 22))
        const x = index * slot + (slot - barWidth) / 2
        const center = index * slot + slot / 2
        return (
          <g key={column.key}>
            <rect
              className={column.muted ? 'ov-columns__bar ov-columns__bar--muted' : 'ov-columns__bar'}
              fill={column.color}
              height={barHeight}
              rx="3"
              width={barWidth}
              x={x}
              y={base - barHeight}
            >
              <title>{`${column.label}: ${formatCount(column.value)}`}</title>
            </rect>
            <text className="ov-columns__value" textAnchor="middle" x={center} y={base - barHeight - 5}>{formatCount(column.value)}</text>
            <text className="ov-columns__label" textAnchor="middle" x={center} y={base + 17}>{column.label}</text>
          </g>
        )
      })}
    </svg>
  )
}

/** One whole split into consecutive parts on a single bar. */
export function StackedBar({ slices, summary }: { slices: readonly Slice[]; summary: string }) {
  const total = sum(slices)
  return (
    <div>
      <div aria-label={summary} className="ov-stack" role="img">
        {total === 0 ? <span className="ov-stack__empty" /> : slices.filter((slice) => slice.value > 0).map((slice) => (
          <span key={slice.key} style={{ flexGrow: slice.value, background: slice.color }} title={`${slice.label}: ${formatCount(slice.value)}`} />
        ))}
      </div>
      <Legend slices={slices} total={total} />
    </div>
  )
}
