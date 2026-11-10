import { ArrowUpRight, BookOpen, Crosshair, Flag } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { VocabularyMapBand, VocabularyMapResponse } from '@/features/vocabulary/api/notebookApi'
import { bandToCefr } from '@/features/vocabulary/lib/understanding'

const number = (value: number) => value.toLocaleString('vi-VN')

/** A level as the learner reads it: "B1 · IELTS 4.0–5.0", or just the code when the level is unknown to the map. */
function levelText(cefr: string, bands: VocabularyMapBand[]) {
  const band = bands.find((item) => item.cefr === cefr)
  return band ? `${cefr} · IELTS ${band.band}` : cefr
}

const validBand = (value: number | null | undefined): value is number => typeof value === 'number' && Number.isFinite(value) && value > 0

interface DetailedVocabularyMapProps {
  data: VocabularyMapResponse
  /** The learner's own IELTS band (estimate or placement); used when no word is being learned yet. */
  learnerBand?: number | null
  targetBand?: number | null
}

export function DetailedVocabularyMap({ data, learnerBand = null, targetBand = null }: DetailedVocabularyMapProps) {
  const total = data.bands.reduce((sum, band) => sum + band.total, 0)
  const learned = data.bands.reduce((sum, band) => sum + band.learned, 0)
  const percent = total ? Math.round(learned / total * 100) : 0
  // Words being learned decide the level; before any, the learner's band does.
  const bandLevel = validBand(learnerBand) ? bandToCefr(learnerBand) : null
  const currentCefr = data.currentBand ?? bandLevel
  const currentFromBand = data.currentBand === null && bandLevel !== null
  const targetCefr = validBand(targetBand) ? bandToCefr(targetBand) : null
  return <>
    <div className="detailed-vocabulary-toolbar">
      <div className="detailed-vocabulary-context">
        <span><BookOpen size={15} aria-hidden="true" /> Cấp độ đang học: <strong>{currentCefr ? levelText(currentCefr, data.bands) : 'Chưa xác định'}</strong>{currentFromBand && <em>theo band của bạn</em>}</span>
        {targetCefr && <span className="is-target"><Flag size={15} aria-hidden="true" /> Mục tiêu: <strong>{levelText(targetCefr, data.bands)}</strong></span>}
        <span className="is-review"><Crosshair size={15} aria-hidden="true" /> Tập trung ôn: <strong>{data.suggestedBand ? levelText(data.suggestedBand, data.bands) : 'Chưa có từ đến hạn'}</strong></span>
      </div>
      <Button asChild className="detailed-map-link"><Link to="/vocabulary/map">Xem bản đồ chi tiết <ArrowUpRight size={16} /></Link></Button>
    </div>
    <div className="detailed-vocabulary-total"><span>Đã học <strong>{number(learned)}</strong> / {number(total)} nghĩa</span><progress className="overview-chart-progress" value={percent} max={100} aria-label="Tỷ lệ từ vựng đã học" /><strong>{percent}%</strong></div>
    {total === 0 && <p className="statistics-muted">Chưa có từ vựng trong kho. Bản đồ sẽ cập nhật khi có nội dung.</p>}
    {total > 0 && learned === 0 && <div className="detailed-vocabulary-start">
      <p>Bạn chưa học từ nào.{currentCefr ? <> Hãy bắt đầu với cấp độ <strong>{levelText(currentCefr, data.bands)}</strong>, phù hợp với band hiện tại của bạn.</> : ' Hãy chọn một bộ từ để bắt đầu.'}</p>
      <Button asChild variant="outline"><Link to="/vocabulary">Chọn bộ từ vựng <ArrowUpRight size={16} /></Link></Button>
    </div>}
    <ol className="detailed-vocabulary-levels" aria-label="Tiến độ từ vựng theo cấp độ">
      {data.bands.map((band) => {
        const share = band.total ? Math.min(100, band.learned / band.total * 100) : 0
        const isCurrent = currentCefr === band.cefr
        const isTarget = targetCefr === band.cefr
        const details = [band.learning > 0 && `${number(band.learning)} đang học`, band.needsReview > 0 && `${number(band.needsReview)} cần ôn`].filter(Boolean).join(' · ')
        return <li className={`detailed-vocabulary-level${isCurrent ? ' is-current' : ''}${isTarget ? ' is-target' : ''}`} key={band.cefr}>
          <div className="detailed-vocabulary-name">
            <strong>IELTS {band.band}</strong>
            <span className="detailed-cefr">{band.cefr}</span>
            {isCurrent && <span className="detailed-level-badge">Đang học ở đây</span>}
            {isTarget && <span className="detailed-level-badge is-target">Mục tiêu</span>}
          </div>
          <div className="detailed-vocabulary-meter" role="progressbar" aria-valuemin={0} aria-valuemax={band.total} aria-valuenow={band.learned}
            aria-label={`${band.cefr}, IELTS ${band.band}`} aria-valuetext={`${band.learned} trên ${band.total} nghĩa đã học`}>
            <span className="learned overview-chart-progress" style={{ width: `${share}%` }} />
          </div>
          <div className="detailed-vocabulary-figures">
            <strong>{number(band.learned)} / {number(band.total)} nghĩa</strong>
            {details && <small>{details}</small>}
          </div>
        </li>
      })}
    </ol>
    <div className="detailed-chart-legend"><span><i className="learned" />Đã học</span><span><i className="remaining" />Chưa học</span></div>
    <p className="detailed-chart-note">Mỗi nghĩa của một từ được đếm riêng. Nghĩa đang học nằm trong số nghĩa đã học; nghĩa cần ôn là nghĩa đã đến hạn ôn lại, có thể thuộc bất kỳ nhóm nào. Chỉ tính các nghĩa đã xếp cấp độ trong kho từ của IELTS Space.</p>
  </>
}
