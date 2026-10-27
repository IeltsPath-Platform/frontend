import { useEffect, useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import type { AiDraftStatus } from '../../ai-drafts/types'
import { elapsedText } from '../lib/elapsedText'

/** After this long the wait is no longer usual, so the card says what can be done meanwhile. */
const SLOW_AFTER_SECONDS = 120

type StepState = 'done' | 'active' | 'todo'
const STEPS: Array<{ title: string; hint: string }> = [
  { title: 'Đã nhận yêu cầu', hint: 'Band, kỹ năng và các điểm kiến thức bạn chọn.' },
  { title: 'Xếp hàng chờ AI', hint: 'Yêu cầu đang đợi tới lượt xử lý.' },
  { title: 'AI lập kế hoạch khóa học', hint: 'Gom điểm kiến thức thành bài học và topic, chọn gói luyện cho từng bài.' },
  { title: 'Kiểm tra và dựng bản nháp', hint: 'Loại mã không có trong kho, đối chiếu thứ tự học rồi lưu bản nháp.' },
]

/** Where each step stands for a running draft; the server only reports queued or generating, so the last step is never lit early. */
function stepStates(status: AiDraftStatus): StepState[] {
  return status === 'GENERATING' ? ['done', 'done', 'active', 'todo'] : ['done', 'active', 'todo', 'todo']
}

/**
 * What the author sees while a course draft is being made: the real stage it is in, how long it has been running, and
 * a ghost of the structure that will replace this card. The page refreshes itself, so the author never needs to reload.
 */
export function CourseDraftProgress({ status, createdAt }: { status: AiDraftStatus; createdAt: string }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])
  const seconds = Math.max(0, (now - new Date(createdAt).getTime()) / 1000)
  const states = stepStates(status)
  return <section aria-label="Tiến trình sinh bản nháp" className="adm-block adm-gen">
    <header className="adm-gen__head">
      <span aria-hidden="true" className="adm-gen__orb"><Sparkles size={20} /></span>
      <div className="adm-gen__title">
        <h2 role="status">{status === 'GENERATING' ? 'AI đang lập kế hoạch khóa học' : 'Yêu cầu đang chờ tới lượt'}</h2>
        <p className="adm-muted">Trang tự cập nhật, bạn không cần tải lại. Có thể rời trang, bản nháp vẫn được tạo và nằm trong Danh sách bản nháp.</p>
      </div>
      <time aria-label="Thời gian đã chạy" className="adm-gen__clock" dateTime={`PT${Math.floor(seconds)}S`}>{elapsedText(seconds)}</time>
    </header>
    <ol className="adm-gen__steps">
      {STEPS.map((step, index) => <li aria-current={states[index] === 'active' ? 'step' : undefined} className={`adm-gen__step is-${states[index]}`} key={step.title}>
        <span aria-hidden="true" className="adm-gen__mark">{states[index] === 'done' ? <Check size={14} strokeWidth={3} /> : null}</span>
        <div>
          <strong>{step.title}</strong>
          <small>{step.hint}</small>
        </div>
      </li>)}
    </ol>
    {seconds >= SLOW_AFTER_SECONDS ? <p className="adm-gen__slow" role="note">Lần này lâu hơn thường lệ. Nếu vài phút nữa vẫn chưa xong, kiểm tra dịch vụ AI hoặc tạo lại bản nháp từ Danh sách bản nháp.</p> : null}
    <div aria-hidden="true" className="adm-gen__ghost">
      {[0, 1].map((topic) => <div className="adm-gen__ghost-topic" key={topic}>
        <span className="adm-gen__bar adm-gen__bar--title" />
        {[0, 1, 2].map((lesson) => <span className="adm-gen__bar" key={lesson} />)}
      </div>)}
    </div>
  </section>
}
