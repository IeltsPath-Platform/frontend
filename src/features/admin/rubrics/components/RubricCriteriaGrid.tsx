import type { Rubric } from '../types'

const BAND_MAX = 9

/** The criteria of a rubric as cards: code, name, the start of its description and the band range it covers. */
export function RubricCriteriaGrid({ rubric }: { rubric: Rubric }) {
  const criteria = [...rubric.criteria].sort((a, b) => a.sortOrder - b.sortOrder)
  return (
    <ul aria-label="Các tiêu chí" className="rb-criteria">
      {criteria.map((criterion) => {
        const bands = criterion.bandDescriptors.map((item) => item.band)
        const min = Math.min(...bands)
        const max = Math.max(...bands)
        return (
          <li className="rb-criterion" key={criterion.code}>
            <div className="rb-criterion__top">
              <span className="rb-criterion__code">{criterion.code}</span>
              <h3>{criterion.name}</h3>
            </div>
            <p>{criterion.description}</p>
            {bands.length > 0 ? (
              <div className="rb-criterion__bands">
                <span className="rb-range" aria-hidden="true">
                  <i style={{ left: `${(min / BAND_MAX) * 100}%`, width: `${Math.max(((max - min) / BAND_MAX) * 100, 4)}%` }} />
                </span>
                <span>Band {min.toFixed(1)} – {max.toFixed(1)}</span>
              </div>
            ) : <span className="adm-muted">Chưa có mô tả band</span>}
          </li>
        )
      })}
    </ul>
  )
}
