import { useState } from 'react'
import { FlaskConical, RotateCcw, ServerCrash } from 'lucide-react'
import { learningDemoControls } from '../api'
import { setPendingReviews } from '../lib/reviewGate'

export function DemoControls() {
  const [failing, setFailing] = useState(false)
  if (!learningDemoControls) return null

  function resetDemo() {
    learningDemoControls?.reset()
    setPendingReviews([])
    window.location.assign('/learn')
  }

  function toggleFailure() {
    learningDemoControls?.setServerFailing(!failing)
    setFailing(!failing)
  }

  return (
    <aside className="lp-demo lp-shell" aria-label="Điều khiển demo">
      <p><FlaskConical aria-hidden="true" size={16} />Dữ liệu giả lập cho học viên Lan, lưu trong trình duyệt này.</p>
      <div className="lp-demo__actions">
        <button type="button" onClick={resetDemo}><RotateCcw aria-hidden="true" size={15} />Đặt lại demo</button>
        <button type="button" onClick={toggleFailure} aria-pressed={failing}>
          <ServerCrash aria-hidden="true" size={15} />{failing ? 'Đang giả lỗi 500 · bấm để tắt' : 'Giả lỗi máy chủ 500'}
        </button>
      </div>
    </aside>
  )
}
