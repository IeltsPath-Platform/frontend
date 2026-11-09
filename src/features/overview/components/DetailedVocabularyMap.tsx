import { ArrowUpRight, BookOpen, Crosshair } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import type { VocabularyMapResponse } from '@/features/vocabulary/api/notebookApi'

const number = (value: number) => value.toLocaleString('vi-VN')
const states = [
  { key: 'learned', label: 'Đã học', className: 'learned' },
  { key: 'learning', label: 'Đang học', className: 'learning' },
  { key: 'needsReview', label: 'Cần ôn lại', className: 'review' },
] as const

export function DetailedVocabularyMap({ data }: { data: VocabularyMapResponse }) {
  const total = data.bands.reduce((sum, band) => sum + band.total, 0)
  const learned = data.bands.reduce((sum, band) => sum + band.learned, 0)
  const percent = total ? Math.round(learned / total * 100) : 0
  return <>
    <div className="detailed-vocabulary-toolbar">
      <div className="detailed-vocabulary-context">
        <span><BookOpen size={15} /> Cấp độ đang học: <strong>{data.currentBand ?? 'Chưa xác định'}</strong></span>
        <span><Crosshair size={15} /> Tập trung ôn: <strong>{data.suggestedBand ?? 'Chưa có từ đến hạn'}</strong></span>
      </div>
      <Button asChild className="detailed-map-link"><Link to="/vocabulary/map">Xem bản đồ chi tiết <ArrowUpRight size={16} /></Link></Button>
    </div>
    <div className="detailed-vocabulary-total"><span>Đã học <strong>{number(learned)}</strong> / {number(total)} từ</span><progress value={percent} max={100} aria-label="Tỷ lệ từ vựng đã học" /><strong>{percent}%</strong></div>
    {total === 0 && <p className="statistics-muted">Chưa có từ vựng trong danh mục. Bản đồ sẽ cập nhật khi có nội dung.</p>}
    <div className="detailed-vocabulary-columns">
      {data.bands.map((band) => <div className={`detailed-vocabulary-level${data.currentBand === band.cefr ? ' is-current' : ''}`} key={band.cefr}>
        <span className="detailed-vocabulary-count">{number(band.learned)} / {number(band.total)}</span>
        <div className="detailed-vocabulary-bars" role="img" aria-label={`${band.cefr}, IELTS ${band.band}: ${band.learned} đã học, ${band.learning} đang học, ${band.needsReview} cần ôn, ${band.notLearned} chưa học, tổng ${band.total} từ`}>
          {states.map((state) => <div className="detailed-vocabulary-track" key={state.key} title={`${state.label}: ${number(band[state.key])} / ${number(band.total)} từ`}><span className={state.className} style={{ height: `${band.total ? Math.min(100, band[state.key] / band.total * 100) : 0}%` }} /></div>)}
        </div>
        <strong>IELTS {band.band}</strong><span className="detailed-cefr">{band.cefr}</span>
        {data.currentBand === band.cefr && <span className="detailed-level-badge">Đang học ở đây</span>}
      </div>)}
    </div>
    <div className="detailed-chart-legend">{states.map((state) => <span key={state.key}><i className={state.className} />{state.label}</span>)}<span><i className="remaining" />Phần còn lại</span></div>
    <p className="detailed-chart-note">Mỗi cấp độ có ba cột tỷ lệ riêng. Từ đang học và từ cần ôn có thể nằm trong số từ đã học.</p>
  </>
}
