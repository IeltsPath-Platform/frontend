/** Why a review is on the learner's list, in words the learner can act on. */
export function reviewReasonText(review: { blocking?: boolean; triggerKind?: string | null }): string | null {
  // A review without the flag is treated as required, as the backend does.
  const required = review.blocking !== false
  switch (review.triggerKind) {
    case 'WRITING_CRITERION':
      return required
        ? 'Examiner chấm lại tiêu chí này vẫn chưa đạt, ở một bài viết khác. Hoàn thành bài ôn để mở lại các bài Writing.'
        : 'Tiêu chí này chưa đạt trong bài viết của bạn. Bạn vẫn học tiếp được.'
    case 'SPEAKING_CRITERION':
      // A grade by AI never blocks, so this is always a suggestion.
      return 'AI chấm phần nói chưa đạt tiêu chí này. Đây chỉ là gợi ý, bạn vẫn học tiếp được.'
    case 'ERROR_PATTERN':
      return 'Bạn hay mắc lỗi này ở điểm kiến thức này. Ôn lại để không lặp lại.'
    default:
      return null
  }
}
