import { Headphones, ListChecks, Mic, Timer } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

/** What the examiner does in each part of the test, so the learner knows what is coming before the first question. */
const PART_LEAD: Record<number, string> = {
  1: 'Giám khảo hỏi những câu chung về chủ đề quen thuộc. Trả lời ngắn gọn, tự nhiên.',
  2: 'Bạn nhận một thẻ gợi ý, có ít phút chuẩn bị rồi nói liên tục về chủ đề đó.',
  3: 'Thảo luận sâu hơn về chủ đề của Part 2. Nêu quan điểm và giải thích lý do.',
}
const FULL_LEAD = 'Bài thi đủ ba phần: câu hỏi quen thuộc, thẻ gợi ý rồi thảo luận. Làm lần lượt từng phần.'

const TIPS = [
  { icon: Headphones, text: 'Tìm nơi yên tĩnh, đeo tai nghe nếu có.' },
  { icon: Mic, text: 'Trình duyệt sẽ xin quyền dùng micro: hãy chọn Cho phép.' },
]

function minutesLabel(seconds: number) {
  return seconds < 90 ? `${seconds} giây` : `khoảng ${Math.round(seconds / 60)} phút`
}

/** "Are you ready?" before a Speaking part opens, so the first question never takes the learner by surprise. */
export function SpeakingReadyModal({ title, partNo, questionCount, timeLimitSeconds, onClose, onConfirm }: {
  title: string
  /** The part about to open; null for a full test. */
  partNo: number | null
  questionCount: number
  timeLimitSeconds: number | null
  onClose: () => void
  onConfirm: () => void
}) {
  const lead = (partNo ? PART_LEAD[partNo] : undefined) ?? FULL_LEAD
  const stats = [
    { icon: ListChecks, text: `${questionCount} câu hỏi` },
    ...(timeLimitSeconds ? [{ icon: Timer, text: `Thời lượng ${minutesLabel(timeLimitSeconds)}` }] : []),
  ]

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="practice-screen2-dialog practice-mode-dialog speaking-ready-dialog">
        <div className="screen2-top-header">
          <DialogTitle className="screen2-test-title">{title}</DialogTitle>
        </div>
        <div className="screen2-blue-body">
          <DialogDescription className="screen2-section-heading speaking-ready-heading">
            <span className="speaking-ready-mic" aria-hidden="true"><Mic size={16} /></span>Bạn đã sẵn sàng chưa?
          </DialogDescription>
          <div className="speaking-ready-panel">
            <p className="speaking-ready-lead">{lead}</p>
            <ul className="speaking-ready-stats" aria-label="Thông tin phần thi">
              {stats.map(({ icon: Icon, text }) => <li key={text}><Icon aria-hidden="true" size={15} />{text}</li>)}
            </ul>
            <ul className="speaking-ready-tips">
              {TIPS.map(({ icon: Icon, text }) => <li key={text}><span className="speaking-ready-tip-icon" aria-hidden="true"><Icon size={14} /></span><span>{text}</span></li>)}
            </ul>
          </div>
          <div className="screen2-action-footer speaking-ready-actions">
            <button type="button" className="screen2-start-cta" onClick={onConfirm}>SẴN SÀNG, BẮT ĐẦU</button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
