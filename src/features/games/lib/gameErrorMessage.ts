import { HttpError } from '@/lib/httpClient'
const messages: Record<string, string> = {
  WORD_NOT_FOUND:
    'Từ không có trong kho. Hãy thử từ khác; bạn không mất lượt đoán.',
  INVALID_GUESS_LENGTH: 'Hãy nhập đủ số chữ của từ hiện tại.',
  INVALID_CHARACTERS: 'Chỉ nhập chữ cái tiếng Anh A–Z.',
  WORD_EXPIRED: 'Từ đã hết giờ. Đang đồng bộ lượt chơi tiếp theo.',
  WORD_NOT_CURRENT: 'Lượt chơi đã thay đổi. Hãy dùng từ hiện tại.',
  MATCH_FINISHED: 'Phiên chơi đã kết thúc.',
  REQUEST_ID_CONFLICT:
    'Lượt đoán này đã được dùng với dữ liệu khác. Hãy đồng bộ lại.',
  ROUND_CLOSED: 'Câu này đã hết giờ. Đang chuyển sang câu tiếp theo.',
  ALREADY_ANSWERED: 'Bạn đã trả lời câu này rồi.',
  INVALID_OPTION: 'Lựa chọn không hợp lệ. Hãy tải lại câu hỏi.',
  ROUND_NOT_FOUND: 'Không tìm thấy câu hỏi này.',
  PLAYER_NOT_ACTIVE: 'Bạn không còn tham gia lượt chơi này.',
  MATCH_NOT_FINISHED: 'Lượt chơi chưa kết thúc.',
  MULTIPLAYER_NOT_AVAILABLE: 'Chế độ nhiều người của Tên lửa chưa mở.',
}
function notEnoughWordsMessage(body: unknown) {
  const available = (body as { details?: { available?: unknown } } | null)
    ?.details?.available
  return `Không đủ từ cho trình độ và chủ đề này${
    typeof available === 'number' ? ` (hiện có ${available} từ)` : ''
  }. Hãy đổi lựa chọn hoặc giảm số từ.`
}

export function gameErrorMessage(reason: unknown) {
  if (reason instanceof HttpError && reason.code === 'NOT_ENOUGH_WORDS')
    return notEnoughWordsMessage(reason.body)
  if (reason instanceof HttpError && reason.code && messages[reason.code])
    return messages[reason.code]
  return reason instanceof Error
    ? reason.message
    : 'Không thực hiện được. Vui lòng thử lại.'
}
