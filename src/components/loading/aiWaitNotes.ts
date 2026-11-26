/**
 * What to say about the time while an essay is graded. No figure is promised: the note changes with the seconds already
 * waited, so a long grade is not mistaken for a stuck one.
 */
export function essayWaitNote(seconds: number): string {
  if (seconds >= 90) return 'Vẫn đang chấm, bài dài có thể mất thêm chút thời gian · bạn không cần gửi lại'
  if (seconds >= 30) return 'Lâu hơn thường lệ một chút, hệ thống đang đông · vẫn đang chấm, hãy giữ trang này mở'
  return 'Giữ trang này mở, kết quả sẽ tự hiện ra'
}