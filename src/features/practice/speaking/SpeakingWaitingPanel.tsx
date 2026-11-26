import { AiWaitPanel } from '@/components/loading/AiWaitPanel'

/** The stages a submission goes through before its result can be shown, in order. */
const STEPS = [
  { label: 'Đã nhận bài', hint: 'Bản ghi của bạn đã vào hàng chờ.' },
  { label: 'Phân tích giọng nói', hint: 'Đang chép lời và đo phát âm từng từ, từng âm.' },
  { label: 'Chấm bài', hint: 'AI đang đọc bài nói và chấm theo từng tiêu chí.' },
  { label: 'Hoàn tất kết quả', hint: 'Kết quả sắp hiện ra.' },
] as const

/** A queued submission has been received (the send popup said so), so its wait already belongs to the speech analysis. */
const STAGE_OF: Record<string, number> = {
  UPLOADING: 0, QUEUED: 1, ANALYZING: 1, GRADING: 2, PAYMENT_PENDING: 3, FAILED_RETRYABLE: 2,
}

/** After this long the usual wait is over and the note says so, so a long grade is not mistaken for a stuck one. */
const LONGER_THAN_USUAL_SECONDS = 30
const MINUTES_SECONDS = 120

/**
 * What to tell the learner about the time. How long a grade takes depends on how long the answer is and how busy the
 * grader is, so no figure is promised: the note changes with the time already waited instead.
 */
function waitNote(seconds: number) {
  if (seconds >= MINUTES_SECONDS) return 'Vẫn đang chấm, bài nói dài có thể mất vài phút · bạn không cần gửi lại, kết quả sẽ tự hiện ra'
  if (seconds >= LONGER_THAN_USUAL_SECONDS) return 'Bài nói dài hoặc hệ thống đang đông nên cần thêm thời gian · vẫn đang chấm, hãy giữ trang này mở'
  return 'Thời gian chấm tùy độ dài bài nói · giữ trang này mở, kết quả sẽ tự hiện ra'
}

function verb(stage: number) {
  return ['Đang chờ tới lượt chấm', 'Đang phân tích giọng nói', 'Đang chấm bài', 'Đang hoàn tất kết quả'][stage]!
}

/**
 * The waiting screen of a Speaking result: while the speech is analysed and graded the learner sees which of four stages
 * the submission is in. A retry (the grader could not be reached) keeps the same stage and says so.
 */
export function SpeakingWaitingPanel({ status }: { status: string | undefined }) {
  const stage = status === undefined ? 0 : STAGE_OF[status] ?? 0
  const retrying = status === 'FAILED_RETRYABLE'
  const loading = status === undefined
  const title = retrying ? 'Đang thử chấm lại' : loading ? 'Đang tải kết quả' : verb(stage)
  const hint = retrying
    ? 'Lần chấm trước chưa thành công, hệ thống tự thử lại. Bạn không bị trừ point.'
    : loading ? 'Chờ một chút nhé.' : STEPS[stage]!.hint
  return <AiWaitPanel hint={hint} note={waitNote} retrying={retrying} stage={stage} steps={STEPS} title={title} />
}