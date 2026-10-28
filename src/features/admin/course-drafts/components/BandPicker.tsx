import { useId } from 'react'
import { CEFR_LEVELS, type CefrLevel } from '../../knowledge-graph/types'
import { cefrForBand } from '../lib/courseKnowledgeOptions'

const BANDS = Array.from({ length: 19 }, (_, index) => index * 0.5)

/** The scale 0.0–9.0 split by the CEFR level each band belongs to, so the band and the level it teaches read together. */
const GROUPS = CEFR_LEVELS
  .map((level) => ({ level, bands: BANDS.filter((band) => cefrForBand(band) === level) }))
  .filter((group): group is { level: CefrLevel; bands: number[] } => group.bands.length > 0)

/** Target band of a course as one tap on a scale; arrow keys move along it like any radio group. */
export function BandPicker({ value, onChange }: { value: number; onChange: (band: number) => void }) {
  const name = useId()
  const current = cefrForBand(value)
  return <fieldset className="adm-band">
    <legend>Band mục tiêu<span aria-hidden="true" className="adm-required" /></legend>
    <div className="adm-band__scale">
      {GROUPS.map((group) => <div className={`adm-band__group${group.level === current ? ' is-current' : ''}`} key={group.level}>
        <div className="adm-band__chips">
          {group.bands.map((band) => <label className="adm-band__chip" key={band}>
            <input checked={band === value} name={name} onChange={() => onChange(band)} type="radio" value={band} />
            <span>{band.toFixed(1)}</span>
          </label>)}
        </div>
        <span aria-hidden="true" className="adm-band__level">{group.level}</span>
      </div>)}
    </div>
  </fieldset>
}
